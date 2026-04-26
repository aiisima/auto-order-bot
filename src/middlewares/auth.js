const { isAdmin } = require('../utils/helpers');

const sessionMiddleware = () => {
    return async (ctx, next) => {
        ctx.session = ctx.session || {};
        await next();
    };
};

const adminOnly = () => {
    return async (ctx, next) => {
        if (!isAdmin(ctx.from.id)) {
            await ctx.reply('❌ Akses ditolak. Hanya admin yang dapat mengakses fitur ini.');
            return;
        }
        await next();
    };
};

module.exports = {
    sessionMiddleware,
    adminOnly
};
