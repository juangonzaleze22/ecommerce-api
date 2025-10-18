export interface OrderProductData {
  productId: string; // product ID
  quantity: number;
  price: number;
}

export interface OrderData {
  products: OrderProductData[];
  total: number;
  shippingAddress: string;
}

export interface OrderResponseData {
  id: string;
  userId: string;
  orderItems: OrderProductData[];
  status: string;
  total: number;
  shippingAddress: string;
  createdAt: Date;
  updatedAt: Date;
} 