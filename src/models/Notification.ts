import mongoose, { Schema, Document, Model } from 'mongoose';

export interface INotification extends Document {
  userId: string;
  alertId?: string;
  title: string;
  message: string;
  severity: 'critical' | 'high' | 'warning' | 'info';
  provider: string;
  resourceName: string;
  resourceId: string;
  metricName: 'cpu' | 'memory' | 'disk' | string;
  filesystem?: string;
  value: number;
  threshold: number;
  type: 'threshold_alert' | 'alert_resolved' | 'test' | 'system';
  read: boolean;
  link?: string;
  emailDeliveryStatus: 'sent' | 'failed' | 'skipped' | 'none';
  emailDeliveryError?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema: Schema<INotification> = new Schema(
  {
    userId: {
      type: String,
      default: 'admin',
      index: true,
    },
    alertId: {
      type: String,
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    severity: {
      type: String,
      enum: ['critical', 'high', 'warning', 'info'],
      default: 'warning',
      index: true,
    },
    provider: {
      type: String,
      default: 'other',
    },
    resourceName: {
      type: String,
      required: true,
    },
    resourceId: {
      type: String,
      required: true,
    },
    metricName: {
      type: String,
      default: 'cpu',
    },
    filesystem: {
      type: String,
      default: '',
    },
    value: {
      type: Number,
      default: 0,
    },
    threshold: {
      type: Number,
      default: 70,
    },
    type: {
      type: String,
      enum: ['threshold_alert', 'alert_resolved', 'test', 'system'],
      default: 'threshold_alert',
      index: true,
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
    link: {
      type: String,
      default: '/dashboard/alerts',
    },
    emailDeliveryStatus: {
      type: String,
      enum: ['sent', 'failed', 'skipped', 'none'],
      default: 'none',
    },
    emailDeliveryError: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

NotificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
NotificationSchema.index({ createdAt: -1 });

if (mongoose.models.Notification) {
  delete (mongoose.models as any).Notification;
}

export const Notification: Model<INotification> =
  mongoose.model<INotification>('Notification', NotificationSchema);

export default Notification;

