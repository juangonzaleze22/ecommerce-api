export interface CategoryData {
  name: string;
  description?: string;
  image?: string;
  isActive?: boolean;
}

export interface CategoryResponseData {
  _id: string;
  name: string;
  description?: string;
  image?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
} 