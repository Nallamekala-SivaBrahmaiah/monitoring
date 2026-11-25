import mongoose, { Schema, Document, Model } from 'mongoose';
import { ToolCategory } from '@/lib/automation/toolCatalog';

export interface IAutomationPackage extends Document {
  packageId: string;
  name: string;
  category: ToolCategory;
  description: string;
  badge?: string;
  functionName: string;
  installScript: string;
  defaultVersion?: string;
  supportedVersions?: string[];
  port?: number;
  dependencies?: string[];
  verificationCommand: string;
  iconName?: string;
  isCustom: boolean;
  author?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AutomationPackageSchema: Schema = new Schema(
  {
    packageId: { type: String, required: true, unique: true, trim: true, lowercase: true },
    name: { type: String, required: true, trim: true },
    category: {
      type: String,
      required: true,
      enum: ['programming', 'devops', 'security', 'webservers', 'databases', 'monitoring', 'utilities'],
      default: 'devops',
    },
    description: { type: String, default: '', trim: true },
    badge: { type: String, default: 'Custom', trim: true },
    functionName: { type: String, required: true, trim: true },
    installScript: { type: String, required: true },
    defaultVersion: { type: String, default: 'latest' },
    supportedVersions: [{ type: String }],
    port: { type: Number },
    dependencies: [{ type: String }],
    verificationCommand: { type: String, default: '' },
    iconName: { type: String, default: 'Boxes' },
    isCustom: { type: Boolean, default: true },
    author: { type: String, default: 'User' },
  },
  { timestamps: true }
);

AutomationPackageSchema.index({ packageId: 1, category: 1 });

const AutomationPackage: Model<IAutomationPackage> =
  mongoose.models.AutomationPackage ||
  mongoose.model<IAutomationPackage>('AutomationPackage', AutomationPackageSchema);

export default AutomationPackage;
