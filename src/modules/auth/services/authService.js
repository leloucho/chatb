const jwt = require('jsonwebtoken');
const AppError = require('../../../errors/AppError');

function login(username, password) {
    const adminUser = process.env.ADMIN_USERNAME;
    const adminPass = process.env.ADMIN_PASSWORD;
    const secret = process.env.JWT_SECRET;

    if (!adminUser || !adminPass || !secret) {
        throw new AppError('AUTH_CONFIG_ERROR', 'Configura ADMIN_USERNAME, ADMIN_PASSWORD y JWT_SECRET', 500);
    }

    if (username !== adminUser || password !== adminPass) {
        throw new AppError('INVALID_CREDENTIALS', 'Credenciales inválidas', 401);
    }

    const expiresIn = process.env.JWT_EXPIRES_IN || '8h';
    const token = jwt.sign(
        {
            sub: username,
            role: 'admin'
        },
        secret,
        { expiresIn }
    );

    return {
        accessToken: token,
        tokenType: 'Bearer',
        expiresIn
    };
}

module.exports = {
    login
};
