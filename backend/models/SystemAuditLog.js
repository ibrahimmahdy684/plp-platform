const mongoose = require('mongoose');

const systemAuditLogSchema = new mongoose.Schema({
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: true
  },
  entityType: {
    type: String,
    enum: ['User', 'ChildProfile', 'GuardianProfile', 'SeriousGame', 'SafetyAlert', 'Settings', 'Other'],
    required: true
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  ipAddress: {
    type: String,
    default: null
  },
  userAgent: {
    type: String,
    default: null
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for queries
systemAuditLogSchema.index({ performedBy: 1, timestamp: -1 });
systemAuditLogSchema.index({ entityType: 1, entityId: 1 });
systemAuditLogSchema.index({ timestamp: -1 });

// Static method to create audit log
systemAuditLogSchema.statics.log = function(performedBy, action, entityType, entityId = null, details = {}, req = null) {
  return this.create({
    performedBy,
    action,
    entityType,
    entityId,
    details,
    ipAddress: req ? req.ip : null,
    userAgent: req ? req.headers['user-agent'] : null
  });
};

// Static method to get logs for admin
systemAuditLogSchema.statics.getRecentLogs = function(limit = 100) {
  return this.find()
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate('performedBy', 'userName role');
};

module.exports = mongoose.model('SystemAuditLog', systemAuditLogSchema);
