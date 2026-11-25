import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITerraformExecution extends Document {
  projectId: mongoose.Types.ObjectId;
  projectName: string;
  provider: 'aws' | 'azure';
  workspace: string;
  environment: string;
  operation: 'init' | 'validate' | 'fmt' | 'plan' | 'apply' | 'destroy' | 'import' | 'state';
  serverId?: mongoose.Types.ObjectId | string;
  serverName?: string;
  terraformVersion: string;
  status: 'queued' | 'running' | 'successful' | 'failed' | 'cancelled';
  startedAt: Date;
  completedAt?: Date;
  durationMs: number;
  initiator: string;
  planSummary?: {
    toAdd: number;
    toChange: number;
    toDestroy: number;
    toReplace: number;
    rawText?: string;
  };
  resourceChanges?: Array<{
    action: 'create' | 'update' | 'delete' | 'replace' | 'no-op';
    address: string;
    type: string;
    name: string;
  }>;
  logs: string;
  error?: string;
  exitCode?: number;
  createdAt: Date;
  updatedAt: Date;
}

const TerraformExecutionSchema = new Schema<ITerraformExecution>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'TerraformProject', required: true, index: true },
    projectName: { type: String, required: true },
    provider: { type: String, required: true, enum: ['aws', 'azure'] },
    workspace: { type: String, default: 'default' },
    environment: { type: String, default: 'dev' },
    operation: {
      type: String,
      required: true,
      enum: ['init', 'validate', 'fmt', 'plan', 'apply', 'destroy', 'import', 'state'],
      index: true,
    },
    serverId: { type: Schema.Types.ObjectId, ref: 'Server' },
    serverName: { type: String },
    terraformVersion: { type: String, default: '1.14.6' },
    status: {
      type: String,
      default: 'queued',
      enum: ['queued', 'running', 'successful', 'failed', 'cancelled'],
      index: true,
    },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
    durationMs: { type: Number, default: 0 },
    initiator: { type: String, default: 'DevOps Architect' },
    planSummary: {
      toAdd: { type: Number, default: 0 },
      toChange: { type: Number, default: 0 },
      toDestroy: { type: Number, default: 0 },
      toReplace: { type: Number, default: 0 },
      rawText: { type: String },
    },
    resourceChanges: [
      {
        action: { type: String, enum: ['create', 'update', 'delete', 'replace', 'no-op'] },
        address: String,
        type: String,
        name: String,
      },
    ],
    logs: { type: String, default: '' },
    error: { type: String },
    exitCode: { type: Number },
  },
  {
    timestamps: true,
  }
);

TerraformExecutionSchema.index({ projectId: 1, startedAt: -1 });

const TerraformExecution: Model<ITerraformExecution> =
  mongoose.models.TerraformExecution ||
  mongoose.model<ITerraformExecution>('TerraformExecution', TerraformExecutionSchema);

export default TerraformExecution;
