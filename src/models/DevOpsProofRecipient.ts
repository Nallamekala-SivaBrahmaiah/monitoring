import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IDevOpsProofRecipient extends Document {
  email: string;
  name: string;
  role: 'CTO' | 'Engineering Manager' | 'VP of Engineering' | 'Lead Architect' | 'Personal Audit Trail' | 'DevOps Stakeholder';
  enabled: boolean;
  addedOn: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DevOpsProofRecipientSchema: Schema<IDevOpsProofRecipient> = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    name: {
      type: String,
      default: '',
      trim: true,
    },
    role: {
      type: String,
      default: 'CTO',
      enum: ['CTO', 'Engineering Manager', 'VP of Engineering', 'Lead Architect', 'Personal Audit Trail', 'DevOps Stakeholder'],
    },
    enabled: {
      type: Boolean,
      default: true,
      index: true,
    },
    addedOn: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

if (mongoose.models.DevOpsProofRecipient) {
  delete (mongoose.models as any).DevOpsProofRecipient;
}

export const DevOpsProofRecipient: Model<IDevOpsProofRecipient> =
  mongoose.model<IDevOpsProofRecipient>('DevOpsProofRecipient', DevOpsProofRecipientSchema);

export default DevOpsProofRecipient;
