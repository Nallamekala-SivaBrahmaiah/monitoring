import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IDeploymentRecord extends Document {
  deploymentId: string;
  projectName: string;
  appName: string;
  environment: 'production' | 'staging' | 'development' | 'testing';
  platform: 'aws' | 'azure' | 'onprem' | 'kubernetes';
  targetServer: string;
  clusterName?: string;
  repository?: string;
  branch?: string;
  commitId?: string;
  buildVersion?: string;
  dockerImage?: string;
  startTime: Date;
  completionTime?: Date | null;
  durationSeconds: number;
  status:
    | 'started'
    | 'in_progress'
    | 'successful'
    | 'failed'
    | 'rolled_back'
    | 'cancelled';
  logs?: string;
  rollbackInfo?: string;
  initiatingUser: string;
  workSessionId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const DeploymentRecordSchema: Schema = new Schema(
  {
    deploymentId: { type: String, required: true, unique: true, index: true },
    projectName: { type: String, required: true, default: 'MultiCloud App' },
    appName: { type: String, required: true },
    environment: {
      type: String,
      enum: ['production', 'staging', 'development', 'testing'],
      default: 'production',
      index: true,
    },
    platform: {
      type: String,
      enum: ['aws', 'azure', 'onprem', 'kubernetes'],
      default: 'onprem',
      index: true,
    },
    targetServer: { type: String, required: true },
    clusterName: { type: String, default: '' },
    repository: { type: String, default: '' },
    branch: { type: String, default: 'main' },
    commitId: { type: String, default: '' },
    buildVersion: { type: String, default: 'v1.0.0' },
    dockerImage: { type: String, default: '' },
    startTime: { type: Date, default: Date.now, index: true },
    completionTime: { type: Date, default: null },
    durationSeconds: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['started', 'in_progress', 'successful', 'failed', 'rolled_back', 'cancelled'],
      default: 'successful',
      index: true,
    },
    logs: { type: String, default: '' },
    rollbackInfo: { type: String, default: '' },
    initiatingUser: { type: String, default: 'DevOps Engineer' },
    workSessionId: { type: String, default: null, index: true },
  },
  { timestamps: true }
);

DeploymentRecordSchema.index({ status: 1, startTime: -1 });

if (mongoose.models.DeploymentRecord) {
  delete (mongoose.models as any).DeploymentRecord;
}

export const DeploymentRecord: Model<IDeploymentRecord> =
  mongoose.model<IDeploymentRecord>('DeploymentRecord', DeploymentRecordSchema);

export default DeploymentRecord;
