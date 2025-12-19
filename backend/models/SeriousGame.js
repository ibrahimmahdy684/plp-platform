const mongoose = require('mongoose');

const seriousGameSchema = new mongoose.Schema({
  gameType: {
    type: String,
    enum: ['Math', 'Physics', 'Language', 'Coding'],
    required: [true, 'Game type is required']
  },
  difficultyLevel: {
    type: String,
    enum: ['Easy', 'Medium', 'Hard'],
    required: [true, 'Difficulty level is required']
  },
  name: {
    type: String,
    required: [true, 'Game name is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Game description is required']
  },
  maxPoints: {
    type: Number,
    required: [true, 'Max points is required'],
    min: [10, 'Minimum max points is 10']
  },
  // Age groups this game is appropriate for
  appropriateAgeGroups: [{
    type: String,
    enum: ['3-5', '6-8', '9-12']
  }],
  icon: {
    type: String,
    default: '🎮'
  },
  color: {
    type: String,
    default: 'from-purple-400 to-pink-400'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Questions for the game
  questions: [{
    question: String,
    options: [String],
    correctAnswer: Number,
    hint: String,
    points: {
      type: Number,
      default: 20
    }
  }],
  // Statistics
  totalPlays: {
    type: Number,
    default: 0
  },
  averageScore: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index for queries
seriousGameSchema.index({ gameType: 1, difficultyLevel: 1 });
seriousGameSchema.index({ appropriateAgeGroups: 1 });
seriousGameSchema.index({ isActive: 1 });

// Static method to get games for an age group
seriousGameSchema.statics.getGamesForAgeGroup = function(ageGroup) {
  return this.find({
    appropriateAgeGroups: ageGroup,
    isActive: true
  });
};

// Method to record a play
seriousGameSchema.methods.recordPlay = async function(score) {
  const newTotalPlays = this.totalPlays + 1;
  const newAverageScore = ((this.averageScore * this.totalPlays) + score) / newTotalPlays;
  
  this.totalPlays = newTotalPlays;
  this.averageScore = newAverageScore;
  await this.save();
};

module.exports = mongoose.model('SeriousGame', seriousGameSchema);
