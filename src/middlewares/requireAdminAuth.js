const jwt = require('jsonwebtoken');
const AppError = require('../errors/AppError');

function isAuthEnabled() {
    return String(process.env.AUTH_ENABLED || 'false').toLowerCase() === 'true';
}

function requireAdminAuth(req, res, next) {
    if (!isAuthEnabled()) {
        return next();
    }

    const authHeader = req.headers.authorization || '';
    const [type, token] = authHeader.split(' ');

    if (type !== 'Bearer' || !token) {
        return next(new AppError('AUTH_REQUIRED', 'Token Bearer requerido', 401));
    }

    try {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            return next(new AppError('AUTH_CONFIG_ERROR', 'JWT_SECRET no configurado', 500));
        }

        const payload = jwt.verify(token, secret);
        if (payload.role !== 'admin') {
            return next(new AppError('FORBIDDEN', 'No autorizado para este recurso', 403));
        }

        req.auth = payload;
        return next();
    } catch (error) {
        return next(new AppError('INVALID_TOKEN', 'Token inválido o expirado', 401));
    }
}

module.exports = {
    requireAdminAuth,
    isAuthEnabled
};
