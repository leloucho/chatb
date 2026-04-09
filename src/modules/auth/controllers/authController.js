const authService = require('../services/authService');

async function login(req, res, next) {
    try {
        const { username, password } = req.body;
        const token = authService.login(username, password);
        return res.json({ success: true, data: token });
    } catch (error) {
        return next(error);
    }
}

module.exports = {
    login
};
