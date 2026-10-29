import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yaml';
import fs from 'fs';
import { ENV } from '../configs/env';

const router = Router();

if (ENV.SWAGGER_ENABLED && fs.existsSync(ENV.OPENAPI_SPEC_PATH)) {
  try {
    const rawYaml = fs.readFileSync(ENV.OPENAPI_SPEC_PATH, 'utf8');
    const swaggerDocument = YAML.parse(rawYaml);
    
    // Serve swagger UI assets & document
    router.use('/docs', swaggerUi.serve);
    router.get('/docs', swaggerUi.setup(swaggerDocument, {
      customSiteTitle: 'DCC NG ICD API Specification',
      customCss: '.swagger-ui .topbar { display: none }',
      swaggerOptions: {
        docExpansion: 'list',
        filter: true
      }
    }));
    
    // Raw OpenAPI specification JSON endpoint
    router.get('/openapi.json', (req, res) => {
      res.json(swaggerDocument);
    });

    console.log('[Swagger] API Documentation mounted at /api/docs');
  } catch (err: any) {
    console.warn('[Swagger] Failed to load OpenAPI YAML:', err.message);
  }
}

export const docsRouter = router;
