import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITerraformApproval extends Document {
  projectId: mongoose.Types.ObjectId;
  projectName: string;
  executionId?: mongoose.Types.ObjectId;
  operation: 'apply' | 'destroy' | 'security_change';
  environment: string;
  requester: string;
  approver?: string;
  status: 'pending' | 'approved' | 'rejected';
  reason?: string;
  rejectionReason?: string;
  planSummary?: {
    toAdd: number;
    toChange: number;
    toDestroy: number;
    toReplace: number;
    rawText?: string;
  };
  requestedAt: Date;
  decidedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TerraformApprovalSchema = new Schema<ITerraformApproval>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'TerraformProject', required: true, index: true },
    projectName: { type: String, required: true },
    executionId: { type: Schema.Types.ObjectId, ref: 'TerraformExecution' },
    operation: { type: String, required: true, enum: ['apply', 'destroy', 'security_change'] },
    environment: { type: String, default: 'production' },
    requester: { type: String, default: 'DevOps Engineer' },
    approver: { type: String },
    status: { type: String, default: 'pending', enum: ['pending', 'approved', 'rejected'], index: true },
    reason: { type: String, default: 'Production infrastructure release requested' },
    rejectionReason: { type: String },
    planSummary: {
      toAdd: Number,
      toChange: Number,
      toDestroy: Number,
      toReplace: Number,
      rawText: String,
    },
    requestedAt: { type: Date, default: Date.now },
    decidedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

const TerraformApproval: Model<ITerraformApproval> =
  mongoose.models.TerraformApproval ||
  mongoose.model<ITerraformApproval>('TerraformApproval', TerraformApprovalSchema);

export default TerraformApproval;
