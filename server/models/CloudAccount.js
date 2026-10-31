const mongoose = require('mongoose');

const CloudAccountSchema = new mongoose.Schema(
  {
    provider: {
      type: String,
      required: true,
      enum: ['aws', 'azure'],
    },
    accountName: {
      type: String,
      required: true,
    },
    // AWS specific
    accountId: {
      type: String,
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
    },
    tenantId: {
      type: String,
    },
    clientId: {
      type: String,
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

module.exports = mongoose.model('CloudAccount', CloudAccountSchema);
