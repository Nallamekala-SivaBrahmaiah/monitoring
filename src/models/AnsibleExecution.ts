import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAnsibleTaskRecap {
  ok: number;
  changed: number;
  unreachable: number;
  failed: number;
  skipped: number;
}

export interface IAnsibleExecutionTask {
  name: string;
  status: 'ok' | 'changed' | 'failed' | 'skipped' | 'unreachable';
  output?: string;
  durationMs?: number;
}

export interface IAnsibleExecutionData {
  _id?: string;
  jobId: string;
  controllerId?: string;
  controllerName?: string;
  playbookId?: string;
  playbookName: string;
  hostId?: string;
  hostName: string;
  hostIp: string;
  targetWorkerIds?: string[];
  targetWorkerNames?: string[];
  extraVars?: string;
  status: 'RUNNING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
  startTime: Date;
  endTime?: Date | null;
  durationSeconds: number;
  logs: string;
  tasks?: IAnsibleExecutionTask[];
  recap?: IAnsibleTaskRecap;
  errorMessage?: string | null;
  executedBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IAnsibleExecution extends Document {
  jobId: string;
  controllerId?: any;
  controllerName?: string;
  playbookId?: any;
  playbookName: string;
  hostId?: any;
  hostName: string;
  hostIp: string;
  targetWorkerIds: any[];
  targetWorkerNames: string[];
  extraVars: string;
  status: 'RUNNING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
  startTime: Date;
  endTime: Date | null;
  durationSeconds: number;
  logs: string;
  tasks: IAnsibleExecutionTask[];
  recap: IAnsibleTaskRecap;
  errorMessage: string | null;
  executedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const AnsibleExecutionSchema = new Schema<IAnsibleExecution>(
  {
    jobId: { type: String, required: true, unique: true, index: true },
    controllerId: { type: Schema.Types.ObjectId, ref: 'AnsibleController', index: true },
    controllerName: { type: String, trim: true },
    playbookId: { type: Schema.Types.ObjectId, ref: 'AnsiblePlaybook', index: true },
    playbookName: { type: String, required: true, index: true },
    hostId: { type: Schema.Types.ObjectId, ref: 'AnsibleHost', index: true },
    hostName: { type: String, required: true, index: true },
    hostIp: { type: String, required: true },
    targetWorkerIds: [{ type: Schema.Types.ObjectId, ref: 'AnsibleHost' }],
    targetWorkerNames: { type: [String], default: [] },
    extraVars: { type: String, default: '' },
    status: {
      type: String,
      enum: ['RUNNING', 'SUCCESS', 'FAILED', 'CANCELLED'],
      default: 'RUNNING',
      index: true,
    },
    startTime: { type: Date, required: true, default: Date.now },
    endTime: { type: Date, default: null },
    durationSeconds: { type: Number, default: 0 },
    logs: { type: String, default: '' },
    tasks: [
      {
        name: { type: String, required: true },
        status: {
          type: String,
          enum: ['ok', 'changed', 'failed', 'skipped', 'unreachable'],
          required: true,
        },
        output: { type: String },
        durationMs: { type: Number },
      },
    ],
    recap: {
      ok: { type: Number, default: 0 },
      changed: { type: Number, default: 0 },
      unreachable: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
      skipped: { type: Number, default: 0 },
    },
    errorMessage: { type: String, default: null },
    executedBy: { type: String, default: 'Admin' },
  },
  {
    timestamps: true,
  }
);

const AnsibleExecution: Model<IAnsibleExecution> =
  mongoose.models.AnsibleExecution ||
  mongoose.model<IAnsibleExecution>('AnsibleExecution', AnsibleExecutionSchema);

export default AnsibleExecution;
