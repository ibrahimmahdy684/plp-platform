const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  content: {
    type: String,
    required: true
  },
  isFlagged: {
    type: Boolean,
    default: false
  },
  flagReason: {
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
chatMessageSchema.index({ senderId: 1, timestamp: -1 });
chatMessageSchema.index({ isFlagged: 1 });

// Pre-save middleware to check for safety threats
chatMessageSchema.pre('save', async function(next) {
  if (this.isNew || this.isModified('content')) {
    const SafetyThreatDictionary = require('./SafetyThreatDictionary');
    const threats = await SafetyThreatDictionary.checkContent(this.content);
    
    if (threats.length > 0) {
      this.isFlagged = true;
      this.flagReason = threats.map(t => t.category).join(', ');
      
      // Create safety alert
      const SafetyAlert = require('./SafetyAlert');
      const highestSeverity = SafetyThreatDictionary.getHighestSeverity(threats);
      
      await SafetyAlert.create({
        childId: this.senderId,
        severity: highestSeverity,
        alertType: threats[0].category === 'Cyberbullying' ? 'Cyberbullying' : 
                   threats[0].category === 'ExplicitContent' ? 'ExplicitContent' : 'Other',
        message: `Flagged message detected with ${threats.length} safety concern(s)`,
        triggerKeyword: threats[0].keyword
      });
    }
  }
  next();
});

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
