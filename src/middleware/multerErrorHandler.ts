import { Request, Response, NextFunction } from 'express';
import multer from 'multer';

export const multerErrorHandler = (err: any, req: Request, res: Response, next: NextFunction): void => {
  if (err instanceof multer.MulterError) {
    // Un error de Multer ocurrió durante la subida
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({
        success: false,
        message: 'El archivo es demasiado grande. Tamaño máximo: 5MB'
      });
      return;
    }
    
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      res.status(400).json({
        success: false,
        message: 'Campo de archivo no esperado'
      });
      return;
    }
    
    res.status(400).json({
      success: false,
      message: `Error en la subida de archivo: ${err.message}`
    });
    return;
  } else if (err) {
    // Un error no relacionado con Multer
    res.status(400).json({
      success: false,
      message: err.message || 'Error en la subida de archivo'
    });
    return;
  }
  
  next();
}; 