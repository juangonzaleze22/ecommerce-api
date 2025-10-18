import { Request } from 'express';

export interface ShippingAgency {
  agencia_id: number;
  estado_id: number;
  nombre: string;
  codigo: string;
  direccion: string;
  latitud: string;
  longitud: string;
  estado: string;
}

export interface RegisterUserData {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role?: 'CLIENT' | 'ADMIN';
  profileImage?: string;
  shippingAgencies?: ShippingAgency[];
}

export interface UserResponseData {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  profileImage?: string;
  profileImageUrl?: string;
  shippingAgencies?: ShippingAgency[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminResponseData {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  profileImage?: string;
  profileImageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RequestWithUser extends Request {
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  file?: Express.Multer.File;
} 