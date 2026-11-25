import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITerraformSetting extends Document {
  defaultProvider: 'aws' | 'azure';
  defaultRegion: string;
  defaultTerraformVersion: string;
  executionTimeoutSeconds: number;
  defaultWorkspace: string;
  requireProductionApproval: boolean;
  enableStateLocking: boolean;
  autoFormatOnSave: boolean;
  sensitiveSecretRedaction: boolean;
  defaultProjectDirectory: string;
  createdAt: Date;
  updatedAt: Date;
}

const TerraformSettingSchema = new Schema<ITerraformSetting>(
  {
    defaultProvider: { type: String, default: 'aws', enum: ['aws', 'azure'] },
    defaultRegion: { type: String, default: 'us-east-1' },
    defaultTerraformVersion: { type: String, default: '1.14.6' },
    executionTimeoutSeconds: { type: Number, default: 300 },
    defaultWorkspace: { type: String, default: 'default' },
    requireProductionApproval: { type: Boolean, default: true },
    enableStateLocking: { type: Boolean, default: true },
    autoFormatOnSave: { type: Boolean, default: true },
    sensitiveSecretRedaction: { type: Boolean, default: true },
    defaultProjectDirectory: { type: String, default: './terraform-workspaces' },
  },
  {
    timestamps: true,
  }
);

const TerraformSetting: Model<ITerraformSetting> =
  mongoose.models.TerraformSetting ||
  mongoose.model<ITerraformSetting>('TerraformSetting', TerraformSettingSchema);

export default TerraformSetting;
