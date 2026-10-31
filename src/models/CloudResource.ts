import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICloudResource extends Document {
  provider: 'aws' | 'azure';
  resourceType: 'vm' | 'ec2' | 'disk' | 'nic' | 'public_ip' | 'load_balancer' | 'vnet' | 'k8s_cluster' | 'k8s_pod' | 'container' | 'storage_account';
  resourceId: string;
  name: string;
  subscriptionId?: string;
  accountId?: string;
  region: string;
  resourceGroup?: string;
  status: 'Running' | 'Stopped' | 'Terminated' | 'Pending' | 'Healthy' | 'Degraded';
  size?: string;
  privateIp?: string;
  publicIp?: string;
  metrics: {
    cpuUtilization: number | null;
    memoryUtilization: number | null;
    diskUtilization: number | null;
    networkIn: number | null;
    networkOut: number | null;
    lastUpdated: Date;
  };
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const CloudResourceSchema: Schema<ICloudResource> = new Schema(
  {
    provider: {
      type: String,
      required: true,
      enum: ['aws', 'azure'],
      index: true,
    },
    resourceType: {
      type: String,
      required: true,
      index: true,
    },
    resourceId: {
      type: String,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    subscriptionId: {
      type: String,
      index: true,
    },
    accountId: {
      type: String,
      index: true,
    },
    region: {
      type: String,
      required: true,
      index: true,
    },
    resourceGroup: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      default: 'Running',
      index: true,
    },
    size: {
      type: String,
    },
    privateIp: {
      type: String,
    },
    publicIp: {
      type: String,
    },
    metrics: {
      cpuUtilization: { type: Number, default: null },
      memoryUtilization: { type: Number, default: null },
      diskUtilization: { type: Number, default: null },
      networkIn: { type: Number, default: null },
      networkOut: { type: Number, default: null },
      lastUpdated: { type: Date, default: Date.now },
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

CloudResourceSchema.index({ provider: 1, resourceType: 1 });
CloudResourceSchema.index({ provider: 1, region: 1 });
CloudResourceSchema.index({ provider: 1, subscriptionId: 1 });
CloudResourceSchema.index({ provider: 1, accountId: 1 });
CloudResourceSchema.index({ resourceId: 1, provider: 1 }, { unique: true });

export const CloudResource: Model<ICloudResource> =
  mongoose.models.CloudResource || mongoose.model<ICloudResource>('CloudResource', CloudResourceSchema);

export default CloudResource;
