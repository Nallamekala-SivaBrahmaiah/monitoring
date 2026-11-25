import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IDailyReport extends Document {
  reportId: string;
  reportDate: string; // YYYY-MM-DD
  employeeName: string;
  employeeId: string;
  workSessionId?: string | null;
  startTime?: Date | null;
  endTime?: Date | null;
  activeMinutes: number;
  dailyObjective?: string;
  tomorrowPlan?: string;
  summary: {
    totalActivities: number;
    successfulActivities: number;
    failedActivities: number;
    awsActivities: number;
    azureActivities: number;
    onPremActivities: number;
    appActivities: number;
    deploymentsCount: number;
    troubleshootingCount: number;
    resolvedCount: number;
    pendingCount: number;
  };
  sections: {
    awsActivities: any[];
    azureActivities: any[];
    onPremActivities: any[];
    appActivities: any[];
    deployments: any[];
    troubleshooting: any[];
    pendingTasks: any[];
  };
  recipients: Array<{
    email: string;
    name: string;
    preference: 'TO' | 'CC' | 'BCC';
    status: 'delivered' | 'failed' | 'pending';
    error?: string;
  }>;
  deliveryStatus: 'draft' | 'pending' | 'sent' | 'failed';
  deliveryMode: 'automatic' | 'manual';
  sentAt?: Date | null;
  deliveryError?: string;
  htmlContent?: string;
  pdfAvailable: boolean;
  generatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DailyReportSchema: Schema = new Schema(
  {
    reportId: { type: String, required: true, unique: true, index: true },
    reportDate: { type: String, required: true, index: true }, // YYYY-MM-DD
    employeeName: { type: String, required: true, default: 'DevOps Engineer' },
    employeeId: { type: String, default: 'devops-01' },
    workSessionId: { type: String, default: null, index: true },
    startTime: { type: Date, default: null },
    endTime: { type: Date, default: null },
    activeMinutes: { type: Number, default: 0 },
    dailyObjective: { type: String, default: '' },
    tomorrowPlan: { type: String, default: '' },
    summary: {
      totalActivities: { type: Number, default: 0 },
      successfulActivities: { type: Number, default: 0 },
      failedActivities: { type: Number, default: 0 },
      awsActivities: { type: Number, default: 0 },
      azureActivities: { type: Number, default: 0 },
      onPremActivities: { type: Number, default: 0 },
      appActivities: { type: Number, default: 0 },
      deploymentsCount: { type: Number, default: 0 },
      troubleshootingCount: { type: Number, default: 0 },
      resolvedCount: { type: Number, default: 0 },
      pendingCount: { type: Number, default: 0 },
    },
    sections: {
      awsActivities: { type: [Schema.Types.Mixed], default: [] },
      azureActivities: { type: [Schema.Types.Mixed], default: [] },
      onPremActivities: { type: [Schema.Types.Mixed], default: [] },
      appActivities: { type: [Schema.Types.Mixed], default: [] },
      deployments: { type: [Schema.Types.Mixed], default: [] },
      troubleshooting: { type: [Schema.Types.Mixed], default: [] },
      pendingTasks: { type: [Schema.Types.Mixed], default: [] },
    },
    recipients: [
      {
        email: { type: String, required: true },
        name: { type: String, default: '' },
        preference: { type: String, enum: ['TO', 'CC', 'BCC'], default: 'TO' },
        status: { type: String, enum: ['delivered', 'failed', 'pending'], default: 'pending' },
        error: { type: String, default: '' },
      },
    ],
    deliveryStatus: {
      type: String,
      enum: ['draft', 'pending', 'sent', 'failed'],
      default: 'draft',
      index: true,
    },
    deliveryMode: {
      type: String,
      enum: ['automatic', 'manual'],
      default: 'automatic',
    },
    sentAt: { type: Date, default: null },
    deliveryError: { type: String, default: '' },
    htmlContent: { type: String, default: '' },
    pdfAvailable: { type: Boolean, default: true },
    generatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

DailyReportSchema.index({ reportDate: -1, deliveryStatus: 1 });

if (mongoose.models.DailyReport) {
  delete (mongoose.models as any).DailyReport;
}

export const DailyReport: Model<IDailyReport> =
  mongoose.model<IDailyReport>('DailyReport', DailyReportSchema);

export default DailyReport;
