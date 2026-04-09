const swaggerJsdoc = require('swagger-jsdoc');

function buildSpec() {
    return swaggerJsdoc({
        definition: {
            openapi: '3.0.3',
            info: {
                title: 'ESIAD Chatbot API',
                version: '1.0.0',
                description: 'API backend para chatbot y gestión de pedidos ESIAD'
            },
            servers: [
                {
                    url: '/'
                }
            ],
            components: {
                securitySchemes: {
                    bearerAuth: {
                        type: 'http',
                        scheme: 'bearer',
                        bearerFormat: 'JWT'
                    }
                }
            },
            paths: {
                '/api/auth/login': {
                    post: {
                        summary: 'Autenticación de administrador',
                        requestBody: {
                            required: true,
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        required: ['username', 'password'],
                                        properties: {
                                            username: { type: 'string' },
                                            password: { type: 'string' }
                                        }
                                    }
                                }
                            }
                        },
                        responses: {
                            200: { description: 'Token generado' },
                            401: { description: 'Credenciales inválidas' }
                        }
                    }
                },
                '/api/upload-files': {
                    post: {
                        summary: 'Sube archivos de pedido',
                        requestBody: {
                            required: true,
                            content: {
                                'multipart/form-data': {
                                    schema: {
                                        type: 'object',
                                        required: ['token', 'specifications', 'files'],
                                        properties: {
                                            token: { type: 'string' },
                                            specifications: { type: 'string' },
                                            files: {
                                                type: 'array',
                                                items: { type: 'string', format: 'binary' }
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        responses: {
                            200: { description: 'Pedido generado' }
                        }
                    }
                },
                '/api/orders/pending': {
                    get: {
                        summary: 'Lista pedidos pendientes',
                        security: [{ bearerAuth: [] }],
                        responses: {
                            200: { description: 'Listado de pedidos' }
                        }
                    }
                },
                '/api/orders/{id}/review': {
                    post: {
                        summary: 'Revisión técnica del pedido',
                        security: [{ bearerAuth: [] }],
                        parameters: [
                            { name: 'id', in: 'path', required: true, schema: { type: 'integer' } }
                        ],
                        requestBody: {
                            required: true,
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        required: ['reviewStatus'],
                                        properties: {
                                            reviewStatus: { type: 'string' },
                                            comment: { type: 'string' }
                                        }
                                    }
                                }
                            }
                        },
                        responses: {
                            200: { description: 'Revisión registrada' }
                        }
                    }
                },
                '/api/orders/{id}/update': {
                    post: {
                        summary: 'Actualiza estado de pedido',
                        security: [{ bearerAuth: [] }],
                        parameters: [
                            { name: 'id', in: 'path', required: true, schema: { type: 'integer' } }
                        ],
                        requestBody: {
                            required: true,
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        required: ['status'],
                                        properties: {
                                            status: { type: 'string' },
                                            comment: { type: 'string' },
                                            estimatedTime: { type: 'string' }
                                        }
                                    }
                                }
                            }
                        },
                        responses: {
                            200: { description: 'Pedido actualizado' }
                        }
                    }
                },
                '/api/admin/orders': {
                    get: {
                        summary: 'Listado admin de pedidos',
                        security: [{ bearerAuth: [] }],
                        responses: {
                            200: { description: 'Listado admin' }
                        }
                    }
                }
            }
        },
        apis: []
    });
}

module.exports = {
    buildSpec
};
