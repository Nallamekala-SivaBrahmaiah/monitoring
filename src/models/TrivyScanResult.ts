import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITrivyVulnerability {
  vulnerabilityId: string;
  pkgName: string;
  installedVersion: string;
  fixedVersion?: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';
  title?: string;
  description?: string;
  primaryUrl?: string;
}

export interface ITrivyScanResultData {
  _id?: any;
  serverId: string;
  serverName: string;
  serverHost: string;
  scanType: 'image' | 'fs' | 'repo';
  target: string;
  status: 'SUCCESS' | 'FAILED';
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    unknown: number;
    total: number;
  };
  vulnerabilities: ITrivyVulnerability[];
  rawOutput?: string;
  errorMessage?: string;
  durationMs?: number;
  scannedAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ITrivyScanResultDocument extends Omit<ITrivyScanResultData, '_id'>, Document {}

const TrivyScanResultSchema = new Schema<ITrivyScanResultDocument>(
  {
    serverId: { type: String, required: true, index: true },
    serverName: { type: String, required: true },
    serverHost: { type: String, required: true },
    scanType: { type: String, enum: ['image', 'fs', 'repo'], required: true },
    target: { type: String, required: true },
    status: { type: String, enum: ['SUCCESS', 'FAILED'], default: 'SUCCESS' },
    summary: {
      critical: { type: Number, default: 0 },
      high: { type: Number, default: 0 },
      medium: { type: Number, default: 0 },
      low: { type: Number, default: 0 },
      unknown: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
    },
    vulnerabilities: [
      {
        vulnerabilityId: { type: String, required: true },
        pkgName: { type: String, required: true },
        installedVersion: { type: String, default: '' },
        fixedVersion: { type: String, default: '' },
        severity: {
          type: String,
          enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'UNKNOWN'],
          default: 'UNKNOWN',
        },
        title: { type: String, default: '' },
        description: { type: String, default: '' },
        primaryUrl: { type: String, default: '' },
      },
    ],
    rawOutput: { type: String, default: '' },
    errorMessage: { type: String, default: '' },
    durationMs: { type: Number, default: 0 },
    scannedAt: { type: Date, default: Date.now, index: true },
  },
  {
    timestamps: true,
  }
);

if (mongoose.models && mongoose.models.TrivyScanResult) {
  delete (mongoose.models as any).TrivyScanResult;
}

const TrivyScanResult: Model<ITrivyScanResultDocument> = mongoose.model<ITrivyScanResultDocument>(
  'TrivyScanResult',
  TrivyScanResultSchema
);

export default TrivyScanResult;
