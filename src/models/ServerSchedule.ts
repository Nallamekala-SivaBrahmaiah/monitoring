import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IServerScheduleData {
  _id: string;
  name: string;
  provider: 'aws' | 'azure';
  resourceId: string;
  serverName: string;
  region: string;
  startTime: string; // "09:00"
  stopTime: string;  // "19:00"
  timezone: string;  // "Asia/Kolkata"
  daysOfWeek: string[]; // ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
  enabled: boolean;
  isPaused: boolean;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  currentState: 'Running' | 'Stopped' | 'Starting' | 'Stopping' | 'Unknown';
  lastAction: 'START' | 'STOP' | 'NONE';
  lastActionAt?: Date | string | null;
  lastActionStatus: 'Success' | 'Failed' | 'Pending' | 'None';
  lastActionKey?: string | null;
  lastStartKey?: string | null;
  lastStopKey?: string | null;
  nextAction?: 'START' | 'STOP' | 'NONE';
  nextActionAt?: Date | string | null;
  failureCount: number;
  lastError?: string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface IServerSchedule extends Document {
  name: string;
  provider: 'aws' | 'azure';
  resourceId: string;
  serverName: string;
  region: string;
  startTime: string; // "09:00"
  stopTime: string;  // "19:00"
  timezone: string;  // "Asia/Kolkata"
  daysOfWeek: string[]; // ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
  enabled: boolean;
  isPaused: boolean;
  startDate?: Date | null;
  endDate?: Date | null;
  currentState: 'Running' | 'Stopped' | 'Starting' | 'Stopping' | 'Unknown';
  lastAction: 'START' | 'STOP' | 'NONE';
  lastActionAt?: Date | null;
  lastActionStatus: 'Success' | 'Failed' | 'Pending' | 'None';
  lastActionKey?: string | null;
  lastStartKey?: string | null;
  lastStopKey?: string | null;
  nextAction?: 'START' | 'STOP' | 'NONE';
  nextActionAt?: Date | null;
  failureCount: number;
  lastError?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const ServerScheduleSchema: Schema<IServerSchedule> = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    provider: {
      type: String,
      required: true,
      enum: ['aws', 'azure'],
      index: true,
    },
    resourceId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    serverName: {
      type: String,
      required: true,
      trim: true,
    },
    region: {
      type: String,
      required: true,
      trim: true,
      default: 'ap-southeast-2',
    },
    startTime: {
      type: String,
      required: true,
      default: '09:00',
    },
    stopTime: {
      type: String,
      required: true,
      default: '19:00',
    },
    timezone: {
      type: String,
      required: true,
      default: 'Asia/Kolkata',
    },
    daysOfWeek: {
      type: [String],
      required: true,
      default: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    },
    enabled: {
      type: Boolean,
      default: true,
      index: true,
    },
    isPaused: {
      type: Boolean,
      default: false,
    },
    startDate: {
      type: Date,
      default: null,
    },
    endDate: {
      type: Date,
      default: null,
    },
    currentState: {
      type: String,
      enum: ['Running', 'Stopped', 'Starting', 'Stopping', 'Unknown'],
      default: 'Unknown',
    },
    lastAction: {
      type: String,
      enum: ['START', 'STOP', 'NONE'],
      default: 'NONE',
    },
    lastActionAt: {
      type: Date,
      default: null,
    },
    lastActionStatus: {
      type: String,
      enum: ['Success', 'Failed', 'Pending', 'None'],
      default: 'None',
    },
    lastActionKey: {
      type: String,
      default: null,
      index: true,
    },
    lastStartKey: {
      type: String,
      default: null,
    },
    lastStopKey: {
      type: String,
      default: null,
    },
    nextAction: {
      type: String,
      enum: ['START', 'STOP', 'NONE'],
      default: 'NONE',
    },
    nextActionAt: {
      type: Date,
      default: null,
    },
    failureCount: {
      type: Number,
      default: 0,
    },
    lastError: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure uniqueness per resource if desired
ServerScheduleSchema.index({ provider: 1, resourceId: 1 });

export const ServerSchedule: Model<IServerSchedule> =
  mongoose.models.ServerSchedule ||
  mongoose.model<IServerSchedule>('ServerSchedule', ServerScheduleSchema);

export default ServerSchedule;
