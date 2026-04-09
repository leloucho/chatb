function errorHandler(err, req, res, next) {
    const statusCode = err.statusCode || 500;
    const code = err.code || 'INTERNAL_ERROR';
    const message = err.message || 'Error interno del servidor';

    console.error('Error:', {
        requestId: req.requestId,
        statusCode,
        code,
        message,
        stack: err.stack
    });

    res.status(statusCode).json({
        success: false,
        error: {
            code,
            message,
            details: err.details || null
        },
        requestId: req.requestId,
        timestamp: new Date().toISOString()
    });
}

module.exports = errorHandler;
