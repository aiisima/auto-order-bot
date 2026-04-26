const { Markup } = require('telegraf');
const db = require('../utils/database');
const { formatRupiah, formatDate, getStatusBadge, getStatusText } = require('../utils/helpers');

class AdminHandler {
    async adminPanel(ctx) {
        const products = db.getProducts();
        const orders = db.getOrders();
        const users = db.getUsers();
        
        const pendingOrders = orders.filter(o => o.status === 'pending').length;
        const totalRevenue = orders.reduce((sum, o) => sum + o.totalPrice, 0);
        
        const message = `⚙️ *PANEL ADMINISTRATOR*\n\n` +
            `📊 *STATISTIK*\n` +
            `👥 Total User: ${users.length}\n` +
            `📦 Total Order: ${orders.length}\n` +
            `⏳ Pending Order: ${pendingOrders}\n` +
            `💰 Total Revenue: ${formatRupiah(totalRevenue)}\n` +
            `📦 Total Produk: ${products.length}\n\n` +
            `Pilih menu di bawah untuk mengelola bot:`;

        await ctx.replyWithHTML(message, Markup.inlineKeyboard([
            [Markup.button.callback('📦 Kelola Produk', 'admin_products')],
            [Markup.button.callback('📝 Kelola Order', 'admin_orders')],
            [Markup.button.callback('👥 Kelola User', 'admin_users')],
            [Markup.button.callback('📊 Lihat Statistik', 'admin_stats')],
            [Markup.button.callback('📨 Broadcast', 'admin_broadcast')],
            [Markup.button.callback('🔙 Kembali ke Menu', 'back_to_menu')]
        ]));
    }

    async manageProducts(ctx) {
        const products = db.getProducts();
        
        let message = `📦 *KELOLA PRODUK*\n\n`;
        products.forEach((product, index) => {
            message += `${index + 1}. ${product.name}\n`;
            message += `   💰 ${formatRupiah(product.price)} | 📦 Stok: ${product.stock}\n`;
            message += `   🆔 ID: ${product.id}\n\n`;
        });

        await ctx.replyWithHTML(message, Markup.inlineKeyboard([
            [Markup.button.callback('➕ Tambah Produk', 'admin_add_product')],
            [Markup.button.callback('✏️ Edit Stok', 'admin_edit_stock')],
            [Markup.button.callback('💰 Edit Harga', 'admin_edit_price')],
            [Markup.button.callback('📎 Upload File Produk', 'admin_upload_file')],
            [Markup.button.callback('❌ Hapus Produk', 'admin_delete_product')],
            [Markup.button.callback('🔙 Kembali', 'admin_panel')]
        ]));
    }

    async askAddProduct(ctx) {
        await ctx.reply('📝 *Tambah Produk Baru*\n\nSilakan kirimkan data produk dengan format:\n\n`nama_produk|harga|stok|deskripsi`\n\nContoh:\n`Product X|250000|10|Deskripsi produk X`', {
            parse_mode: 'Markdown'
        });
        ctx.session.adminAction = 'waiting_add_product';
    }

    async processAddProduct(ctx, text) {
        const parts = text.split('|');
        if (parts.length < 4) {
            await ctx.reply('❌ Format salah! Gunakan format: `nama|harga|stok|deskripsi`');
            return;
        }
        
        const [name, price, stock, description] = parts;
        
        const newProduct = {
            name: name.trim(),
            price: parseInt(price),
            stock: parseInt(stock),
            description: description.trim(),
            file_id: null,
            file_type: null
        };
        
        db.addProduct(newProduct);
        await ctx.reply(`✅ Produk "${name}" berhasil ditambahkan!`);
        delete ctx.session.adminAction;
    }

    async askEditStock(ctx) {
        const products = db.getProducts();
        let message = `✏️ *Edit Stok Produk*\n\nPilih produk yang akan diedit stoknya:\n\n`;
        products.forEach(p => {
            message += `🆔 ${p.id} - ${p.name} (Stok: ${p.stock})\n`;
        });
        message += `\nKirimkan ID produk dan stok baru: `;
        message += `\nContoh: \`1 50\``;
        
        await ctx.replyWithHTML(message, { parse_mode: 'Markdown' });
        ctx.session.adminAction = 'waiting_edit_stock';
    }

    async processEditStock(ctx, text) {
        const parts = text.split(' ');
        if (parts.length < 2) {
            await ctx.reply('❌ Format salah! Gunakan: `id_produk stok_baru`');
            return;
        }
        
        const [productId, newStock] = parts;
        const product = db.getProduct(parseInt(productId));
        
        if (!product) {
            await ctx.reply('❌ Produk tidak ditemukan!');
            return;
        }
        
        db.updateStock(parseInt(productId), parseInt(newStock));
        await ctx.reply(`✅ Stok produk "${product.name}" diubah menjadi ${newStock}`);
        delete ctx.session.adminAction;
    }

    async askEditPrice(ctx) {
        const products = db.getProducts();
        let message = `💰 *Edit Harga Produk*\n\nPilih produk yang akan diedit harganya:\n\n`;
        products.forEach(p => {
            message += `🆔 ${p.id} - ${p.name} (Harga: ${formatRupiah(p.price)})\n`;
        });
        message += `\nKirimkan ID produk dan harga baru: `;
        message += `\nContoh: \`1 200000\``;
        
        await ctx.replyWithHTML(message, { parse_mode: 'Markdown' });
        ctx.session.adminAction = 'waiting_edit_price';
    }

    async processEditPrice(ctx, text) {
        const parts = text.split(' ');
        if (parts.length < 2) {
            await ctx.reply('❌ Format salah! Gunakan: `id_produk harga_baru`');
            return;
        }
        
        const [productId, newPrice] = parts;
        const product = db.getProduct(parseInt(productId));
        
        if (!product) {
            await ctx.reply('❌ Produk tidak ditemukan!');
            return;
        }
        
        db.updatePrice(parseInt(productId), parseInt(newPrice));
        await ctx.reply(`✅ Harga produk "${product.name}" diubah menjadi ${formatRupiah(parseInt(newPrice))}`);
        delete ctx.session.adminAction;
    }

    async askUploadFile(ctx) {
        const products = db.getProducts();
        let message = `📎 *Upload File Produk*\n\nPilih produk untuk diupload file-nya:\n\n`;
        products.forEach(p => {
            message += `🆔 ${p.id} - ${p.name}\n`;
        });
        message += `\nKirimkan ID produk, lalu kirimkan file (bisa gambar, video, atau dokumen).\n`;
        message += `Contoh: Kirim \`1\` lalu kirim file-nya.`;
        
        await ctx.replyWithHTML(message, { parse_mode: 'Markdown' });
        ctx.session.adminAction = 'waiting_upload_file_product';
    }

    async setUploadFileProduct(ctx, productId) {
        ctx.session.uploadProductId = parseInt(productId);
        await ctx.reply(`✅ Produk dipilih. Sekarang kirimkan file yang ingin dilampirkan (gambar/video/dokumen):`);
        ctx.session.adminAction = 'waiting_upload_file';
    }

    async processUploadFile(ctx) {
        const productId = ctx.session.uploadProductId;
        const product = db.getProduct(productId);
        
        if (!product) {
            await ctx.reply('❌ Produk tidak ditemukan!');
            delete ctx.session.adminAction;
            delete ctx.session.uploadProductId;
            return;
        }
        
        let fileId = null;
        let fileType = null;
        
        if (ctx.message.photo) {
            fileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
            fileType = 'photo';
        } else if (ctx.message.video) {
            fileId = ctx.message.video.file_id;
            fileType = 'video';
        } else if (ctx.message.document) {
            fileId = ctx.message.document.file_id;
            fileType = 'document';
        } else {
            await ctx.reply('❌ Kirimkan file berupa gambar, video, atau dokumen!');
            return;
        }
        
        db.updateProduct(productId, { file_id: fileId, file_type: fileType });
        await ctx.reply(`✅ File berhasil diupload untuk produk "${product.name}"`);
        
        delete ctx.session.adminAction;
        delete ctx.session.uploadProductId;
    }

    async askDeleteProduct(ctx) {
        const products = db.getProducts();
        let message = `❌ *Hapus Produk*\n\nPilih produk yang akan dihapus:\n\n`;
        products.forEach(p => {
            message += `🆔 ${p.id} - ${p.name}\n`;
        });
        message += `\nKirimkan ID produk yang akan dihapus.`;
        
        await ctx.replyWithHTML(message, { parse_mode: 'Markdown' });
        ctx.session.adminAction = 'waiting_delete_product';
    }

    async processDeleteProduct(ctx, text) {
        const productId = parseInt(text);
        const product = db.getProduct(productId);
        
        if (!product) {
            await ctx.reply('❌ Produk tidak ditemukan!');
            return;
        }
        
        db.deleteProduct(productId);
        await ctx.reply(`✅ Produk "${product.name}" berhasil dihapus!`);
        delete ctx.session.adminAction;
    }

    async manageOrders(ctx) {
        const orders = db.getOrders();
        const pendingOrders = orders.filter(o => o.status === 'pending');
        
        if (pendingOrders.length === 0) {
            await ctx.reply('📝 Tidak ada pending order.', Markup.inlineKeyboard([
                [Markup.button.callback('🔙 Kembali', 'admin_panel')]
            ]));
            return;
        }
        
        let message = `📝 *PENDING ORDERS*\n\n`;
        pendingOrders.forEach((order, index) => {
            message += `${index + 1}. 🆔 ${order.id}\n`;
            message += `   👤 ${order.userName}\n`;
            message += `   📦 ${order.productName} x${order.quantity}\n`;
            message += `   💰 ${formatRupiah(order.totalPrice)}\n`;
            message += `   ⏰ ${formatDate(order.createdAt)}\n\n`;
        });
        
        const buttons = [];
        pendingOrders.slice(0, 5).forEach(order => {
            buttons.push([Markup.button.callback(`✅ Approve ${order.id.slice(-8)}`, `approve_${order.id}`)]);
            buttons.push([Markup.button.callback(`❌ Reject ${order.id.slice(-8)}`, `reject_${order.id}`)]);
        });
        buttons.push([Markup.button.callback('🔙 Kembali', 'admin_panel')]);
        
        await ctx.replyWithHTML(message, Markup.inlineKeyboard(buttons));
    }

    async approveOrder(ctx, orderId) {
        const order = db.getOrders().find(o => o.id === orderId);
        if (!order) {
            await ctx.reply('❌ Order tidak ditemukan!');
            return;
        }
        
        db.updateOrder(orderId, { status: 'processing' });
        
        // Kirim file ke user jika ada
        const product = db.getProduct(order.productId);
        let fileSent = false;
        
        if (product && product.file_id) {
            try {
                if (product.file_type === 'photo') {
                    await ctx.telegram.sendPhoto(order.userId, product.file_id, {
                        caption: `📦 *File Order #${orderId}*\n\nProduk: ${order.productName}\nTerima kasih telah berbelanja!`
                    });
                } else if (product.file_type === 'video') {
                    await ctx.telegram.sendVideo(order.userId, product.file_id, {
                        caption: `📦 *File Order #${orderId}*\n\nProduk: ${order.productName}`
                    });
                } else if (product.file_type === 'document') {
                    await ctx.telegram.sendDocument(order.userId, product.file_id, {
                        caption: `📦 *File Order #${orderId}*\n\nProduk: ${order.productName}`
                    });
                }
                fileSent = true;
            } catch (err) {
                console.error('Error sending file:', err);
            }
        }
        
        await ctx.telegram.sendMessage(order.userId,
            `✅ *ORDER DIAPPROVE!*\n\n` +
            `🆔 Order ID: ${orderId}\n` +
            `📦 Produk: ${order.productName}\n` +
            `🔢 Jumlah: ${order.quantity}\n` +
            `💰 Total: ${formatRupiah(order.totalPrice)}\n\n` +
            `📌 Status: Diproses\n` +
            `${fileSent ? '📎 File sudah dikirim ke chat ini.\n\n' : ''}` +
            `Terima kasih sudah berbelanja! 🛍️`,
            { parse_mode: 'Markdown' }
        );
        
        await ctx.reply(`✅ Order ${orderId} telah diapprove.`);
    }

    async rejectOrder(ctx, orderId) {
        const order = db.getOrders().find(o => o.id === orderId);
        if (!order) {
            await ctx.reply('❌ Order tidak ditemukan!');
            return;
        }
        
        db.updateOrder(orderId, { status: 'cancelled' });
        
        // Kembalikan stok
        const product = db.getProduct(order.productId);
        if (product) {
            db.updateStock(product.id, product.stock + order.quantity);
        }
        
        await ctx.telegram.sendMessage(order.userId,
            `❌ *ORDER DITOLAK*\n\n` +
            `🆔 Order ID: ${orderId}\n\n` +
            `Maaf, order Anda tidak dapat diproses. Silakan hubungi admin untuk informasi lebih lanjut.`,
            { parse_mode: 'Markdown' }
        );
        
        await ctx.reply(`❌ Order ${orderId} telah ditolak.`);
    }

    async manageUsers(ctx) {
        const users = db.getUsers();
        
        let message = `👥 *DAFTAR USER*\n\n`;
        users.slice(0, 20).forEach((user, index) => {
            message += `${index + 1}. 👤 ${user.first_name}\n`;
            message += `   🆔 ID: ${user.id}\n`;
            message += `   📦 Order: ${user.total_orders || 0}\n`;
            message += `   💰 Total: ${formatRupiah(user.total_spent || 0)}\n\n`;
        });
        
        message += `\nTotal User: ${users.length}`;
        
        await ctx.replyWithHTML(message, Markup.inlineKeyboard([
            [Markup.button.callback('📨 Broadcast ke Semua', 'admin_broadcast')],
            [Markup.button.callback('🔙 Kembali', 'admin_panel')]
        ]));
    }

    async broadcast(ctx) {
        await ctx.reply('📨 *BROADCAST MESSAGE*\n\nSilakan kirimkan pesan yang akan dikirim ke semua user.\n\nKetik /cancel untuk membatalkan.', {
            parse_mode: 'Markdown'
        });
        ctx.session.adminAction = 'waiting_broadcast';
    }

    async processBroadcast(ctx, messageText) {
        const users = db.getUsers();
        let success = 0;
        let failed = 0;
        
        await ctx.reply(`⏳ Mengirim broadcast ke ${users.length} user...`);
        
        for (const user of users) {
            try {
                await ctx.telegram.sendMessage(user.id, messageText, { parse_mode: 'Markdown' });
                success++;
            } catch (err) {
                failed++;
            }
            // Delay untuk menghindari rate limit
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        await ctx.reply(`✅ Broadcast selesai!\n📨 Berhasil: ${success}\n❌ Gagal: ${failed}`);
        delete ctx.session.adminAction;
    }

    async showStats(ctx) {
        const orders = db.getOrders();
        const users = db.getUsers();
        const products = db.getProducts();
        
        const pendingOrders = orders.filter(o => o.status === 'pending').length;
        const processingOrders = orders.filter(o => o.status === 'processing').length;
        const completedOrders = orders.filter(o => o.status === 'completed').length;
        const cancelledOrders = orders.filter(o => o.status === 'cancelled').length;
        
        const totalRevenue = orders.reduce((sum, o) => sum + o.totalPrice, 0);
        const avgOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;
        
        // Order per bulan
        const ordersPerMonth = {};
        orders.forEach(order => {
            const month = formatDate(order.createdAt).slice(3, 10);
            ordersPerMonth[month] = (ordersPerMonth[month] || 0) + 1;
        });
        
        let monthlyStats = '';
        Object.entries(ordersPerMonth).slice(-6).forEach(([month, count]) => {
            monthlyStats += `   📅 ${month}: ${count} order\n`;
        });
        
        const message = `📊 *STATISTIK LENGKAP BOT*\n\n` +
            `👥 *USER STATS*\n` +
            `   Total User: ${users.length}\n\n` +
            `📦 *ORDER STATS*\n` +
            `   Total Order: ${orders.length}\n` +
            `   ⏳ Pending: ${pendingOrders}\n` +
            `   🔄 Diproses: ${processingOrders}\n` +
            `   ✅ Selesai: ${completedOrders}\n` +
            `   ❌ Dibatalkan: ${cancelledOrders}\n\n` +
            `💰 *REVENUE STATS*\n` +
            `   Total Revenue: ${formatRupiah(totalRevenue)}\n` +
            `   Rata-rata Order: ${formatRupiah(avgOrderValue)}\n\n` +
            `📦 *PRODUK STATS*\n` +
            `   Total Produk: ${products.length}\n` +
            `   Total Stok: ${products.reduce((sum, p) => sum + p.stock, 0)}\n\n` +
            `📅 *ORDER PER BULAN (6 bulan terakhir)*\n${monthlyStats || '   Belum ada data'}`;
        
        await ctx.replyWithHTML(message, Markup.inlineKeyboard([
            [Markup.button.callback('🔄 Refresh', 'admin_stats')],
            [Markup.button.callback('🔙 Kembali', 'admin_panel')]
        ]));
    }
}

module.exports = new AdminHandler();
