module.exports = {
    routes: require('./routes/ordersRoutes'),
    controller: require('./controllers/ordersController'),
    service: require('./services/ordersModuleService'),
    repository: require('./repositories/ordersRepository')
};
