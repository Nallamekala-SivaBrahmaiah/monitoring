import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAnsiblePlaybookData {
  _id?: string;
  name: string;
  title: string;
  description: string;
  content: string;
  category: string;
  isTemplate: boolean;
  targetHostsPattern: string;
  defaultExtraVars?: string;
  totalRuns: number;
  lastRunAt?: Date | null;
  lastRunStatus?: 'SUCCESS' | 'FAILED' | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IAnsiblePlaybook extends Document {
  name: string;
  title: string;
  description: string;
  content: string;
  category: string;
  isTemplate: boolean;
  targetHostsPattern: string;
  defaultExtraVars: string;
  totalRuns: number;
  lastRunAt: Date | null;
  lastRunStatus: 'SUCCESS' | 'FAILED' | null;
  createdAt: Date;
  updatedAt: Date;
}

const AnsiblePlaybookSchema = new Schema<IAnsiblePlaybook>(
  {
    name: { type: String, required: true, trim: true, unique: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    content: { type: String, required: true },
    category: { type: String, trim: true, default: 'General', index: true },
    isTemplate: { type: Boolean, default: false },
    targetHostsPattern: { type: String, default: 'all' },
    defaultExtraVars: { type: String, default: '' },
    totalRuns: { type: Number, default: 0 },
    lastRunAt: { type: Date, default: null },
    lastRunStatus: {
      type: String,
      enum: ['SUCCESS', 'FAILED', null],
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const AnsiblePlaybook: Model<IAnsiblePlaybook> =
  mongoose.models.AnsiblePlaybook ||
  mongoose.model<IAnsiblePlaybook>('AnsiblePlaybook', AnsiblePlaybookSchema);

export default AnsiblePlaybook;

