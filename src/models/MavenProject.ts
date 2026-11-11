import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IMavenEnvVar {
  key: string;
  value: string;
  isSecret?: boolean;
}

export interface IMavenProjectData {
  _id: string;
  name: string;
  repositoryUrl: string;
  branch: string;
  projectFolder: string;
  mavenVersion: string;
  jdkVersion: string;
  mavenCommand: string;
  envVariables: IMavenEnvVar[];
  executionMode: 'native' | 'docker' | 'auto';
  lastBuildStatus?: 'SUCCESS' | 'FAILED' | 'RUNNING' | 'NONE';
  lastBuildAt?: Date | string | null;
  lastBuildDuration?: number;
  totalBuilds: number;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface IMavenProject extends Document {
  name: string;
  repositoryUrl: string;
  branch: string;
  projectFolder: string;
  mavenVersion: string;
  jdkVersion: string;
  mavenCommand: string;
  envVariables: IMavenEnvVar[];
  executionMode: 'native' | 'docker' | 'auto';
  lastBuildStatus: 'SUCCESS' | 'FAILED' | 'RUNNING' | 'NONE';
  lastBuildAt?: Date | null;
  lastBuildDuration?: number;
  totalBuilds: number;
  createdAt: Date;
  updatedAt: Date;
}

const MavenProjectSchema: Schema<IMavenProject> = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    repositoryUrl: {
      type: String,
      required: true,
      trim: true,
    },
    branch: {
      type: String,
      default: 'main',
      trim: true,
    },
    projectFolder: {
      type: String,
      default: '.',
      trim: true,
    },
    mavenVersion: {
      type: String,
      default: '3.9',
    },
    jdkVersion: {
      type: String,
      default: 'Java 21',
    },
    mavenCommand: {
      type: String,
      default: 'mvn clean package',
      trim: true,
    },
    envVariables: [
      {
        key: { type: String, required: true },
        value: { type: String, default: '' },
        isSecret: { type: Boolean, default: false },
      },
    ],
    executionMode: {
      type: String,
      enum: ['native', 'docker', 'auto'],
      default: 'auto',
    },
    lastBuildStatus: {
      type: String,
      enum: ['SUCCESS', 'FAILED', 'RUNNING', 'NONE'],
      default: 'NONE',
    },
    lastBuildAt: {
      type: Date,
      default: null,
    },
    lastBuildDuration: {
      type: Number,
      default: 0,
    },
    totalBuilds: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

export const MavenProject: Model<IMavenProject> =
  mongoose.models.MavenProject ||
  mongoose.model<IMavenProject>('MavenProject', MavenProjectSchema);

export default MavenProject;

