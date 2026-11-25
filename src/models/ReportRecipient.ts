import mongoose, { Schema, Document, Model } from 'mongoose';

export type RecipientGroup =
  | 'HR'
  | 'Manager'
  | 'CTO'
  | 'Team Lead'
  | 'Work Members'
  | 'DevOps Lead'
  | 'Project Manager'
  | 'Sir'
  | 'Other';

export interface IReportRecipient extends Document {
  name: string;
  email: string;
  designation: string;
  department: string;
  group: RecipientGroup;
  deliveryPreference: 'TO' | 'CC' | 'BCC';
  isActive: boolean;
  isDefault: boolean;
  notes?: string;
  lastEmailSentAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const ReportRecipientSchema: Schema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    designation: { type: String, default: 'DevOps Lead', trim: true },
    department: { type: String, default: 'Engineering / Operations', trim: true },
    group: {
      type: String,
      required: true,
      enum: [
        'HR',
        'Manager',
        'CTO',
        'Team Lead',
        'Work Members',
        'DevOps Lead',
        'Project Manager',
        'Sir',
        'Other',
      ],
      default: 'Manager',
      index: true,
    },
    deliveryPreference: {
      type: String,
      enum: ['TO', 'CC', 'BCC'],
      default: 'TO',
    },
    isActive: { type: Boolean, default: true, index: true },
    isDefault: { type: Boolean, default: true },
    notes: { type: String, default: '' },
    lastEmailSentAt: { type: Date, default: null },
  },
  { timestamps: true }
);

if (mongoose.models.ReportRecipient) {
  delete (mongoose.models as any).ReportRecipient;
}

export const ReportRecipient: Model<IReportRecipient> =
  mongoose.model<IReportRecipient>('ReportRecipient', ReportRecipientSchema);

export default ReportRecipient;
