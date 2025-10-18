// Tipos básicos para la aplicación

export interface AppResponse {
  mensaje: string;
  estado: string;
  version: string;
}

// Estados de validación de pago
export type PaymentValidationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

// Estados de la orden
export type OrderStatus = 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'; 