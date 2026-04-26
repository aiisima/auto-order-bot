const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../../database.json');

class Database {
    constructor() {
        this.data = this.read();
    }

    read() {
        try {
            const data = fs.readFileSync(dbPath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('Error reading database:', error);
            return { orders: [], users: [], products: [], settings: {} };
        }
    }

    write() {
        try {
            fs.writeFileSync(dbPath, JSON.stringify(this.data, null, 2));
            return true;
        } catch (error) {
            console.error('Error writing database:', error);
            return false;
        }
    }

    // User methods
    getUsers() {
        return this.data.users;
    }

    getUser(userId) {
        return this.data.users.find(u => u.id === userId);
    }

    addUser(user) {
        if (!this.getUser(user.id)) {
            this.data.users.push(user);
            this.write();
            return true;
        }
        return false;
    }

    updateUser(userId, updates) {
        const index = this.data.users.findIndex(u => u.id === userId);
        if (index !== -1) {
            this.data.users[index] = { ...this.data.users[index], ...updates };
            this.write();
            return true;
        }
        return false;
    }

    // Order methods
    getOrders() {
        return this.data.orders;
    }

    getUserOrders(userId) {
        return this.data.orders.filter(o => o.userId === userId);
    }

    addOrder(order) {
        this.data.orders.push(order);
        this.write();
        return order;
    }

    updateOrder(orderId, updates) {
        const index = this.data.orders.findIndex(o => o.id === orderId);
        if (index !== -1) {
            this.data.orders[index] = { ...this.data.orders[index], ...updates };
            this.write();
            return true;
        }
        return false;
    }

    // Product methods
    getProducts() {
        return this.data.products;
    }

    getProduct(productId) {
        return this.data.products.find(p => p.id === productId);
    }

    addProduct(product) {
        const newId = Math.max(...this.data.products.map(p => p.id), 0) + 1;
        const newProduct = { id: newId, ...product };
        this.data.products.push(newProduct);
        this.write();
        return newProduct;
    }

    updateProduct(productId, updates) {
        const index = this.data.products.findIndex(p => p.id === productId);
        if (index !== -1) {
            this.data.products[index] = { ...this.data.products[index], ...updates };
            this.write();
            return true;
        }
        return false;
    }

    updateStock(productId, newStock) {
        const index = this.data.products.findIndex(p => p.id === productId);
        if (index !== -1) {
            this.data.products[index].stock = newStock;
            this.write();
            return true;
        }
        return false;
    }

    updatePrice(productId, newPrice) {
        const index = this.data.products.findIndex(p => p.id === productId);
        if (index !== -1) {
            this.data.products[index].price = newPrice;
            this.write();
            return true;
        }
        return false;
    }

    deleteProduct(productId) {
        const index = this.data.products.findIndex(p => p.id === productId);
        if (index !== -1) {
            this.data.products.splice(index, 1);
            this.write();
            return true;
        }
        return false;
    }

    // Settings methods
    getSettings() {
        return this.data.settings;
    }

    updateSettings(updates) {
        this.data.settings = { ...this.data.settings, ...updates };
        this.write();
        return true;
    }
}

module.exports = new Database();
