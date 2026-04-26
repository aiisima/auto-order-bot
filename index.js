'use strict';

const { Telegraf, Markup, session } = require('telegraf');
const fs   = require('fs');
const path = require('path');
const moment = require('moment');
require('dotenv').config();

// ─────────────────────────────────────────────
//  KONFIGURASI
// ─────────────────────────────────────────────
const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
    console.error('❌  BOT_TOKEN tidak ditemukan di .env');
    process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);
bot.use(session());

// ─────────────────────────────────────────────
//  DATABASE
// ─────────────────────────────────────────────
const DB_PATH = path.join(__dirname, 'database.json');

const DEFAULT_DB = {
    orders:   [],
    users:    [],
    products: [
        { id: 1, name: 'Product Premium A', price: 100000, stock: 10, description: 'Produk premium berkualitas tinggi',    file_id: null, file_type: null },
        { id: 2, name: 'Product Premium B', price: 150000, stock: 5,  description: 'Produk dengan fitur lengkap',          file_id: null, file_type: null },
        { id: 3, name: 'Product Premium C', price: 200000, stock: 8,  description: 'Produk terbaik untuk kebutuhan Anda', file_id: null, file_type: null }
    ],
    settings: { maintenance: false, auto_approve: true }
};

const readDB = () => {
    try {
        if (!fs.existsSync(DB_PATH)) {
            fs.writeFileSync(DB_PATH, JSON.stringify(DEFAULT_DB, null, 2));
            return DEFAULT_DB;
        }
        return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    } catch (e) {
        console.error('DB read error:', e.message);
        return { orders: [], users: [], products: [], settings: {} };
    }
};

const writeDB = (data) => {
    try {
        fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
        return true;
    } catch (e) {
        console.error('DB write error:', e.message);
        return false;
    }
};

// ─────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────
const formatRupiah = (n) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

const formatDate = (d) => moment(d).format('DD/MM/YYYY HH:mm');
const generateId = ()  => `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
const isAdmin    = (id) => process.env.ADMIN_ID && id.toString() === process.env.ADMIN_ID.toString();
const sleep      = (ms) => new Promise(r => setTimeout(r, ms));

const STATUS_BADGE = { pending: '⏳', processing: '🔄', completed: '✅', cancelled: '❌', shipped: '📦' };
const STATUS_TEXT  = { pending: 'Menunggu Konfirmasi', processing: 'Sedang Diproses', completed: 'Selesai', cancelled: 'Dibatalkan', shipped: 'Dikirim' };
const badge = (s) => STATUS_BADGE[s] || '❓';
const stext = (s) => STATUS_TEXT[s]  || s;

// ─────────────────────────────────────────────
//  KEYBOARDS
// ─────────────────────────────────────────────
const KB_MAIN = Markup.inlineKeyboard([
    [Markup.button.callback('🛍️  Auto Order',    'auto_order'),   Markup.button.callback('📊  Cek Order',   'check_order')],
    [Markup.button.callback('📦  Daftar Produk', 'list_products'), Markup.button.callback('📝  Riwayat',     'order_history')],
    [Markup.button.callback('👤  Profil Saya',   'my_profile'),   Markup.button.callback('ℹ️   Info Bot',    'info_bot')]
]);

const KB_BACK_MAIN  = Markup.inlineKeyboard([[Markup.button.callback('🔙  Menu Utama',  'back_to_menu')]]);
const KB_BACK_ADMIN = Markup.inlineKeyboard([[Markup.button.callback('🔙  Panel Admin', 'admin_panel')]]);

// ─────────────────────────────────────────────
//  ENSURE USER
// ─────────────────────────────────────────────
const ensureUser = (db, from) => {
    if (!db.users.find(u => u.id === from.id)) {
        db.users.push({
            id:           from.id,
            first_name:   from.first_name,
            username:     from.username || '',
            joined_at:    new Date().toISOString(),
            total_orders: 0,
            total_spent:  0
        });
    }
};

// ─────────────────────────────────────────────
//  /start
// ─────────────────────────────────────────────
bot.start(async (ctx) => {
    const { id, first_name, username } = ctx.from;
    const db   = readDB();
    ensureUser(db, ctx.from);
    writeDB(db);

    const now  = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
    const img  = process.env.CATBOX_IMAGE_URL || 'https://files.catbox.moe/gs46so.jpg';
    const user = db.users.find(u => u.id === id);

    const caption = `\
┌─────────────────────────────┐
│   🤖  AUTO ORDER BOT         │
└─────────────────────────────┘

👋  Halo, <b>${first_name}</b>!
Selamat datang di sistem pemesanan otomatis.

┌─ INFO AKUN ──────────────────┐
│  🆔  ID       : <code>${id}</code>
│  👤  Nama     : ${first_name}
│  📛  Username : @${username || '-'}
│  🕐  Login    : ${now}
│  📦  Order    : ${user?.total_orders || 0} transaksi
│  💰  Belanja  : ${formatRupiah(user?.total_spent || 0)}
└──────────────────────────────┘

Pilih menu di bawah untuk memulai:`;

    try {
        await ctx.replyWithPhoto(img, { caption, parse_mode: 'HTML', ...KB_MAIN });
    } catch {
        await ctx.reply(caption, { parse_mode: 'HTML', ...KB_MAIN });
    }
});

// ─────────────────────────────────────────────
//  BACK TO MENU
// ─────────────────────────────────────────────
bot.action('back_to_menu', async (ctx) => {
    await ctx.answerCbQuery();
    try { await ctx.deleteMessage(); } catch {}

    const db = readDB();
    const { id, first_name, username } = ctx.from;
    const now  = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
    const user = db.users.find(u => u.id === id);

    const text = `\
┌─────────────────────────────┐
│   🤖  AUTO ORDER BOT         │
└─────────────────────────────┘

👋  Halo, <b>${first_name}</b>!

┌─ INFO AKUN ──────────────────┐
│  🆔  ID       : <code>${id}</code>
│  👤  Nama     : ${first_name}
│  📛  Username : @${username || '-'}
│  🕐  Login    : ${now}
│  📦  Order    : ${user?.total_orders || 0} transaksi
│  💰  Belanja  : ${formatRupiah(user?.total_spent || 0)}
└──────────────────────────────┘

Pilih menu di bawah:`;

    await ctx.replyWithHTML(text, KB_MAIN);
});

// ─────────────────────────────────────────────
//  AUTO ORDER – pilih produk
// ─────────────────────────────────────────────
bot.action('auto_order', async (ctx) => {
    await ctx.answerCbQuery();
    const db       = readDB();
    const products = db.products;

    if (!products.length) return ctx.reply('❌  Belum ada produk tersedia.', KB_BACK_MAIN);

    const lines = products.map((p, i) =>
        `│  ${i + 1}.  <b>${p.name}</b>\n│      💰 ${formatRupiah(p.price)}  •  📦 Stok: ${p.stock}`
    ).join('\n│\n');

    const text = `\
┌─ 🛍️  PILIH PRODUK ──────────┐
${lines}
└──────────────────────────────┘`;

    const buttons = products.map(p => [Markup.button.callback(`🛍️  ${p.name}`, `order_${p.id}`)]);
    buttons.push([Markup.button.callback('🔙  Kembali', 'back_to_menu')]);

    await ctx.replyWithHTML(text, Markup.inlineKeyboard(buttons));
});

// ─────────────────────────────────────────────
//  ORDER – detail & qty
// ─────────────────────────────────────────────
bot.action(/^order_(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const productId = parseInt(ctx.match[1]);
    const db        = readDB();
    const product   = db.products.find(p => p.id === productId);

    if (!product)           return ctx.reply('❌  Produk tidak ditemukan!');
    if (product.stock <= 0) return ctx.reply('❌  Stok produk ini habis!');

    ctx.session = ctx.session || {};
    ctx.session.tempOrder = {
        productId:   product.id,
        productName: product.name,
        price:       product.price,
        file_id:     product.file_id,
        file_type:   product.file_type
    };

    const maxQty = Math.min(product.stock, 100);
    const text   = `\
┌─ 📦  DETAIL PRODUK ──────────┐
│  <b>${product.name}</b>
│
│  💰  Harga    : ${formatRupiah(product.price)}
│  📦  Stok     : ${product.stock}
│  📝  Deskripsi: ${product.description}
└──────────────────────────────┘

Pilih jumlah pesanan (maks ${maxQty}):`;

    await ctx.replyWithHTML(text, Markup.inlineKeyboard([
        [Markup.button.callback('1', 'qty_1'), Markup.button.callback('2', 'qty_2'), Markup.button.callback('3', 'qty_3')],
        [Markup.button.callback('4', 'qty_4'), Markup.button.callback('5', 'qty_5'), Markup.button.callback('🔢  Custom', 'qty_custom')],
        [Markup.button.callback('❌  Batal', 'cancel_order')]
    ]));
});

bot.action(/^qty_(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const qty = parseInt(ctx.match[1]);
    if (!ctx.session?.tempOrder) return ctx.reply('❌  Sesi habis. Silakan order ulang.', KB_BACK_MAIN);

    const db      = readDB();
    const product = db.products.find(p => p.id === ctx.session.tempOrder.productId);
    if (!product || product.stock < qty)
        return ctx.reply(`❌  Stok tidak cukup! Tersisa: ${product?.stock ?? 0}`);

    ctx.session.tempOrder.quantity   = qty;
    ctx.session.tempOrder.totalPrice = ctx.session.tempOrder.price * qty;
    ctx.session.waitingForAddress    = true;

    const text = `\
┌─ 📋  RINGKASAN ORDER ────────┐
│  📦  ${ctx.session.tempOrder.productName}
│  🔢  Jumlah   : ${qty}
│  💰  Total    : ${formatRupiah(ctx.session.tempOrder.totalPrice)}
└──────────────────────────────┘

📍  Kirimkan <b>alamat lengkap</b> Anda:`;

    await ctx.replyWithHTML(text, Markup.inlineKeyboard([[Markup.button.callback('❌  Batal', 'cancel_order')]]));
});

bot.action('qty_custom', async (ctx) => {
    await ctx.answerCbQuery();
    ctx.session = ctx.session || {};
    ctx.session.waitingForCustomQty = true;
    await ctx.reply('📝  Ketik jumlah yang diinginkan (1–100):',
        Markup.inlineKeyboard([[Markup.button.callback('❌  Batal', 'cancel_order')]]));
});

bot.action('cancel_order', async (ctx) => {
    await ctx.answerCbQuery();
    ctx.session = {};
    await ctx.reply('❌  Order dibatalkan.', KB_BACK_MAIN);
});

// ─────────────────────────────────────────────
//  CEK ORDER
// ─────────────────────────────────────────────
bot.action('check_order', async (ctx) => {
    await ctx.answerCbQuery();
    const db     = readDB();
    const orders = db.orders.filter(o => o.userId === ctx.from.id);

    if (!orders.length) {
        return ctx.reply('📭  Belum ada order. Yuk mulai belanja!',
            Markup.inlineKeyboard([
                [Markup.button.callback('🛍️  Order Sekarang', 'auto_order')],
                [Markup.button.callback('🔙  Kembali', 'back_to_menu')]
            ])
        );
    }

    const pending    = orders.filter(o => o.status === 'pending').length;
    const processing = orders.filter(o => o.status === 'processing').length;
    const completed  = orders.filter(o => o.status === 'completed').length;
    const cancelled  = orders.filter(o => o.status === 'cancelled').length;

    const recent = [...orders].reverse().slice(0, 3).map(o =>
        `│  ${badge(o.status)}  <b>${o.productName}</b> x${o.quantity}\n│      💰 ${formatRupiah(o.totalPrice)}  •  ${stext(o.status)}\n│      🆔 <code>${o.id}</code>`
    ).join('\n│\n');

    const text = `\
┌─ 📊  STATUS ORDER ───────────┐
│  📝  Total      : ${orders.length}
│  ⏳  Pending    : ${pending}
│  🔄  Diproses   : ${processing}
│  ✅  Selesai    : ${completed}
│  ❌  Dibatalkan : ${cancelled}
├─ 3 ORDER TERBARU ────────────┤
${recent}
└──────────────────────────────┘`;

    await ctx.replyWithHTML(text, Markup.inlineKeyboard([
        [Markup.button.callback('📝  Riwayat Lengkap', 'order_history')],
        [Markup.button.callback('🔙  Kembali', 'back_to_menu')]
    ]));
});

// ─────────────────────────────────────────────
//  RIWAYAT ORDER
// ─────────────────────────────────────────────
bot.action('order_history', async (ctx) => {
    await ctx.answerCbQuery();
    const db     = readDB();
    const orders = db.orders.filter(o => o.userId === ctx.from.id);

    if (!orders.length) return ctx.reply('📭  Belum ada riwayat order.', KB_BACK_MAIN);

    const items = [...orders].reverse().map((o, i) =>
        `│  ${i + 1}.  ${badge(o.status)} <b>${o.productName}</b> x${o.quantity}\n│      💰 ${formatRupiah(o.totalPrice)}  •  ${stext(o.status)}\n│      ⏰ ${formatDate(o.createdAt)}\n│      🆔 <code>${o.id}</code>`
    ).join('\n│\n');

    const text = `\
┌─ 📝  RIWAYAT ORDER ──────────┐
${items}
└──────────────────────────────┘`;

    await ctx.replyWithHTML(text, KB_BACK_MAIN);
});

// ─────────────────────────────────────────────
//  DAFTAR PRODUK
// ─────────────────────────────────────────────
bot.action('list_products', async (ctx) => {
    await ctx.answerCbQuery();
    const db       = readDB();
    const products = db.products;

    if (!products.length) return ctx.reply('📭  Belum ada produk.', KB_BACK_MAIN);

    const items = products.map((p, i) =>
        `│  ${i + 1}.  <b>${p.name}</b>\n│      💰 ${formatRupiah(p.price)}  •  📦 Stok: ${p.stock}\n│      📝 ${p.description}`
    ).join('\n│\n');

    const text = `\
┌─ 📦  DAFTAR PRODUK ──────────┐
${items}
└──────────────────────────────┘`;

    const buttons = products.map(p => [Markup.button.callback(`🛍️  Beli ${p.name}`, `order_${p.id}`)]);
    buttons.push([Markup.button.callback('🔙  Kembali', 'back_to_menu')]);

    await ctx.replyWithHTML(text, Markup.inlineKeyboard(buttons));
});

// ─────────────────────────────────────────────
//  PROFIL SAYA
// ─────────────────────────────────────────────
bot.action('my_profile', async (ctx) => {
    await ctx.answerCbQuery();
    const db = readDB();
    ensureUser(db, ctx.from);
    writeDB(db);
    const u = db.users.find(u => u.id === ctx.from.id);

    const text = `\
┌─ 👤  PROFIL SAYA ────────────┐
│  🆔  User ID    : <code>${u.id}</code>
│  👤  Nama       : ${u.first_name}
│  📛  Username   : @${u.username || '-'}
│  📅  Bergabung  : ${formatDate(u.joined_at)}
├─ 📊  STATISTIK ──────────────┤
│  📦  Total Order   : ${u.total_orders || 0}
│  💰  Total Belanja : ${formatRupiah(u.total_spent || 0)}
└──────────────────────────────┘`;

    const buttons = [[Markup.button.callback('📝  Riwayat Order', 'order_history')]];
    if (isAdmin(ctx.from.id)) buttons.push([Markup.button.callback('⚙️  Panel Admin', 'admin_panel')]);
    buttons.push([Markup.button.callback('🔙  Kembali', 'back_to_menu')]);

    await ctx.replyWithHTML(text, Markup.inlineKeyboard(buttons));
});

// ─────────────────────────────────────────────
//  INFO BOT
// ─────────────────────────────────────────────
bot.action('info_bot', async (ctx) => {
    await ctx.answerCbQuery();
    const db      = readDB();
    const revenue = db.orders.reduce((s, o) => s + o.totalPrice, 0);
    const now     = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });

    const text = `\
┌─ ℹ️   INFO BOT ───────────────┐
│  🤖  AUTO ORDER BOT
│  🖥️   Platform : Node.js / Telegraf
│  🕐  Runtime   : ${now}
├─ 📊  STATISTIK ──────────────┤
│  👥  Total User    : ${db.users.length}
│  📦  Total Order   : ${db.orders.length}
│  💰  Total Revenue : ${formatRupiah(revenue)}
│  🗂️   Produk Aktif  : ${db.products.length}
├─ 🔗  DEVELOPER ──────────────┤
│  📡  t.me/AiiSimaRajaIblis
│  © Medusa
└──────────────────────────────┘`;

    await ctx.replyWithHTML(text, KB_BACK_MAIN);
});

// ─────────────────────────────────────────────
//  ADMIN PANEL
// ─────────────────────────────────────────────
bot.action('admin_panel', async (ctx) => {
    await ctx.answerCbQuery();
    if (!isAdmin(ctx.from.id)) return ctx.reply('⛔  Akses ditolak!');

    const db      = readDB();
    const revenue = db.orders.reduce((s, o) => s + o.totalPrice, 0);
    const pending = db.orders.filter(o => o.status === 'pending').length;

    const text = `\
┌─ ⚙️   PANEL ADMINISTRATOR ────┐
│  👥  User       : ${db.users.length}
│  📦  Order      : ${db.orders.length}
│  ⏳  Pending    : ${pending}
│  💰  Revenue    : ${formatRupiah(revenue)}
│  🗂️   Produk     : ${db.products.length}
└──────────────────────────────┘`;

    await ctx.replyWithHTML(text, Markup.inlineKeyboard([
        [Markup.button.callback('📦  Kelola Produk', 'admin_products'), Markup.button.callback('📝  Kelola Order',  'admin_orders')],
        [Markup.button.callback('👥  Daftar User',   'admin_users'),   Markup.button.callback('📊  Statistik',     'admin_stats')],
        [Markup.button.callback('📨  Broadcast',     'admin_broadcast')],
        [Markup.button.callback('🔙  Menu Utama',    'back_to_menu')]
    ]));
});

// ─────────────────────────────────────────────
//  ADMIN – KELOLA PRODUK
// ─────────────────────────────────────────────
bot.action('admin_products', async (ctx) => {
    await ctx.answerCbQuery();
    if (!isAdmin(ctx.from.id)) return;
    const db       = readDB();
    const products = db.products;

    const items = products.length
        ? products.map(p => `│  [${p.id}]  ${p.name}  •  ${formatRupiah(p.price)}  •  Stok: ${p.stock}`).join('\n')
        : '│  (belum ada produk)';

    const text = `\
┌─ 📦  KELOLA PRODUK ──────────┐
${items}
└──────────────────────────────┘`;

    await ctx.replyWithHTML(text, Markup.inlineKeyboard([
        [Markup.button.callback('➕  Tambah',     'admin_add_product'),   Markup.button.callback('✏️   Edit Stok',   'admin_edit_stock')],
        [Markup.button.callback('💰  Edit Harga', 'admin_edit_price'),   Markup.button.callback('📎  Upload File', 'admin_upload_file')],
        [Markup.button.callback('❌  Hapus',      'admin_delete_product')],
        [Markup.button.callback('🔙  Panel Admin', 'admin_panel')]
    ]));
});

bot.action('admin_add_product', async (ctx) => {
    await ctx.answerCbQuery();
    if (!isAdmin(ctx.from.id)) return;
    await ctx.reply(
        '📝  Format: <code>nama|harga|stok|deskripsi</code>\n\nContoh:\n<code>Product X|250000|10|Deskripsi produk X</code>',
        { parse_mode: 'HTML' }
    );
    ctx.session = ctx.session || {};
    ctx.session.adminAction = 'waiting_add_product';
});

bot.action('admin_edit_stock', async (ctx) => {
    await ctx.answerCbQuery();
    if (!isAdmin(ctx.from.id)) return;
    const db   = readDB();
    const list = db.products.map(p => `[${p.id}]  ${p.name}  →  Stok: ${p.stock}`).join('\n');
    await ctx.reply(`📦  Edit Stok\n\n${list}\n\nKirim: <code>id_produk stok_baru</code>\nContoh: <code>1 50</code>`, { parse_mode: 'HTML' });
    ctx.session = ctx.session || {};
    ctx.session.adminAction = 'waiting_edit_stock';
});

bot.action('admin_edit_price', async (ctx) => {
    await ctx.answerCbQuery();
    if (!isAdmin(ctx.from.id)) return;
    const db   = readDB();
    const list = db.products.map(p => `[${p.id}]  ${p.name}  →  ${formatRupiah(p.price)}`).join('\n');
    await ctx.reply(`💰  Edit Harga\n\n${list}\n\nKirim: <code>id_produk harga_baru</code>\nContoh: <code>1 200000</code>`, { parse_mode: 'HTML' });
    ctx.session = ctx.session || {};
    ctx.session.adminAction = 'waiting_edit_price';
});

bot.action('admin_upload_file', async (ctx) => {
    await ctx.answerCbQuery();
    if (!isAdmin(ctx.from.id)) return;
    const db   = readDB();
    const list = db.products.map(p => `[${p.id}]  ${p.name}`).join('\n');
    await ctx.reply(`📎  Upload File ke Produk\n\n${list}\n\nKirim ID produk:`, { parse_mode: 'HTML' });
    ctx.session = ctx.session || {};
    ctx.session.adminAction = 'waiting_upload_file_product';
});

bot.action('admin_delete_product', async (ctx) => {
    await ctx.answerCbQuery();
    if (!isAdmin(ctx.from.id)) return;
    const db   = readDB();
    const list = db.products.map(p => `[${p.id}]  ${p.name}`).join('\n');
    await ctx.reply(`❌  Hapus Produk\n\n${list}\n\nKirim ID produk yang akan dihapus:`, { parse_mode: 'HTML' });
    ctx.session = ctx.session || {};
    ctx.session.adminAction = 'waiting_delete_product';
});

// ─────────────────────────────────────────────
//  ADMIN – KELOLA ORDER
// ─────────────────────────────────────────────
bot.action('admin_orders', async (ctx) => {
    await ctx.answerCbQuery();
    if (!isAdmin(ctx.from.id)) return;
    const db      = readDB();
    const pending = db.orders.filter(o => o.status === 'pending');

    if (!pending.length) return ctx.reply('✅  Tidak ada pending order.', KB_BACK_ADMIN);

    const items = pending.slice(0, 10).map((o, i) =>
        `│  ${i + 1}.  🆔 <code>${o.id.slice(-12)}</code>\n│      👤 ${o.userName}\n│      📦 ${o.productName} x${o.quantity}\n│      💰 ${formatRupiah(o.totalPrice)}\n│      ⏰ ${formatDate(o.createdAt)}`
    ).join('\n│\n');

    const text = `\
┌─ ⏳  PENDING ORDERS (${pending.length}) ──────┐
${items}
└──────────────────────────────┘`;

    const buttons = [];
    pending.slice(0, 5).forEach(o => {
        buttons.push([
            Markup.button.callback(`✅ ${o.id.slice(-10)}`, `approve_${o.id}`),
            Markup.button.callback(`❌ ${o.id.slice(-10)}`, `reject_${o.id}`)
        ]);
    });
    buttons.push([Markup.button.callback('🔙  Panel Admin', 'admin_panel')]);

    await ctx.replyWithHTML(text, Markup.inlineKeyboard(buttons));
});

// ─────────────────────────────────────────────
//  ADMIN – DAFTAR USER
// ─────────────────────────────────────────────
bot.action('admin_users', async (ctx) => {
    await ctx.answerCbQuery();
    if (!isAdmin(ctx.from.id)) return;
    const db    = readDB();
    const users = db.users;

    const items = users.slice(0, 20).map((u, i) =>
        `│  ${i + 1}.  👤 ${u.first_name}  (@${u.username || '-'})\n│      🆔 <code>${u.id}</code>  •  Order: ${u.total_orders || 0}  •  ${formatRupiah(u.total_spent || 0)}`
    ).join('\n│\n');

    const text = `\
┌─ 👥  DAFTAR USER (${users.length}) ──────────┐
${items || '│  (belum ada user)'}
└──────────────────────────────┘`;

    await ctx.replyWithHTML(text, Markup.inlineKeyboard([
        [Markup.button.callback('📨  Broadcast', 'admin_broadcast')],
        [Markup.button.callback('🔙  Panel Admin', 'admin_panel')]
    ]));
});

// ─────────────────────────────────────────────
//  ADMIN – BROADCAST
// ─────────────────────────────────────────────
bot.action('admin_broadcast', async (ctx) => {
    await ctx.answerCbQuery();
    if (!isAdmin(ctx.from.id)) return;
    await ctx.reply('📨  Kirim pesan broadcast (mendukung HTML).\n\nKetik /cancel untuk batal:');
    ctx.session = ctx.session || {};
    ctx.session.adminAction = 'waiting_broadcast';
});

// ─────────────────────────────────────────────
//  ADMIN – STATISTIK
// ─────────────────────────────────────────────
bot.action('admin_stats', async (ctx) => {
    await ctx.answerCbQuery();
    if (!isAdmin(ctx.from.id)) return;
    const db      = readDB();
    const orders  = db.orders;
    const revenue = orders.reduce((s, o) => s + o.totalPrice, 0);
    const avgVal  = orders.length ? revenue / orders.length : 0;

    const perMonth = {};
    orders.forEach(o => {
        const key = formatDate(o.createdAt).slice(3, 10);
        perMonth[key] = (perMonth[key] || 0) + 1;
    });
    const monthLines = Object.entries(perMonth).slice(-6)
        .map(([m, c]) => `│      📅 ${m}: ${c} order`).join('\n') || '│      (belum ada data)';

    const text = `\
┌─ 📊  STATISTIK LENGKAP ──────┐
│  👥  User        : ${db.users.length}
│  🗂️   Produk      : ${db.products.length}
│  📦  Stok Total  : ${db.products.reduce((s, p) => s + p.stock, 0)}
├─ ORDER ──────────────────────┤
│  📝  Total       : ${orders.length}
│  ⏳  Pending     : ${orders.filter(o => o.status === 'pending').length}
│  🔄  Diproses    : ${orders.filter(o => o.status === 'processing').length}
│  ✅  Selesai     : ${orders.filter(o => o.status === 'completed').length}
│  ❌  Dibatalkan  : ${orders.filter(o => o.status === 'cancelled').length}
├─ REVENUE ────────────────────┤
│  💰  Total       : ${formatRupiah(revenue)}
│  📈  Rata-rata   : ${formatRupiah(avgVal)}
├─ ORDER/BULAN (6 terbaru) ────┤
${monthLines}
└──────────────────────────────┘`;

    await ctx.replyWithHTML(text, Markup.inlineKeyboard([
        [Markup.button.callback('🔄  Refresh', 'admin_stats')],
        [Markup.button.callback('🔙  Panel Admin', 'admin_panel')]
    ]));
});

// ─────────────────────────────────────────────
//  APPROVE / REJECT ORDER
// ─────────────────────────────────────────────
bot.action(/^approve_(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    if (!isAdmin(ctx.from.id)) return;
    const orderId = ctx.match[1];
    const db      = readDB();
    const order   = db.orders.find(o => o.id === orderId);
    if (!order) return ctx.reply('❌  Order tidak ditemukan.');

    order.status = 'processing';

    const user = db.users.find(u => u.id === order.userId);
    if (user) {
        user.total_orders = (user.total_orders || 0) + 1;
        user.total_spent  = (user.total_spent  || 0) + order.totalPrice;
    }

    writeDB(db);

    // Kirim file ke user jika ada
    const product = db.products.find(p => p.id === order.productId);
    if (product?.file_id) {
        try {
            const caption = `📎  File untuk Order <code>${orderId}</code>\n📦  ${order.productName}`;
            if      (product.file_type === 'photo')    await ctx.telegram.sendPhoto(order.userId, product.file_id, { caption, parse_mode: 'HTML' });
            else if (product.file_type === 'video')    await ctx.telegram.sendVideo(order.userId, product.file_id, { caption, parse_mode: 'HTML' });
            else if (product.file_type === 'document') await ctx.telegram.sendDocument(order.userId, product.file_id, { caption, parse_mode: 'HTML' });
        } catch {}
    }

    const notif = `\
✅  <b>ORDER DISETUJUI!</b>

┌─ DETAIL ORDER ───────────────┐
│  🆔  <code>${orderId}</code>
│  📦  ${order.productName} x${order.quantity}
│  💰  ${formatRupiah(order.totalPrice)}
│  📌  Sedang Diproses 🔄
└──────────────────────────────┘

Terima kasih sudah berbelanja! 🛍️`;

    await ctx.telegram.sendMessage(order.userId, notif, { parse_mode: 'HTML' });
    await ctx.reply(`✅  Order <code>${orderId}</code> diapprove.`, { parse_mode: 'HTML' });
});

bot.action(/^reject_(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    if (!isAdmin(ctx.from.id)) return;
    const orderId = ctx.match[1];
    const db      = readDB();
    const order   = db.orders.find(o => o.id === orderId);
    if (!order) return ctx.reply('❌  Order tidak ditemukan.');

    order.status = 'cancelled';

    const product = db.products.find(p => p.id === order.productId);
    if (product) product.stock += order.quantity;

    writeDB(db);

    await ctx.telegram.sendMessage(order.userId,
        `❌  <b>ORDER DITOLAK</b>\n\n🆔  <code>${orderId}</code>\n\nMohon hubungi admin untuk informasi lebih lanjut.`,
        { parse_mode: 'HTML' }
    );
    await ctx.reply(`❌  Order <code>${orderId}</code> ditolak.`, { parse_mode: 'HTML' });
});

// ─────────────────────────────────────────────
//  TEXT HANDLER
// ─────────────────────────────────────────────
bot.on('text', async (ctx) => {
    const text = ctx.message.text.trim();
    ctx.session = ctx.session || {};

    // /cancel
    if (text === '/cancel') {
        ctx.session = {};
        return ctx.reply('✅  Dibatalkan.', KB_BACK_MAIN);
    }

    // ── Custom qty ──────────────────────────
    if (ctx.session.waitingForCustomQty) {
        const qty = parseInt(text);
        if (!ctx.session.tempOrder || isNaN(qty) || qty < 1 || qty > 100)
            return ctx.reply('❌  Jumlah tidak valid! Masukkan angka 1–100.');

        const db      = readDB();
        const product = db.products.find(p => p.id === ctx.session.tempOrder.productId);
        if (!product || product.stock < qty)
            return ctx.reply(`❌  Stok tidak cukup! Tersisa: ${product?.stock ?? 0}`);

        ctx.session.tempOrder.quantity   = qty;
        ctx.session.tempOrder.totalPrice = ctx.session.tempOrder.price * qty;
        ctx.session.waitingForCustomQty  = false;
        ctx.session.waitingForAddress    = true;

        const txt = `\
┌─ 📋  RINGKASAN ORDER ────────┐
│  📦  ${ctx.session.tempOrder.productName}
│  🔢  Jumlah   : ${qty}
│  💰  Total    : ${formatRupiah(ctx.session.tempOrder.totalPrice)}
└──────────────────────────────┘

📍  Kirimkan <b>alamat lengkap</b> Anda:`;

        return ctx.replyWithHTML(txt, Markup.inlineKeyboard([[Markup.button.callback('❌  Batal', 'cancel_order')]]));
    }

    // ── Alamat pengiriman ───────────────────
    if (ctx.session.waitingForAddress && ctx.session.tempOrder) {
        if (text.length < 10)
            return ctx.reply('❌  Alamat terlalu pendek (min. 10 karakter). Coba lagi:');

        const db      = readDB();
        const orderId = generateId();
        const order   = {
            id:          orderId,
            userId:      ctx.from.id,
            userName:    ctx.from.first_name,
            productId:   ctx.session.tempOrder.productId,
            productName: ctx.session.tempOrder.productName,
            quantity:    ctx.session.tempOrder.quantity,
            price:       ctx.session.tempOrder.price,
            totalPrice:  ctx.session.tempOrder.totalPrice,
            address:     text,
            status:      'pending',
            createdAt:   new Date().toISOString()
        };

        db.orders.push(order);

        const product = db.products.find(p => p.id === order.productId);
        if (product) product.stock -= order.quantity;

        writeDB(db);
        ctx.session = {};

        const confirm = `\
✅  <b>ORDER BERHASIL DIBUAT!</b>

┌─ DETAIL ORDER ───────────────┐
│  🆔  <code>${orderId}</code>
│  📦  ${order.productName} x${order.quantity}
│  💰  ${formatRupiah(order.totalPrice)}
│  📍  ${text}
│  📌  ${badge('pending')}  ${stext('pending')}
└──────────────────────────────┘

⏳  Menunggu konfirmasi dari admin.`;

        await ctx.replyWithHTML(confirm, Markup.inlineKeyboard([
            [Markup.button.callback('📊  Cek Order', 'check_order')],
            [Markup.button.callback('🏠  Menu Utama', 'back_to_menu')]
        ]));

        if (process.env.ADMIN_ID) {
            await ctx.telegram.sendMessage(
                process.env.ADMIN_ID,
                `🆕  <b>ORDER BARU!</b>\n\n🆔  <code>${orderId}</code>\n👤  ${ctx.from.first_name} (<code>${ctx.from.id}</code>)\n📦  ${order.productName} x${order.quantity}\n💰  ${formatRupiah(order.totalPrice)}\n📍  ${text}`,
                { parse_mode: 'HTML' }
            );
        }
        return;
    }

    // ── Admin actions ───────────────────────
    if (ctx.session.adminAction && isAdmin(ctx.from.id)) {
        const db = readDB();

        switch (ctx.session.adminAction) {

            case 'waiting_add_product': {
                const parts = text.split('|');
                if (parts.length < 4) {
                    await ctx.reply('❌  Format salah!\nGunakan: <code>nama|harga|stok|deskripsi</code>', { parse_mode: 'HTML' });
                    break;
                }
                const [name, price, stock, desc] = parts.map(s => s.trim());
                const newId = Math.max(...db.products.map(p => p.id), 0) + 1;
                db.products.push({ id: newId, name, price: parseInt(price), stock: parseInt(stock), description: desc, file_id: null, file_type: null });
                writeDB(db);
                await ctx.reply(`✅  Produk "<b>${name}</b>" berhasil ditambahkan!`, { parse_mode: 'HTML' });
                delete ctx.session.adminAction;
                break;
            }

            case 'waiting_edit_stock': {
                const [id, stock] = text.split(' ');
                const p = db.products.find(p => p.id === parseInt(id));
                if (!p) { await ctx.reply('❌  Produk tidak ditemukan!'); break; }
                p.stock = parseInt(stock);
                writeDB(db);
                await ctx.reply(`✅  Stok "<b>${p.name}</b>" → ${stock}`, { parse_mode: 'HTML' });
                delete ctx.session.adminAction;
                break;
            }

            case 'waiting_edit_price': {
                const [id, price] = text.split(' ');
                const p = db.products.find(p => p.id === parseInt(id));
                if (!p) { await ctx.reply('❌  Produk tidak ditemukan!'); break; }
                p.price = parseInt(price);
                writeDB(db);
                await ctx.reply(`✅  Harga "<b>${p.name}</b>" → ${formatRupiah(parseInt(price))}`, { parse_mode: 'HTML' });
                delete ctx.session.adminAction;
                break;
            }

            case 'waiting_upload_file_product': {
                const pid = parseInt(text);
                const p   = db.products.find(p => p.id === pid);
                if (!p) {
                    await ctx.reply('❌  Produk tidak ditemukan!');
                    delete ctx.session.adminAction;
                    break;
                }
                ctx.session.uploadProductId = pid;
                ctx.session.adminAction     = 'waiting_upload_file';
                await ctx.reply(`✅  Produk "<b>${p.name}</b>" dipilih.\nSekarang kirimkan file (gambar/video/dokumen):`, { parse_mode: 'HTML' });
                break;
            }

            case 'waiting_delete_product': {
                const pid   = parseInt(text);
                const index = db.products.findIndex(p => p.id === pid);
                if (index === -1) { await ctx.reply('❌  Produk tidak ditemukan!'); break; }
                const name = db.products[index].name;
                db.products.splice(index, 1);
                writeDB(db);
                await ctx.reply(`✅  Produk "<b>${name}</b>" dihapus.`, { parse_mode: 'HTML' });
                delete ctx.session.adminAction;
                break;
            }

            case 'waiting_broadcast': {
                let ok = 0, fail = 0;
                await ctx.reply(`⏳  Mengirim ke ${db.users.length} user...`);
                for (const u of db.users) {
                    try {
                        await ctx.telegram.sendMessage(u.id, text, { parse_mode: 'HTML' });
                        ok++;
                    } catch { fail++; }
                    await sleep(60);
                }
                await ctx.reply(`✅  Broadcast selesai!\n📨  Berhasil: ${ok}\n❌  Gagal: ${fail}`);
                delete ctx.session.adminAction;
                break;
            }
        }
        return;
    }

    // Fallback
    await ctx.reply('👋  Gunakan tombol menu untuk memulai.', KB_BACK_MAIN);
});

// ─────────────────────────────────────────────
//  FILE HANDLER
// ─────────────────────────────────────────────
bot.on(['photo', 'video', 'document'], async (ctx) => {
    ctx.session = ctx.session || {};

    if (ctx.session.adminAction === 'waiting_upload_file' && ctx.session.uploadProductId && isAdmin(ctx.from.id)) {
        const db      = readDB();
        const product = db.products.find(p => p.id === ctx.session.uploadProductId);

        if (!product) {
            await ctx.reply('❌  Produk tidak ditemukan!');
            delete ctx.session.adminAction;
            delete ctx.session.uploadProductId;
            return;
        }

        let fileId = null, fileType = null;
        if      (ctx.message.photo)    { fileId = ctx.message.photo.at(-1).file_id; fileType = 'photo'; }
        else if (ctx.message.video)    { fileId = ctx.message.video.file_id;         fileType = 'video'; }
        else if (ctx.message.document) { fileId = ctx.message.document.file_id;      fileType = 'document'; }

        if (!fileId) return ctx.reply('❌  Jenis file tidak didukung!');

        product.file_id   = fileId;
        product.file_type = fileType;
        writeDB(db);

        await ctx.reply(`✅  File berhasil diupload untuk produk "<b>${product.name}</b>"`, { parse_mode: 'HTML' });
        delete ctx.session.adminAction;
        delete ctx.session.uploadProductId;
    } else {
        await ctx.reply('ℹ️   Gunakan menu yang tersedia.', KB_BACK_MAIN);
    }
});

// ─────────────────────────────────────────────
//  LAUNCH
// ─────────────────────────────────────────────
bot.launch().then(() => {
    const bar = '─'.repeat(44);
    console.log(`\n┌${bar}┐`);
    console.log(`│  🤖  AUTO ORDER BOT  ─  READY                │`);
    console.log(`├${bar}┤`);
    console.log(`│  ✅  Bot berhasil dijalankan                   │`);
    console.log(`│  📅  ${new Date().toLocaleString('id-ID').padEnd(39)}│`);
    console.log(`│  🚀  Menunggu pesan masuk...                   │`);
    console.log(`└${bar}┘\n`);
});

process.once('SIGINT',  () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
