const mongoose = require('mongoose');

const knowledgePointsTransactionSchema = new mongoose.Schema({
  childId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  points: {
    type: Number,
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for queries
knowledgePointsTransactionSchema.index({ childId: 1, timestamp: -1 });

// Static method to get transaction history
knowledgePointsTransactionSchema.statics.getHistory = function(childId, limit = 50) {
  return this.find({ childId })
    .sort({ timestamp: -1 })
    .limit(limit);
};

// Static method to get total points for a period
knowledgePointsTransactionSchema.statics.getPointsForPeriod = async function(childId, startDate, endDate) {
  const transactions = await this.find({
    childId,
    timestamp: { $gte: startDate, $lte: endDate }
  });
  
  return transactions.reduce((sum, t) => sum + t.points, 0);
};

module.exports = mongoose.model('KnowledgePointsTransaction', knowledgePointsTransactionSchema);
