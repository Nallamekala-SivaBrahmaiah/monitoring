import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAiChatSessionMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  model?: string;
  isError?: boolean;
  actionProposal?: any;
  logId?: string;
  actionStatus?: string;
  actionOutput?: string;
  verifyOutput?: string;
  rollbackOutput?: string;
}

export interface IAiChatSession extends Document {
  title: string;
  aiModel: string;
  serverName?: string;
  messages: IAiChatSessionMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const AiChatSessionSchema: Schema = new Schema(
  {
    title: { type: String, required: true },
    aiModel: { type: String, default: 'gemini-2.5-flash' },
    serverName: { type: String },
    messages: { type: Schema.Types.Mixed, default: [] },
  },
  {
    collection: 'ai_chat_sessions',
    timestamps: true,
  }
);

AiChatSessionSchema.index({ updatedAt: -1 });

export const AiChatSession: Model<IAiChatSession> =
  mongoose.models.AiChatSession ||
  mongoose.model<IAiChatSession>('AiChatSession', AiChatSessionSchema);

export default AiChatSession;
