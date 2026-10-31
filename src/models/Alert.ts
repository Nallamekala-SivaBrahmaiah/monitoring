import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAlert extends Document {
  provider: 'aws' | 'azure';
  resourceId?: string;
  resourceName?: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  region?: string;
  status: 'active' | 'acknowledged' | 'resolved';
  timestamp: Date;
}

const AlertSchema: Schema<IAlert> = new Schema(
  {
    provider: {
      type: String,
      required: true,
      enum: ['aws', 'azure'],
      index: true,
    },
    resourceId: {
      type: String,
      index: true,
    },
    resourceName: {
      type: String,
    },
    severity: {
      type: String,
      enum: ['critical', 'warning', 'info'],
      default: 'warning',
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
    region: {
      type: String,
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
  },
  {
    timestamps: true,
  }
);

AlertSchema.index({ provider: 1, status: 1, timestamp: -1 });

export const Alert: Model<IAlert> =
  mongoose.models.Alert || mongoose.model<IAlert>('Alert', AlertSchema);

export default Alert;
