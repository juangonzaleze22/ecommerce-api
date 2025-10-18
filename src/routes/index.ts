import express from 'express';
import { welcome } from '../controllers/homeController';
import productsRouter from './products';
import ordersRouter from './orders';
import cartRouter from './cart';
import reviewsRouter from './reviews';
import categoriesRouter from './categories';
import brandsRouter from './brands';
import notificationsRouter from './notifications';

const router = express.Router();

// Ruta de bienvenida
router.get('/', welcome);
router.use('/products', productsRouter);
router.use('/orders', ordersRouter);
router.use('/cart', cartRouter);
router.use('/categories', categoriesRouter);
router.use('/brands', brandsRouter);
router.use('/notifications', notificationsRouter);
router.use('/', reviewsRouter);

export default router; 