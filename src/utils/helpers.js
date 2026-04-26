const moment = require('moment');

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
    const badges = {
        pending: '⏳',
        processing: '🔄',
        completed: '✅',
        cancelled: '❌',
        shipped: '📦'
    };
    return badges[status] || '❓';
};

const getStatusText = (status) => {
    const texts = {
        pending: 'Menunggu Konfirmasi',
        processing: 'Sedang Diproses',
        completed: 'Selesai',
        cancelled: 'Dibatalkan',
        shipped: 'Dikirim'
    };
    return texts[status] || status;
};

const isAdmin = (userId) => {
    const adminId = process.env.ADMIN_ID;
    return userId.toString() === adminId.toString();
};

module.exports = {
    formatRupiah,
    generateOrderId,
    formatDate,
    getStatusBadge,
    getStatusText,
    isAdmin
};
