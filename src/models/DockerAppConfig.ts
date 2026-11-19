import mongoose, { Schema, Document } from 'mongoose';

export interface IDockerAppConfigData {
  _id?: string;
  serverId: string;
  appName: string;
  stackType?: 'mern' | 'python' | 'java' | 'maven' | 'dotnet' | 'custom' | string;
  gitRepoUrl: string;
  gitBranch: string;
  appDirectory: string;
  frontendDirectory?: string;
  backendDirectory?: string;
  frontendDockerfile?: string;
  backendDockerfile?: string;
  composeFilePath?: string;
  packageManager?: string;
  buildCommand?: string;
  runCommand?: string;
  frontendContainerName?: string;
  backendContainerName?: string;
  databaseContainerName?: string;
  redisContainerName?: string;
  nginxContainerName?: string;
  frontendPort?: number;
  backendPort?: number;
  databasePort?: number;
  healthCheckUrl?: string;
  healthCheckTimeout?: number;
  envVars?: Record<string, string>;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IDockerAppConfigDocument extends Omit<IDockerAppConfigData, '_id'>, Document {}

const DockerAppConfigSchema = new Schema<IDockerAppConfigDocument>(
  {
    serverId: { type: String, required: true, index: true },
    appName: { type: String, required: true, default: 'monitoring-app' },
    stackType: { type: String, default: 'mern' },
    gitRepoUrl: { type: String, default: 'https://github.com/Nallamekala-SivaBrahmaiah/monitoring.git' },
    gitBranch: { type: String, default: 'main' },
    appDirectory: { type: String, default: '/home/siva/monitoring' },
    frontendDirectory: { type: String, default: 'src' },
    backendDirectory: { type: String, default: 'src/server' },
    frontendDockerfile: { type: String, default: 'Dockerfile' },
    backendDockerfile: { type: String, default: 'Dockerfile' },
    composeFilePath: { type: String, default: 'docker-compose.yml' },
    packageManager: { type: String, default: 'npm' },
    buildCommand: { type: String, default: 'npm run build' },
    runCommand: { type: String, default: 'npm start' },
    frontendContainerName: { type: String, default: 'monitoring-frontend' },
    backendContainerName: { type: String, default: 'monitoring-backend' },
    databaseContainerName: { type: String, default: 'monitoring-database' },
    redisContainerName: { type: String, default: 'monitoring-redis-cache' },
    nginxContainerName: { type: String, default: 'monitoring-nginx-proxy' },
    frontendPort: { type: Number, default: 3000 },
    backendPort: { type: Number, default: 5000 },
    databasePort: { type: Number, default: 27017 },
    healthCheckUrl: { type: String, default: 'http://localhost:3000/api/health' },
    healthCheckTimeout: { type: Number, default: 15 },
    envVars: { type: Map, of: String, default: {} },
  },
  { timestamps: true }
);

DockerAppConfigSchema.index({ serverId: 1, appName: 1 }, { unique: true });

const DockerAppConfig =
  mongoose.models.DockerAppConfig ||
  mongoose.model<IDockerAppConfigDocument>('DockerAppConfig', DockerAppConfigSchema);

export default DockerAppConfig;

