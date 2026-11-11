import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAnsibleControllerData {
  _id?: string;
  name: string;
  type: 'cloud' | 'custom' | 'local';
  sourceResourceId?: string;
  instanceId?: string;
  hostname: string;
  ipAddress: string;
  privateIp?: string;
  provider: 'aws' | 'azure' | 'linux' | 'local' | 'other';
  region?: string;
  os: string;
  username: string;
  port: number;
  authMethod: 'privateKey' | 'password';
  hasAuthSecret?: boolean;
  ansibleVersion: string;
  pythonVersion: string;
  status: 'Online' | 'Offline' | 'Connecting' | 'Authentication Failed';
  sshStatus: 'Ready / Active' | 'Connected' | 'Disconnected' | 'Unavailable';
  uptimeFormatted?: string;
  cpuCores?: number;
  memoryFormatted?: string;
  lastCheckedAt?: Date | null;
  lastLatencyMs?: number | null;
  lastError?: string | null;
  isPrimary: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IAnsibleController extends Document {
  name: string;
  type: 'cloud' | 'custom' | 'local';
  sourceResourceId?: string;
  instanceId?: string;
  hostname: string;
  ipAddress: string;
  privateIp?: string;
  provider: 'aws' | 'azure' | 'linux' | 'local' | 'other';
  region?: string;
  os: string;
  username: string;
  port: number;
  authMethod: 'privateKey' | 'password';
  encryptedAuthSecret?: string;
  authSecretIv?: string;
  authSecretTag?: string;
  ansibleVersion: string;
  pythonVersion: string;
  status: 'Online' | 'Offline' | 'Connecting' | 'Authentication Failed';
  sshStatus: 'Ready / Active' | 'Connected' | 'Disconnected' | 'Unavailable';
  uptimeFormatted?: string;
  cpuCores?: number;
  memoryFormatted?: string;
  lastCheckedAt?: Date | null;
  lastLatencyMs?: number | null;
  lastError?: string | null;
  isPrimary: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AnsibleControllerSchema = new Schema<IAnsibleController>(
  {
    name: { type: String, required: true, trim: true, default: 'Ansible-Controller-01' },
    type: { type: String, enum: ['cloud', 'custom', 'local'], default: 'local' },
    sourceResourceId: { type: String, trim: true },
    instanceId: { type: String, trim: true },
    hostname: { type: String, trim: true, default: 'localhost' },
    ipAddress: { type: String, trim: true, default: '127.0.0.1' },
    privateIp: { type: String, trim: true },
    provider: {
      type: String,
      enum: ['aws', 'azure', 'linux', 'local', 'other'],
      default: 'local',
    },
    region: { type: String, trim: true },
    os: { type: String, trim: true, default: 'Linux' },
    username: { type: String, trim: true, default: 'ubuntu' },
    port: { type: Number, default: 22 },
    authMethod: {
      type: String,
      enum: ['privateKey', 'password'],
      default: 'privateKey',
    },
    encryptedAuthSecret: { type: String },
    authSecretIv: { type: String },
    authSecretTag: { type: String },
    ansibleVersion: { type: String, default: 'Ansible Core 2.16.3' },
    pythonVersion: { type: String, default: 'Python 3.10+' },
    status: {
      type: String,
      enum: ['Online', 'Offline', 'Connecting', 'Authentication Failed'],
      default: 'Online',
    },
    sshStatus: {
      type: String,
      enum: ['Ready / Active', 'Connected', 'Disconnected', 'Unavailable'],
      default: 'Ready / Active',
    },
    uptimeFormatted: { type: String, default: '0m' },
    cpuCores: { type: Number, default: 2 },
    memoryFormatted: { type: String, default: 'Standard' },
    lastCheckedAt: { type: Date, default: null },
    lastLatencyMs: { type: Number, default: null },
    lastError: { type: String, default: null },
    isPrimary: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

const AnsibleController: Model<IAnsibleController> =
  mongoose.models.AnsibleController ||
  mongoose.model<IAnsibleController>('AnsibleController', AnsibleControllerSchema);

export default AnsibleController;

