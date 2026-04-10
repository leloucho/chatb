const path = require('path');
const ConversationService = require('../../../services/conversationService');
const CustomerService = require('../../../services/customerService');

function getPublicBaseUrl() {
    const webhookUrl = process.env.WEBHOOK_URL || '';

    if (webhookUrl.includes('/webhook/whatsapp')) {
        return webhookUrl.replace('/webhook/whatsapp', '');
    }

    return `http://localhost:${process.env.PORT || 3000}`;
}

function buildTokenErrorPayload(reason) {
    if (reason === 'expired') {
        return {
            statusCode: 410,
            message: 'Token expirado. Solicita un nuevo enlace desde WhatsApp.'
        };
    }

    return {
        statusCode: 404,
        message: 'Token inválido o expirado'
    };
}

function renderLaserForm(req, res) {
    const token = req.query.token;
    if (!token) {
        return res.status(400).send('Token requerido');
    }

    return res.sendFile(path.join(__dirname, '../../../../public/pedido-corte-laser.html'));
}

function renderCustomerRegistration(req, res) {
    const token = req.query.token;

    if (!token) {
        return res.status(400).send('Token requerido');
    }

    return res.sendFile(path.join(__dirname, '../../../../public/cliente-registro.html'));
}

function renderCustomerAuth(req, res) {
    const token = req.query.token;

    if (!token) {
        return res.status(400).send('Token requerido');
    }

    return res.sendFile(path.join(__dirname, '../../../../public/cliente-autenticacion.html'));
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

async function getFormContext(req, res, next) {
    try {
        const token = req.query.token;

        if (!token) {
            return res.status(400).json({
                success: false,
                message: 'Token requerido'
            });
        }

        const tokenStatus = await ConversationService.getConversationByTokenStatus(token);
        const conversation = tokenStatus.conversation;

        if (!conversation) {
            const tokenError = buildTokenErrorPayload(tokenStatus.reason);
            return res.status(tokenError.statusCode).json({
                success: false,
                message: tokenError.message
            });
        }

        let customerName = null;

        if (conversation.customer_dni) {
            const customer = await CustomerService.getByDni(conversation.customer_dni);
            customerName = customer?.name || null;
        }

        return res.json({
            success: true,
            data: {
                serviceType: conversation.selected_service || 'corte_laser',
                serviceName: (conversation.selected_service || 'corte_laser') === 'corte_laser' ? 'Corte Láser' : (conversation.selected_service || 'Servicio'),
                customerDni: conversation.customer_dni || null,
                customerName
            }
        });
    } catch (error) {
        return next(error);
    }
}

async function getCustomerAccessContext(req, res, next) {
    try {
        const token = req.query.token;

        if (!token) {
            return res.status(400).json({ success: false, message: 'Token requerido' });
        }

        const tokenStatus = await ConversationService.getConversationByTokenStatus(token);
        const conversation = tokenStatus.conversation;

        if (!conversation) {
            const tokenError = buildTokenErrorPayload(tokenStatus.reason);
            return res.status(tokenError.statusCode).json({ success: false, message: tokenError.message });
        }

        if (!conversation.customer_dni) {
            return res.status(400).json({ success: false, message: 'No hay DNI asociado a esta conversación' });
        }

        const customer = await CustomerService.getByDni(conversation.customer_dni);

        return res.json({
            success: true,
            data: {
                customerDni: conversation.customer_dni,
                customerName: customer?.name || null,
                isRegistered: Boolean(customer?.name)
            }
        });
    } catch (error) {
        return next(error);
    }
}

async function registerCustomer(req, res, next) {
    try {
        const { token, name } = req.body;

        if (!token || !name || String(name).trim().length < 2) {
            return res.status(400).json({ success: false, message: 'Token y nombre son requeridos' });
        }

        const tokenStatus = await ConversationService.getConversationByTokenStatus(token);
        const conversation = tokenStatus.conversation;

        if (!conversation || !conversation.customer_dni) {
            const tokenError = buildTokenErrorPayload(tokenStatus.reason);
            return res.status(tokenError.statusCode).json({ success: false, message: tokenError.message });
        }

        await CustomerService.upsertByDni({
            dni: conversation.customer_dni,
            phoneNumber: conversation.phone_number,
            name: String(name).trim()
        });

        const nextUrl = `${getPublicBaseUrl()}/pedido/corte-laser?token=${encodeURIComponent(token)}`;

        await ConversationService.updateConversationState(
            conversation.phone_number,
            'awaiting_web_upload',
            'corte_laser',
            { web_form_url: nextUrl }
        );

        return res.json({ success: true, nextUrl });
    } catch (error) {
        return next(error);
    }
}

async function authenticateCustomer(req, res, next) {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ success: false, message: 'Token requerido' });
        }

        const tokenStatus = await ConversationService.getConversationByTokenStatus(token);
        const conversation = tokenStatus.conversation;

        if (!conversation || !conversation.customer_dni) {
            const tokenError = buildTokenErrorPayload(tokenStatus.reason);
            return res.status(tokenError.statusCode).json({ success: false, message: tokenError.message });
        }

        const customer = await CustomerService.getByDni(conversation.customer_dni);

        if (!customer || !customer.name) {
            return res.status(400).json({ success: false, message: 'Cliente no registrado. Completa registro primero.' });
        }

        const nextUrl = `${getPublicBaseUrl()}/pedido/corte-laser?token=${encodeURIComponent(token)}`;

        await ConversationService.updateConversationState(
            conversation.phone_number,
            'awaiting_web_upload',
            'corte_laser',
            { web_form_url: nextUrl }
        );

        return res.json({ success: true, nextUrl });
    } catch (error) {
        return next(error);
    }
}

module.exports = {
    renderLaserForm,
    renderCustomerRegistration,
    renderCustomerAuth,
    health,
    root,
    adminRedirect,
    getFormContext,
    getCustomerAccessContext,
    registerCustomer,
    authenticateCustomer
};
