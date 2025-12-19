const mongoose = require('mongoose');

const timeUsageLogSchema = new mongoose.Schema({
  childId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  durationMinutes: {
    type: Number,
    required: true,
    min: [0, 'Duration cannot be negative']
  },
  sessionType: {
    type: String,
    enum: ['Game', 'Browse', 'Chat', 'Other'],
    default: 'Other'
  },
  gameId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SeriousGame',
    default: null
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  date: {
    type: String, // Format: YYYY-MM-DD
    default: () => new Date().toISOString().split('T')[0]
  }
}, {
  timestamps: true
});

// Index for queries
timeUsageLogSchema.index({ childId: 1, date: 1 });
timeUsageLogSchema.index({ childId: 1, timestamp: -1 });

// Static method to get daily usage
timeUsageLogSchema.statics.getDailyUsage = async function(childId, date = null) {
  const targetDate = date || new Date().toISOString().split('T')[0];
  
  const logs = await this.find({ childId, date: targetDate });
  return logs.reduce((sum, log) => sum + log.durationMinutes, 0);
};

// Static method to get usage for a date range
timeUsageLogSchema.statics.getUsageRange = async function(childId, startDate, endDate) {
  const logs = await this.find({
    childId,
    date: { $gte: startDate, $lte: endDate }
  }).sort({ date: 1 });
  
  // Group by date
  const usage = {};
  for (const log of logs) {
    if (!usage[log.date]) {
      usage[log.date] = 0;
    }
    usage[log.date] += log.durationMinutes;
  }
  
  return usage;
};

// Static method to get weekly summary
timeUsageLogSchema.statics.getWeeklySummary = async function(childId) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7);
  
  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];
  
  return this.getUsageRange(childId, startDateStr, endDateStr);
};

module.exports = mongoose.model('TimeUsageLog', timeUsageLogSchema);
