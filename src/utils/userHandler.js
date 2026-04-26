const { Markup } = require('telegraf');
const db = require('../utils/database');
const { formatRupiah, formatDate, isAdmin } = require('../utils/helpers');

class UserHandler {
    async myProfile(ctx) {
        const userId = ctx.from.id;
        let user = db.getUser(userId);
        
        if (!user) {
            user = {
                id: userId,
                first_name: ctx.from.first_name,
                username: ctx.from.username || '-',
                joined_at: new Date().toISOString(),
                total_orders: 0,
                total_spent: 0
            };
            db.addUser(user);
        }

        const message = `👤 *PROFIL SAYA*\n\n` +
            `🆔 ID: ${user.id}\n` +
            `👤 Nama: ${user.first_name}\n` +
            `📝 Username: @${user.username || '-'}\n` +
            `📅 Bergabung: ${formatDate(user.joined_at)}\n` +
            `━━━━━━━━━━━━━━━━━\n` +
            `📊 *STATISTIK BELANJA*\n` +
            `📦 Total Order: ${user.total_orders || 0}\n` +
            `💰 Total Belanja: ${formatRupiah(user.total_spent || 0)}\n\n` +
            `💡 Terima kasih telah menjadi pelanggan setia kami!`;

        const buttons = [
            [Markup.button.callback('📝 Riwayat Order', 'order_history')],
            [Markup.button.callback('🛍️ Order Lagi', 'auto_order')]
        ];
        
        if (isAdmin(userId)) {
            buttons.push([Markup.button.callback('⚙️ Panel Admin', 'admin_panel')]);
        }
        
        buttons.push([Markup.button.callback('🔙 Kembali ke Menu', 'back_to_menu')]);

        await ctx.replyWithHTML(message, Markup.inlineKeyboard(buttons));
    }

    async infoBot(ctx) {
        const senderId = ctx.from.id;
        const userName = ctx.from.first_name;
        const dbData = db.read();
        
        const totalOrders = dbData.orders.length;
        const totalUsers = dbData.users.length;
        const totalRevenue = dbData.orders.reduce((sum, order) => sum + order.totalPrice, 0);
        const pendingOrders = dbData.orders.filter(o => o.status === 'pending').length;
        
        const waktuRunPanel = new Date().toLocaleString('id-ID');
        
        const message = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 *STATISTIK BOT*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👥 Total User : ${totalUsers}
📦 Total Order : ${totalOrders}
⏳ Pending : ${pendingOrders}
💰 Pendapatan : ${formatRupiah(totalRevenue)}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ᙺ t.me/AiiSimaRajaIblis
❍─────────────────────────────
ᨑ © 𝙼𝚎𝚍𝚞𝚜𝚊`;

        await ctx.replyWithHTML(message, Markup.inlineKeyboard([
            [Markup.button.callback('🛍️ Mulai Order', 'auto_order')],
            [Markup.button.callback('👤 Profil Saya', 'my_profile')],
            [Markup.button.callback('🔙 Menu Utama', 'back_to_menu')]
        ]));
    }
}

module.exports = new UserHandler();
