import mongoose, { Schema, Document, Model } from 'mongoose';

export interface INginxAppData {
  _id?: string;
  serverId: string;
  serverName: string;
  serverHost: string;
  name: string;
  type: 'nodejs' | 'nextjs' | 'react' | 'vite' | 'java-maven' | 'java-tomcat' | 'docker' | 'custom';
  frameworkName: string;
  directory: string;
  gitRepoUrl: string;
  gitBranch: string;
  packageManager: 'auto' | 'npm' | 'pnpm' | 'yarn' | 'bun' | 'maven' | 'gradle';
  buildCommand?: string;
  startCommand?: string;
  pm2ProcessName?: string;
  appPort?: number;
  domain?: string;
  status: 'Deployed' | 'Building' | 'Failed' | 'Stopped';
  healthStatus: 'Healthy' | 'Degraded' | 'Down' | 'Unknown';
  lastDeployedAt?: Date | string | null;
  lastDeploymentDuration?: string;
  lastSuccessfulCommit?: string;
  currentCommit?: string;
  iconType: 'cart' | 'globe' | 'cake' | 'game' | 'api' | 'layers';
  autoDeploy?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface INginxAppDocument extends Omit<INginxAppData, '_id'>, Document {}

const NginxAppSchema = new Schema<INginxAppDocument>(
  {
    serverId: { type: String, required: true, index: true },
    serverName: { type: String, required: true },
    serverHost: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['nodejs', 'nextjs', 'react', 'vite', 'java-maven', 'java-tomcat', 'docker', 'custom'],
      default: 'nodejs',
    },
    frameworkName: { type: String, default: 'Node.js App' },
    directory: { type: String, required: true, trim: true },
    gitRepoUrl: { type: String, default: '', trim: true },
    gitBranch: { type: String, default: 'main', trim: true },
    packageManager: {
      type: String,
      enum: ['auto', 'npm', 'pnpm', 'yarn', 'bun', 'maven', 'gradle'],
      default: 'auto',
    },
    buildCommand: { type: String, default: '' },
    startCommand: { type: String, default: 'npm start' },
    pm2ProcessName: { type: String, default: '' },
    appPort: { type: Number },
    domain: { type: String, default: '' },
    status: {
      type: String,
      enum: ['Deployed', 'Building', 'Failed', 'Stopped'],
      default: 'Stopped',
    },
    healthStatus: {
      type: String,
      enum: ['Healthy', 'Degraded', 'Down', 'Unknown'],
      default: 'Unknown',
    },
    lastDeployedAt: { type: Date },
    lastDeploymentDuration: { type: String },
    lastSuccessfulCommit: { type: String, default: '' },
    currentCommit: { type: String, default: '' },
    iconType: {
      type: String,
      enum: ['cart', 'globe', 'cake', 'game', 'api', 'layers'],
      default: 'layers',
    },
    autoDeploy: { type: Boolean, default: true },
  },
  { timestamps: true }
);

NginxAppSchema.index({ serverId: 1, name: 1 }, { unique: true });

const NginxApp: Model<INginxAppDocument> =
  mongoose.models.NginxApp ||
  mongoose.model<INginxAppDocument>('NginxApp', NginxAppSchema);

export default NginxApp;
