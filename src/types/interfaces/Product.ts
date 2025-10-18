export interface ProductData {
  name: string;
  description: string;
  price: number;
  stock: number;
  images: string[];
  category: string;
  brand?: string;
  sizes?: string[];
  colors?: string[];
  shoeSizes?: string[];
  discount?: number;
  isActive?: boolean;
}

export interface ProductResponseData {
  _id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  images: string[];
  category: {
    _id: string;
    name: string;
    description?: string;
    image?: string;
  };
  brand?: {
    _id: string;
    name: string;
    description?: string;
    image?: string;
  };
  sizes?: string[];
  colors?: string[];
  shoeSizes?: string[];
  discount?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
} 