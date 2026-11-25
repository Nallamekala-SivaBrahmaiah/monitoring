import mongoose, { Schema, Document, Model } from 'mongoose';

export type ActivityPlatform = 'aws' | 'azure' | 'onprem' | 'application';
export type ActivityStatus = 'success' | 'failed' | 'in_progress' | 'pending' | 'info';
export type ActivitySource =
  | 'Application Event'
  | 'AWS CloudTrail'
  | 'Azure Activity Log'
  | 'Server Audit'
  | 'Manual User Note';

export interface IActivityEvent extends Document {
  eventId: string; // Deduplication ID
  platform: ActivityPlatform;
  module: string;
  resourceType: string;
  resourceId: string;
  resourceName: string;
  action: string;
  status: ActivityStatus;
  previousState?: any;
  newState?: any;
  initiator: string;
  details?: string;
  metadata?: Record<string, any>;
  source: ActivitySource;
  workSessionId?: string | null;
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ActivityEventSchema: Schema = new Schema(
  {
    eventId: { type: String, required: true, unique: true, index: true },
    platform: {
      type: String,
      required: true,
      enum: ['aws', 'azure', 'onprem', 'application'],
      index: true,
    },
    module: { type: String, required: true, index: true },
    resourceType: { type: String, required: true, default: 'Resource' },
    resourceId: { type: String, default: '' },
    resourceName: { type: String, required: true },
    action: { type: String, required: true },
    status: {
      type: String,
      required: true,
      enum: ['success', 'failed', 'in_progress', 'pending', 'info'],
      default: 'success',
      index: true,
    },
    previousState: { type: Schema.Types.Mixed, default: null },
    newState: { type: Schema.Types.Mixed, default: null },
    initiator: { type: String, default: 'DevOps Engineer' },
    details: { type: String, default: '' },
    metadata: { type: Schema.Types.Mixed, default: {} },
    source: {
      type: String,
      enum: [
        'Application Event',
        'AWS CloudTrail',
        'Azure Activity Log',
        'Server Audit',
        'Manual User Note',
      ],
      default: 'Application Event',
      index: true,
    },
    workSessionId: { type: String, default: null, index: true },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

ActivityEventSchema.index({ platform: 1, timestamp: -1 });
ActivityEventSchema.index({ module: 1, timestamp: -1 });
ActivityEventSchema.index({ status: 1, timestamp: -1 });

if (mongoose.models.ActivityEvent) {
  delete (mongoose.models as any).ActivityEvent;
}

export const ActivityEvent: Model<IActivityEvent> =
  mongoose.model<IActivityEvent>('ActivityEvent', ActivityEventSchema);

export default ActivityEvent;
