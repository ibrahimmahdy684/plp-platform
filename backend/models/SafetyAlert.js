const mongoose = require('mongoose');

const safetyAlertSchema = new mongoose.Schema({
  childId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  severity: {
    type: String,
    enum: ['Low', 'Medium', 'High'],
    required: true
  },
  alertType: {
    type: String,
    enum: ['Cyberbullying', 'ExplicitContent', 'ScreenTime', 'TimeExtensionRequest', 'Other'],
    required: true
  },
  message: {
    type: String,
    required: true
  },
  triggerKeyword: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  resolved: {
    type: Boolean,
    default: false
  },
  resolvedAt: {
    type: Date,
    default: null
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  // Auto-deletion date based on retention policy (default 90 days)
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
  }
}, {
  timestamps: true
});

// Index for queries
safetyAlertSchema.index({ childId: 1, createdAt: -1 });
safetyAlertSchema.index({ resolved: 1 });
safetyAlertSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

// Static method to create time extension request
safetyAlertSchema.statics.createTimeExtensionRequest = function(childId, requestedMinutes) {
  return this.create({
    childId,
    severity: 'Low',
    alertType: 'TimeExtensionRequest',
    message: `Time extension request for ${requestedMinutes} additional minutes`
  });
};

// Static method to get unresolved alerts for guardian's children
safetyAlertSchema.statics.getUnresolvedForGuardian = async function(guardianId) {
  const GuardianProfile = require('./GuardianProfile');
  const ChildProfile = require('./ChildProfile');
  
  const guardianProfile = await GuardianProfile.findOne({ guardianId });
  if (!guardianProfile) return [];
  
  const childProfiles = await ChildProfile.find({ _id: { $in: guardianProfile.linkedChildren } });
  const childUserIds = childProfiles.map(cp => cp.childId);
  
  return this.find({
    childId: { $in: childUserIds },
    resolved: false
  }).sort({ createdAt: -1 });
};

// Method to resolve alert
safetyAlertSchema.methods.resolve = async function(resolvedByUserId) {
  this.resolved = true;
  this.resolvedAt = new Date();
  this.resolvedBy = resolvedByUserId;
  await this.save();
  return this;
};

module.exports = mongoose.model('SafetyAlert', safetyAlertSchema);
