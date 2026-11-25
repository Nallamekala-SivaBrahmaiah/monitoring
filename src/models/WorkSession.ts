import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IWorkSession extends Document {
  userId: string;
  userName: string;
  workDate: string; // YYYY-MM-DD
  startTime: Date;
  endTime?: Date | null;
  status: 'active' | 'paused' | 'ended';
  totalActiveMinutes: number;
  pauseMinutes: number;
  lastPauseTime?: Date | null;
  dailyObjective?: string;
  project?: string;
  sessionNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const WorkSessionSchema: Schema = new Schema(
  {
    userId: { type: String, required: true, default: 'devops-user', index: true },
    userName: { type: String, required: true, default: 'DevOps Engineer' },
    workDate: { type: String, required: true, index: true }, // YYYY-MM-DD
    startTime: { type: Date, required: true, default: Date.now },
    endTime: { type: Date, default: null },
    status: {
      type: String,
      enum: ['active', 'paused', 'ended'],
      default: 'active',
      index: true,
    },
    totalActiveMinutes: { type: Number, default: 0 },
    pauseMinutes: { type: Number, default: 0 },
    lastPauseTime: { type: Date, default: null },
    dailyObjective: { type: String, default: '', trim: true },
    project: { type: String, default: 'Multi-Cloud Infrastructure' },
    sessionNotes: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

WorkSessionSchema.index({ workDate: 1, userId: 1 });

if (mongoose.models.WorkSession) {
  delete (mongoose.models as any).WorkSession;
}

export const WorkSession: Model<IWorkSession> =
  mongoose.model<IWorkSession>('WorkSession', WorkSessionSchema);

export default WorkSession;
