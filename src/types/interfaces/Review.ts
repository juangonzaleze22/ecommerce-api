export interface ReviewData {
  product: string; // product ID
  user: string; // user ID
  rating: number;
  comment: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface ReviewResponseData {
  _id: string;
  product: string;
  user: string;
  rating: number;
  comment: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
} 