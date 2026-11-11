import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IMavenArtifact {
  name: string;
  path: string;
  sizeBytes: number;
  sizeFormatted: string;
  extension: string;
  createdAt: Date | string;
}

export interface IMavenBuildData {
  _id: string;
  projectId?: string;
  projectName: string;
  buildNumber: number;
  repositoryUrl: string;
  branch: string;
  projectFolder: string;
  command: string;
  executionMode: string;
  status: 'QUEUED' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
  startTime: Date | string;
  endTime?: Date | string | null;
  durationSeconds: number;
  logs: string;
  artifacts: IMavenArtifact[];
  containerId?: string | null;
  errorMessage?: string | null;
  workspacePath?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface IMavenBuild extends Document {
  projectId?: mongoose.Types.ObjectId;
  projectName: string;
  buildNumber: number;
  repositoryUrl: string;
  branch: string;
  projectFolder: string;
  command: string;
  executionMode: string;
  status: 'QUEUED' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
  startTime: Date;
  endTime?: Date | null;
  durationSeconds: number;
  logs: string;
  artifacts: IMavenArtifact[];
  containerId?: string | null;
  errorMessage?: string | null;
  workspacePath?: string;
  createdAt: Date;
  updatedAt: Date;
}

const MavenBuildSchema: Schema<IMavenBuild> = new Schema(
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
    buildNumber: {
      type: Number,
      required: true,
      default: 1,
    },
    repositoryUrl: {
      type: String,
      required: true,
    },
    branch: {
      type: String,
      default: 'main',
    },
    projectFolder: {
      type: String,
      default: '.',
    },
    command: {
      type: String,
      required: true,
      default: 'mvn clean package',
    },
    executionMode: {
      type: String,
      default: 'native',
    },
    status: {
      type: String,
      enum: ['QUEUED', 'RUNNING', 'SUCCESS', 'FAILED', 'CANCELLED'],
      default: 'QUEUED',
      index: true,
    },
    startTime: {
      type: Date,
      default: Date.now,
    },
    endTime: {
      type: Date,
      default: null,
    },
    durationSeconds: {
      type: Number,
      default: 0,
    },
    logs: {
      type: String,
      default: '',
    },
    artifacts: [
      {
        name: { type: String, required: true },
        path: { type: String, required: true },
        sizeBytes: { type: Number, default: 0 },
        sizeFormatted: { type: String, default: '0 KB' },
        extension: { type: String, default: 'jar' },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    containerId: {
      type: String,
      default: null,
    },
    errorMessage: {
      type: String,
      default: null,
    },
    workspacePath: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

MavenBuildSchema.index({ createdAt: -1 });

export const MavenBuild: Model<IMavenBuild> =
  mongoose.models.MavenBuild ||
  mongoose.model<IMavenBuild>('MavenBuild', MavenBuildSchema);

export default MavenBuild;

