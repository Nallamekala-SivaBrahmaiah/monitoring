import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IDevOpsProofLog extends Document {
  auditId: string;
  engineerName: string;
  actionType: 'Deployment' | 'Troubleshooting' | 'Security Patch' | 'Configuration' | 'Disaster Recovery';
  tool: string; // "Docker", "Kubernetes", "Maven", "Ansible", "Terraform", "Jenkins", "SonarQube", "Trivy", "Server OS"
  summary: string;
  serverOrHost: string;
  commandsExecuted: string;
  resultOutcome: string;
  durationMinutes: number;
  recipients: string[];
  clockTimeIST: string;
  clockTimeUTC: string;
  status: 'Delivered' | 'Pending' | 'Failed';
  messageId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const DevOpsProofLogSchema: Schema<IDevOpsProofLog> = new Schema(
  {
    auditId: { type: String, required: true, unique: true, index: true },
    engineerName: { type: String, required: true, default: 'Siva' },
    actionType: {
      type: String,
      required: true,
      default: 'Troubleshooting',
    },
    tool: { type: String, required: true, default: 'Server OS' },
    summary: { type: String, required: true },
    serverOrHost: { type: String, default: 'vm01siva-mon (4.240.105.247)' },
    commandsExecuted: { type: String, default: '' },
    resultOutcome: { type: String, default: 'Successfully Resolved' },
    durationMinutes: { type: Number, default: 15 },
    recipients: { type: [String], default: [] },
    clockTimeIST: { type: String, required: true },
    clockTimeUTC: { type: String, required: true },
    status: { type: String, enum: ['Delivered', 'Pending', 'Failed'], default: 'Delivered' },
    messageId: { type: String, default: '' },
  },
  {
    timestamps: true,
  }
);

if (mongoose.models.DevOpsProofLog) {
  delete (mongoose.models as any).DevOpsProofLog;
}

export const DevOpsProofLog: Model<IDevOpsProofLog> =
  mongoose.model<IDevOpsProofLog>('DevOpsProofLog', DevOpsProofLogSchema);

export default DevOpsProofLog;
