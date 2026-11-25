import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAutomationScript extends Document {
  name: string;
  description: string;
  category: 'system' | 'devops' | 'docker' | 'security' | 'database' | 'custom';
  content: string;
  isBuiltIn: boolean;
  author?: string;
  version?: string;
  tags?: string[];
  lastExecutedAt?: Date;
  executionCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

const AutomationScriptSchema: Schema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    category: {
      type: String,
      enum: ['system', 'devops', 'docker', 'security', 'database', 'custom'],
      default: 'custom',
    },
    content: { type: String, required: true },
    isBuiltIn: { type: Boolean, default: false },
    author: { type: String, default: 'Admin' },
    version: { type: String, default: '1.0.0' },
    tags: [{ type: String }],
    lastExecutedAt: { type: Date, default: null },
    executionCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

AutomationScriptSchema.index({ name: 1, category: 1 });

const AutomationScript: Model<IAutomationScript> =
  mongoose.models.AutomationScript ||
  mongoose.model<IAutomationScript>('AutomationScript', AutomationScriptSchema);

export default AutomationScript;
