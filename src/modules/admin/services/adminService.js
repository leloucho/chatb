const adminRepository = require('../repositories/adminRepository');

async function getAdminOrders() {
    const orders = await adminRepository.fetchAllOrders();

    return {
        success: true,
        orders
    };
}

module.exports = {
    getAdminOrders
};
