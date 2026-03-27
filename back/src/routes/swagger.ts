import { Router, Request, Response } from 'express';
import { swaggerSpec } from '../utils/swagger';
import { ConfigService } from '../services/configService';

const router = Router();

router.get('/swagger.json', async (req: Request, res: Response) => {
  const enabled = await ConfigService.isSwaggerEnabled();
  if (!enabled) {
    return res.status(404).json({ message: 'Swagger is disabled' });
  }
  res.json(swaggerSpec);
});

router.get('/api-docs', async (req: Request, res: Response) => {
  const enabled = await ConfigService.isSwaggerEnabled();
  if (!enabled) {
    return res.status(404).send('Swagger is disabled. Enable it in System Config.');
  }

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>API Documentation</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
  <style>
    html { box-sizing: border-box; overflow-y: scroll; }
    *, *:before, *:after { box-sizing: inherit; }
    body { margin: 0; background: #fafafa; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      window.ui = SwaggerUIBundle({
        url: "/api/swagger.json",
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        layout: "StandaloneLayout",
        persistAuthorization: true
      });
    };
  </script>
</body>
</html>
  `;

  res.setHeader('Content-Security-Policy', "default-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com; style-src 'self' 'unsafe-inline' https://unpkg.com; connect-src 'self' https://unpkg.com;");
  res.type('html').send(html);
});

export default router;
