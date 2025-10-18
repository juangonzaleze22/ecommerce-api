import { Request, Response } from 'express';
import { AppResponse } from '../types';

// Controlador para la página de inicio
export const welcome = (req: Request, res: Response): void => {
  const responseData: AppResponse = {
    mensaje: '¡Bienvenido a tuEstadoApi!',
    estado: 'online',
    version: '1.0.0'
  };
  
  res.json(responseData);
}; 