const swaggerJsdoc = require('swagger-jsdoc');
const fs = require('fs');
const path = require('path');

const options = {
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
    path.resolve(__dirname, '../src/routes/admin/*.ts'),
    path.resolve(__dirname, '../src/routes/admin/**/*.ts'),
    path.resolve(__dirname, '../src/routes/common/*.ts'),
    path.resolve(__dirname, '../src/routes/common/**/*.ts'),
    path.resolve(__dirname, '../src/routes/client/*.ts'),
    path.resolve(__dirname, '../src/routes/health.ts'),
    path.resolve(__dirname, '../src/routes/public.ts'),
  ],
};

const swaggerSpec = swaggerJsdoc(options);

const outputPath = path.resolve(__dirname, '../dist/swagger.json');
const rootOutputPath = path.resolve(__dirname, '../swagger.json');
const distDir = path.dirname(outputPath);
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}
fs.writeFileSync(outputPath, JSON.stringify(swaggerSpec, null, 2));
fs.writeFileSync(rootOutputPath, JSON.stringify(swaggerSpec, null, 2));
console.log('[Swagger] Generated swagger.json');