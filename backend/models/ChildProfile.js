const mongoose = require('mongoose');

const childProfileSchema = new mongoose.Schema({
  childId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  ageGroup: {
    type: String,
    enum: ['3-5', '6-8', '9-12'],
    required: [true, 'Age group is required']
  },
  knowledgePoints: {
    type: Number,
    default: 0,
    min: [0, 'Knowledge points cannot be negative']
  },
  achievements: [{
    type: String
  }],
  timeLimitMinutes: {
    type: Number,
    default: 60,
    min: [15, 'Minimum time limit is 15 minutes'],
    max: [240, 'Maximum time limit is 240 minutes']
  },
  timeUsedToday: {
    type: Number,
    default: 0,
    min: [0, 'Time used cannot be negative']
  },
  lastTimeReset: {
    type: Date,
    default: Date.now
  },
  // Guardian who manages this child
  guardianId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // Games the child is allowed to access (set by guardian)
  allowedGames: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SeriousGame'
  }],
  // Track all-time stats
  totalGamesPlayed: {
    type: Number,
    default: 0
  },
  totalTimeSpent: {
    type: Number,
    default: 0 // in minutes
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for queries
childProfileSchema.index({ guardianId: 1 });
childProfileSchema.index({ ageGroup: 1 });

// Virtual to get the user data
childProfileSchema.virtual('user', {
  ref: 'User',
  localField: 'childId',
  foreignField: '_id',
  justOne: true
});

// Method to add points
childProfileSchema.methods.addPoints = async function(points, reason) {
  this.knowledgePoints += points;
  await this.save();
  
  // Create transaction record
  const KnowledgePointsTransaction = require('./KnowledgePointsTransaction');
  await KnowledgePointsTransaction.create({
    childId: this.childId,
    points,
    reason
  });
  
  return this.knowledgePoints;
};

// Method to add achievement
childProfileSchema.methods.addAchievement = async function(achievement) {
  if (!this.achievements.includes(achievement)) {
    this.achievements.push(achievement);
    await this.save();
    return true;
  }
  return false;
};

// Method to reset daily time
childProfileSchema.methods.resetDailyTime = async function() {
  const now = new Date();
  const lastReset = new Date(this.lastTimeReset);
  
  // Check if it's a new day
  if (now.toDateString() !== lastReset.toDateString()) {
    this.timeUsedToday = 0;
    this.lastTimeReset = now;
    await this.save();
  }
};

// Method to add time used
childProfileSchema.methods.addTimeUsed = async function(minutes) {
  this.timeUsedToday += minutes;
  this.totalTimeSpent += minutes;
  await this.save();
  
  return {
    timeUsedToday: this.timeUsedToday,
    timeRemaining: Math.max(0, this.timeLimitMinutes - this.timeUsedToday)
  };
};

// Static method to check time limit
childProfileSchema.statics.checkTimeLimit = async function(childId) {
  const profile = await this.findOne({ childId });
  if (!profile) return { allowed: false, message: 'Profile not found' };
  
  await profile.resetDailyTime();
  
  const timeRemaining = profile.timeLimitMinutes - profile.timeUsedToday;
  return {
    allowed: timeRemaining > 0,
    timeRemaining,
    timeLimitMinutes: profile.timeLimitMinutes,
    timeUsedToday: profile.timeUsedToday
  };
};

module.exports = mongoose.model('ChildProfile', childProfileSchema);
