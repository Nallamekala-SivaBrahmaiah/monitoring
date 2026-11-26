import mongoose, { Schema, Document, Model } from 'mongoose';

export interface INotificationPreferences extends Document {
  userId: string;
  emailNotificationsEnabled: boolean;
  inAppNotificationsEnabled: boolean;
  alertRecipients: string[];
  phoneNumbers: string[];
  smsEnabled: boolean;
  audioEnabled: boolean;
  pushEnabled: boolean;
  webhookEnabled: boolean;
  webhookUrl: string;
  smsOnlyP1: boolean;
  notifyOnResolved: boolean;
  reminderIntervalMinutes: number;
  minSeverity: 'critical' | 'warning' | 'info';
  updatedAt: Date;
  createdAt: Date;
}

const NotificationPreferencesSchema: Schema<INotificationPreferences> = new Schema(
  {
    userId: {
      type: String,
      default: 'admin',
      unique: true,
      index: true,
    },
    emailNotificationsEnabled: {
      type: Boolean,
      default: true,
    },
    inAppNotificationsEnabled: {
      type: Boolean,
      default: true,
    },
    alertRecipients: {
      type: [String],
      default: ['nallasiva552@gmail.com'],
    },
    phoneNumbers: {
      type: [String],
      default: [],
    },
    smsEnabled: {
      type: Boolean,
      default: true,
    },
    audioEnabled: {
      type: Boolean,
      default: true,
    },
    pushEnabled: {
      type: Boolean,
      default: true,
    },
    webhookEnabled: {
      type: Boolean,
      default: false,
    },
    webhookUrl: {
      type: String,
      default: '',
    },
    smsOnlyP1: {
      type: Boolean,
      default: true,
    },
    notifyOnResolved: {
      type: Boolean,
      default: true,
    },
    reminderIntervalMinutes: {
      type: Number,
      default: 60,
    },
    minSeverity: {
      type: String,
      enum: ['critical', 'warning', 'info'],
      default: 'warning',
    },
  },
  {
    timestamps: true,
  }
);

if (mongoose.models.NotificationPreferences) {
  delete (mongoose.models as any).NotificationPreferences;
}

export const NotificationPreferences: Model<INotificationPreferences> =
  mongoose.model<INotificationPreferences>('NotificationPreferences', NotificationPreferencesSchema);

export default NotificationPreferences;

