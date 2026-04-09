# Trazabilidad de Rearquitectura (Fase actual)

Este documento mapea endpoints existentes hacia la nueva estructura modular sin cambio de comportamiento.

## Webhook

- `POST /webhook/whatsapp`
  - Route: `src/modules/chat/routes/chatRoutes.js`
  - Controller: `src/modules/chat/controllers/chatHttpController.js`
  - Service: `src/modules/chat/services/chatConversationService.js`
  - Legacy facade: `src/controllers/chatbotController.js` (compatibilidad)

- `POST /webhook/status`
  - Route: `src/modules/chat/routes/chatRoutes.js`
  - Controller: `src/modules/chat/controllers/chatHttpController.js`
  - Service: `src/modules/chat/services/chatConversationService.js`

- `GET /webhook/whatsapp`
  - Route: `src/modules/chat/routes/chatRoutes.js`
  - Controller: `src/modules/chat/controllers/chatHttpController.js`
  - Service: `src/modules/chat/services/chatWebhookService.js`

## Chat internals

- Conversation engine: `src/modules/chat/services/chatConversationService.js`
- Messaging provider adapter: `src/modules/chat/services/chatMessagingService.js`
- Legacy compatibility facade: `src/controllers/chatbotController.js`

## API Orders

- `POST /api/upload-files`
  - Route: `src/modules/orders/routes/ordersRoutes.js`
  - Controller: `src/modules/orders/controllers/ordersController.js`
  - Service: `src/modules/orders/services/ordersModuleService.js`
  - Repository: usa servicios existentes `src/services/conversationService.js` y `src/services/orderService.js`

- `POST /api/orders/:id/review`
  - Route: `src/modules/orders/routes/ordersRoutes.js`
  - Controller: `src/modules/orders/controllers/ordersController.js`
  - Service: `src/modules/orders/services/ordersModuleService.js`

- `GET /api/orders/pending`
  - Route: `src/modules/orders/routes/ordersRoutes.js`
  - Controller: `src/modules/orders/controllers/ordersController.js`
  - Service: `src/modules/orders/services/ordersModuleService.js`

- `POST /api/orders/:id/update`
  - Route: `src/modules/orders/routes/ordersRoutes.js`
  - Controller: `src/modules/orders/controllers/ordersController.js`
  - Service: `src/modules/orders/services/ordersModuleService.js`

- `GET /api/orders/:id/download`
  - Route: `src/modules/orders/routes/ordersRoutes.js`
  - Controller: `src/modules/orders/controllers/ordersController.js`
  - Service: `src/modules/orders/services/ordersModuleService.js`
  - Repository: `src/modules/orders/repositories/ordersRepository.js`

## API Admin

- `GET /api/admin/orders`
  - Route: `src/modules/admin/routes/adminRoutes.js`
  - Controller: `src/modules/admin/controllers/adminController.js`
  - Service: `src/modules/admin/services/adminService.js`
  - Repository: `src/modules/admin/repositories/adminRepository.js`

## Web

- `GET /pedido/corte-laser`
  - Route: `src/modules/web/routes/webRoutes.js`
  - Controller: `src/modules/web/controllers/webController.js`

- `GET /health`
  - Route: `src/modules/web/routes/webRoutes.js`
  - Controller: `src/modules/web/controllers/webController.js`

- `GET /`
  - Route: `src/modules/web/routes/webRoutes.js`
  - Controller: `src/modules/web/controllers/webController.js`

- `GET /admin`
  - Route: `src/modules/web/routes/webRoutes.js`
  - Controller: `src/modules/web/controllers/webController.js`

## Capa de bootstrap y cross-cutting

- Composition root: `src/bootstrap/createApp.js`
- Arranque: `src/bootstrap/startServer.js`
- Signal handlers: `src/bootstrap/registerProcessHandlers.js`
- Logging middleware: `src/middlewares/requestLogger.js`
- Error middleware: `src/middlewares/errorHandler.js`
- Upload config: `src/config/upload.js`
