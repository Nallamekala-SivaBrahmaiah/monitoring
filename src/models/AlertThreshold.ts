import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAlertThreshold extends Document {
  cpuThreshold: number; // default 70
  memoryThreshold: number; // default 70
  diskThreshold: number; // default 70
  defaultSeverity: 'critical' | 'warning' | 'info'; // default warning
  criticalEscalationThreshold: number; // default 90
  reminderIntervalMinutes: number; // default 60
  enabled: boolean; // default true
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AlertThresholdSchema: Schema<IAlertThreshold> = new Schema(
  {
    cpuThreshold: {
      type: Number,
      required: true,
      default: 70,
      min: 1,
      max: 100,
    },
    memoryThreshold: {
      type: Number,
      required: true,
      default: 70,
      min: 1,
      max: 100,
    },
    diskThreshold: {
      type: Number,
      required: true,
      default: 70,
      min: 1,
      max: 100,
    },
    defaultSeverity: {
      type: String,
      enum: ['critical', 'warning', 'info'],
      default: 'warning',
    },
    criticalEscalationThreshold: {
      type: Number,
      default: 90,
      min: 1,
      max: 100,
    },
    reminderIntervalMinutes: {
      type: Number,
      default: 60,
    },
    enabled: {
      type: Boolean,
      default: true,
    },
    updatedBy: {
      type: String,
      default: 'admin',
    },
  },
  {
    timestamps: true,
  }
);

if (mongoose.models.AlertThreshold) {
  delete (mongoose.models as any).AlertThreshold;
}

export const AlertThreshold: Model<IAlertThreshold> =
  mongoose.model<IAlertThreshold>('AlertThreshold', AlertThresholdSchema);

export default AlertThreshold;
