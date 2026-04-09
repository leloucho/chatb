const path = require('path');

function getStorageDriver() {
    return (process.env.FILE_STORAGE_DRIVER || 'local').toLowerCase();
}

function getPublicFileUrl(fileName) {
    const safeName = path.basename(fileName);
    const driver = getStorageDriver();

    if (driver === 's3') {
        const publicBase = process.env.S3_PUBLIC_BASE_URL;
        if (!publicBase) {
            throw new Error('S3_PUBLIC_BASE_URL no configurado para FILE_STORAGE_DRIVER=s3');
        }
        return `${publicBase.replace(/\/$/, '')}/${safeName}`;
    }

    return `${process.env.WEBHOOK_URL.replace('/webhook/whatsapp', '')}/files/${safeName}`;
}

module.exports = {
    getPublicFileUrl,
    getStorageDriver
};
