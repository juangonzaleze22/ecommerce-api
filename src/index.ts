import express, { Application } from 'express';
import { createServer } from 'http';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { connectDB } from './config/database';
import { errorHandler } from './middleware/errorHandler';
import { multerErrorHandler } from './middleware/multerErrorHandler';
import { initializeWebSocket } from './services/WebSocketService';
import homeRoutes from './routes';
import statesRoutes from './routes/states';
import authRoutes from './routes/auth';
import categoriesRoutes from './routes/categories';
import productsRoutes from './routes/products';
import brandsRoutes from './routes/brands';
import ordersRoutes from './routes/orders';
import cartRoutes from './routes/cart';
import reviewsRoutes from './routes/reviews';
import agenciesRoutes from './routes/agencies';
import notificationsRoutes from './routes/notifications';

// Cargar variables de entorno desde la raíz del proyecto
const envPath = path.resolve(process.cwd(), '.env');
console.log('Buscando archivo .env en:', envPath);

if (!fs.existsSync(envPath)) {
  console.error('❌ No se encontró el archivo .env en:', envPath);
  process.exit(1);
}

// Cargar variables de entorno
const result = dotenv.config({ path: envPath });
if (result.error) {
  console.error('❌ Error al cargar .env:', result.error);
  process.exit(1);
}

// Verificar variables de entorno críticas
const requiredEnvVars = [
  'DATABASE_URL'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.error('❌ Faltan las siguientes variables de entorno requeridas:', missingVars);
  process.exit(1);
}

console.log('✅ Variables de entorno cargadas correctamente');
console.log('✅ DATABASE_URL presente:', process.env.DATABASE_URL ? 'Sí' : 'No');

// Initialize Express app
const app: Application = express();
const server = createServer(app);
const PORT: number = parseInt(process.env.PORT || '3000', 10);

// Connect to database
connectDB();

// Initialize WebSocket service
initializeWebSocket(server);

// Middleware
app.use(express.json());
app.use(cookieParser());

// Configurar CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*', // Permitir solicitudes desde cualquier origen o especificar en .env
  credentials: true, // Permitir cookies en solicitudes cross-origin
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Configurar archivos estáticos
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// Routes
app.use('/', homeRoutes);
app.use('/api/states', statesRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/brands', brandsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/agencies', agenciesRoutes);
app.use('/api/notifications', notificationsRoutes);

// Middleware para manejar errores de Multer
app.use(multerErrorHandler);

// Handle not found routes
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handling middleware
app.use(errorHandler);

// Start server
server.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
  console.log(`✅ WebSocket server initialized`);
  console.log(`- Environment: ${process.env.NODE_ENV || 'development'}`);
}); 