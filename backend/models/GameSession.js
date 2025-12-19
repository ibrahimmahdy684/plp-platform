const mongoose = require('mongoose');

const gameSessionSchema = new mongoose.Schema({
  childId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  gameId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SeriousGame',
    required: true
  },
  scoreRaw: {
    type: Number,
    default: 0,
    min: [0, 'Score cannot be negative']
  },
  kpEarned: {
    type: Number,
    default: 0,
    min: [0, 'KP earned cannot be negative']
  },
  startTime: {
    type: Date,
    default: Date.now
  },
  endTime: {
    type: Date
  },
  // Session statistics
  questionsAnswered: {
    type: Number,
    default: 0
  },
  correctAnswers: {
    type: Number,
    default: 0
  },
  hintsUsed: {
    type: Number,
    default: 0
  },
  // Badge earned in this session
  badgeEarned: {
    type: String,
    default: null
  },
  isCompleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for queries
gameSessionSchema.index({ childId: 1, startTime: -1 });
gameSessionSchema.index({ gameId: 1 });

// Virtual for duration in minutes
gameSessionSchema.virtual('durationMinutes').get(function() {
  if (this.endTime && this.startTime) {
    return Math.round((this.endTime - this.startTime) / (1000 * 60));
  }
  return 0;
});

// Method to complete session
gameSessionSchema.methods.complete = async function(score, correctAnswers, questionsAnswered, hintsUsed, badgeEarned) {
  this.endTime = new Date();
  this.scoreRaw = score;
  this.kpEarned = score; // Points directly translate to KP
  this.correctAnswers = correctAnswers;
  this.questionsAnswered = questionsAnswered;
  this.hintsUsed = hintsUsed;
  this.badgeEarned = badgeEarned;
  this.isCompleted = true;
  
  await this.save();
  
  // Update child profile
  const ChildProfile = require('./ChildProfile');
  const childProfile = await ChildProfile.findOne({ childId: this.childId });
  
  if (childProfile) {
    await childProfile.addPoints(this.kpEarned, `SeriousGame: ${this.gameId}`);
    
    if (badgeEarned) {
      await childProfile.addAchievement(badgeEarned);
    }
    
    childProfile.totalGamesPlayed += 1;
    await childProfile.save();
  }
  
  // Update game statistics
  const SeriousGame = require('./SeriousGame');
  const game = await SeriousGame.findById(this.gameId);
  if (game) {
    await game.recordPlay(score);
  }
  
  return this;
};

// Static method to get child's recent sessions
gameSessionSchema.statics.getRecentSessions = function(childId, limit = 10) {
  return this.find({ childId, isCompleted: true })
    .sort({ endTime: -1 })
    .limit(limit)
    .populate('gameId');
};

// Static method to get child's stats
gameSessionSchema.statics.getChildStats = async function(childId) {
  const sessions = await this.find({ childId, isCompleted: true });
  
  return {
    totalSessions: sessions.length,
    totalPointsEarned: sessions.reduce((sum, s) => sum + s.kpEarned, 0),
    totalCorrectAnswers: sessions.reduce((sum, s) => sum + s.correctAnswers, 0),
    totalQuestions: sessions.reduce((sum, s) => sum + s.questionsAnswered, 0),
    averageAccuracy: sessions.length > 0 
      ? Math.round((sessions.reduce((sum, s) => sum + s.correctAnswers, 0) / 
          sessions.reduce((sum, s) => sum + s.questionsAnswered, 0)) * 100)
      : 0
  };
};

module.exports = mongoose.model('GameSession', gameSessionSchema);
