import { Request, Response, NextFunction } from 'express';

interface ErrorResponse extends Error {
  statusCode?: number;
  code?: number;
}

export const errorHandler = (
  err: ErrorResponse,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error(err);

  // Error de Prisma por duplicado (P2002)
  if (err.name === 'PrismaClientKnownRequestError' && (err as any).code === 'P2002') {
    res.status(400).json({
      success: false,
      message: 'Ya existe un registro con ese valor único'
    });
    return;
  }

  // Error de Prisma por registro no encontrado (P2025)
  if (err.name === 'PrismaClientKnownRequestError' && (err as any).code === 'P2025') {
    res.status(404).json({
      success: false,
      message: 'Recurso no encontrado'
    });
    return;
  }

  // Error de validación de Prisma
  if (err.name === 'PrismaClientValidationError') {
    res.status(400).json({
      success: false,
      message: 'Error de validación en los datos enviados',
      error: err.message
    });
    return;
  }

  // Error de ID no válido
  if (err.name === 'CastError') {
    const message = 'ID no válido o recurso no encontrado';
    res.status(404).json({
      success: false,
      message,
      error: err.message
    });
    return;
  }

  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Error del servidor',
    error: process.env.NODE_ENV === 'production' ? null : err.stack
  });
}; 