import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Define interface to extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

// Protect routes
export const protect = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  let token;

  console.log('🔍 [AUTH MIDDLEWARE] Verificando autenticación para:', req.path);
  console.log('🔍 [AUTH MIDDLEWARE] Headers authorization:', req.headers.authorization);
  console.log('🔍 [AUTH MIDDLEWARE] Cookies:', req.cookies);

  // Check for token in headers or cookies
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    // Set token from Bearer token in header
    token = req.headers.authorization.split(' ')[1];
    console.log('🔍 [AUTH MIDDLEWARE] Token encontrado en header:', token ? 'Sí' : 'No');
  } else if (req.cookies?.token) {
    // Set token from cookie
    token = req.cookies.token;
    console.log('🔍 [AUTH MIDDLEWARE] Token encontrado en cookie:', token ? 'Sí' : 'No');
  }

  // Make sure token exists
  if (!token) {
    console.log('❌ [AUTH MIDDLEWARE] No se encontró token');
    res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
    return;
  }

  try {
    // Verify token
    const jwtSecret = process.env.JWT_SECRET || 'secretkey123456789';
    console.log('🔍 [AUTH MIDDLEWARE] Verificando token con secret:', jwtSecret.substring(0, 10) + '...');
    
    // @ts-ignore: Ignoring type checking for jwt.verify due to typing issues
    const decoded = jwt.verify(token, jwtSecret);
    console.log('🔍 [AUTH MIDDLEWARE] Token decodificado:', decoded);

    // Attach user to request using Prisma
    const user = await prisma.user.findUnique({
      where: { id: (decoded as any).id }
    });

    console.log('🔍 [AUTH MIDDLEWARE] Usuario encontrado:', user ? 'Sí' : 'No');

    if (!user) {
      console.log('❌ [AUTH MIDDLEWARE] Usuario no encontrado en BD');
      res.status(401).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    req.user = user;
    console.log('✅ [AUTH MIDDLEWARE] Usuario autenticado correctamente:', user.email);
    next();
  } catch (error) {
    console.error('❌ [AUTH MIDDLEWARE] Error en autenticación:', error);
    res.status(401).json({
      success: false,
      message: 'Not authorized to access this route',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Grant access to specific roles
export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: `User role ${req.user.role} is not authorized to access this route`
      });
      return;
    }
    
    next();
  };
}; 