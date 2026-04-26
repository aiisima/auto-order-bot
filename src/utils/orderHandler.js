const { Markup } = require('telegraf');
const db = require('../utils/database');
const { generateOrderId, formatRupiah, formatDate, getStatusBadge, getStatusText } = require('../utils/helpers');

class OrderHandler {
    async showOrderMenu(ctx) {
        const products = db.getProducts();
        
        if (products.length === 0) {
            await ctx.reply('❌ Belum ada produk tersedia. Silakan cek kembali nanti.');
            return;
        }
        
        let message = '🛍️ *Silakan pilih produk yang ingin diorder:*\n\n';
        
        products.forEach((product, index) => {
            message += `${index + 1}. *${product.name}*\n`;
            message += `   💰 Harga: ${formatRupiah(product.price)}\n`;
            message += `   📦 Stok: ${product.stock}\n`;
            message += `   📝 ${product.description.substring(0, 50)}${product.description.length > 50 ? '...' : ''}\n\n`;
        });

        const buttons = [];
        products.forEach((product) => {
            buttons.push([Markup.button.callback(`🛍️ ${product.name}`, `order_${product.id}`)]);
        });
        buttons.push([Markup.button.callback('🔙 Kembali ke Menu', 'back_to_menu')]);

        await ctx.replyWithHTML(message, Markup.inlineKeyboard(buttons));
    }

    async processOrder(ctx, productId) {
        const userId = ctx.from.id;
        const product = db.getProduct(parseInt(productId));
        
        if (!product) {
            await ctx.reply('❌ Produk tidak ditemukan!');
            return;
        }

        if (product.stock <= 0) {
            await ctx.reply('❌ Maaf, stok produk ini sedang habis!');
            return;
        }

        ctx.session = ctx.session || {};
        ctx.session.tempOrder = {
            productId: product.id,
            productName: product.name,
            price: product.price,
            file_id: product.file_id,
            file_type: product.file_type
        };

        let message = `🛍️ *Detail Order*\n\n` +
            `📦 Produk: ${product.name}\n` +
            `💰 Harga: ${formatRupiah(product.price)}\n` +
            `📦 Stok: ${product.stock}\n` +
            `📝 Deskripsi: ${product.description}\n\n` +
            `Silakan masukkan *jumlah* yang ingin diorder (maksimal ${product.stock}):`;

        await ctx.replyWithHTML(message, Markup.inlineKeyboard([
            [Markup.button.callback('1', 'qty_1'), Markup.button.callback('2', 'qty_2'), Markup.button.callback('3', 'qty_3')],
            [Markup.button.callback('4', 'qty_4'), Markup.button.callback('5', 'qty_5'), Markup.button.callback('🔟 Lainnya', 'qty_custom')],
            [Markup.button.callback('🔙 Batal', 'cancel_order')]
        ]));
    }

    async askCustomQuantity(ctx) {
        await ctx.reply('📝 Silakan masukkan jumlah yang diinginkan (1-100):');
        ctx.session.waitingForCustomQty = true;
    }

    async setQuantity(ctx, qty) {
        if (!ctx.session || !ctx.session.tempOrder) {
            await ctx.reply('❌ Sesi order tidak ditemukan. Silakan mulai order ulang.');
            return;
        }

        const product = db.getProduct(ctx.session.tempOrder.productId);
        const quantity = parseInt(qty);
        
        if (isNaN(quantity) || quantity < 1) {
            await ctx.reply('❌ Jumlah tidak valid! Silakan masukkan angka yang benar.');
            return;
        }
        
        if (!product || product.stock < quantity) {
            await ctx.reply(`❌ Stok tidak mencukupi! Stok tersedia: ${product ? product.stock : 0}`);
            return;
        }

        if (quantity > 100) {
            await ctx.reply('❌ Maksimal order 100 item per transaksi.');
            return;
        }

        ctx.session.tempOrder.quantity = quantity;
        ctx.session.tempOrder.totalPrice = ctx.session.tempOrder.price * quantity;

        const message = `✅ *Ringkasan Order*\n\n` +
            `📦 Produk: ${ctx.session.tempOrder.productName}\n` +
            `🔢 Jumlah: ${quantity}\n` +
            `💰 Harga/item: ${formatRupiah(ctx.session.tempOrder.price)}\n` +
            `💎 Total: ${formatRupiah(ctx.session.tempOrder.totalPrice)}\n\n` +
            `📝 Silakan masukkan *alamat lengkap* pengiriman Anda:\n` +
            `(Nama, No HP, Alamat lengkap, Kode Pos)`;

        await ctx.replyWithHTML(message);
        ctx.session.waitingForAddress = true;
    }

    async saveOrder(ctx, address) {
        if (!ctx.session || !ctx.session.tempOrder) {
            await ctx.reply('❌ Sesi order tidak ditemukan. Silakan /start untuk memulai ulang.');
            return;
        }

        const orderId = generateOrderId();
        const newOrder = {
            id: orderId,
            userId: ctx.from.id,
            userName: ctx.from.first_name,
            userPhone: ctx.from.username || '-',
            productId: ctx.session.tempOrder.productId,
            productName: ctx.session.tempOrder.productName,
            quantity: ctx.session.tempOrder.quantity,
            price: ctx.session.tempOrder.price,
            totalPrice: ctx.session.tempOrder.totalPrice,
            address: address,
            status: 'pending',
            file_sent: false,
            createdAt: new Date().toISOString()
        };

        db.addOrder(newOrder);
        
        // Update stok
        const product = db.getProduct(ctx.session.tempOrder.productId);
        db.updateStock(product.id, product.stock - ctx.session.tempOrder.quantity);

        // Update user stats
        const user = db.getUser(ctx.from.id);
        if (user) {
            db.updateUser(ctx.from.id, {
                total_orders: (user.total_orders || 0) + 1,
                total_spent: (user.total_spent || 0) + ctx.session.tempOrder.totalPrice
            });
        }

        let fileMessage = '';
        if (ctx.session.tempOrder.file_id) {
            fileMessage = `\n📎 *File akan dikirim setelah pembayaran dikonfirmasi.*`;
        }

        const message = `✅ *ORDER BERHASIL!*\n\n` +
            `🆔 Order ID: ${orderId}\n` +
            `📦 Produk: ${newOrder.productName}\n` +
            `🔢 Jumlah: ${newOrder.quantity}\n` +
            `💰 Total: ${formatRupiah(newOrder.totalPrice)}\n` +
            `📝 Alamat: ${address}\n` +
            `⏰ Waktu: ${formatDate(newOrder.createdAt)}\n\n` +
            `📌 Status: ${getStatusBadge('pending')} ${getStatusText('pending')}\n` +
            `${fileMessage}\n\n` +
            `💡 *Petunjuk Pembayaran:*\n` +
            `Silakan transfer ke:\n` +
            `🏦 BCA: 1234567890 a.n Toko Kami\n` +
            `📱 DANA: 62××××\n\n` +
            `📸 Kirim bukti transfer ke admin: @AiiSimaRajaIblis\n\n` +
            `Terima kasih telah berbelanja! 🛍️`;

        await ctx.replyWithHTML(message, Markup.inlineKeyboard([
            [Markup.button.callback('📊 Cek Status Order', 'check_order')],
            [Markup.button.callback('🏠 Menu Utama', 'back_to_menu')]
        ]));

        // Kirim notifikasi ke admin
        const adminId = process.env.ADMIN_ID;
        if (adminId) {
            await ctx.telegram.sendMessage(adminId, 
                `🆕 *ORDER BARU!*\n\n` +
                `🆔 ID: ${orderId}\n` +
                `👤 User: ${ctx.from.first_name} (@${ctx.from.username || '-'})\n` +
                `🆔 User ID: ${ctx.from.id}\n` +
                `📦 Produk: ${newOrder.productName}\n` +
                `🔢 Jumlah: ${newOrder.quantity}\n` +
                `💰 Total: ${formatRupiah(newOrder.totalPrice)}\n` +
                `📝 Alamat: ${address}\n\n` +
                `🔗 /approve_${orderId} - /reject_${orderId}`,
                { parse_mode: 'Markdown' }
            );
        }

        delete ctx.session.tempOrder;
        delete ctx.session.waitingForAddress;
        delete ctx.session.waitingForCustomQty;
    }

    async checkOrder(ctx) {
        const userId = ctx.from.id;
        const orders = db.getUserOrders(userId);
        
        if (orders.length === 0) {
            await ctx.reply('📝 Belum ada order. Yuk mulai order! 🛍️', Markup.inlineKeyboard([
                [Markup.button.callback('🛍️ Order Sekarang', 'auto_order')],
                [Markup.button.callback('🏠 Menu Utama', 'back_to_menu')]
            ]));
            return;
        }
        
        const pendingOrders = orders.filter(o => o.status === 'pending');
        const processingOrders = orders.filter(o => o.status === 'processing');
        const completedOrders = orders.filter(o => o.status === 'completed');
        const shippedOrders = orders.filter(o => o.status === 'shipped');

        let message = `📊 *STATUS ORDER ANDA*\n\n`;
        message += `📝 Total Order: ${orders.length}\n`;
        message += `⏳ Menunggu: ${pendingOrders.length}\n`;
        message += `🔄 Diproses: ${processingOrders.length}\n`;
        message += `📦 Dikirim: ${shippedOrders.length}\n`;
        message += `✅ Selesai: ${completedOrders.length}\n\n`;

        if (orders.length > 0) {
            message += `*📋 Order Terbaru:*\n`;
            const recentOrders = orders.slice(-5).reverse();
            recentOrders.forEach(order => {
                message += `\n┏━━ 🆔 ${order.id}\n`;
                message += `┣ 📦 ${order.productName}\n`;
                message += `┣ 🔢 ${order.quantity} item\n`;
                message += `┣ 💰 ${formatRupiah(order.totalPrice)}\n`;
                message += `┣ 📌 Status: ${getStatusBadge(order.status)} ${getStatusText(order.status)}\n`;
                message += `┗ ⏰ ${formatDate(order.createdAt)}\n`;
            });
        }

        await ctx.replyWithHTML(message, Markup.inlineKeyboard([
            [Markup.button.callback('📝 Lihat Semua Riwayat', 'order_history')],
            [Markup.button.callback('🛍️ Order Lagi', 'auto_order')],
            [Markup.button.callback('🔙 Kembali', 'back_to_menu')]
        ]));
    }

    async orderHistory(ctx) {
        const userId = ctx.from.id;
        const orders = db.getUserOrders(userId);

        if (orders.length === 0) {
            await ctx.reply('📝 Belum ada riwayat order.', Markup.inlineKeyboard([
                [Markup.button.callback('🛍️ Mulai Order', 'auto_order')],
                [Markup.button.callback('🔙 Kembali', 'back_to_menu')]
            ]));
            return;
        }

        let message = `📝 *RIWAYAT ORDER LENGKAP*\n\n`;
        const reversedOrders = [...orders].reverse();
        
        reversedOrders.forEach((order, index) => {
            message += `${index + 1}. 🆔 ${order.id}\n`;
            message += `   📦 ${order.productName}\n`;
            message += `   🔢 ${order.quantity} x ${formatRupiah(order.price)}\n`;
            message += `   💰 Total: ${formatRupiah(order.totalPrice)}\n`;
            message += `   📌 Status: ${getStatusBadge(order.status)} ${getStatusText(order.status)}\n`;
            message += `   ⏰ ${formatDate(order.createdAt)}\n\n`;
        });

        message += `\n📌 *Keterangan Status:*\n`;
        message += `⏳ Menunggu Konfirmasi\n`;
        message += `🔄 Sedang Diproses\n`;
        message += `📦 Sedang Dikirim\n`;
        message += `✅ Order Selesai\n`;

        await ctx.replyWithHTML(message, Markup.inlineKeyboard([
            [Markup.button.callback('🛍️ Order Baru', 'auto_order')],
            [Markup.button.callback('🔙 Kembali ke Menu', 'back_to_menu')]
        ]));
    }

    async cancelOrder(ctx, orderId) {
        const order = db.getOrders().find(o => o.id === orderId);
        
        if (!order) {
            await ctx.reply('❌ Order tidak ditemukan!');
            return;
        }
        
        if (order.userId !== ctx.from.id && !isAdmin(ctx.from.id)) {
            await ctx.reply('❌ Anda tidak memiliki akses ke order ini!');
            return;
        }
        
        if (order.status !== 'pending') {
            await ctx.reply(`❌ Order tidak dapat dibatalkan karena status: ${getStatusText(order.status)}`);
            return;
        }
        
        db.updateOrder(orderId, { status: 'cancelled' });
        
        // Kembalikan stok
        const product = db.getProduct(order.productId);
        if (product) {
            db.updateStock(product.id, product.stock + order.quantity);
        }
        
        await ctx.reply(`✅ Order ${orderId} berhasil dibatalkan.`);
    }
}

module.exports = new OrderHandler();
