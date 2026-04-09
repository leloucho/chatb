const AppError = require('../errors/AppError');

function extractZodDetails(issues) {
    return issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
        code: issue.code
    }));
}

function validate(schema) {
    return (req, res, next) => {
        const result = schema.safeParse({
            body: req.body,
            params: req.params,
            query: req.query
        });

        if (!result.success) {
            return next(new AppError(
                'VALIDATION_ERROR',
                'La solicitud no cumple con el esquema esperado',
                400,
                extractZodDetails(result.error.issues)
            ));
        }

        req.validated = result.data;
        return next();
    };
}

module.exports = {
    validate
};
