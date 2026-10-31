import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICloudAccount extends Document {
  provider: 'aws' | 'azure';
  accountName: string;
  accountId?: string;
  subscriptionId?: string;
  tenantId?: string;
  clientId?: string;
  clientSecret?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  roleArn?: string;
  authType: 'service_principal' | 'iam_role' | 'access_keys';
  status: 'Connected' | 'Disconnected' | 'Connection Failed';
  errorMessage?: string;
  availableRegions: string[];
  selectedRegions: string[];
  resourcesCount: number;
  lastSyncAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CloudAccountSchema: Schema<ICloudAccount> = new Schema(
  {
    provider: {
      type: String,
      required: true,
      enum: ['aws', 'azure'],
      index: true,
    },
    accountName: {
      type: String,
      required: true,
      trim: true,
    },
    accountId: {
      type: String,
      trim: true,
      index: true,
    },
    subscriptionId: {
      type: String,
      trim: true,
      index: true,
    },
    tenantId: {
      type: String,
      trim: true,
    },
    clientId: {
      type: String,
      trim: true,
    },
    clientSecret: {
      type: String,
      select: false, // Security: Never return secrets in API responses
    },
    accessKeyId: {
      type: String,
      trim: true,
      select: false,
    },
    secretAccessKey: {
      type: String,
      select: false,
    },
    roleArn: {
      type: String,
      trim: true,
    },
    authType: {
      type: String,
      enum: ['service_principal', 'iam_role', 'access_keys'],
      default: 'service_principal',
    },
    status: {
      type: String,
      enum: ['Connected', 'Disconnected', 'Connection Failed'],
      default: 'Connected',
      index: true,
    },
    errorMessage: {
      type: String,
    },
    availableRegions: {
      type: [String],
      default: [],
    },
    selectedRegions: {
      type: [String],
      default: [],
    },
    resourcesCount: {
      type: Number,
      default: 0,
    },
    lastSyncAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

CloudAccountSchema.index({ provider: 1, accountId: 1 });
CloudAccountSchema.index({ provider: 1, subscriptionId: 1 });

export const CloudAccount: Model<ICloudAccount> =
  mongoose.models.CloudAccount || mongoose.model<ICloudAccount>('CloudAccount', CloudAccountSchema);

export default CloudAccount;
