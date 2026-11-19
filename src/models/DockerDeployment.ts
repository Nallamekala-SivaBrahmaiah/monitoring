import mongoose, { Schema, Document } from 'mongoose';

export interface IDockerDeploymentStep {
  name: string;
  status: 'SUCCESS' | 'FAILED' | 'RUNNING' | 'PENDING';
  logs: string;
  timestamp: string;
}

export interface IDockerDeploymentData {
  _id?: string;
  deploymentId: string;
  serverId: string;
  serverName: string;
  appName: string;
  status: 'PENDING' | 'BUILDING' | 'DEPLOYING' | 'SUCCESS' | 'FAILED' | 'ROLLED_BACK';
  gitCommit?: string;
  startTime: Date;
  endTime?: Date | null;
  durationSeconds?: number;
  steps: IDockerDeploymentStep[];
  logs: string;
  errorMessage?: string;
  previousImageTag?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IDockerDeploymentDocument extends Omit<IDockerDeploymentData, '_id'>, Document {}

const DockerDeploymentStepSchema = new Schema<IDockerDeploymentStep>(
  {
    name: { type: String, required: true },
    status: { type: String, enum: ['SUCCESS', 'FAILED', 'RUNNING', 'PENDING'], default: 'PENDING' },
    logs: { type: String, default: '' },
    timestamp: { type: String, default: () => new Date().toISOString() },
  },
  { _id: false }
);

const DockerDeploymentSchema = new Schema<IDockerDeploymentDocument>(
  {
    deploymentId: { type: String, required: true, unique: true, index: true },
    serverId: { type: String, required: true, index: true },
    serverName: { type: String, required: true },
    appName: { type: String, required: true },
    status: {
      type: String,
      enum: ['PENDING', 'BUILDING', 'DEPLOYING', 'SUCCESS', 'FAILED', 'ROLLED_BACK'],
      default: 'PENDING',
    },
    gitCommit: { type: String, default: '' },
    startTime: { type: Date, default: Date.now },
    endTime: { type: Date, default: null },
    durationSeconds: { type: Number, default: 0 },
    steps: [DockerDeploymentStepSchema],
    logs: { type: String, default: '' },
    errorMessage: { type: String, default: '' },
    previousImageTag: { type: String, default: '' },
  },
  { timestamps: true }
);

const DockerDeployment =
  mongoose.models.DockerDeployment ||
  mongoose.model<IDockerDeploymentDocument>('DockerDeployment', DockerDeploymentSchema);

export default DockerDeployment;

