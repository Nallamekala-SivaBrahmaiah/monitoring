import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IScheduleExecutionHistory extends Document {
  scheduleId?: mongoose.Types.ObjectId | string;
  scheduleName: string;
  serverName: string;
  resourceId: string;
  provider: 'aws' | 'azure';
  region: string;
  action: 'START' | 'STOP';
  triggerType: 'SCHEDULED' | 'MANUAL';
  scheduledExecutionTime: Date;
  actualExecutionTime: Date;
  previousState: string;
  newState: string;
  status: 'SUCCESS' | 'FAILED';
  errorDetails?: string | null;
  durationMs: number;
  createdAt: Date;
}

const ScheduleExecutionHistorySchema: Schema<IScheduleExecutionHistory> = new Schema(
  {
    scheduleId: {
      type: Schema.Types.ObjectId,
      ref: 'ServerSchedule',
      index: true,
    },
    scheduleName: {
      type: String,
      required: true,
      trim: true,
    },
    serverName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    resourceId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    provider: {
      type: String,
      required: true,
      enum: ['aws', 'azure'],
      index: true,
    },
    region: {
      type: String,
      required: true,
      trim: true,
    },
    action: {
      type: String,
      required: true,
      enum: ['START', 'STOP'],
      index: true,
    },
    triggerType: {
      type: String,
      required: true,
      enum: ['SCHEDULED', 'MANUAL'],
      default: 'SCHEDULED',
    },
    scheduledExecutionTime: {
      type: Date,
      required: true,
    },
    actualExecutionTime: {
      type: Date,
      default: Date.now,
      index: true,
    },
    previousState: {
      type: String,
      default: 'Unknown',
    },
    newState: {
      type: String,
      default: 'Unknown',
    },
    status: {
      type: String,
      required: true,
      enum: ['SUCCESS', 'FAILED'],
      index: true,
    },
    errorDetails: {
      type: String,
      default: null,
    },
    durationMs: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Indexes for fast searching and filtering
ScheduleExecutionHistorySchema.index({ provider: 1, status: 1, actualExecutionTime: -1 });

export const ScheduleExecutionHistory: Model<IScheduleExecutionHistory> =
  mongoose.models.ScheduleExecutionHistory ||
  mongoose.model<IScheduleExecutionHistory>(
    'ScheduleExecutionHistory',
    ScheduleExecutionHistorySchema
  );

export default ScheduleExecutionHistory;

