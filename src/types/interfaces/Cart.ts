export interface CartProductData {
  product: string; // product ID
  quantity: number;
}

export interface CartData {
  user: string; // user ID
  products: CartProductData[];
}

export interface CartResponseData {
  _id: string;
  user: string;
  products: CartProductData[];
  createdAt: Date;
  updatedAt: Date;
} 