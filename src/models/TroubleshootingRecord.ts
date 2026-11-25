import mongoose, { Schema, Document, Model } from 'mongoose';

export type IssueStatus = 'Open' | 'In Progress' | 'Resolved' | 'Unresolved';

export interface ITroubleshootingRecord extends Document {
  issueId: string;
  title: string;
  platform: 'aws' | 'azure' | 'onprem' | 'application';
  serverOrResource: string;
  errorMessage: string;
  errorLogs?: string;
  investigationSteps?: string;
  commandsExecuted?: string;
  rootCause?: string;
  resolutionSteps?: string;
  verification?: string;
  startedAt: Date;
  resolvedAt?: Date | null;
  durationMinutes: number;
  status: IssueStatus;
  relatedDeploymentId?: string;
  userNotes?: string;
  workSessionId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const TroubleshootingRecordSchema: Schema = new Schema(
  {
    issueId: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    platform: {
      type: String,
      required: true,
      enum: ['aws', 'azure', 'onprem', 'application'],
      default: 'onprem',
      index: true,
    },
    serverOrResource: { type: String, required: true },
    errorMessage: { type: String, required: true },
    errorLogs: { type: String, default: '' },
    investigationSteps: { type: String, default: '' },
    commandsExecuted: { type: String, default: '' },
    rootCause: { type: String, default: '' },
    resolutionSteps: { type: String, default: '' },
    verification: { type: String, default: '' },
    startedAt: { type: Date, default: Date.now, index: true },
    resolvedAt: { type: Date, default: null },
    durationMinutes: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['Open', 'In Progress', 'Resolved', 'Unresolved'],
      default: 'In Progress',
      index: true,
    },
    relatedDeploymentId: { type: String, default: '' },
    userNotes: { type: String, default: '' },
    workSessionId: { type: String, default: null, index: true },
  },
  { timestamps: true }
);

TroubleshootingRecordSchema.index({ status: 1, startedAt: -1 });

if (mongoose.models.TroubleshootingRecord) {
  delete (mongoose.models as any).TroubleshootingRecord;
}

export const TroubleshootingRecord: Model<ITroubleshootingRecord> =
  mongoose.model<ITroubleshootingRecord>('TroubleshootingRecord', TroubleshootingRecordSchema);

export default TroubleshootingRecord;
