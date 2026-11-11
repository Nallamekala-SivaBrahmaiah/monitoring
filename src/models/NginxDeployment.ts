import mongoose, { Schema, Document, Model } from 'mongoose';

export interface INginxDeploymentData {
  _id?: string;
  deploymentId: string;
  appName: string;
  appType: 'nextjs' | 'nextjs-standalone' | 'vite' | 'react' | 'nodejs' | 'express' | 'custom';
  deploymentMode: 'static' | 'pm2-node' | 'pm2-next' | 'pm2-standalone' | 'custom';
  deploySource?: 'local' | 'git';
  gitRepoUrl?: string;
  gitBranch?: string;
  serverId: string;
  serverName: string;
  serverHost: string;
  deployDir: string;
  backupDir?: string;
  appPort?: number;
  domain?: string;
  pm2ProcessName?: string;
  startCommand?: string;
  envVars?: Record<string, string>;
  archiveName?: string;
  archiveSizeBytes?: number;
  status: 'PENDING' | 'UPLOADING' | 'EXTRACTING' | 'CONFIGURING' | 'SUCCESS' | 'FAILED' | 'ROLLED_BACK';
  startTime: Date | string;
  endTime?: Date | string | null;
  durationSeconds?: number;
  logs: string;
  errorMessage?: string;
  appUrl?: string;
  rollbackAvailable?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface INginxDeploymentDocument extends Omit<INginxDeploymentData, '_id'>, Document {}

const NginxDeploymentSchema = new Schema<INginxDeploymentDocument>(
  {
    deploymentId: { type: String, required: true, unique: true, index: true },
    appName: { type: String, required: true, trim: true },
    appType: {
      type: String,
      enum: ['nextjs', 'nextjs-standalone', 'vite', 'react', 'nodejs', 'express', 'custom'],
      default: 'vite',
    },
    deploymentMode: {
      type: String,
      enum: ['static', 'pm2-node', 'pm2-next', 'pm2-standalone', 'custom'],
      default: 'static',
    },
    deploySource: {
      type: String,
      enum: ['local', 'git'],
      default: 'local',
    },
    gitRepoUrl: { type: String, default: '' },
    gitBranch: { type: String, default: 'main' },
    serverId: { type: String, required: true, index: true },
    serverName: { type: String, required: true },
    serverHost: { type: String, required: true },
    deployDir: { type: String, required: true },
    backupDir: { type: String, default: '' },
    appPort: { type: Number },
    domain: { type: String, default: '' },
    pm2ProcessName: { type: String, default: '' },
    startCommand: { type: String, default: '' },
    envVars: { type: Schema.Types.Mixed, default: {} },
    archiveName: { type: String, default: '' },
    archiveSizeBytes: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['PENDING', 'UPLOADING', 'EXTRACTING', 'CONFIGURING', 'SUCCESS', 'FAILED', 'ROLLED_BACK'],
      default: 'PENDING',
    },
    startTime: { type: Date, default: Date.now },
    endTime: { type: Date, default: null },
    durationSeconds: { type: Number, default: 0 },
    logs: { type: String, default: '' },
    errorMessage: { type: String, default: '' },
    appUrl: { type: String, default: '' },
    rollbackAvailable: { type: Boolean, default: false },
  },
  { timestamps: true }
);

NginxDeploymentSchema.index({ serverId: 1, createdAt: -1 });

const NginxDeployment: Model<INginxDeploymentDocument> =
  mongoose.models.NginxDeployment ||
  mongoose.model<INginxDeploymentDocument>('NginxDeployment', NginxDeploymentSchema);

export default NginxDeployment;

