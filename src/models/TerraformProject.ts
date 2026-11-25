import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITerraformFile {
  name: string;
  content: string;
}

export interface ITerraformLockInfo {
  id: string;
  owner: string;
  created: Date;
  info?: string;
}

export interface ITerraformManagedResource {
  address: string;
  type: string;
  name: string;
  id: string;
  provider: string;
}

export interface ITerraformProject extends Document {
  name: string;
  description?: string;
  provider: 'aws' | 'azure';
  cloudAccountId?: mongoose.Types.ObjectId | string;
  region: string;
  environment: 'dev' | 'test' | 'staging' | 'production' | 'custom';
  terraformVersion: string;
  workspaces: string[];
  currentWorkspace: string;
  backendType: 'local' | 's3' | 'azurerm';
  backendConfig: {
    bucket?: string;
    key?: string;
    region?: string;
    dynamodbTable?: string;
    storageAccountName?: string;
    containerName?: string;
    resourceGroupName?: string;
  };
  files: ITerraformFile[];
  tags: Record<string, string>;
  serverId?: mongoose.Types.ObjectId | string; // Optional target Linux server
  serverName?: string;
  lastExecution?: {
    operation: string;
    status: string;
    executedAt: Date;
    durationMs: number;
    planSummary?: {
      toAdd: number;
      toChange: number;
      toDestroy: number;
      toReplace: number;
    };
  };
  managedResourcesCount: number;
  managedResources: ITerraformManagedResource[];
  outputs: Record<string, { value: any; sensitive: boolean; type?: string }>;
  stateRaw?: string;
  isLocked: boolean;
  lockInfo?: ITerraformLockInfo;
  status: 'active' | 'archived';
  createdAt: Date;
  updatedAt: Date;
}

const TerraformFileSchema = new Schema<ITerraformFile>(
  {
    name: { type: String, required: true },
    content: { type: String, default: '' },
  },
  { _id: false }
);

const TerraformManagedResourceSchema = new Schema<ITerraformManagedResource>(
  {
    address: { type: String, required: true },
    type: { type: String, required: true },
    name: { type: String, required: true },
    id: { type: String, default: '' },
    provider: { type: String, default: '' },
  },
  { _id: false }
);

const TerraformProjectSchema = new Schema<ITerraformProject>(
  {
    name: { type: String, required: true, trim: true, unique: true },
    description: { type: String, default: '' },
    provider: { type: String, required: true, enum: ['aws', 'azure'] },
    cloudAccountId: { type: Schema.Types.ObjectId, ref: 'CloudAccount' },
    region: { type: String, default: 'us-east-1' },
    environment: {
      type: String,
      default: 'dev',
      enum: ['dev', 'test', 'staging', 'production', 'custom'],
    },
    terraformVersion: { type: String, default: '1.14.6' },
    workspaces: { type: [String], default: ['default'] },
    currentWorkspace: { type: String, default: 'default' },
    backendType: { type: String, default: 'local', enum: ['local', 's3', 'azurerm'] },
    backendConfig: {
      bucket: String,
      key: String,
      region: String,
      dynamodbTable: String,
      storageAccountName: String,
      containerName: String,
      resourceGroupName: String,
    },
    files: [TerraformFileSchema],
    tags: { type: Map, of: String, default: {} },
    serverId: { type: Schema.Types.ObjectId, ref: 'Server' },
    serverName: { type: String },
    lastExecution: {
      operation: String,
      status: String,
      executedAt: Date,
      durationMs: Number,
      planSummary: {
        toAdd: Number,
        toChange: Number,
        toDestroy: Number,
        toReplace: Number,
      },
    },
    managedResourcesCount: { type: Number, default: 0 },
    managedResources: [TerraformManagedResourceSchema],
    outputs: { type: Schema.Types.Mixed, default: {} },
    stateRaw: { type: String, default: '' },
    isLocked: { type: Boolean, default: false },
    lockInfo: {
      id: String,
      owner: String,
      created: Date,
      info: String,
    },
    status: { type: String, default: 'active', enum: ['active', 'archived'] },
  },
  {
    timestamps: true,
  }
);

TerraformProjectSchema.index({ provider: 1, environment: 1 });
TerraformProjectSchema.index({ status: 1 });

const TerraformProject: Model<ITerraformProject> =
  mongoose.models.TerraformProject ||
  mongoose.model<ITerraformProject>('TerraformProject', TerraformProjectSchema);

export default TerraformProject;
