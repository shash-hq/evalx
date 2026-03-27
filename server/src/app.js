import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { errorHandler } from './middleware/errorHandler.js';

import authRoutes from './routes/auth.routes.js';
import contestRoutes from './routes/contest.routes.js';
import problemRoutes from './routes/problem.routes.js';
import submissionRoutes from './routes/submission.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import adminRoutes from './routes/admin.routes.js';

const app = express();

app.set('trust proxy', 1);

// THE FIX: Array of multiple allowed origins
const allowedOrigins = [
  process.env.CLIENT_URL, // Railway env variable (e.g., the long preview URL)
  'https://evalx-nine.vercel.app', // Vercel main production URL
  'http://localhost:5173' // Local development fallback
].filter(Boolean); // filter(Boolean) removes any null/undefined entries safely

console.log('CORS origins allowed:', allowedOrigins);

if (!process.env.CLIENT_URL) {
  console.error('CRITICAL: CLIENT_URL is not set. CORS might block credentialed requests.');
}

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like Postman or server-to-server)
    if (!origin) return callback(null, true);
    
    // Check if the incoming origin exists in our allowed array
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    console.warn(`CORS blocked request from origin: ${origin}`);
    callback(new Error(`Origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.options('(.*)', cors(corsOptions));

app.use(helmet());
app.use(morgan('dev'));
app.use(cookieParser());

app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/contests', contestRoutes);
app.use('/api/problems', problemRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);

app.get('/health', (_, res) => res.json({ status: 'ok' }));

app.use(errorHandler);

export default app;
