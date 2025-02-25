import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Wallet Holdings API',
      version: '2.2.0',
      description: 'API documentation for Wallet Holdings service',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
      {
        url: 'https://seal-app-4kzyz.ondigitalocean.app',
        description: 'Production server',
      },
    ],
  },
  apis: ['./src/routes/*.ts'], // Path to the API routes
};

export const specs = swaggerJsdoc(options); 