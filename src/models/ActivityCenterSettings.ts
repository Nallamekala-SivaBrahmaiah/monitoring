import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IActivityCenterSettings extends Document {
  // Master switches requested by user
  trackingEnabled: boolean; // ON / OFF master switch for activity recording
  autoReportEnabled: boolean; // ON / OFF master switch for automatic evening report emails

  // Timing & Schedule
  workStartTime: string; // '09:30'
  workEndTime: string; // '18:30'
  reportSendTime: string; // '18:30'
  timezone: string; // 'Asia/Kolkata'
  scheduleType?: 'daily' | 'once' | 'weekdays' | 'custom';
  selectedReportDate?: string;
  lastDeliveryStatus?: 'Enabled' | 'Disabled' | 'Scheduled' | 'Completed' | 'Failed';
  lastDeliveryAt?: Date | null;
  workingDays: string[]; // ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
  deliveryMode: 'automatic' | 'manual_approval';

  // Default recipients & groups
  defaultRecipientGroups: string[];
  ccEmails: string[];
  bccEmails: string[];

  // Included sections in reports
  includeAws: boolean;
  includeAzure: boolean;
  includeOnPrem: boolean;
  includeApp: boolean;
  includeDeployments: boolean;
  includeTroubleshooting: boolean;
  includePending: boolean;
  attachPdf: boolean;

  // Custom SMTP override (or fallback to environment variables)
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  smtpUser?: string;
  smtpPassword?: string;
  senderName?: string;
  senderEmail?: string;

  // Multi-Platform Webhook Channels
  slackWebhookUrl?: string;
  slackEnabled?: boolean;
  discordWebhookUrl?: string;
  discordEnabled?: boolean;
  teamsWebhookUrl?: string;
  teamsEnabled?: boolean;
  telegramBotToken?: string;
  telegramChatId?: string;
  telegramEnabled?: boolean;

  // Smart Features & Maintenance
  maintenanceMode?: boolean;
  alertDeduplicationEnabled?: boolean;
  aiExecutiveSummaryEnabled?: boolean;

  // Retention
  reportRetentionDays: number;

  createdAt: Date;
  updatedAt: Date;
}

const ActivityCenterSettingsSchema: Schema = new Schema(
  {
    trackingEnabled: { type: Boolean, default: true, index: true },
    autoReportEnabled: { type: Boolean, default: true, index: true },
    workStartTime: { type: String, default: '09:30' },
    workEndTime: { type: String, default: '18:30' },
    reportSendTime: { type: String, default: '18:30' },
    timezone: { type: String, default: 'Asia/Kolkata' },
    scheduleType: {
      type: String,
      enum: ['daily', 'once', 'weekdays', 'custom'],
      default: 'daily',
    },
    selectedReportDate: { type: String, default: '' },
    lastDeliveryStatus: {
      type: String,
      enum: ['Enabled', 'Disabled', 'Scheduled', 'Completed', 'Failed'],
      default: 'Scheduled',
    },
    lastDeliveryAt: { type: Date, default: null },
    workingDays: {
      type: [String],
      default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    },
    deliveryMode: {
      type: String,
      enum: ['automatic', 'manual_approval'],
      default: 'automatic',
    },
    defaultRecipientGroups: {
      type: [String],
      default: ['HR', 'Manager', 'CTO', 'Team Lead', 'Work Members'],
    },
    ccEmails: { type: [String], default: [] },
    bccEmails: { type: [String], default: [] },
    includeAws: { type: Boolean, default: true },
    includeAzure: { type: Boolean, default: true },
    includeOnPrem: { type: Boolean, default: true },
    includeApp: { type: Boolean, default: true },
    includeDeployments: { type: Boolean, default: true },
    includeTroubleshooting: { type: Boolean, default: true },
    includePending: { type: Boolean, default: true },
    attachPdf: { type: Boolean, default: true },
    smtpHost: { type: String, default: '' },
    smtpPort: { type: Number, default: 587 },
    smtpSecure: { type: Boolean, default: false },
    smtpUser: { type: String, default: '' },
    smtpPassword: { type: String, default: '' },
    senderName: { type: String, default: 'MultiCloud DevOps Activity Center' },
    senderEmail: { type: String, default: '' },
    reportRetentionDays: { type: Number, default: 90 },

    // Webhook Channels
    slackWebhookUrl: { type: String, default: '' },
    slackEnabled: { type: Boolean, default: false },
    discordWebhookUrl: { type: String, default: '' },
    discordEnabled: { type: Boolean, default: false },
    teamsWebhookUrl: { type: String, default: '' },
    teamsEnabled: { type: Boolean, default: false },
    telegramBotToken: { type: String, default: '' },
    telegramChatId: { type: String, default: '' },
    telegramEnabled: { type: Boolean, default: false },

    // Smart Features & Maintenance
    maintenanceMode: { type: Boolean, default: false },
    alertDeduplicationEnabled: { type: Boolean, default: true },
    aiExecutiveSummaryEnabled: { type: Boolean, default: true },
  },
  { timestamps: true }
);

if (mongoose.models.ActivityCenterSettings) {
  delete (mongoose.models as any).ActivityCenterSettings;
}

export const ActivityCenterSettings: Model<IActivityCenterSettings> =
  mongoose.model<IActivityCenterSettings>(
    'ActivityCenterSettings',
    ActivityCenterSettingsSchema
  );

export default ActivityCenterSettings;
