import swaggerJSDoc from 'swagger-jsdoc';

import { env } from '../config/env.js';

export const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Costy API',
      version: '0.1.0',
      description: 'REST API for the Costy-like social media app.',
    },
    servers: [{ url: `${env.SERVER_URL}/api/v1`, description: 'Local' }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/modules/**/*.routes.ts', './src/modules/**/*.controller.ts'],
});
