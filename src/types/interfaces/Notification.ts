export interface NotificationData {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  channel: NotificationChannel;
  priority?: NotificationPriority;
  data?: any;
}

export interface NotificationResponseData {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  channel: NotificationChannel;
  status: NotificationStatus;
  priority: NotificationPriority;
  data?: any;
  sentAt?: Date;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationTemplateData {
  name: string;
  type: NotificationType;
  channel: NotificationChannel;
  subject?: string;
  content: string;
  variables: string[];
}

export interface NotificationPreferenceData {
  userId: string;
  type: NotificationType;
  emailEnabled: boolean;
  pushEnabled: boolean;
  smsEnabled: boolean;
  inAppEnabled: boolean;
}

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

export interface SMSConfig {
  accountSid: string;
  authToken: string;
  fromNumber: string;
}

export interface PushConfig {
  serverKey: string;
  projectId: string;
}

export type NotificationType = 
  | 'ORDER_CREATED'
  | 'ORDER_PAYMENT_APPROVED'
  | 'ORDER_PAYMENT_REJECTED'
  | 'ORDER_PROCESSING'
  | 'ORDER_SHIPPED'
  | 'ORDER_DELIVERED'
  | 'ORDER_CANCELLED'
  | 'ORDER_REFUNDED'
  | 'STOCK_LOW'
  | 'PRODUCT_BACK_IN_STOCK'
  | 'PRICE_DROP'
  | 'NEW_PRODUCT'
  | 'NEW_REVIEW'
  | 'WISHLIST_ITEM_AVAILABLE'
  | 'PROMO_CODE'
  | 'DISCOUNT_AVAILABLE'
  | 'ACCOUNT_SECURITY'
  | 'SYSTEM_MAINTENANCE'
  | 'WELCOME'
  | 'PASSWORD_RESET'
  | 'ACCOUNT_VERIFICATION';

export type NotificationChannel = 
  | 'EMAIL'
  | 'PUSH'
  | 'SMS'
  | 'IN_APP'
  | 'WEBHOOK';

export type NotificationStatus = 
  | 'PENDING'
  | 'SENT'
  | 'FAILED'
  | 'DELIVERED'
  | 'READ';

export type NotificationPriority = 
  | 'LOW'
  | 'MEDIUM'
  | 'HIGH'
  | 'URGENT';
