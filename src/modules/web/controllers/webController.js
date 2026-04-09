const path = require('path');

function renderLaserForm(req, res) {
    const token = req.query.token;
    if (!token) {
        return res.status(400).send('Token requerido');
    }

    return res.sendFile(path.join(__dirname, '../../../../public/pedido-corte-laser.html'));
}

function health(req, res) {
    return res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        service: 'ESIAD WhatsApp Chatbot'
    });
}

function root(req, res) {
    return res.json({
        message: 'ESIAD Proyectos SAC - WhatsApp Chatbot',
        version: '1.0.0',
        endpoints: {
            webhook: '/webhook/whatsapp',
            status: '/webhook/status',
            health: '/health',
            admin: '/admin.html'
        }
    });
}

function adminRedirect(req, res) {
    return res.redirect('/admin.html');
}

module.exports = {
    renderLaserForm,
    health,
    root,
    adminRedirect
};
