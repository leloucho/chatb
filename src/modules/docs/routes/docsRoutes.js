const express = require('express');
const swaggerUi = require('swagger-ui-express');
const { buildSpec } = require('../../../openapi/spec');

const router = express.Router();
const spec = buildSpec();

router.get('/api/openapi.json', (req, res) => {
    res.json(spec);
});

router.use('/api/docs', swaggerUi.serve, swaggerUi.setup(spec));

module.exports = router;
