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
    },
    subscriptionId: {
      type: String, // Azure subscription ID
    },
    region: {
      type: String,
      required: true,
      index: true,
    },
    resourceType: {
      type: String,
      required: true,
      enum: ['ec2', 'virtual-machine', 'container', 'cluster', 'pod', 'database'],
    },
    resourceId: {
      type: String,
      required: true,
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

// Method to build provider MongoDB query
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
