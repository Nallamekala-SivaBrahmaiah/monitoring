import mongoose, { Schema, Document, Model } from 'mongoose';

export interface INginxServerData {
  _id?: any;
  name: string;
  host: string;
  port: number;
  username: string;
  authMethod: 'privateKey' | 'password';
  encryptedAuthSecret?: string;
  authSecretIv?: string;
  authSecretTag?: string;
  cloudProvider: 'aws' | 'azure' | 'gcp' | 'on-premise' | 'other';
  instanceId?: string;
  region?: string;
  privateIp?: string;
  osName?: string;
  osVersion?: string;
  connectionStatus: 'Online' | 'Offline' | 'Connecting' | 'Failed' | 'Untested';
  lastConnectedAt?: Date | string | null;
  nginxInstalled?: boolean;
  nginxVersion?: string;
  nginxStatus?: 'RUNNING' | 'STOPPED' | 'FAILED' | 'NOT_INSTALLED' | 'UNKNOWN';
  nginxPorts?: string[];
  nginxWorkerCount?: number;
  pm2Installed?: boolean;
  pm2Count?: number;
  pm2RunningCount?: number;
  pm2FailedCount?: number;
  discoveredAppCount?: number;
  metrics?: {
    cpuPercent?: number;
    memoryPercent?: number;
    diskPercent?: number;
    memoryUsedGb?: number;
    memoryTotalGb?: number;
    diskUsedGb?: number;
    diskTotalGb?: number;
    uptime?: string;
    networkRx?: string;
    networkTx?: string;
  };
  isActive?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface INginxServerDocument extends Omit<INginxServerData, '_id'>, Document {}

const NginxServerSchema = new Schema<INginxServerDocument>(
  {
    name: { type: String, required: true, trim: true },
    host: { type: String, required: true, trim: true },
    port: { type: Number, default: 22 },
    username: { type: String, default: 'ubuntu', trim: true },
    authMethod: { type: String, enum: ['privateKey', 'password'], default: 'privateKey' },
    encryptedAuthSecret: { type: String, default: '' },
    authSecretIv: { type: String, default: '' },
    authSecretTag: { type: String, default: '' },
    cloudProvider: {
      type: String,
      default: 'aws',
    },
    instanceId: { type: String, default: '' },
    region: { type: String, default: '' },
    privateIp: { type: String, default: '' },
    osName: { type: String, default: 'Linux' },
    osVersion: { type: String, default: '' },
    connectionStatus: {
      type: String,
      default: 'Untested',
    },
    lastConnectedAt: { type: Date, default: null },
    nginxInstalled: { type: Boolean, default: false },
    nginxVersion: { type: String, default: '' },
    nginxStatus: {
      type: String,
      enum: ['RUNNING', 'STOPPED', 'FAILED', 'NOT_INSTALLED', 'UNKNOWN'],
      default: 'UNKNOWN',
    },
    nginxPorts: { type: [String], default: [] },
    nginxWorkerCount: { type: Number, default: 0 },
    pm2Installed: { type: Boolean, default: false },
    pm2Count: { type: Number, default: 0 },
    pm2RunningCount: { type: Number, default: 0 },
    pm2FailedCount: { type: Number, default: 0 },
    discoveredAppCount: { type: Number, default: 0 },
    metrics: {
      cpuPercent: { type: Number, default: 0 },
      memoryPercent: { type: Number, default: 0 },
      diskPercent: { type: Number, default: 0 },
      memoryUsedGb: { type: Number, default: 0 },
      memoryTotalGb: { type: Number, default: 0 },
      diskUsedGb: { type: Number, default: 0 },
      diskTotalGb: { type: Number, default: 0 },
      uptime: { type: String, default: '0m' },
      networkRx: { type: String, default: '' },
      networkTx: { type: String, default: '' },
    },
    isActive: { type: Boolean, default: false },
  },
  { timestamps: true }
);

NginxServerSchema.index({ host: 1 });
NginxServerSchema.index({ instanceId: 1 });

const NginxServer: Model<INginxServerDocument> =
  mongoose.models.NginxServer ||
  mongoose.model<INginxServerDocument>('NginxServer', NginxServerSchema);

export default NginxServer;
