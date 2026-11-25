import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IActivityAuditLog extends Document {
  action: string;
  actor: string;
  targetType: string;
  targetId?: string;
  details: string;
  previousValue?: any;
  newValue?: any;
  ipAddress?: string;
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ActivityAuditLogSchema: Schema = new Schema(
  {
    action: { type: String, required: true, index: true },
    actor: { type: String, required: true, default: 'DevOps Engineer' },
    targetType: { type: String, required: true, default: 'Settings' },
    targetId: { type: String, default: '' },
    details: { type: String, required: true },
    previousValue: { type: Schema.Types.Mixed, default: null },
    newValue: { type: Schema.Types.Mixed, default: null },
    ipAddress: { type: String, default: '127.0.0.1' },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

ActivityAuditLogSchema.index({ action: 1, timestamp: -1 });

if (mongoose.models.ActivityAuditLog) {
  delete (mongoose.models as any).ActivityAuditLog;
}

export const ActivityAuditLog: Model<IActivityAuditLog> =
  mongoose.model<IActivityAuditLog>('ActivityAuditLog', ActivityAuditLogSchema);

export default ActivityAuditLog;
