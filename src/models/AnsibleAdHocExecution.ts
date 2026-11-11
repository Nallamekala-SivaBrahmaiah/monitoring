import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAdHocWorkerResult {
  workerId: string;
  workerName: string;
  workerIp: string;
  status: 'SUCCESS' | 'CHANGED' | 'FAILED' | 'UNREACHABLE';
  stdout: string;
  stderr: string;
  returnCode: number;
  durationMs: number;
  executionTime?: string;
}

export interface IAnsibleAdHocExecutionData {
  _id?: string;
  jobId: string;
  controllerId: string;
  controllerName: string;
  targetScope: 'all' | 'single' | 'multiple';
  targetWorkerIds: string[];
  targetWorkerNames: string[];
  moduleName: string;
  commandArgs: string;
  status: 'RUNNING' | 'SUCCESS' | 'FAILED' | 'PARTIAL' | 'CANCELLED';
  startTime: Date;
  endTime?: Date | null;
  durationMs: number;
  durationFormatted: string;
  logs: string;
  workerResults: IAdHocWorkerResult[];
  errorMessage?: string | null;
  executedBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IAnsibleAdHocExecution extends Document {
  jobId: string;
  controllerId: mongoose.Types.ObjectId;
  controllerName: string;
  targetScope: 'all' | 'single' | 'multiple';
  targetWorkerIds: mongoose.Types.ObjectId[];
  targetWorkerNames: string[];
  moduleName: string;
  commandArgs: string;
  status: 'RUNNING' | 'SUCCESS' | 'FAILED' | 'PARTIAL' | 'CANCELLED';
  startTime: Date;
  endTime: Date | null;
  durationMs: number;
  durationFormatted: string;
  logs: string;
  workerResults: IAdHocWorkerResult[];
  errorMessage: string | null;
  executedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const AdHocWorkerResultSchema = new Schema<IAdHocWorkerResult>(
  {
    workerId: { type: String, required: true },
    workerName: { type: String, required: true },
    workerIp: { type: String, required: true },
    status: {
      type: String,
      enum: ['SUCCESS', 'CHANGED', 'FAILED', 'UNREACHABLE'],
      required: true,
    },
    stdout: { type: String, default: '' },
    stderr: { type: String, default: '' },
    returnCode: { type: Number, default: 0 },
    durationMs: { type: Number, default: 0 },
    executionTime: { type: String, default: '' },
  },
  { _id: false }
);

const AnsibleAdHocExecutionSchema = new Schema<IAnsibleAdHocExecution>(
  {
    jobId: { type: String, required: true, unique: true, index: true },
    controllerId: { type: Schema.Types.ObjectId, ref: 'AnsibleController', required: true, index: true },
    controllerName: { type: String, required: true },
    targetScope: {
      type: String,
      enum: ['all', 'single', 'multiple'],
      default: 'multiple',
    },
    targetWorkerIds: [{ type: Schema.Types.ObjectId, ref: 'AnsibleHost' }],
    targetWorkerNames: { type: [String], default: [] },
    moduleName: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    commandArgs: { type: String, default: '' },
    status: {
      type: String,
      enum: ['RUNNING', 'SUCCESS', 'FAILED', 'PARTIAL', 'CANCELLED'],
      default: 'RUNNING',
      index: true,
    },
    startTime: { type: Date, required: true, default: Date.now },
    endTime: { type: Date, default: null },
    durationMs: { type: Number, default: 0 },
    durationFormatted: { type: String, default: '0s' },
    logs: { type: String, default: '' },
    workerResults: { type: [AdHocWorkerResultSchema], default: [] },
    errorMessage: { type: String, default: null },
    executedBy: { type: String, default: 'Admin' },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for fast controller-scoped filtering
AnsibleAdHocExecutionSchema.index({ controllerId: 1, createdAt: -1 });
AnsibleAdHocExecutionSchema.index({ controllerId: 1, status: 1 });
AnsibleAdHocExecutionSchema.index({ controllerId: 1, moduleName: 1 });

const AnsibleAdHocExecution: Model<IAnsibleAdHocExecution> =
  mongoose.models.AnsibleAdHocExecution ||
  mongoose.model<IAnsibleAdHocExecution>('AnsibleAdHocExecution', AnsibleAdHocExecutionSchema);

export default AnsibleAdHocExecution;

