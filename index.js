const { Telegraf, session } = require('telegraf');
const dotenv = require('dotenv');
const db = require('./src/utils/database');
const { formatRupiah, formatDate, isAdmin } = require('./src/utils/helpers');
const orderHandler = require('./src/handlers/orderHandler');
const productHandler = require('./src/handlers/productHandler');
const userHandler = require('./src/handlers/userHandler');
const adminHandler = require('./src/handlers/adminHandler');

dotenv.config();

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
    console.error('❌ BOT_TOKEN tidak ditemukan di file .env');
    process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

// Session middleware
bot.use(session());

// Main Menu Keyboard
const mainMenuKeyboard = {
    reply_markup: {
        inline_keyboard: [
            [{ text: '🛍️ Auto Order', callback_data: 'auto_order' }],
            [{ text: '📊 Cek Order', callback_data: 'check_order' }],
            [{ text: '📦 Daftar Produk', callback_data: 'list_products' }],
            [{ text: '📝 Riwayat Order', callback_data: 'order_history' }],
            [{ text: '👤 Profil Saya', callback_data: 'my_profile' }],
            [{ text: 'ℹ️ Info Bot', callback_data: 'info_bot' }]
        ]
    }
};

// Waktu run
const waktuRunPanel = new Date().toLocaleString('id-ID');
const CATBOX_IMAGE_URL = process.env.CATBOX_IMAGE_URL || 'https://files.catbox.moe/gs46so.jpg';

// Command /start dengan foto
bot.start(async (ctx) => {
    const senderId = ctx.from.id;
    const userName = ctx.from.first_name;
    
    // Simpan user ke database
    const userExists = db.getUser(senderId);
    if (!userExists) {
        db.addUser({
            id: senderId,
            first_name: userName,
            username: ctx.from.username || '',
            joined_at: new Date().toISOString(),
            total_orders: 0,
            total_spent: 0
        });
    }
    
    const caption = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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

sᴄʀɪᴘᴛ ᴀᴍᴘᴀs ɪɴɪ ᴍᴀsɪʜ ᴅᴀʟᴀᴍ ᴛᴀʜᴀᴘ ᴘᴇɴɢᴇᴍʙᴀɴɢᴀɴ ᴅᴀɴ ᴍᴜɴɢᴋɪɴ ᴍᴀsɪʜ ᴍᴇᴍɪʟɪᴋɪ ʙᴜɢ ᴀᴛᴀᴜ ғɪᴛᴜʀ ʏᴀɴɢ ʙᴇʟᴜᴍ sᴇᴘᴇɴᴜʜɴʏᴀ ʙᴇʀғᴜɴɢsɪ.ʜᴀʀᴀᴘ ʙᴇʀsᴀʙᴀʀ ᴅᴀɴ ɴᴀɴᴛɪᴋᴀɴ ᴘᴇᴍʙᴀʀᴜᴀɴ sᴇʟᴀɴᴊᴜᴛɴʏᴀ ᴜɴᴛᴜᴋ ᴘᴇɴɪɴɢᴋᴀᴛᴀɴ ᴅᴀɴ ᴘᴇʀʙᴀɪᴋᴀɴ ʟᴇʙɪʜ ʟᴀɴᴊᴜᴛ.

ᴊɪᴋᴀ ᴀɴᴅᴀ ɪɴɢɪɴ ᴅᴀʟᴀᴍ ғᴏʀᴍᴀᴛ ᴀᴛᴀᴜ ɢᴀʏᴀ ᴛᴇʀᴛᴇɴᴛᴜ ʙᴇʀɪᴛᴀʜᴜ sᴀʏᴀ!

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
        console.error('Error sending photo:', error);
        await ctx.reply(caption, {
            parse_mode: 'HTML',
            ...mainMenuKeyboard
        });
    }
});

// Menu handler
bot.action('back_to_menu', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply('🏠 *Menu Utama*', {
        parse_mode: 'Markdown',
        ...mainMenuKeyboard
    });
});

// Order handlers
bot.action('auto_order', async (ctx) => {
    await ctx.answerCbQuery();
    await orderHandler.showOrderMenu(ctx);
});

bot.action(/order_(\d+)/, async (ctx) => {
    await ctx.answerCbQuery();
    const productId = ctx.match[1];
    await orderHandler.processOrder(ctx, productId);
});

bot.action(/qty_(\d+)/, async (ctx) => {
    await ctx.answerCbQuery();
    const qty = ctx.match[1];
    await orderHandler.setQuantity(ctx, qty);
});

bot.action('qty_custom', async (ctx) => {
    await ctx.answerCbQuery();
    await orderHandler.askCustomQuantity(ctx);
});

bot.action('cancel_order', async (ctx) => {
    await ctx.answerCbQuery();
    ctx.session.tempOrder = null;
    await ctx.reply('❌ Order dibatalkan.', mainMenuKeyboard);
});

bot.action('check_order', async (ctx) => {
    await ctx.answerCbQuery();
    await orderHandler.checkOrder(ctx);
});

bot.action('order_history', async (ctx) => {
    await ctx.answerCbQuery();
    await orderHandler.orderHistory(ctx);
});

// Product handlers
bot.action('list_products', async (ctx) => {
    await ctx.answerCbQuery();
    await productHandler.listProducts(ctx);
});

bot.action(/detail_(\d+)/, async (ctx) => {
    await ctx.answerCbQuery();
    const productId = ctx.match[1];
    await productHandler.showProductDetail(ctx, productId);
});

// User handlers
bot.action('my_profile', async (ctx) => {
    await ctx.answerCbQuery();
    await userHandler.myProfile(ctx);
});

bot.action('info_bot', async (ctx) => {
    await ctx.answerCbQuery();
    await userHandler.infoBot(ctx);
});

// Admin handlers
bot.action('admin_panel', async (ctx) => {
    await ctx.answerCbQuery();
    if (!isAdmin(ctx.from.id)) return;
    await adminHandler.adminPanel(ctx);
});

bot.action('admin_products', async (ctx) => {
    await ctx.answerCbQuery();
    if (!isAdmin(ctx.from.id)) return;
    await adminHandler.manageProducts(ctx);
});

bot.action('admin_add_product', async (ctx) => {
    await ctx.answerCbQuery();
    if (!isAdmin(ctx.from.id)) return;
    await adminHandler.askAddProduct(ctx);
});

bot.action('admin_edit_stock', async (ctx) => {
    await ctx.answerCbQuery();
    if (!isAdmin(ctx.from.id)) return;
    await adminHandler.askEditStock(ctx);
});

bot.action('admin_edit_price', async (ctx) => {
    await ctx.answerCbQuery();
    if (!isAdmin(ctx.from.id)) return;
    await adminHandler.askEditPrice(ctx);
});

bot.action('admin_upload_file', async (ctx) => {
    await ctx.answerCbQuery();
    if (!isAdmin(ctx.from.id)) return;
    await adminHandler.askUploadFile(ctx);
});

bot.action('admin_delete_product', async (ctx) => {
    await ctx.answerCbQuery();
    if (!isAdmin(ctx.from.id)) return;
    await adminHandler.askDeleteProduct(ctx);
});

bot.action('admin_orders', async (ctx) => {
    await ctx.answerCbQuery();
    if (!isAdmin(ctx.from.id)) return;
    await adminHandler.manageOrders(ctx);
});

bot.action('admin_users', async (ctx) => {
    await ctx.answerCbQuery();
    if (!isAdmin(ctx.from.id)) return;
    await adminHandler.manageUsers(ctx);
});

bot.action('admin_broadcast', async (ctx) => {
    await ctx.answerCbQuery();
    if (!isAdmin(ctx.from.id)) return;
    await adminHandler.broadcast(ctx);
});

bot.action('admin_stats', async (ctx) => {
    await ctx.answerCbQuery();
    if (!isAdmin(ctx.from.id)) return;
    await adminHandler.showStats(ctx);
});

bot.action(/approve_(.+)/, async (ctx) => {
    await ctx.answerCbQuery();
    if (!isAdmin(ctx.from.id)) return;
    const orderId = ctx.match[1];
    await adminHandler.approveOrder(ctx, orderId);
});

bot.action(/reject_(.+)/, async (ctx) => {
    await ctx.answerCbQuery();
    if (!isAdmin(ctx.from.id)) return;
    const orderId = ctx.match[1];
    await adminHandler.rejectOrder(ctx, orderId);
});

// Text message handlers
bot.on('text', async (ctx) => {
    const text = ctx.message.text;
    
    if (text === '/cancel') {
        ctx.session = {};
        await ctx.reply('✅ Action dibatalkan.', mainMenuKeyboard);
        return;
    }
    
    // Handle custom quantity
    if (ctx.session.waitingForCustomQty) {
        const qty = parseInt(text);
        if (!isNaN(qty) && qty > 0 && qty <= 100) {
            await orderHandler.setQuantity(ctx, qty);
        } else {
            await ctx.reply('❌ Jumlah tidak valid! Masukkan angka 1-100.');
        }
        delete ctx.session.waitingForCustomQty;
        return;
    }
    
    // Handle address input
    if (ctx.session.waitingForAddress) {
        if (text.length < 10) {
            await ctx.reply('❌ Alamat terlalu pendek. Silakan masukkan alamat lengkap (minimal 10 karakter):');
            return;
        }
        await orderHandler.saveOrder(ctx, text);
        return;
    }
    
    // Handle admin actions
    if (ctx.session.adminAction) {
        if (!isAdmin(ctx.from.id)) {
            await ctx.reply('❌ Akses ditolak.');
            delete ctx.session.adminAction;
            return;
        }
        
        switch (ctx.session.adminAction) {
            case 'waiting_add_product':
                await adminHandler.processAddProduct(ctx, text);
                break;
            case 'waiting_edit_stock':
                await adminHandler.processEditStock(ctx, text);
                break;
            case 'waiting_edit_price':
                await adminHandler.processEditPrice(ctx, text);
                break;
            case 'waiting_upload_file_product':
                await adminHandler.setUploadFileProduct(ctx, text);
                break;
            case 'waiting_delete_product':
                await adminHandler.processDeleteProduct(ctx, text);
                break;
            case 'waiting_broadcast':
                if (text !== '/cancel') {
                    await adminHandler.processBroadcast(ctx, text);
                }
                break;
            default:
                delete ctx.session.adminAction;
        }
        return;
    }
    
    // Default response
    await ctx.reply('Silakan gunakan menu yang tersedia.', mainMenuKeyboard);
});

// File upload handler for admin
bot.on(['photo', 'video', 'document'], async (ctx) => {
    if (ctx.session.adminAction === 'waiting_upload_file' && ctx.session.uploadProductId) {
        if (!isAdmin(ctx.from.id)) return;
        await adminHandler.processUploadFile(ctx);
    } else {
        await ctx.reply('Silakan gunakan menu yang tersedia.', mainMenuKeyboard);
    }
});

// Error handler
bot.catch((err, ctx) => {
    console.error('Bot error:', err);
    ctx.reply('⚠️ Terjadi kesalahan. Silakan coba lagi nanti.');
});

// Start bot
bot.launch().then(() => {
    console.log('✅ Auto Order Bot started successfully!');
    console.log(`📅 Time: ${new Date().toLocaleString()}`);
    console.log('🚀 Bot is running...');
});

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
