import swaggerJsdoc from 'swagger-jsdoc';
import path from 'path';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AixProject API Documentation',
      version: '1.0.0',
      description: 'API documentation for AixProject management platform',
    },
    servers: [
      {
        url: '/api',
        description: 'API Server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: [
    path.resolve(__dirname, '../routes/admin/*.ts'),
    path.resolve(__dirname, '../routes/admin/**/*.ts'),
    path.resolve(__dirname, '../routes/common/*.ts'),
    path.resolve(__dirname, '../routes/common/**/*.ts'),
    path.resolve(__dirname, '../routes/client/*.ts'),
    path.resolve(__dirname, '../routes/health.ts'),
    path.resolve(__dirname, '../routes/public.ts'),
  ],
};

export const swaggerSpec = swaggerJsdoc(options);
