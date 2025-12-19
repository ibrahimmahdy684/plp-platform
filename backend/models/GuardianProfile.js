const mongoose = require('mongoose');

const guardianProfileSchema = new mongoose.Schema({
  guardianId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  linkedChildren: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChildProfile'
  }],
  notificationPreferences: {
    type: String,
    enum: ['Email', 'App', 'Both'],
    default: 'App'
  },
  // Settings for managing children
  defaultTimeLimit: {
    type: Number,
    default: 60,
    min: [15, 'Minimum time limit is 15 minutes'],
    max: [240, 'Maximum time limit is 240 minutes']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual to get the user data
guardianProfileSchema.virtual('user', {
  ref: 'User',
  localField: 'guardianId',
  foreignField: '_id',
  justOne: true
});

// Virtual to get linked children profiles
guardianProfileSchema.virtual('children', {
  ref: 'ChildProfile',
  localField: 'linkedChildren',
  foreignField: '_id'
});

// Method to link a child
guardianProfileSchema.methods.linkChild = async function(childProfileId) {
  if (!this.linkedChildren.includes(childProfileId)) {
    this.linkedChildren.push(childProfileId);
    await this.save();
    
    // Update child's guardian reference
    const ChildProfile = require('./ChildProfile');
    await ChildProfile.findByIdAndUpdate(childProfileId, { guardianId: this.guardianId });
    
    return true;
  }
  return false;
};

// Method to unlink a child
guardianProfileSchema.methods.unlinkChild = async function(childProfileId) {
  const index = this.linkedChildren.indexOf(childProfileId);
  if (index > -1) {
    this.linkedChildren.splice(index, 1);
    await this.save();
    
    // Remove guardian reference from child
    const ChildProfile = require('./ChildProfile');
    await ChildProfile.findByIdAndUpdate(childProfileId, { $unset: { guardianId: 1 } });
    
    return true;
  }
  return false;
};

// Method to set time limit for a child
guardianProfileSchema.methods.setChildTimeLimit = async function(childProfileId, minutes) {
  if (!this.linkedChildren.includes(childProfileId)) {
    throw new Error('Child is not linked to this guardian');
  }
  
  const ChildProfile = require('./ChildProfile');
  await ChildProfile.findByIdAndUpdate(childProfileId, { timeLimitMinutes: minutes });
  return true;
};

// Method to set allowed games for a child
guardianProfileSchema.methods.setChildAllowedGames = async function(childProfileId, gameIds) {
  if (!this.linkedChildren.includes(childProfileId)) {
    throw new Error('Child is not linked to this guardian');
  }
  
  const ChildProfile = require('./ChildProfile');
  await ChildProfile.findByIdAndUpdate(childProfileId, { allowedGames: gameIds });
  return true;
};

module.exports = mongoose.model('GuardianProfile', guardianProfileSchema);
