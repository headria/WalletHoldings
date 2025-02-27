import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import { specs } from './config/swagger';
import connectDB from './db/config';
const routes = require('./routes'); // Use require for CommonJS import
import twitterRoutes from './routes/twitter.routes';

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet()); // Adds various HTTP headers for security

// Rate limiting
// const limiter = rateLimit({
//     windowMs: 15 * 60 * 1000, // 15 minutes
//     max: 100 // limit each IP to 100 requests per windowMs
// });
// app.use(limiter);

// Middleware
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*', // Restrict CORS to specific origins
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10kb' })); // Limit request size

// Remove X-Powered-By header
app.disable('x-powered-by');

// Swagger Documentation
// app.use('/api-docs', [...swaggerUi.serve, swaggerUi.setup(specs)] as unknown as express.RequestHandler[]);

// Connect to MongoDB
connectDB();

// Routes
app.use('/api', routes);
app.use('/api/twitter', twitterRoutes);

// Global error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(err.stack);
    res.status(500).json({ 
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Swagger documentation available at http://localhost:${PORT}/api-docs`);
}); 