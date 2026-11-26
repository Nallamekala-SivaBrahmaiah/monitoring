import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IEmergencyPhone extends Document {
  phone: string;
  label: string;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const EmergencyPhoneSchema: Schema<IEmergencyPhone> = new Schema(
  {
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    label: {
      type: String,
      default: 'On-Call DevOps',
      trim: true,
    },
    enabled: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

if (mongoose.models.EmergencyPhone) {
  delete (mongoose.models as any).EmergencyPhone;
}

const EmergencyPhone: Model<IEmergencyPhone> = mongoose.model<IEmergencyPhone>(
  'EmergencyPhone',
  EmergencyPhoneSchema
);

export default EmergencyPhone;
