import express from 'express';
import cors from 'cors';
import connectDB from './db/config';
const routes = require('./routes'); // Use require for CommonJS import
import twitterRoutes from './routes/twitter.routes';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
connectDB();

// Routes
app.use('/api', routes);
app.use('/api/twitter', twitterRoutes);

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 