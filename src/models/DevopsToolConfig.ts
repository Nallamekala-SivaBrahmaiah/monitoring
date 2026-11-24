import mongoose, { Schema, Document, Model } from 'mongoose';
import {
  DevopsToolName,
  IDevopsToolConfigData,
  DEFAULT_DEVOPS_COMMANDS,
} from '@/lib/devops/devopsDefaults';

export type { DevopsToolName, IDevopsToolConfigData };
export { DEFAULT_DEVOPS_COMMANDS };

export interface IDevopsToolConfigDocument
  extends Omit<IDevopsToolConfigData, 'createdAt' | 'updatedAt'>,
    Document {
  createdAt: Date;
  updatedAt: Date;
}

const DevopsToolConfigSchema = new Schema<IDevopsToolConfigDocument>(
  {
    tool: {
      type: String,
      required: true,
      unique: true,
      enum: ['jenkins', 'sonarqube', 'trivy'],
      index: true,
    },
    installCommands: { type: String, required: true },
    uninstallCommands: { type: String, required: true },
    verificationCommands: { type: String, default: '' },
    serviceName: { type: String, default: '' },
    port: { type: Number, default: 0 },
    healthCheckCommand: { type: String, default: '' },
    lastExecutionAt: { type: Date },
    lastExecutionStatus: { type: String, enum: ['success', 'failed', 'running', null] },
    lastExecutionServerName: { type: String, default: '' },
    lastExecutionServerHost: { type: String, default: '' },
    lastExecutionAction: { type: String, enum: ['install', 'uninstall', 'test', null] },
    lastExecutionLog: { type: String, default: '' },
    lastExecutionExitCode: { type: Number },
  },
  {
    timestamps: true,
  }
);

export const DevopsToolConfig: Model<IDevopsToolConfigDocument> =
  mongoose.models.DevopsToolConfig ||
  mongoose.model<IDevopsToolConfigDocument>('DevopsToolConfig', DevopsToolConfigSchema);

export default DevopsToolConfig;
