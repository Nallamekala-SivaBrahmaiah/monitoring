import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAnsibleHostData {
  _id?: string;
  name: string;
  controllerId?: string;
  controllerName?: string;
  instanceId?: string;
  ip: string;
  privateIp?: string;
  provider: 'aws' | 'azure' | 'linux' | 'local' | 'other';
  region?: string;
  os?: string;
  username: string;
  port: number;
  authMethod: 'privateKey' | 'password';
  hasAuthSecret?: boolean;
  status: 'Connected' | 'Disconnected' | 'Connecting' | 'Authentication Failed' | 'Error';
  lastCheckedAt?: Date | null;
  lastLatencyMs?: number | null;
  lastError?: string | null;
  sourceResourceId?: string;
  sourceResourceType?: 'ec2' | 'azure-vm' | 'server' | 'custom';
  groups?: string[];
  installedServices?: string[];
  variables?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IAnsibleHost extends Document {
  name: string;
  controllerId?: any;
  controllerName?: string;
  instanceId?: string;
  ip: string;
  privateIp?: string;
  provider: 'aws' | 'azure' | 'linux' | 'local' | 'other';
  region?: string;
  os?: string;
  username: string;
  port: number;
  authMethod: 'privateKey' | 'password';
  encryptedAuthSecret: string;
  authSecretIv: string;
  authSecretTag: string;
  status: 'Connected' | 'Disconnected' | 'Connecting' | 'Authentication Failed' | 'Error';
  lastCheckedAt: Date | null;
  lastLatencyMs?: number | null;
  lastError: string | null;
  sourceResourceId?: string;
  sourceResourceType?: 'ec2' | 'azure-vm' | 'server' | 'custom';
  groups: string[];
  installedServices: string[];
  variables: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const AnsibleHostSchema = new Schema<IAnsibleHost>(
  {
    name: { type: String, required: true, trim: true, index: true },
    controllerId: { type: Schema.Types.ObjectId, ref: 'AnsibleController', index: true },
    controllerName: { type: String, trim: true },
    instanceId: { type: String, trim: true },
    ip: { type: String, required: true, trim: true },
    privateIp: { type: String, trim: true },
    provider: {
      type: String,
      enum: ['aws', 'azure', 'linux', 'local', 'other'],
      default: 'linux',
      index: true,
    },
    region: { type: String, trim: true },
    os: { type: String, trim: true, default: 'Linux' },
    username: { type: String, required: true, trim: true, default: 'ubuntu' },
    port: { type: Number, required: true, default: 22 },
    authMethod: {
      type: String,
      enum: ['privateKey', 'password'],
      default: 'privateKey',
    },
    encryptedAuthSecret: { type: String, default: '' },
    authSecretIv: { type: String, default: '' },
    authSecretTag: { type: String, default: '' },
    status: {
      type: String,
      enum: ['Connected', 'Disconnected', 'Connecting', 'Authentication Failed', 'Error'],
      default: 'Disconnected',
      index: true,
    },
    lastCheckedAt: { type: Date, default: null },
    lastLatencyMs: { type: Number, default: null },
    lastError: { type: String, default: null },
    sourceResourceId: { type: String, default: null },
    sourceResourceType: {
      type: String,
      enum: ['ec2', 'azure-vm', 'server', 'custom'],
      default: 'custom',
    },
    groups: { type: [String], default: ['all'] },
    installedServices: { type: [String], default: [] },
    variables: { type: Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
  }
);

// Index by name and controllerId for fast lookups
AnsibleHostSchema.index({ name: 1, controllerId: 1 });

const AnsibleHost: Model<IAnsibleHost> =
  mongoose.models.AnsibleHost || mongoose.model<IAnsibleHost>('AnsibleHost', AnsibleHostSchema);

export default AnsibleHost;
