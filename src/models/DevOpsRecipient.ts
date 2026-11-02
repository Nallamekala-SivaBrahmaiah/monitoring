import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IDevOpsRecipient extends Document {
  email: string;
  role: string;
  enabled: boolean;
  addedOn: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DevOpsRecipientSchema: Schema<IDevOpsRecipient> = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    role: {
      type: String,
      default: 'DevOps Engineer',
      trim: true,
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

if (mongoose.models.DevOpsRecipient) {
  delete (mongoose.models as any).DevOpsRecipient;
}

export const DevOpsRecipient: Model<IDevOpsRecipient> =
  mongoose.model<IDevOpsRecipient>('DevOpsRecipient', DevOpsRecipientSchema);

export default DevOpsRecipient;

