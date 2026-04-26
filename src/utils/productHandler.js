const { Markup } = require('telegraf');
const db = require('../utils/database');
const { formatRupiah } = require('../utils/helpers');

class ProductHandler {
    async listProducts(ctx) {
        const products = db.getProducts();
        
        if (products.length === 0) {
            await ctx.reply('📦 *Belum ada produk*\n\nMaaf, saat ini belum ada produk yang tersedia. Silakan cek kembali nanti.', {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('🔙 Kembali ke Menu', 'back_to_menu')]
                ])
            });
            return;
        }
        
        let message = `📦 *DAFTAR PRODUK KAMI*\n\n`;
        products.forEach((product, index) => {
            message += `┏━━ ${index + 1}. *${product.name}*\n`;
            message += `┣ 💰 Harga: ${formatRupiah(product.price)}\n`;
            message += `┣ 📦 Stok: ${product.stock} item\n`;
            message += `┣ 📝 ${product.description}\n`;
            message += `┗━━━━━━━━━━━━━━━━━━━━\n\n`;
        });

        const buttons = [];
        products.forEach((product) => {
            buttons.push([Markup.button.callback(`🛍️ Beli ${product.name}`, `order_${product.id}`)]);
        });
        buttons.push([Markup.button.callback('🔙 Kembali ke Menu', 'back_to_menu')]);

        await ctx.replyWithHTML(message, Markup.inlineKeyboard(buttons));
    }

    async showProductDetail(ctx, productId) {
        const product = db.getProduct(parseInt(productId));
        
        if (!product) {
            await ctx.reply('❌ Produk tidak ditemukan!');
            return;
        }

        const message = `📦 *${product.name}*\n\n` +
            `💰 Harga: ${formatRupiah(product.price)}\n` +
            `📦 Stok: ${product.stock}\n` +
            `📝 Deskripsi:\n${product.description}\n\n` +
            `💡 Klik tombol di bawah untuk memesan produk ini.`;

        await ctx.replyWithHTML(message, Markup.inlineKeyboard([
            [Markup.button.callback('🛍️ Pesan Sekarang', `order_${product.id}`)],
            [Markup.button.callback('🔙 Kembali ke Daftar Produk', 'list_products')],
            [Markup.button.callback('🏠 Menu Utama', 'back_to_menu')]
        ]));
    }
}

module.exports = new ProductHandler();
