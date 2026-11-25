import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IToolExecutionProgress {
  toolId: string;
  toolName: string;
  version?: string;
  status: 'pending' | 'installing' | 'success' | 'failed' | 'skipped';
  exitCode?: number;
  durationSeconds?: number;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
}

export interface IAutomationExecution extends Document {
  serverId: string;
  serverName: string;
  serverHost: string;
  serverOs?: string;
  environment?: string;
  executionType: 'tool-installation' | 'custom-script';
  selectedTools: IToolExecutionProgress[];
  scriptId?: string;
  scriptName?: string;
  status: 'queued' | 'running' | 'success' | 'failed' | 'cancelled' | 'partial';
  logOutput: string;
  exitCode: number;
  startedAt: Date;
  completedAt?: Date;
  durationSeconds: number;
  initiatedBy: string;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ToolExecutionProgressSchema = new Schema({
  toolId: { type: String, required: true },
  toolName: { type: String, required: true },
  version: { type: String },
  status: {
    type: String,
    enum: ['pending', 'installing', 'success', 'failed', 'skipped'],
    default: 'pending',
  },
  exitCode: { type: Number },
  durationSeconds: { type: Number, default: 0 },
  error: { type: String },
  startedAt: { type: Date },
  completedAt: { type: Date },
});

const AutomationExecutionSchema: Schema = new Schema(
  {
    serverId: { type: String, required: true, index: true },
    serverName: { type: String, required: true },
    serverHost: { type: String, required: true },
    serverOs: { type: String, default: 'Linux' },
    environment: { type: String, default: 'production' },
    executionType: {
      type: String,
      enum: ['tool-installation', 'custom-script'],
      required: true,
    },
    selectedTools: [ToolExecutionProgressSchema],
    scriptId: { type: String },
    scriptName: { type: String },
    status: {
      type: String,
      enum: ['queued', 'running', 'success', 'failed', 'cancelled', 'partial'],
      default: 'queued',
      index: true,
    },
    logOutput: { type: String, default: '' },
    exitCode: { type: Number, default: 0 },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
    durationSeconds: { type: Number, default: 0 },
    initiatedBy: { type: String, default: 'Admin' },
    errorMessage: { type: String },
  },
  { timestamps: true }
);

AutomationExecutionSchema.index({ createdAt: -1 });
AutomationExecutionSchema.index({ serverId: 1, createdAt: -1 });

const AutomationExecution: Model<IAutomationExecution> =
  mongoose.models.AutomationExecution ||
  mongoose.model<IAutomationExecution>('AutomationExecution', AutomationExecutionSchema);

export default AutomationExecution;
