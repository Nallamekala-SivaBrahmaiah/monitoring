import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAlertHistory {
  timestamp: Date;
  status: 'active' | 'acknowledged' | 'resolved';
  value: number;
  message: string;
}

export interface IAlert extends Document {
  alertKey: string; // composite key: `${resourceId}:${metricName}:${filesystem || ''}`
  provider: string; // 'aws' | 'azure' | 'other' | 'custom'
  resourceId: string;
  resourceName: string;
  resourceType: string;
  severity: 'critical' | 'high' | 'warning' | 'info';
  metricName: 'cpu' | 'memory' | 'disk';
  filesystem?: string; // mount point for disk alerts, e.g. '/'
  value: number; // actual metric value, e.g. 85
  peakValue?: number | null; // peak value during alert lifecycle
  threshold: number; // configured threshold, e.g. 70
  title: string;
  message: string;
  region?: string;
  status: 'active' | 'acknowledged' | 'resolved';
  timestamp: Date; // trigger timestamp
  triggeredAt: Date;
  lastEvaluatedAt: Date;
  resolvedAt?: Date | null;
  acknowledgedAt?: Date | null;
  notificationSentAt?: Date | null;
  emailSentAt?: Date | null;
  resolvedEmailSentAt?: Date | null;
  lastNotifiedTier?: number; // e.g. 70, 80, 90
  history: IAlertHistory[];
  createdAt: Date;
  updatedAt: Date;
}

const AlertHistorySchema = new Schema<IAlertHistory>(
  {
    timestamp: { type: Date, default: Date.now },
    status: { type: String, enum: ['active', 'acknowledged', 'resolved'], required: true },
    value: { type: Number, required: true },
    message: { type: String, required: true },
  },
  { _id: false }
);

const AlertSchema: Schema<IAlert> = new Schema(
  {
    alertKey: {
      type: String,
      required: true,
      index: true,
    },
    provider: {
      type: String,
      required: true,
      index: true,
    },
    resourceId: {
      type: String,
      required: true,
      index: true,
    },
    resourceName: {
      type: String,
      required: true,
      default: 'Unknown Resource',
    },
    resourceType: {
      type: String,
      default: 'Server',
    },
    severity: {
      type: String,
      enum: ['critical', 'high', 'warning', 'info'],
      default: 'warning',
      index: true,
    },
    metricName: {
      type: String,
      enum: ['cpu', 'memory', 'disk'],
      required: true,
      index: true,
    },
    filesystem: {
      type: String,
      default: '',
    },
    value: {
      type: Number,
      required: true,
    },
    peakValue: {
      type: Number,
      default: null,
    },
    threshold: {
      type: Number,
      required: true,
      default: 70,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    region: {
      type: String,
      default: 'global',
    },
    status: {
      type: String,
      enum: ['active', 'acknowledged', 'resolved'],
      default: 'active',
      index: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    triggeredAt: {
      type: Date,
      default: Date.now,
    },
    lastEvaluatedAt: {
      type: Date,
      default: Date.now,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    acknowledgedAt: {
      type: Date,
      default: null,
    },
    notificationSentAt: {
      type: Date,
      default: null,
    },
    emailSentAt: {
      type: Date,
      default: null,
    },
    resolvedEmailSentAt: {
      type: Date,
      default: null,
    },
    lastNotifiedTier: {
      type: Number,
      default: 70,
    },
    history: {
      type: [AlertHistorySchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

AlertSchema.index({ alertKey: 1, status: 1 });
AlertSchema.index({ provider: 1, status: 1, timestamp: -1 });
AlertSchema.index({ status: 1, metricName: 1 });

if (mongoose.models.Alert) {
  delete (mongoose.models as any).Alert;
}

export const Alert: Model<IAlert> = mongoose.model<IAlert>('Alert', AlertSchema);

export default Alert;
