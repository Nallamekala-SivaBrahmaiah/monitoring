import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IMavenAppEnvVar {
  key: string;
  value: string;
}

export interface IMavenAppData {
  _id: string;
  projectId?: string;
  projectName: string;
  buildId?: string;
  artifactName: string;
  artifactPath: string;
  workspacePath: string;
  status: 'STARTING' | 'RUNNING' | 'STOPPED' | 'FAILED';
  port: number;
  customPort?: number;
  pid?: number | null;
  appUrl: string;
  proxyUrl: string;
  runCommand: string;
  jvmArgs?: string;
  appArgs?: string;
  envVariables: IMavenAppEnvVar[];
  logs: string;
  isExecutable: boolean;
  framework: string;
  mainClass?: string;
  startTime?: Date | string | null;
  stopTime?: Date | string | null;
  uptimeSeconds?: number;
  lastHealthCheck?: Date | string | null;
  healthStatus?: 'HEALTHY' | 'UNHEALTHY' | 'STARTING' | 'UNKNOWN';
  errorMessage?: string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface IMavenApp extends Document {
  projectId?: mongoose.Types.ObjectId;
  projectName: string;
  buildId?: mongoose.Types.ObjectId;
  artifactName: string;
  artifactPath: string;
  workspacePath: string;
  status: 'STARTING' | 'RUNNING' | 'STOPPED' | 'FAILED';
  port: number;
  customPort?: number;
  pid?: number | null;
  appUrl: string;
  proxyUrl: string;
  runCommand: string;
  jvmArgs?: string;
  appArgs?: string;
  envVariables: IMavenAppEnvVar[];
  logs: string;
  isExecutable: boolean;
  framework: string;
  mainClass?: string;
  startTime?: Date | null;
  stopTime?: Date | null;
  uptimeSeconds?: number;
  lastHealthCheck?: Date | null;
  healthStatus: 'HEALTHY' | 'UNHEALTHY' | 'STARTING' | 'UNKNOWN';
  errorMessage?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const MavenAppSchema: Schema<IMavenApp> = new Schema(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'MavenProject',
      index: true,
    },
    projectName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    buildId: {
      type: Schema.Types.ObjectId,
      ref: 'MavenBuild',
      index: true,
    },
    artifactName: {
      type: String,
      required: true,
      trim: true,
    },
    artifactPath: {
      type: String,
      required: true,
      trim: true,
    },
    workspacePath: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['STARTING', 'RUNNING', 'STOPPED', 'FAILED'],
      default: 'STARTING',
      index: true,
    },
    port: {
      type: Number,
      required: true,
      default: 8080,
      index: true,
    },
    customPort: {
      type: Number,
      default: null,
    },
    pid: {
      type: Number,
      default: null,
    },
    appUrl: {
      type: String,
      required: true,
    },
    proxyUrl: {
      type: String,
      required: true,
    },
    runCommand: {
      type: String,
      required: true,
    },
    jvmArgs: {
      type: String,
      default: '',
    },
    appArgs: {
      type: String,
      default: '',
    },
    envVariables: [
      {
        key: { type: String, required: true },
        value: { type: String, default: '' },
      },
    ],
    logs: {
      type: String,
      default: '',
    },
    isExecutable: {
      type: Boolean,
      default: true,
    },
    framework: {
      type: String,
      default: 'Spring Boot',
    },
    mainClass: {
      type: String,
      default: '',
    },
    startTime: {
      type: Date,
      default: null,
    },
    stopTime: {
      type: Date,
      default: null,
    },
    uptimeSeconds: {
      type: Number,
      default: 0,
    },
    lastHealthCheck: {
      type: Date,
      default: null,
    },
    healthStatus: {
      type: String,
      enum: ['HEALTHY', 'UNHEALTHY', 'STARTING', 'UNKNOWN'],
      default: 'STARTING',
    },
    errorMessage: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const MavenApp: Model<IMavenApp> =
  mongoose.models.MavenApp || mongoose.model<IMavenApp>('MavenApp', MavenAppSchema);

export default MavenApp;

