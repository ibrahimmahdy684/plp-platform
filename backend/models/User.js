const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  userName: {
    type: String,
    required: [true, 'Username is required'],
    trim: true,
    minlength: [2, 'Username must be at least 2 characters'],
    maxlength: [50, 'Username cannot exceed 50 characters']
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    sparse: true, // Allows null values for children
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  hashedPassword: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [60, 'Password hash must be 60 characters'] // bcrypt hash length
  },
  role: {
    type: String,
    enum: ['Child', 'Guardian', 'SystemAdmin', 'Admin'],
    required: [true, 'Role is required']
  },
  preferredLanguage: {
    type: String,
    enum: ['ar-EG', 'en-US'],
    default: 'en-US'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for performance
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('hashedPassword') || this.hashedPassword.length === 60) {
    return next();
  }
  
  const salt = await bcrypt.genSalt(12);
  this.hashedPassword = await bcrypt.hash(this.hashedPassword, salt);
  next();
});

// Method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.hashedPassword);
};

// Static method to find by email
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

// Virtual for child profile
userSchema.virtual('childProfile', {
  ref: 'ChildProfile',
  localField: '_id',
  foreignField: 'childId',
  justOne: true
});

// Virtual for guardian profile
userSchema.virtual('guardianProfile', {
  ref: 'GuardianProfile',
  localField: '_id',
  foreignField: 'guardianId',
  justOne: true
});

module.exports = mongoose.model('User', userSchema);
