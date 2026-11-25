import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITerraformVariable extends Document {
  projectId: mongoose.Types.ObjectId;
  workspace: string; // 'all' or specific workspace
  key: string;
  value: string;
  type: 'string' | 'number' | 'boolean' | 'list' | 'map';
  category: 'terraform' | 'env';
  description?: string;
  sensitive: boolean;
  required: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TerraformVariableSchema = new Schema<ITerraformVariable>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'TerraformProject', required: true, index: true },
    workspace: { type: String, default: 'all' },
    key: { type: String, required: true, trim: true },
    value: { type: String, default: '' },
    type: { type: String, default: 'string', enum: ['string', 'number', 'boolean', 'list', 'map'] },
    category: { type: String, default: 'terraform', enum: ['terraform', 'env'] },
    description: { type: String, default: '' },
    sensitive: { type: Boolean, default: false },
    required: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

TerraformVariableSchema.index({ projectId: 1, key: 1, workspace: 1 }, { unique: true });

const TerraformVariable: Model<ITerraformVariable> =
  mongoose.models.TerraformVariable ||
  mongoose.model<ITerraformVariable>('TerraformVariable', TerraformVariableSchema);

export default TerraformVariable;
