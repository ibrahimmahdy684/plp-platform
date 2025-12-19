const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  guardianId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  alertId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SafetyAlert',
    required: true
  },
  isRead: {
    type: Boolean,
    default: false
  },
  sentAt: {
    type: Date,
    default: Date.now
  },
  readAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Index for queries
notificationSchema.index({ guardianId: 1, isRead: 1, sentAt: -1 });

// Static method to get unread notifications for guardian
notificationSchema.statics.getUnread = function(guardianId) {
  return this.find({ guardianId, isRead: false })
    .sort({ sentAt: -1 })
    .populate('alertId');
};

// Method to mark as read
notificationSchema.methods.markAsRead = async function() {
  this.isRead = true;
  this.readAt = new Date();
  await this.save();
  return this;
};

// Static method to create notification from alert
notificationSchema.statics.createFromAlert = async function(alertId, childId) {
  const ChildProfile = require('./ChildProfile');
  const childProfile = await ChildProfile.findOne({ childId });
  
  if (childProfile && childProfile.guardianId) {
    const GuardianProfile = require('./GuardianProfile');
    const guardianProfile = await GuardianProfile.findOne({ 
      linkedChildren: childProfile._id 
    });
    
    if (guardianProfile) {
      return this.create({
        guardianId: guardianProfile.guardianId,
        alertId
      });
    }
  }
  
  return null;
};

module.exports = mongoose.model('Notification', notificationSchema);
