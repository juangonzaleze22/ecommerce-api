export interface BrandData {
  name: string;
  description?: string;
  image?: string;
  isActive?: boolean;
}

export interface BrandResponseData {
  _id: string;
  name: string;
  description?: string;
  image?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
} 