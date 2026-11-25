import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IRecommendedFix {
  id: string;
  title: string;
  description: string;
  commands: string;
  riskLevel: 'low' | 'medium' | 'high';
  expectedOutcome: string;
  isApproved?: boolean;
}

export interface IIncidentTimeline {
  timestamp: Date;
  event: string;
  actor: string;
  details?: string;
}

export interface IServerIncident extends Document {
  incidentId: string;
  serverName: string;
  serverId?: string;
  host: string;
  provider: 'aws' | 'azure' | 'onprem';
  resourceType: 'disk' | 'memory' | 'cpu' | 'service' | 'deployment' | 'network';
  severity: 'critical' | 'warning' | 'info';
  status: 'active' | 'investigating' | 'fix_approved' | 'fixing' | 'recovery_verified' | 'resolved';
  title: string;
  description: string;
  mountPoint?: string;
  currentValue: number;
  thresholdValue: number;
  unit: string;
  evidence: string[];
  diagnosticsOutput?: string;
  possibleCauses: string[];
  confirmedCause?: string;
  recommendedFixes: IRecommendedFix[];
  approvedBy?: string;
  approvedAt?: Date;
  executedFixTitle?: string;
  executedCommands?: string;
  executionOutput?: string;
  postFixValue?: number;
  recoveryVerifiedAt?: Date;
  recoveryMessage?: string;
  recoveryNotificationSent: boolean;
  startedAt: Date;
  resolvedAt?: Date | null;
  durationMinutes: number;
  timeline: IIncidentTimeline[];
  createdAt: Date;
  updatedAt: Date;
}

const ServerIncidentSchema: Schema = new Schema(
  {
    incidentId: { type: String, required: true, unique: true, index: true },
    serverName: { type: String, required: true, index: true },
    serverId: { type: String, default: '', index: true },
    host: { type: String, required: true },
    provider: { type: String, enum: ['aws', 'azure', 'onprem'], default: 'onprem' },
    resourceType: {
      type: String,
      enum: ['disk', 'memory', 'cpu', 'service', 'deployment', 'network'],
      required: true,
      index: true,
    },
    severity: {
      type: String,
      enum: ['critical', 'warning', 'info'],
      default: 'warning',
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'investigating', 'fix_approved', 'fixing', 'recovery_verified', 'resolved'],
      default: 'active',
      index: true,
    },
    title: { type: String, required: true },
    description: { type: String, required: true },
    mountPoint: { type: String, default: '/' },
    currentValue: { type: Number, required: true },
    thresholdValue: { type: Number, default: 70 },
    unit: { type: String, default: '%' },
    evidence: { type: [String], default: [] },
    diagnosticsOutput: { type: String, default: '' },
    possibleCauses: { type: [String], default: [] },
    confirmedCause: { type: String, default: '' },
    recommendedFixes: {
      type: [
        {
          id: { type: String, required: true },
          title: { type: String, required: true },
          description: { type: String, default: '' },
          commands: { type: String, required: true },
          riskLevel: { type: String, enum: ['low', 'medium', 'high'], default: 'low' },
          expectedOutcome: { type: String, default: '' },
          isApproved: { type: Boolean, default: false },
        },
      ],
      default: [],
    },
    approvedBy: { type: String, default: '' },
    approvedAt: { type: Date, default: null },
    executedFixTitle: { type: String, default: '' },
    executedCommands: { type: String, default: '' },
    executionOutput: { type: String, default: '' },
    postFixValue: { type: Number, default: null },
    recoveryVerifiedAt: { type: Date, default: null },
    recoveryMessage: { type: String, default: '' },
    recoveryNotificationSent: { type: Boolean, default: false },
    startedAt: { type: Date, default: Date.now, index: true },
    resolvedAt: { type: Date, default: null },
    durationMinutes: { type: Number, default: 0 },
    timeline: {
      type: [
        {
          timestamp: { type: Date, default: Date.now },
          event: { type: String, required: true },
          actor: { type: String, default: 'Autonomous Monitor' },
          details: { type: String, default: '' },
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

ServerIncidentSchema.index({ status: 1, severity: 1, startedAt: -1 });

if (mongoose.models.ServerIncident) {
  delete (mongoose.models as any).ServerIncident;
}

export const ServerIncident: Model<IServerIncident> =
  mongoose.model<IServerIncident>('ServerIncident', ServerIncidentSchema);

export default ServerIncident;
