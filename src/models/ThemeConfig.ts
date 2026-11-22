import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IThemeConfig extends Document {
  userId?: string;
  name: string;
  isDefault: boolean;
  config: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const ThemeConfigSchema = new Schema<IThemeConfig>(
  {
    userId: {
      type: String,
      default: 'global_admin',
      index: true,
    },
    name: {
      type: String,
      required: true,
      default: 'Custom Theme',
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    config: {
      type: Schema.Types.Mixed,
      required: true,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

export const ThemeConfig: Model<IThemeConfig> =
  mongoose.models.ThemeConfig || mongoose.model<IThemeConfig>('ThemeConfig', ThemeConfigSchema);
export default ThemeConfig;
