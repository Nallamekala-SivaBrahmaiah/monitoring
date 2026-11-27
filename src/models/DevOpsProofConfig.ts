import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IDevOpsProofConfig extends Document {
  engineerName: string;
  engineerRole: string;
  autoDispatchOnAction: boolean;
  scheduledDispatchEnabled: boolean;
  emailDispatchEnabled: boolean;
  scheduledTime: string; // "18:00"
  timezone: string; // "Asia/Kolkata"
  toolsMonitored: string[]; // ["docker", "kubernetes", "maven", "ansible", "terraform", "jenkins", "sonarqube", "trivy", "server"]
  createdAt: Date;
  updatedAt: Date;
}

const DevOpsProofConfigSchema: Schema<IDevOpsProofConfig> = new Schema(
  {
    engineerName: { type: String, default: 'Siva', trim: true },
    engineerRole: { type: String, default: 'Lead DevOps Engineer', trim: true },
    autoDispatchOnAction: { type: Boolean, default: true },
    scheduledDispatchEnabled: { type: Boolean, default: true },
    emailDispatchEnabled: { type: Boolean, default: true },
    scheduledTime: { type: String, default: '18:00' },
    timezone: { type: String, default: 'Asia/Kolkata' },
    toolsMonitored: {
      type: [String],
      default: [
        'docker',
        'kubernetes',
        'maven',
        'ansible',
        'terraform',
        'jenkins',
        'sonarqube',
        'trivy',
        'server',
      ],
    },
  },
  {
    timestamps: true,
  }
);

if (mongoose.models.DevOpsProofConfig) {
  delete (mongoose.models as any).DevOpsProofConfig;
}

export const DevOpsProofConfig: Model<IDevOpsProofConfig> =
  mongoose.model<IDevOpsProofConfig>('DevOpsProofConfig', DevOpsProofConfigSchema);

export default DevOpsProofConfig;
