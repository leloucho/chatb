const { z } = require('zod');

const idParam = z.object({
    id: z.string().regex(/^\d+$/, 'id debe ser numérico')
});

const uploadFilesSchema = z.object({
    body: z.object({
        token: z.string().min(1),
        specifications: z.string().min(2)
    }),
    params: z.object({}),
    query: z.object({})
});

const reviewOrderSchema = z.object({
    body: z.object({
        reviewStatus: z.string().min(1),
        comment: z.string().optional().default('')
    }),
    params: idParam,
    query: z.object({})
});

const updateOrderSchema = z.object({
    body: z.object({
        status: z.string().min(1),
        comment: z.string().optional().default(''),
        estimatedTime: z.string().optional().default('')
    }),
    params: idParam,
    query: z.object({})
});

const orderIdSchema = z.object({
    body: z.object({}).passthrough(),
    params: idParam,
    query: z.object({})
});

module.exports = {
    uploadFilesSchema,
    reviewOrderSchema,
    updateOrderSchema,
    orderIdSchema
};
