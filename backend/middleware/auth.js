const jwt = require('jsonwebtoken');
const { User, ChildProfile, GuardianProfile } = require('../models');

// Generate JWT Token
const generateToken = (userId, role) => {
  return jwt.sign(
    { userId, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// Verify JWT Token
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

// Authentication Middleware
const authenticate = async (req, res, next) => {
  try {
    // Get token from cookie or Authorization header
    let token = req.cookies?.token;
    
    if (!token && req.headers.authorization) {
      const parts = req.headers.authorization.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        token = parts[1];
      }
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token.'
      });
    }

    // Get user from database
    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User not found or inactive.'
      });
    }

    // Attach user to request
    req.user = user;
    req.userId = user._id;
    req.userRole = user.role;

    // If child, get child profile and check time limit
    if (user.role === 'Child') {
      const childProfile = await ChildProfile.findOne({ childId: user._id });
      if (childProfile) {
        await childProfile.resetDailyTime();
        req.childProfile = childProfile;
      }
    }

    // If guardian, get guardian profile
    if (user.role === 'Guardian') {
      const guardianProfile = await GuardianProfile.findOne({ guardianId: user._id });
      req.guardianProfile = guardianProfile;
    }

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication error.'
    });
  }
};

// Authorization Middleware - Check if user has required role
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated.'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this resource.'
      });
    }

    next();
  };
};

// Check child's screen time middleware
const checkScreenTime = async (req, res, next) => {
  if (req.user?.role !== 'Child') {
    return next();
  }

  try {
    const timeStatus = await ChildProfile.checkTimeLimit(req.user._id);
    
    if (!timeStatus.allowed) {
      return res.status(403).json({
        success: false,
        message: 'Screen time limit reached for today.',
        data: {
          timeLimitMinutes: timeStatus.timeLimitMinutes,
          timeUsedToday: timeStatus.timeUsedToday,
          timeRemaining: 0
        }
      });
    }

    req.timeStatus = timeStatus;
    next();
  } catch (error) {
    console.error('Screen time check error:', error);
    next();
  }
};

// Middleware to check if guardian can access child data
const canAccessChild = async (req, res, next) => {
  try {
    const childProfileId = req.params.childProfileId || req.body.childProfileId;
    
    if (!childProfileId) {
      return next();
    }

    if (req.user.role === 'SystemAdmin') {
      return next();
    }

    if (req.user.role === 'Guardian') {
      const guardianProfile = await GuardianProfile.findOne({ guardianId: req.user._id });
      
      if (!guardianProfile || !guardianProfile.linkedChildren.includes(childProfileId)) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to access this child\'s data.'
        });
      }
    }

    if (req.user.role === 'Child') {
      const childProfile = await ChildProfile.findOne({ childId: req.user._id });
      
      if (!childProfile || childProfile._id.toString() !== childProfileId) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to access this data.'
        });
      }
    }

    next();
  } catch (error) {
    console.error('Child access check error:', error);
    res.status(500).json({
      success: false,
      message: 'Authorization check error.'
    });
  }
};

module.exports = {
  generateToken,
  verifyToken,
  authenticate,
  authorize,
  checkScreenTime,
  canAccessChild
};
