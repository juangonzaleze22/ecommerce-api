// Interfaces para Prisma - Reemplazando las interfaces de Mongoose

// User interfaces
export interface ShippingAgency {
  agencia_id: string;
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

export interface TokenResponseData {
  success: boolean;
  token: string;
  user: UserResponseData | AdminResponseData;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  error?: string;
}

// Request interfaces
export interface RequestWithUser extends Request {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  params: any;
  query: any;
  body: any;
}

// Product interfaces
export interface ProductData {
  name: string;
  description: string;
  price: number;
  stock: number;
  images?: string[];
  categoryId: string;
  brandId?: string;
  sizes?: string[];
  colors?: string[];
  shoeSizes?: string[];
  discount?: number;
  isActive?: boolean;
}

export interface ProductResponseData {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  images: string[];
  discount: number;
  isActive: boolean;
  sizes: string[];
  colors: string[];
  shoeSizes: string[];
  category: {
    id: string;
    name: string;
  };
  brand?: {
    id: string;
    name: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Category interfaces
export interface CategoryData {
  name: string;
  description?: string;
  image?: string;
  isActive?: boolean;
}

export interface CategoryResponseData {
  id: string;
  name: string;
  description?: string;
  image?: string;
  isActive: boolean;
  count?: number;
  createdAt: Date;
  updatedAt: Date;
}

// Brand interfaces
export interface BrandData {
  name: string;
  description?: string;
  image?: string;
  isActive?: boolean;
}

export interface BrandResponseData {
  id: string;
  name: string;
  description?: string;
  image?: string;
  isActive: boolean;
  count?: number;
  createdAt: Date;
  updatedAt: Date;
}

// Order interfaces
export interface OrderData {
  items: Array<{
    productId: string;
    quantity: number;
    selectedSize?: string;
    selectedColor?: string;
    selectedShoeSize?: string;
  }>;
  currency: string;
  shippingAddress: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  paymentInfo: {
    method: string;
    comprobanteFile?: any;
  };
  notes?: string;
}

export interface OrderResponseData {
  id: string;
  userId: string;
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  currency: string;
  status: 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED';
  paymentMethod: string;
  paymentStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  comprobanteFile?: string;
  notes?: string;
  shippingAddress?: any;
  paymentInfo?: any;
  orderItems: Array<{
    id: string;
    productId: string;
    quantity: number;
    price: number;
    selectedSize?: string;
    selectedColor?: string;
    selectedShoeSize?: string;
    productName?: string;
    productImage?: string;
    product: {
      id: string;
      name: string;
      price: number;
      oldPrice?: number;
      discount: number;
      images: string[];
    };
  }>;
  user: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Cart interfaces
export interface CartItemData {
  productId: string;
  quantity: number;
}

export interface CartResponseData {
  id: string;
  userId: string;
  cartItems: Array<{
    id: string;
    productId: string;
    quantity: number;
    product: {
      id: string;
      name: string;
      price: number;
      images: string[];
      discount: number;
    };
  }>;
  createdAt: Date;
  updatedAt: Date;
}

// Review interfaces
export interface ReviewData {
  productId: string;
  rating: number;
  comment: string;
}

export interface ReviewResponseData {
  id: string;
  productId: string;
  userId: string;
  rating: number;
  comment: string;
  status: string;
  user: {
    id: string;
    name: string;
    profileImage?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

// State interfaces
export interface StateData {
  name: string;
  code: string;
}

export interface StateResponseData {
  id: string;
  name: string;
  code: string;
  createdAt: Date;
  updatedAt: Date;
}

// Response interfaces
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  count?: number;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Export all interfaces
export * from './User';
export * from './Product';
export * from './Category';
export * from './Brand';
export * from './Order';
export * from './Cart';
export * from './Review';
export * from './Response';
export * from './Notification'; 