const mongoose = require('mongoose');

const ResourceSchema = new mongoose.Schema(
  {
    provider: {
      type: String,
      required: true,
      enum: ['aws', 'azure'],
      index: true,
    },
    accountId: {
      type: String, // AWS account ID
      index: true,
    },
    subscriptionId: {
      type: String, // Azure subscription ID
      index: true,
    },
    region: {
      type: String,
      required: true,
      index: true,
    },
    resourceType: {
      type: String,
      required: true,
      index: true,
    },
    resourceId: {
      type: String,
      required: true,
      index: true,
    },
    name: {
      type: String,
    },
    status: {
      type: String,
      default: 'Running',
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

// High-performance composite indexes
ResourceSchema.index({ provider: 1, subscriptionId: 1 });
ResourceSchema.index({ provider: 1, accountId: 1 });
ResourceSchema.index({ provider: 1, region: 1 });
ResourceSchema.index({ provider: 1, resourceType: 1 });

// Static query builder
ResourceSchema.statics.buildProviderQuery = function (provider, extraFilters = {}) {
  const query = { ...extraFilters };
  if (provider === 'aws') {
    query.provider = 'aws';
  } else if (provider === 'azure') {
    query.provider = 'azure';
  } else if (provider === 'all' || !provider) {
    query.provider = { $in: ['aws', 'azure'] };
  }
  return query;
};

module.exports = mongoose.model('Resource', ResourceSchema);
