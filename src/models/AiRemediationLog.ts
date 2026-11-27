import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAiRemediationLog {
  serverId?: string;
  serverName?: string;
  host?: string;
  provider?: string;
  userMessage: string;
  diagnosis?: string;
  toolAffected?: string; // Docker | Kubernetes | Maven | Ansible | Jenkins | SonarQube | Trivy | Terraform | Nginx | OS
  proposedAction?: string;
  fixCommand?: string;
  verifyCommand?: string;
  rollbackCommand?: string;
  decision: 'pending' | 'approved' | 'rejected' | 'modified';
  executionStatus?: 'idle' | 'running' | 'success' | 'failed' | 'rolled_back';
  executedAt?: Date;
  executionOutput?: string;
  executionSuccess?: boolean;
  verifyOutput?: string;
  verifySuccess?: boolean;
  rollbackExecuted?: boolean;
  rollbackOutput?: string;
  rollbackSuccess?: boolean;
  aiModel?: string;
  timestamp: Date;
}

export interface IAiRemediationLogDocument extends IAiRemediationLog, Document {}

const AiRemediationLogSchema = new Schema<IAiRemediationLogDocument>(
  {
    serverId: { type: String, index: true },
    serverName: { type: String },
    host: { type: String },
    provider: { type: String, default: 'custom' },
    userMessage: { type: String, required: true },
    diagnosis: { type: String },
    toolAffected: { type: String },
    proposedAction: { type: String },
    fixCommand: { type: String },
    verifyCommand: { type: String },
    rollbackCommand: { type: String },
    decision: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'modified'],
      default: 'pending',
      index: true,
    },
    executionStatus: {
      type: String,
      enum: ['idle', 'running', 'success', 'failed', 'rolled_back'],
      default: 'idle',
    },
    executedAt: { type: Date },
    executionOutput: { type: String },
    executionSuccess: { type: Boolean },
    verifyOutput: { type: String },
    verifySuccess: { type: Boolean },
    rollbackExecuted: { type: Boolean, default: false },
    rollbackOutput: { type: String },
    rollbackSuccess: { type: Boolean },
    aiModel: { type: String, default: 'gemini-4-hydrogen' },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  {
    collection: 'ai_remediation_logs',
    timestamps: true,
  }
);

// Prevent re-compilation in Next.js hot reload
const AiRemediationLog: Model<IAiRemediationLogDocument> =
  mongoose.models.AiRemediationLog ||
  mongoose.model<IAiRemediationLogDocument>('AiRemediationLog', AiRemediationLogSchema);

export default AiRemediationLog;
