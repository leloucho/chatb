const express = require('express');
const { z } = require('zod');
const authController = require('../controllers/authController');
const { validate } = require('../../../middlewares/validate');

const router = express.Router();

const loginSchema = z.object({
    body: z.object({
        username: z.string().min(1),
        password: z.string().min(1)
    }),
    params: z.object({}),
    query: z.object({})
});

router.post('/api/auth/login', validate(loginSchema), authController.login);

module.exports = router;
