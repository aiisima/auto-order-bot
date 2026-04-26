const { Telegraf, Markup, session } = require('telegraf');
const fs = require('fs');
const path = require('path');
const moment = require('moment');
require('dotenv').config();

// ============ KONFIGURASI ============
const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
    console.error('❌ BOT_TOKEN tidak ditemukan di file .env');
    process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);
bot.use(session());

// ============ DATABASE ============
const dbPath = path.join(__dirname, 'database.json');

const readDB = () => {
    try {
        if (!fs.existsSync(dbPath)) {
            const defaultDB = {
                orders: [],
                users: [],
                products: [
                    { id: 1, name: 'Product Premium A', price: 100000, stock: 10, description: 'Produk premium berkualitas tinggi', file_id: null, file_type: null },
                    { id: 2, name: 'Product Premium B', price: 150000, stock: 5, description: 'Produk dengan fitur lengkap', file_id: null, file_type: null },
                    { id: 3, name: 'Product Premium C', price: 200000, stock: 8, description: 'Produk terbaik untuk kebutuhan Anda', file_id: null, file_type: null }
                ],
                settings: { maintenance: false, auto_approve: true }
            };
            fs.writeFileSync(dbPath, JSON.stringify(defaultDB, null, 2));
            return defaultDB;
        }
        const data = fs.readFileSync(dbPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading database:', error);
        return { orders: [], users: [], products: [], settings: {} };
    }
};

const writeDB = (data) => {
    try {
        fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error('Error writing database:', error);
        return false;
    }
};

// ============ HELPER FUNCTIONS ============
const formatRupiah = (price) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(price);
};

const generateOrderId = () => {
    return 'ORD-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
};

const formatDate = (date) => {
    return moment(date).format('DD/MM/YYYY HH:mm:ss');
};

const getStatusBadge = (status) => {
    const badges = { pending: '⏳', processing: '🔄', completed: '✅', cancelled: '❌', shipped: '📦' };
    return badges[status] || '❓';
};

const getStatusText = (status) => {
    const texts = { pending: 'Menunggu Konfirmasi', processing: 'Sedang Diproses', completed: 'Selesai', cancelled: 'Dibatalkan', shipped: 'Dikirim' };
    return texts[status] || status;
};

const isAdmin = (userId) => {
    const adminId = process.env.ADMIN_ID;
    return adminId && userId.toString() === adminId.toString();
};

// ============ MAIN MENU KEYBOARD ============
const mainMenuKeyboard = Markup.inlineKeyboard([
    [Markup.button.callback('🛍️ Auto Order', 'auto_order')],
    [Markup.button.callback('📊 Cek Order', 'check_order')],
    [Markup.button.callback('📦 Daftar Produk', 'list_products')],
    [Markup.button.callback('📝 Riwayat Order', 'order_history')],
    [Markup.button.callback('👤 Profil Saya', 'my_profile')],
    [Markup.button.callback('ℹ️ Info Bot', 'info_bot')]
]);

// ============ COMMAND /start ============
bot.start(async (ctx) => {
    const senderId = ctx.from.id;
    const userName = ctx.from.first_name;
    const waktuRunPanel = new Date().toLocaleString('id-ID');
    const CATBOX_IMAGE_URL = process.env.CATBOX_IMAGE_URL || 'https://files.catbox.moe/gs46so.jpg';
    
    // Simpan user ke database
    const db = readDB();
    const userExists = db.users.find(u => u.id === senderId);
    if (!userExists) {
        db.users.push({
            id: senderId,
            first_name: userName,
            username: ctx.from.username || '',
            joined_at: new Date().toISOString(),
            total_orders: 0,
            total_spent: 0
        });
        writeDB(db);
    }
    
    const caption = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
░█▄█░█▀▀░█▀▄░█░█░█▀▀░█▀█
░█░█░█▀▀░█░█░█░█░▀▀█░█▀█
░▀░▀░▀▀▀░▀▀░░▀▀▀░▀▀▀░▀░▀
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┏━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  𖡢 𝐈𝐍𝐅𝐎𝐑𝐌𝐀𝐓𝐈𝐎𝐍 𝐒𝐂𝐑𝐈𝐏𝐓 𖡾
┗━━━━━━━━━━━━━━━━━━━━━━━━┛

⫹⫺ 𝘽𝙤𝙩𝙉𝙖𝙢𝙚 : 𝗔𝗨𝗧𝗢 𝗢𝗥𝗗𝗘𝗥
⫹⫺ 𝙏𝙮𝙥𝙚𝙊𝙨 : 𝗟𝗶𝗻𝘂𝘅
⫹⫺ 𝙍𝙪𝙣𝙏𝙞𝙢𝙚 : ${waktuRunPanel}
⫹⫺ 𝙐𝙨𝙚𝙧𝙄𝘿 : ${senderId}
⫹⫺ 𝙐𝙨𝙚𝙧𝙉𝙖𝙢𝙚 : ${userName}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ᙺ t.me/AiiSimaRajaIblis
❍─────────────────────────────
ᨑ © 𝙼𝚎𝚍𝚞𝚜𝚊`;

    try {
        await ctx.replyWithPhoto(CATBOX_IMAGE_URL, {
            caption: caption,
            parse_mode: 'HTML',
            ...mainMenuKeyboard
        });
    } catch (error) {
        await ctx.reply(caption, { parse_mode: 'HTML', ...mainMenuKeyboard });
    }
});

// ============ BACK TO MENU ============
bot.action('back_to_menu', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply('🏠 *Menu Utama*', { parse_mode: 'Markdown', ...mainMenuKeyboard });
});

// ============ AUTO ORDER ============
bot.action('auto_order', async (ctx) => {
    await ctx.answerCbQuery();
    const db = readDB();
    const products = db.products;
    
    if (products.length === 0) {
        await ctx.reply('❌ Belum ada produk tersedia.');
        return;
    }
    
    let message = '🛍️ *Silakan pilih produk:*\n\n';
    products.forEach((product, index) => {
        message += `${index + 1}. *${product.name}*\n`;
        message += `   💰 ${formatRupiah(product.price)} | 📦 Stok: ${product.stock}\n\n`;
    });
    
    const buttons = products.map(p => [Markup.button.callback(`🛍️ ${p.name}`, `order_${p.id}`)]);
    buttons.push([Markup.button.callback('🔙 Kembali', 'back_to_menu')]);
    
    await ctx.replyWithHTML(message, Markup.inlineKeyboard(buttons));
});

// ============ PROCESS ORDER ============
bot.action(/order_(\d+)/, async (ctx) => {
    await ctx.answerCbQuery();
    const productId = parseInt(ctx.match[1]);
    const db = readDB();
    const product = db.products.find(p => p.id === productId);
    
    if (!product) {
        await ctx.reply('❌ Produk tidak ditemukan!');
        return;
    }
    
    if (product.stock <= 0) {
        await ctx.reply('❌ Stok produk ini habis!');
        return;
    }
    
    ctx.session.tempOrder = {
        productId: product.id,
        productName: product.name,
        price: product.price,
        file_id: product.file_id,
        file_type: product.file_type
    };
    
    const message = `🛍️ *${product.name}*\n\n💰 Harga: ${formatRupiah(product.price)}\n📦 Stok: ${product.stock}\n📝 ${product.description}\n\nMasukkan jumlah yang ingin diorder (1-${Math.min(product.stock, 100)}):`;
    
    await ctx.replyWithHTML(message, Markup.inlineKeyboard([
        [Markup.button.callback('1', 'qty_1'), Markup.button.callback('2', 'qty_2'), Markup.button.callback('3', 'qty_3')],
        [Markup.button.callback('4', 'qty_4'), Markup.button.callback('5', 'qty_5'), Markup.button.callback('🔟 Lainnya', 'qty_custom')],
        [Markup.button.callback('❌ Batal', 'cancel_order')]
    ]));
});

bot.action(/qty_(\d+)/, async (ctx) => {
    await ctx.answerCbQuery();
    const qty = parseInt(ctx.match[1]);
    
    if (!ctx.session.tempOrder) {
        await ctx.reply('❌ Sesi order habis. Mulai order ulang.');
        return;
    }
    
    const db = readDB();
    const product = db.products.find(p => p.id === ctx.session.tempOrder.productId);
    
    if (!product || product.stock < qty) {
        await ctx.reply(`❌ Stok tidak cukup! Tersisa: ${product ? product.stock : 0}`);
        return;
    }
    
    ctx.session.tempOrder.quantity = qty;
    ctx.session.tempOrder.totalPrice = ctx.session.tempOrder.price * qty;
    
    await ctx.replyWithHTML(`✅ *Ringkasan Order*\n\n📦 Produk: ${ctx.session.tempOrder.productName}\n🔢 Jumlah: ${qty}\n💰 Total: ${formatRupiah(ctx.session.tempOrder.totalPrice)}\n\n📝 Silakan masukkan alamat lengkap Anda:`, Markup.inlineKeyboard([[Markup.button.callback('❌ Batal', 'cancel_order')]]));
    
    ctx.session.waitingForAddress = true;
});

bot.action('qty_custom', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply('📝 Masukkan jumlah yang diinginkan (1-100):');
    ctx.session.waitingForCustomQty = true;
});

bot.action('cancel_order', async (ctx) => {
    await ctx.answerCbQuery();
    ctx.session.tempOrder = null;
    ctx.session.waitingForAddress = null;
    ctx.session.waitingForCustomQty = null;
    await ctx.reply('❌ Order dibatalkan.', mainMenuKeyboard);
});

// ============ CEK ORDER ============
bot.action('check_order', async (ctx) => {
    await ctx.answerCbQuery();
    const db = readDB();
    const orders = db.orders.filter(o => o.userId === ctx.from.id);
    
    if (orders.length === 0) {
        await ctx.reply('📝 Belum ada order.', Markup.inlineKeyboard([[Markup.button.callback('🛍️ Order Sekarang', 'auto_order')], [Markup.button.callback('🔙 Kembali', 'back_to_menu')]]));
        return;
    }
    
    const pending = orders.filter(o => o.status === 'pending').length;
    const processing = orders.filter(o => o.status === 'processing').length;
    const completed = orders.filter(o => o.status === 'completed').length;
    
    let message = `📊 *STATUS ORDER*\n\n📝 Total: ${orders.length}\n⏳ Pending: ${pending}\n🔄 Diproses: ${processing}\n✅ Selesai: ${completed}\n\n📋 *Order Terbaru:*\n`;
    
    orders.slice(-3).reverse().forEach(order => {
        message += `\n🆔 ${order.id}\n📦 ${order.productName} x${order.quantity}\n💰 ${formatRupiah(order.totalPrice)}\n📌 ${getStatusBadge(order.status)} ${getStatusText(order.status)}\n`;
    });
    
    await ctx.replyWithHTML(message, Markup.inlineKeyboard([[Markup.button.callback('📝 Riwayat Lengkap', 'order_history')], [Markup.button.callback('🔙 Kembali', 'back_to_menu')]]));
});

// ============ RIWAYAT ORDER ============
bot.action('order_history', async (ctx) => {
    await ctx.answerCbQuery();
    const db = readDB();
    const orders = db.orders.filter(o => o.userId === ctx.from.id);
    
    if (orders.length === 0) {
        await ctx.reply('📝 Belum ada riwayat order.', Markup.inlineKeyboard([[Markup.button.callback('🔙 Kembali', 'back_to_menu')]]));
        return;
    }
    
    let message = `📝 *RIWAYAT ORDER*\n\n`;
    [...orders].reverse().forEach((order, i) => {
        message += `${i + 1}. 🆔 ${order.id}\n   📦 ${order.productName} x${order.quantity}\n   💰 ${formatRupiah(order.totalPrice)}\n   📌 ${getStatusBadge(order.status)} ${getStatusText(order.status)}\n   ⏰ ${formatDate(order.createdAt)}\n\n`;
    });
    
    await ctx.replyWithHTML(message, Markup.inlineKeyboard([[Markup.button.callback('🔙 Kembali', 'back_to_menu')]]));
});

// ============ DAFTAR PRODUK ============
bot.action('list_products', async (ctx) => {
    await ctx.answerCbQuery();
    const db = readDB();
    const products = db.products;
    
    let message = `📦 *DAFTAR PRODUK*\n\n`;
    products.forEach((p, i) => {
        message += `${i + 1}. *${p.name}*\n   💰 ${formatRupiah(p.price)} | 📦 Stok: ${p.stock}\n   📝 ${p.description}\n\n`;
    });
    
    const buttons = products.map(p => [Markup.button.callback(`🛍️ Beli ${p.name}`, `order_${p.id}`)]);
    buttons.push([Markup.button.callback('🔙 Kembali', 'back_to_menu')]);
    
    await ctx.replyWithHTML(message, Markup.inlineKeyboard(buttons));
});

// ============ PROFIL SAYA ============
bot.action('my_profile', async (ctx) => {
    await ctx.answerCbQuery();
    const db = readDB();
    let user = db.users.find(u => u.id === ctx.from.id);
    
    if (!user) {
        user = { id: ctx.from.id, first_name: ctx.from.first_name, username: ctx.from.username || '-', joined_at: new Date().toISOString(), total_orders: 0, total_spent: 0 };
        db.users.push(user);
        writeDB(db);
    }
    
    const message = `👤 *PROFIL SAYA*\n\n🆔 ID: ${user.id}\n👤 Nama: ${user.first_name}\n📝 @${user.username}\n📅 Bergabung: ${formatDate(user.joined_at)}\n━━━━━━━━━━━━━━━\n📊 *STATISTIK*\n📦 Total Order: ${user.total_orders || 0}\n💰 Total Belanja: ${formatRupiah(user.total_spent || 0)}`;
    
    const buttons = [[Markup.button.callback('📝 Riwayat Order', 'order_history')]];
    if (isAdmin(ctx.from.id)) buttons.push([Markup.button.callback('⚙️ Panel Admin', 'admin_panel')]);
    buttons.push([Markup.button.callback('🔙 Kembali', 'back_to_menu')]);
    
    await ctx.replyWithHTML(message, Markup.inlineKeyboard(buttons));
});

// ============ INFO BOT ============
bot.action('info_bot', async (ctx) => {
    await ctx.answerCbQuery();
    const db = readDB();
    const totalOrders = db.orders.length;
    const totalUsers = db.users.length;
    const totalRevenue = db.orders.reduce((sum, o) => sum + o.totalPrice, 0);
    const waktuRunPanel = new Date().toLocaleString('id-ID');
    
    const message = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
░█▄█░█▀▀░█▀▄░█░█░█▀▀░█▀█
░█░█░█▀▀░█░█░█░█░▀▀█░█▀█
░▀░▀░▀▀▀░▀▀░░▀▀▀░▀▀▀░▀░▀
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⫹⫺ 𝘽𝙤𝙩𝙉𝙖𝙢𝙚 : AUTO ORDER
⫹⫺ 𝙍𝙪𝙣𝙏𝙞𝙢𝙚 : ${waktuRunPanel}
⫹⫺ 𝙐𝙨𝙚𝙧 : ${ctx.from.first_name}

📊 STATISTIK
👥 User: ${totalUsers}
📦 Order: ${totalOrders}
💰 Revenue: ${formatRupiah(totalRevenue)}

ᙺ t.me/AiiSimaRajaIblis
© 𝙼𝚎𝚍𝚞𝚜𝚊`;

    await ctx.replyWithHTML(message, mainMenuKeyboard);
});

// ============ ADMIN PANEL ============
bot.action('admin_panel', async (ctx) => {
    await ctx.answerCbQuery();
    if (!isAdmin(ctx.from.id)) return;
    
    const db = readDB();
    const message = `⚙️ *PANEL ADMIN*\n\n📊 Statistik:\n👥 User: ${db.users.length}\n📦 Order: ${db.orders.length}\n💰 Revenue: ${formatRupiah(db.orders.reduce((s, o) => s + o.totalPrice, 0))}\n⏳ Pending: ${db.orders.filter(o => o.status === 'pending').length}`;
    
    await ctx.replyWithHTML(message, Markup.inlineKeyboard([
        [Markup.button.callback('📦 Kelola Produk', 'admin_products')],
        [Markup.button.callback('📝 Kelola Order', 'admin_orders')],
        [Markup.button.callback('📨 Broadcast', 'admin_broadcast')],
        [Markup.button.callback('📊 Statistik', 'admin_stats')],
        [Markup.button.callback('🔙 Kembali', 'back_to_menu')]
    ]));
});

// ============ KELOLA PRODUK ============
bot.action('admin_products', async (ctx) => {
    await ctx.answerCbQuery();
    if (!isAdmin(ctx.from.id)) return;
    
    await ctx.reply('📦 *Kelola Produk*', {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
            [Markup.button.callback('➕ Tambah Produk', 'admin_add_product')],
            [Markup.button.callback('✏️ Edit Stok', 'admin_edit_stock')],
            [Markup.button.callback('💰 Edit Harga', 'admin_edit_price')],
            [Markup.button.callback('📎 Upload File', 'admin_upload_file')],
            [Markup.button.callback('❌ Hapus Produk', 'admin_delete_product')],
            [Markup.button.callback('🔙 Kembali', 'admin_panel')]
        ])
    });
});

bot.action('admin_add_product', async (ctx) => {
    await ctx.answerCbQuery();
    if (!isAdmin(ctx.from.id)) return;
    await ctx.reply('📝 Kirim data produk: `nama|harga|stok|deskripsi`\nContoh: `Product X|250000|10|Deskripsi produk`', { parse_mode: 'Markdown' });
    ctx.session.adminAction = 'waiting_add_product';
});

bot.action('admin_edit_stock', async (ctx) => {
    await ctx.answerCbQuery();
    if (!isAdmin(ctx.from.id)) return;
    const db = readDB();
    let msg = '✏️ Edit Stok\n\n';
    db.products.forEach(p => { msg += `🆔 ${p.id} - ${p.name} (Stok: ${p.stock})\n`; });
    msg += '\nKirim: `id_produk stok_baru`\nContoh: `1 50`';
    await ctx.reply(msg, { parse_mode: 'Markdown' });
    ctx.session.adminAction = 'waiting_edit_stock';
});

bot.action('admin_edit_price', async (ctx) => {
    await ctx.answerCbQuery();
    if (!isAdmin(ctx.from.id)) return;
    const db = readDB();
    let msg = '💰 Edit Harga\n\n';
    db.products.forEach(p => { msg += `🆔 ${p.id} - ${p.name} (Harga: ${formatRupiah(p.price)})\n`; });
    msg += '\nKirim: `id_produk harga_baru`\nContoh: `1 200000`';
    await ctx.reply(msg, { parse_mode: 'Markdown' });
    ctx.session.adminAction = 'waiting_edit_price';
});

bot.action('admin_upload_file', async (ctx) => {
    await ctx.answerCbQuery();
    if (!isAdmin(ctx.from.id)) return;
    const db = readDB();
    let msg = '📎 Upload File Produk\n\n';
    db.products.forEach(p => { msg += `🆔 ${p.id} - ${p.name}\n`; });
    msg += '\nKirim ID produk, lalu kirim file-nya. Contoh: `1`';
    await ctx.reply(msg, { parse_mode: 'Markdown' });
    ctx.session.adminAction = 'waiting_upload_file_product';
});

bot.action('admin_delete_product', async (ctx) => {
    await ctx.answerCbQuery();
    if (!isAdmin(ctx.from.id)) return;
    const db = readDB();
    let msg = '❌ Hapus Produk\n\n';
    db.products.forEach(p => { msg += `🆔 ${p.id} - ${p.name}\n`; });
    msg += '\nKirim ID produk yang akan dihapus.';
    await ctx.reply(msg, { parse_mode: 'Markdown' });
    ctx.session.adminAction = 'waiting_delete_product';
});

// ============ KELOLA ORDER ============
bot.action('admin_orders', async (ctx) => {
    await ctx.answerCbQuery();
    if (!isAdmin(ctx.from.id)) return;
    const db = readDB();
    const pending = db.orders.filter(o => o.status === 'pending');
    
    if (pending.length === 0) {
        await ctx.reply('📝 Tidak ada pending order.', Markup.inlineKeyboard([[Markup.button.callback('🔙 Kembali', 'admin_panel')]]));
        return;
    }
    
    let message = `📝 *PENDING ORDER (${pending.length})*\n\n`;
    pending.slice(0, 10).forEach((o, i) => {
        message += `${i + 1}. 🆔 ${o.id}\n   👤 ${o.userName}\n   📦 ${o.productName} x${o.quantity}\n   💰 ${formatRupiah(o.totalPrice)}\n\n`;
    });
    
    const buttons = [];
    pending.slice(0, 5).forEach(o => {
        buttons.push([Markup.button.callback(`✅ Approve ${o.id.slice(-8)}`, `approve_${o.id}`)]);
        buttons.push([Markup.button.callback(`❌ Reject ${o.id.slice(-8)}`, `reject_${o.id}`)]);
    });
    buttons.push([Markup.button.callback('🔙 Kembali', 'admin_panel')]);
    
    await ctx.replyWithHTML(message, Markup.inlineKeyboard(buttons));
});

// ============ BROADCAST ============
bot.action('admin_broadcast', async (ctx) => {
    await ctx.answerCbQuery();
    if (!isAdmin(ctx.from.id)) return;
    await ctx.reply('📨 Kirim pesan broadcast yang akan dikirim ke semua user.\nKetik /cancel untuk batal.');
    ctx.session.adminAction = 'waiting_broadcast';
});

// ============ STATISTIK ============
bot.action('admin_stats', async (ctx) => {
    await ctx.answerCbQuery();
    if (!isAdmin(ctx.from.id)) return;
    const db = readDB();
    const orders = db.orders;
    const totalRevenue = orders.reduce((s, o) => s + o.totalPrice, 0);
    const pending = orders.filter(o => o.status === 'pending').length;
    const processing = orders.filter(o => o.status === 'processing').length;
    const completed = orders.filter(o => o.status === 'completed').length;
    
    const message = `📊 *STATISTIK BOT*\n\n👥 User: ${db.users.length}\n📦 Produk: ${db.products.length}\n━━━━━━━━━━━━━━━\n📝 *ORDER*\nTotal: ${orders.length}\n⏳ Pending: ${pending}\n🔄 Diproses: ${processing}\n✅ Selesai: ${completed}\n━━━━━━━━━━━━━━━\n💰 Revenue: ${formatRupiah(totalRevenue)}\n📊 Rata-rata: ${formatRupiah(orders.length ? totalRevenue / orders.length : 0)}`;
    
    await ctx.replyWithHTML(message, Markup.inlineKeyboard([[Markup.button.callback('🔄 Refresh', 'admin_stats')], [Markup.button.callback('🔙 Kembali', 'admin_panel')]]));
});

// ============ APPROVE/REJECT ORDER ============
bot.action(/approve_(.+)/, async (ctx) => {
    await ctx.answerCbQuery();
    if (!isAdmin(ctx.from.id)) return;
    const orderId = ctx.match[1];
    const db = readDB();
    const order = db.orders.find(o => o.id === orderId);
    
    if (!order) {
        await ctx.reply('Order tidak ditemukan');
        return;
    }
    
    db.orders = db.orders.map(o => o.id === orderId ? { ...o, status: 'processing' } : o);
    writeDB(db);
    
    // Kirim file jika ada
    const product = db.products.find(p => p.id === order.productId);
    if (product && product.file_id) {
        try {
            if (product.file_type === 'photo') await ctx.telegram.sendPhoto(order.userId, product.file_id, { caption: `✅ Order ${orderId} disetujui!\n📦 ${order.productName}` });
            else if (product.file_type === 'video') await ctx.telegram.sendVideo(order.userId, product.file_id, { caption: `✅ Order ${orderId} disetujui!` });
            else if (product.file_type === 'document') await ctx.telegram.sendDocument(order.userId, product.file_id, { caption: `✅ Order ${orderId} disetujui!` });
        } catch (e) {}
    }
    
    await ctx.telegram.sendMessage(order.userId, `✅ *ORDER DISETUJUI!*\n\n🆔 ${orderId}\n📦 ${order.productName} x${order.quantity}\n💰 ${formatRupiah(order.totalPrice)}\n\n📌 Status: Diproses`, { parse_mode: 'Markdown' });
    await ctx.reply(`✅ Order ${orderId} diapprove.`);
});

bot.action(/reject_(.+)/, async (ctx) => {
    await ctx.answerCbQuery();
    if (!isAdmin(ctx.from.id)) return;
    const orderId = ctx.match[1];
    const db = readDB();
    const order = db.orders.find(o => o.id === orderId);
    
    if (!order) {
        await ctx.reply('Order tidak ditemukan');
        return;
    }
    
    db.orders = db.orders.map(o => o.id === orderId ? { ...o, status: 'cancelled' } : o);
    // Kembalikan stok
    const product = db.products.find(p => p.id === order.productId);
    if (product) product.stock += order.quantity;
    writeDB(db);
    
    await ctx.telegram.sendMessage(order.userId, `❌ *ORDER DITOLAK*\n\n🆔 ${orderId}\nMohon hubungi admin.`, { parse_mode: 'Markdown' });
    await ctx.reply(`❌ Order ${orderId} ditolak.`);
});

// ============ TEXT HANDLER ============
bot.on('text', async (ctx) => {
    const text = ctx.message.text;
    
    if (text === '/cancel') {
        ctx.session = {};
        await ctx.reply('✅ Dibatalkan.', mainMenuKeyboard);
        return;
    }
    
    // Custom quantity
    if (ctx.session.waitingForCustomQty) {
        const qty = parseInt(text);
        if (!isNaN(qty) && qty > 0 && qty <= 100 && ctx.session.tempOrder) {
            const db = readDB();
            const product = db.products.find(p => p.id === ctx.session.tempOrder.productId);
            if (product && product.stock >= qty) {
                ctx.session.tempOrder.quantity = qty;
                ctx.session.tempOrder.totalPrice = ctx.session.tempOrder.price * qty;
                await ctx.replyWithHTML(`✅ *Ringkasan Order*\n\n📦 ${ctx.session.tempOrder.productName}\n🔢 ${qty}\n💰 ${formatRupiah(ctx.session.tempOrder.totalPrice)}\n\n📝 Masukkan alamat lengkap:`);
                ctx.session.waitingForAddress = true;
                ctx.session.waitingForCustomQty = false;
            } else {
                await ctx.reply(`❌ Stok tidak cukup! Tersisa: ${product ? product.stock : 0}`);
            }
        } else {
            await ctx.reply('❌ Jumlah tidak valid! Masukkan angka 1-100.');
        }
        return;
    }
    
    // Address
    if (ctx.session.waitingForAddress && ctx.session.tempOrder) {
        if (text.length < 10) {
            await ctx.reply('❌ Alamat terlalu pendek. Masukkan alamat lengkap (minimal 10 karakter):');
            return;
        }
        
        const db = readDB();
        const orderId = generateOrderId();
        const newOrder = {
            id: orderId,
            userId: ctx.from.id,
            userName: ctx.from.first_name,
            productId: ctx.session.tempOrder.productId,
            productName: ctx.session.tempOrder.productName,
            quantity: ctx.session.tempOrder.quantity,
            price: ctx.session.tempOrder.price,
            totalPrice: ctx.session.tempOrder.totalPrice,
            address: text,
            status: 'pending',
            createdAt: new Date().toISOString()
        };
        
        db.orders.push(newOrder);
        
        // Update stok
        const product = db.products.find(p => p.id === ctx.session.tempOrder.productId);
        if (product) product.stock -= ctx.session.tempOrder.quantity;
        
        // Update user stats
        const user = db.users.find(u => u.id === ctx.from.id);
        if (user) {
            user.total_orders = (user.total_orders || 0) + 1;
            user.total_spent = (user.total_spent || 0) + ctx.session.tempOrder.totalPrice;
        }
        
        writeDB(db);
        
        await ctx.replyWithHTML(`✅ *ORDER BERHASIL!*\n\n🆔 ${orderId}\n📦 ${newOrder.productName} x${newOrder.quantity}\n💰 ${formatRupiah(newOrder.totalPrice)}\n📝 Alamat: ${text}\n\n📌 Status: ${getStatusBadge('pending')} Menunggu Konfirmasi\n\n⏳ Silakan tunggu konfirmasi dari admin.`, Markup.inlineKeyboard([[Markup.button.callback('📊 Cek Order', 'check_order')], [Markup.button.callback('🏠 Menu Utama', 'back_to_menu')]]));
        
        // Notifikasi admin
        const adminId = process.env.ADMIN_ID;
        if (adminId) {
            await ctx.telegram.sendMessage(adminId, `🆕 *ORDER BARU!*\n\n🆔 ${orderId}\n👤 ${ctx.from.first_name}\n📦 ${newOrder.productName} x${newOrder.quantity}\n💰 ${formatRupiah(newOrder.totalPrice)}\n📝 ${text}`, { parse_mode: 'Markdown' });
        }
        
        ctx.session.tempOrder = null;
        ctx.session.waitingForAddress = false;
        return;
    }
    
    // Admin actions
    if (ctx.session.adminAction && isAdmin(ctx.from.id)) {
        const db = readDB();
        
        if (ctx.session.adminAction === 'waiting_add_product') {
            const parts = text.split('|');
            if (parts.length >= 4) {
                const newId = Math.max(...db.products.map(p => p.id), 0) + 1;
                db.products.push({ id: newId, name: parts[0].trim(), price: parseInt(parts[1]), stock: parseInt(parts[2]), description: parts[3].trim(), file_id: null, file_type: null });
                writeDB(db);
                await ctx.reply(`✅ Produk "${parts[0].trim()}" ditambahkan!`);
            } else {
                await ctx.reply('❌ Format salah! Gunakan: `nama|harga|stok|deskripsi`');
            }
            delete ctx.session.adminAction;
        }
        else if (ctx.session.adminAction === 'waiting_edit_stock') {
            const [id, stock] = text.split(' ');
            const product = db.products.find(p => p.id === parseInt(id));
            if (product) {
                product.stock = parseInt(stock);
                writeDB(db);
                await ctx.reply(`✅ Stok "${product.name}" menjadi ${stock}`);
            } else {
                await ctx.reply('❌ Produk tidak ditemukan!');
            }
            delete ctx.session.adminAction;
        }
        else if (ctx.session.adminAction === 'waiting_edit_price') {
            const [id, price] = text.split(' ');
            const product = db.products.find(p => p.id === parseInt(id));
            if (product) {
                product.price = parseInt(price);
                writeDB(db);
                await ctx.reply(`✅ Harga "${product.name}" menjadi ${formatRupiah(parseInt(price))}`);
            } else {
                await ctx.reply('❌ Produk tidak ditemukan!');
            }
            delete ctx.session.adminAction;
        }
        else if (ctx.session.adminAction === 'waiting_upload_file_product') {
            const productId = parseInt(text);
            const product = db.products.find(p => p.id === productId);
            if (product) {
                ctx.session.uploadProductId = productId;
                await ctx.reply(`✅ Produk "${product.name}" dipilih. Sekarang kirimkan file-nya (gambar/video/dokumen):`);
                ctx.session.adminAction = 'waiting_upload_file';
            } else {
                await ctx.reply('❌ Produk tidak ditemukan!');
                delete ctx.session.adminAction;
            }
        }
        else if (ctx.session.adminAction === 'waiting_delete_product') {
            const productId = parseInt(text);
            const index = db.products.findIndex(p => p.id === productId);
            if (index !== -1) {
                const name = db.products[index].name;
                db.products.splice(index, 1);
                writeDB(db);
                await ctx.reply(`✅ Produk "${name}" dihapus!`);
            } else {
                await ctx.reply('❌ Produk tidak ditemukan!');
            }
            delete ctx.session.adminAction;
        }
        else if (ctx.session.adminAction === 'waiting_broadcast') {
            const db = readDB();
            let success = 0, failed = 0;
            await ctx.reply(`⏳ Mengirim broadcast ke ${db.users.length} user...`);
            for (const user of db.users) {
                try {
                    await ctx.telegram.sendMessage(user.id, text, { parse_mode: 'Markdown' });
                    success++;
                } catch (e) { failed++; }
                await new Promise(r => setTimeout(r, 50));
            }
            await ctx.reply(`✅ Broadcast selesai!\n📨 Berhasil: ${success}\n❌ Gagal: ${failed}`);
            delete ctx.session.adminAction;
        }
        return;
    }
});

// ============ FILE HANDLER ============
bot.on(['photo', 'video', 'document'], async (ctx) => {
    if (ctx.session.adminAction === 'waiting_upload_file' && ctx.session.uploadProductId && isAdmin(ctx.from.id)) {
        const db = readDB();
        const product = db.products.find(p => p.id === ctx.session.uploadProductId);
        
        if (product) {
            let fileId = null, fileType = null;
            if (ctx.message.photo) {
                fileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
                fileType = 'photo';
            } else if (ctx.message.video) {
                fileId = ctx.message.video.file_id;
                fileType = 'video';
            } else if (ctx.message.document) {
                fileId = ctx.message.document.file_id;
                fileType = 'document';
            }
            
            if (fileId) {
                product.file_id = fileId;
                product.file_type = fileType;
                writeDB(db);
                await ctx.reply(`✅ File berhasil diupload untuk produk "${product.name}"`);
            } else {
                await ctx.reply('❌ Gagal upload file.');
            }
        }
        delete ctx.session.adminAction;
        delete ctx.session.uploadProductId;
    } else {
        await ctx.reply('Gunakan menu yang tersedia.', mainMenuKeyboard);
    }
});

// ============ START BOT ============
bot.launch().then(() => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('░█▄█░█▀▀░█▀▄░█░█░█▀▀░█▀█');
    console.log('░█░█░█▀▀░█░█░█░█░▀▀█░█▀█');
    console.log('░▀░▀░▀▀▀░▀▀░░▀▀▀░▀▀▀░▀░▀');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ AUTO ORDER BOT STARTED!');
    console.log(`📅 Time: ${new Date().toLocaleString()}`);
    console.log('🚀 Bot is running...');
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
