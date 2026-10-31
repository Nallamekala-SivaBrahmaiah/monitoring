import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IMetric extends Document {
  provider: 'aws' | 'azure';
  resourceId: string;
  resourceType: string;
  metricName: string;
  value: number;
  unit: string;
  timestamp: Date;
}

const MetricSchema: Schema<IMetric> = new Schema(
  {
    provider: {
      type: String,
      required: true,
      enum: ['aws', 'azure'],
      index: true,
    },
    resourceId: {
      type: String,
      required: true,
      index: true,
    },
    resourceType: {
      type: String,
      required: true,
      index: true,
    },
    metricName: {
      type: String,
      required: true,
      index: true,
    },
    value: {
      type: Number,
      required: true,
    },
    unit: {
      type: String,
      default: '%',
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

MetricSchema.index({ resourceId: 1, metricName: 1, timestamp: -1 });

export const Metric: Model<IMetric> =
  mongoose.models.Metric || mongoose.model<IMetric>('Metric', MetricSchema);

export default Metric;
