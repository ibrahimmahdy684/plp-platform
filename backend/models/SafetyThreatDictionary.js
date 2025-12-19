const mongoose = require('mongoose');

const safetyThreatDictionarySchema = new mongoose.Schema({
  keyword: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  severity: {
    type: String,
    enum: ['Low', 'Medium', 'High'],
    required: true
  },
  category: {
    type: String,
    enum: ['Cyberbullying', 'ExplicitContent', 'PersonalInfo', 'Violence', 'Other'],
    default: 'Other'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for fast lookups
safetyThreatDictionarySchema.index({ keyword: 1, isActive: 1 });

// Static method to check content for threats
safetyThreatDictionarySchema.statics.checkContent = async function(content) {
  const threats = await this.find({ isActive: true });
  const contentLower = content.toLowerCase();
  const foundThreats = [];
  
  for (const threat of threats) {
    if (contentLower.includes(threat.keyword)) {
      foundThreats.push({
        keyword: threat.keyword,
        severity: threat.severity,
        category: threat.category
      });
    }
  }
  
  return foundThreats;
};

// Static method to get highest severity from found threats
safetyThreatDictionarySchema.statics.getHighestSeverity = function(threats) {
  if (threats.length === 0) return null;
  
  const severityOrder = { 'High': 3, 'Medium': 2, 'Low': 1 };
  let highest = threats[0];
  
  for (const threat of threats) {
    if (severityOrder[threat.severity] > severityOrder[highest.severity]) {
      highest = threat;
    }
  }
  
  return highest.severity;
};

module.exports = mongoose.model('SafetyThreatDictionary', safetyThreatDictionarySchema);
