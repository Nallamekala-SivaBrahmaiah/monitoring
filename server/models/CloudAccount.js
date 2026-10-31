const mongoose = require('mongoose');

const CloudAccountSchema = new mongoose.Schema(
  {
    provider: {
      type: String,
      required: true,
      enum: ['aws', 'azure'],
      index: true,
    },
    accountName: {
      type: String,
      required: true,
    },
    // AWS specific
    accountId: {
      type: String,
      index: true,
    },
    roleArn: {
      type: String,
    },
    externalId: {
      type: String,
    },
    // Azure specific
    subscriptionId: {
      type: String,
      index: true,
    },
    tenantId: {
      type: String,
    },
    clientId: {
      type: String,
    },
    clientSecret: {
      type: String,
      select: false, // Hidden from frontend JSON responses by default for security
    },
    authType: {
      type: String,
      enum: ['client_secret', 'managed_identity'],
      default: 'client_secret',
    },
    status: {
      type: String,
      enum: ['Connected', 'Connection Failed', 'Disconnected'],
      default: 'Connected',
    },
    availableRegions: {
      type: [Object],
      default: [],
    },
    selectedRegions: {
      type: [String],
      default: [],
    },
    enabledRegions: {
      type: [String],
      default: [],
    },
    resourcesCount: {
      type: Number,
      default: 0,
    },
    monitoringEnabled: {
      type: Boolean,
      default: true,
    },
    lastSync: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

CloudAccountSchema.index({ provider: 1, subscriptionId: 1 });
CloudAccountSchema.index({ provider: 1, accountId: 1 });

module.exports = mongoose.model('CloudAccount', CloudAccountSchema);
