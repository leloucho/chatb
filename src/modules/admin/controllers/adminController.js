const adminService = require('../services/adminService');

async function getAdminOrders(req, res, next) {
    try {
        console.log('--- API ADMIN ORDERS CALLED ---');

        console.log('Ejecutando consulta a la base de datos...');

        const response = await adminService.getAdminOrders();

        console.log('Resultados obtenidos:', response.orders.length, 'pedidos');

        console.log('Enviando respuesta:', JSON.stringify(response, null, 2));

        res.json(response);
    } catch (error) {
        console.error('--- ERROR EN API ADMIN ORDERS ---');
        console.error('Error obteniendo pedidos:', error);
        return next(error);
    }
}

module.exports = {
    getAdminOrders
};
