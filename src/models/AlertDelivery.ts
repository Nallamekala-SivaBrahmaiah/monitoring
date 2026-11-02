import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAlertDelivery extends Document {
  alertId?: string;
  metricType: string; // 'CPU', 'Memory', 'Disk', 'Test'
  metricValue: number; // e.g. 90
  threshold: number; // e.g. 70
  severity: 'critical' | 'high' | 'warning' | 'info';
  serverName: string; // e.g. 'vm01'
  provider: string; // 'azure', 'aws', 'ssh'
  resourceId: string;
  recipientsCount: number;
  recipients: string[];
  deliveryStatus: 'Delivered' | 'Pending' | 'Failed' | 'No Recipients';
  deliveredAt: Date;
  readCount: number;
  unreadCount: number;
  openedAt?: Date | null;
  openedBy?: string | null;
  link?: string;
  smtpResponse?: string | null;
  error?: string | null;
  attemptCount: number;
  isTestEmail: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AlertDeliverySchema: Schema<IAlertDelivery> = new Schema(
  {
    alertId: {
      type: String,
      default: '',
      index: true,
    },
    metricType: {
      type: String,
      required: true,
      index: true,
    },
    metricValue: {
      type: Number,
      required: true,
    },
    threshold: {
      type: Number,
      required: true,
      default: 70,
    },
    severity: {
      type: String,
      enum: ['critical', 'high', 'warning', 'info'],
      default: 'warning',
      index: true,
    },
    serverName: {
      type: String,
      required: true,
      index: true,
    },
    provider: {
      type: String,
      required: true,
      default: 'azure',
    },
    resourceId: {
      type: String,
      required: true,
    },
    recipientsCount: {
      type: Number,
      required: true,
      default: 1,
    },
    recipients: {
      type: [String],
      default: [],
    },
    deliveryStatus: {
      type: String,
      enum: ['Delivered', 'Pending', 'Failed', 'No Recipients'],
      default: 'Delivered',
      index: true,
    },
    deliveredAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    readCount: {
      type: Number,
      default: 0,
    },
    unreadCount: {
      type: Number,
      default: 0,
    },
    openedAt: {
      type: Date,
      default: null,
    },
    openedBy: {
      type: String,
      default: null,
    },
    link: {
      type: String,
      default: '/dashboard/alerts',
    },
    smtpResponse: {
      type: String,
      default: null,
    },
    error: {
      type: String,
      default: null,
    },
    attemptCount: {
      type: Number,
      default: 1,
    },
    isTestEmail: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

AlertDeliverySchema.index({ deliveredAt: -1, isTestEmail: 1 });

if (mongoose.models.AlertDelivery) {
  delete (mongoose.models as any).AlertDelivery;
}

export const AlertDelivery: Model<IAlertDelivery> =
  mongoose.model<IAlertDelivery>('AlertDelivery', AlertDeliverySchema);

export default AlertDelivery;
