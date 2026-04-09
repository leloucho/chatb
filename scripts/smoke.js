const http = require('http');
const assert = require('assert');
const { createApp } = require('../src/bootstrap/createApp');

function request(port, path, method = 'GET', body = null) {
    return new Promise((resolve, reject) => {
        const payload = body ? JSON.stringify(body) : null;
        const req = http.request(
            {
                hostname: '127.0.0.1',
                port,
                path,
                method,
                headers: payload
                    ? {
                        'Content-Type': 'application/json',
                        'Content-Length': Buffer.byteLength(payload)
                    }
                    : undefined
            },
            (res) => {
                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                });
                res.on('end', () => {
                    resolve({
                        statusCode: res.statusCode,
                        body: data,
                        headers: res.headers
                    });
                });
            }
        );

        req.on('error', reject);
        if (payload) {
            req.write(payload);
        }
        req.end();
    });
}

async function main() {
    const app = createApp();
    const server = app.listen(0);
    const port = server.address().port;

    try {
        const health = await request(port, '/health');
        assert.strictEqual(health.statusCode, 200);
        assert.ok(health.body.includes('OK'));

        const root = await request(port, '/');
        assert.strictEqual(root.statusCode, 200);
        assert.ok(root.body.includes('ESIAD Proyectos SAC'));

        const admin = await request(port, '/admin');
        assert.strictEqual(admin.statusCode, 302);
        assert.strictEqual(admin.headers.location, '/admin.html');

        const webhookVerify = await request(port, '/webhook/whatsapp', 'GET');
        assert.strictEqual(webhookVerify.statusCode, 400);

        const webhookStatus = await request(port, '/webhook/status', 'POST', { MessageStatus: 'sent' });
        assert.strictEqual(webhookStatus.statusCode, 200);
        assert.ok(webhookStatus.body.includes('OK'));

        console.log('Smoke test OK');
    } finally {
        server.close();
    }
}

main().catch((error) => {
    console.error('Smoke test failed');
    console.error(error);
    process.exit(1);
});
