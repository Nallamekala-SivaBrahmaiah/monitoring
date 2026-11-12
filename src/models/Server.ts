import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IServerDisk {
  filesystem: string;
  mount: string;
  totalBytes: number;
  usedBytes: number;
  availableBytes: number;
  usagePercent: number;
}

export interface IServerNetwork {
  interface: string;
  bytesReceived: number;
  bytesSent: number;
  packetsReceived: number;
  packetsSent: number;
  rxSpeedBytesPerSec?: number;
  txSpeedBytesPerSec?: number;
}

export interface IServerDockerContainer {
  id: string;
  name: string;
  image: string;
  state: string;
  status: string;
  created: string;
  ports: string;
  cpuPercent?: number;
  memoryUsage?: string;
  memoryPercent?: number;
  memoryLimit?: string;
  networkTraffic?: string;
  diskIO?: string;
}

export interface IServerDockerImage {
  id: string;
  repository: string;
  tag: string;
  size: string;
  created: string;
}

export interface IServerKubernetesPod {
  uid: string;
  name: string;
  namespace: string;
  status: string;
  restarts: number;
  age: string;
  cpuRequest?: string;
  memoryRequest?: string;
}

export interface IServer extends Document {
  name: string;
  host: string;
  port: number;
  username: string;
  authMethod: 'privateKey' | 'password';
  encryptedAuthSecret: string;
  authSecretIv: string;
  authSecretTag: string;
  environment?: string;
  cloudProvider: 'aws' | 'azure' | 'gcp' | 'on-premise' | 'other';
  region?: string;
  tags: string[];
  status: 'Online' | 'Offline' | 'Connecting' | 'Failed' | 'Warning';
  lastError: string | null;
  lastConnectedAt: Date | null;
  lastHeartbeatAt: Date | null;
  hostFingerprint: string | null;
  os: {
    name: string;
    version: string;
    kernel: string;
    arch: string;
    uptimeSeconds: number;
    uptimeFormatted: string;
  };
  hardware: {
    cpuCores: number;
    cpuModel: string;
    totalMemoryBytes: number;
    totalDiskBytes: number;
  };
  metrics: {
    cpu: {
      usagePercent: number;
      loadAvg1m: number;
      loadAvg5m: number;
      loadAvg15m: number;
      cores: number;
      timestamp: Date;
    };
    memory: {
      totalBytes: number;
      usedBytes: number;
      availableBytes: number;
      usagePercent: number;
      swapTotalBytes: number;
      swapUsedBytes: number;
      timestamp: Date;
    };
    disks: IServerDisk[];
    network: IServerNetwork[];
  };
  docker: {
    detected: boolean;
    status: 'running' | 'permission_denied' | 'not_installed' | 'daemon_stopped' | 'error';
    statusMessage?: string;
    version: string;
    containersCount: number;
    runningCount: number;
    containers: IServerDockerContainer[];
    imagesCount: number;
    images: IServerDockerImage[];
    lastSyncedAt: Date | null;
    lastError?: string | null;
  };
  kubernetes: {
    detected: boolean;
    version: string;
    nodeRole: string;
    podsCount: number;
    pods: IServerKubernetesPod[];
    lastSyncedAt: Date | null;
  };
  agent: {
    installed: boolean;
    version: string;
    token: string;
    lastHeartbeat: Date | null;
    status: 'healthy' | 'unreachable' | 'not-installed';
  };
  createdAt: Date;
  updatedAt: Date;
}

const ServerSchema = new Schema<IServer>(
  {
    name: { type: String, required: true, trim: true },
    host: { type: String, required: true, trim: true },
    port: { type: Number, default: 22 },
    username: { type: String, required: true, trim: true },
    authMethod: { type: String, enum: ['privateKey', 'password'], default: 'privateKey' },
    encryptedAuthSecret: { type: String, required: true },
    authSecretIv: { type: String, required: true },
    authSecretTag: { type: String, required: true },
    environment: {
      type: String,
      required: false,
    },
    cloudProvider: {
      type: String,
      enum: ['aws', 'azure', 'gcp', 'on-premise', 'other'],
      default: 'other',
      index: true,
    },
    region: { type: String, default: 'global' },
    tags: [{ type: String }],
    status: {
      type: String,
      enum: ['Online', 'Offline', 'Connecting', 'Failed', 'Warning'],
      default: 'Connecting',
      index: true,
    },
    lastError: { type: String, default: null },
    lastConnectedAt: { type: Date, default: null },
    lastHeartbeatAt: { type: Date, default: null },
    hostFingerprint: { type: String, default: null },
    os: {
      name: { type: String, default: 'Linux' },
      version: { type: String, default: '' },
      kernel: { type: String, default: '' },
      arch: { type: String, default: 'x86_64' },
      uptimeSeconds: { type: Number, default: 0 },
      uptimeFormatted: { type: String, default: '0m' },
    },
    hardware: {
      cpuCores: { type: Number, default: 1 },
      cpuModel: { type: String, default: '' },
      totalMemoryBytes: { type: Number, default: 0 },
      totalDiskBytes: { type: Number, default: 0 },
    },
    metrics: {
      cpu: {
        usagePercent: { type: Number, default: 0 },
        loadAvg1m: { type: Number, default: 0 },
        loadAvg5m: { type: Number, default: 0 },
        loadAvg15m: { type: Number, default: 0 },
        cores: { type: Number, default: 1 },
        timestamp: { type: Date, default: Date.now },
      },
      memory: {
        totalBytes: { type: Number, default: 0 },
        usedBytes: { type: Number, default: 0 },
        availableBytes: { type: Number, default: 0 },
        usagePercent: { type: Number, default: 0 },
        swapTotalBytes: { type: Number, default: 0 },
        swapUsedBytes: { type: Number, default: 0 },
        timestamp: { type: Date, default: Date.now },
      },
      disks: [
        {
          filesystem: { type: String },
          mount: { type: String },
          totalBytes: { type: Number },
          usedBytes: { type: Number },
          availableBytes: { type: Number },
          usagePercent: { type: Number },
        },
      ],
      network: [
        {
          interface: { type: String },
          bytesReceived: { type: Number },
          bytesSent: { type: Number },
          packetsReceived: { type: Number },
          packetsSent: { type: Number },
          rxSpeedBytesPerSec: { type: Number, default: 0 },
          txSpeedBytesPerSec: { type: Number, default: 0 },
        },
      ],
    },
    docker: {
      detected: { type: Boolean, default: false },
      status: { type: String, default: 'not_installed' },
      statusMessage: { type: String, default: '' },
      version: { type: String, default: '' },
      containersCount: { type: Number, default: 0 },
      runningCount: { type: Number, default: 0 },
      containers: [
        {
          id: { type: String },
          name: { type: String },
          image: { type: String },
          state: { type: String },
          status: { type: String },
          created: { type: String },
          ports: { type: String },
          cpuPercent: { type: Number, default: 0 },
          memoryUsage: { type: String, default: '' },
          memoryPercent: { type: Number, default: 0 },
          memoryLimit: { type: String, default: '' },
          networkTraffic: { type: String, default: '' },
          diskIO: { type: String, default: '' },
        },
      ],
      imagesCount: { type: Number, default: 0 },
      images: [
        {
          id: { type: String },
          repository: { type: String },
          tag: { type: String },
          size: { type: String },
          created: { type: String },
        },
      ],
      lastSyncedAt: { type: Date, default: null },
      lastError: { type: String, default: null },
    },
    kubernetes: {
      detected: { type: Boolean, default: false },
      version: { type: String, default: '' },
      nodeRole: { type: String, default: '' },
      podsCount: { type: Number, default: 0 },
      pods: [
        {
          uid: { type: String },
          name: { type: String },
          namespace: { type: String },
          status: { type: String },
          restarts: { type: Number, default: 0 },
          age: { type: String, default: '' },
          cpuRequest: { type: String, default: '' },
          memoryRequest: { type: String, default: '' },
        },
      ],
      lastSyncedAt: { type: Date, default: null },
    },
    agent: {
      installed: { type: Boolean, default: false },
      version: { type: String, default: '1.0.0' },
      token: {
        type: String,
        default: () => 'agt_' + Math.random().toString(36).substring(2) + Date.now().toString(36),
        index: true,
      },
      lastHeartbeat: { type: Date, default: null },
      status: {
        type: String,
        enum: ['healthy', 'unreachable', 'not-installed'],
        default: 'not-installed',
      },
    },
  },
  {
    timestamps: true,
  }
);

if (mongoose.models && mongoose.models.Server) {
  delete (mongoose.models as any).Server;
}

const Server: Model<IServer> = mongoose.model<IServer>('Server', ServerSchema);

export default Server;
