const fs = require('fs');
const path = require('path');
const https = require('https');
const twilio = require('twilio');

class FileService {
    constructor() {
        this.uploadsDir = path.join(__dirname, '../../uploads');
        this.ensureUploadsDirectory();
    }

    // Asegurar que el directorio de uploads existe
    ensureUploadsDirectory() {
        if (!fs.existsSync(this.uploadsDir)) {
            fs.mkdirSync(this.uploadsDir, { recursive: true });
            console.log('Directorio uploads creado');
        }
    }

    // Descargar archivo de WhatsApp usando Twilio
    async downloadWhatsAppMedia(mediaUrl, phoneNumber) {
        return new Promise((resolve, reject) => {
            if (!mediaUrl) {
                reject(new Error('URL de media no proporcionada'));
                return;
            }

            try {
                const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
                
                // Obtener información del media
                client.media(this.extractMediaSidFromUrl(mediaUrl))
                    .fetch()
                    .then(media => {
                        // Generar nombre de archivo único
                        const timestamp = Date.now();
                        const fileExtension = this.getFileExtensionFromContentType(media.contentType);
                        const fileName = `${phoneNumber}_${timestamp}${fileExtension}`;
                        const filePath = path.join(this.uploadsDir, fileName);

                        // Descargar el archivo
                        const fileStream = fs.createWriteStream(filePath);
                        
                        https.get(mediaUrl, (response) => {
                            response.pipe(fileStream);
                            
                            fileStream.on('finish', () => {
                                fileStream.close();
                                console.log(`Archivo descargado: ${fileName}`);
                                resolve({
                                    fileName,
                                    filePath,
                                    contentType: media.contentType,
                                    size: fs.statSync(filePath).size
                                });
                            });
                        }).on('error', (err) => {
                            fs.unlink(filePath, () => {}); // Eliminar archivo parcial
                            reject(err);
                        });

                        fileStream.on('error', (err) => {
                            reject(err);
                        });
                    })
                    .catch(reject);

            } catch (error) {
                reject(error);
            }
        });
    }

    // Extraer Media SID de la URL de Twilio
    extractMediaSidFromUrl(mediaUrl) {
        const matches = mediaUrl.match(/\/Media\/([^\/\?]+)/);
        return matches ? matches[1] : null;
    }

    // Obtener extensión de archivo basada en el tipo de contenido
    getFileExtensionFromContentType(contentType) {
        const extensions = {
            'image/jpeg': '.jpg',
            'image/jpg': '.jpg',
            'image/png': '.png',
            'image/gif': '.gif',
            'image/webp': '.webp',
            'application/pdf': '.pdf',
            'text/plain': '.txt',
            'application/msword': '.doc',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
            'audio/mpeg': '.mp3',
            'audio/mp4': '.mp4',
            'video/mp4': '.mp4',
            'audio/ogg': '.ogg'
        };

        return extensions[contentType] || '.bin';
    }

    // Validar tipo de archivo
    isAllowedFileType(contentType) {
        const allowedTypes = [
            'image/jpeg',
            'image/jpg', 
            'image/png',
            'image/gif',
            'image/webp',
            'application/pdf',
            'text/plain',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];

        return allowedTypes.includes(contentType);
    }

    // Obtener información del archivo
    getFileInfo(filePath) {
        try {
            const stats = fs.statSync(filePath);
            const fileName = path.basename(filePath);
            const fileExtension = path.extname(filePath);
            
            return {
                fileName,
                fileExtension,
                size: stats.size,
                sizeFormatted: this.formatFileSize(stats.size),
                created: stats.birthtime,
                modified: stats.mtime
            };
        } catch (error) {
            throw new Error(`Error obteniendo información del archivo: ${error.message}`);
        }
    }

    // Formatear tamaño de archivo
    formatFileSize(bytes) {
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 Bytes';
        
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }

    // Eliminar archivo
    deleteFile(filePath) {
        return new Promise((resolve, reject) => {
            fs.unlink(filePath, (err) => {
                if (err) {
                    reject(err);
                } else {
                    console.log(`Archivo eliminado: ${filePath}`);
                    resolve(true);
                }
            });
        });
    }

    // Listar archivos de un usuario
    getUserFiles(phoneNumber) {
        try {
            const files = fs.readdirSync(this.uploadsDir);
            const userFiles = files.filter(file => file.startsWith(phoneNumber));
            
            return userFiles.map(file => {
                const filePath = path.join(this.uploadsDir, file);
                return this.getFileInfo(filePath);
            });
        } catch (error) {
            console.error('Error listando archivos del usuario:', error);
            return [];
        }
    }

    // Limpiar archivos antiguos (más de 30 días)
    cleanOldFiles() {
        try {
            const files = fs.readdirSync(this.uploadsDir);
            const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
            
            files.forEach(file => {
                const filePath = path.join(this.uploadsDir, file);
                const stats = fs.statSync(filePath);
                
                if (stats.birthtime.getTime() < thirtyDaysAgo) {
                    fs.unlinkSync(filePath);
                    console.log(`Archivo antiguo eliminado: ${file}`);
                }
            });
        } catch (error) {
            console.error('Error limpiando archivos antiguos:', error);
        }
    }
}

module.exports = new FileService();