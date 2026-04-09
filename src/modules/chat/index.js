module.exports = {
    routes: require('./routes/chatRoutes'),
    controller: require('./controllers/chatHttpController'),
    service: require('./services/chatWebhookService')
};
