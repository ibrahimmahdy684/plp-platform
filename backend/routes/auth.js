const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { User, ChildProfile, GuardianProfile, SystemAuditLog } = require('../models');
const { generateToken } = require('../middleware/auth');
const { authenticate, registerValidation, loginValidation } = require('../middleware');

// @route   POST /api/auth/register
// @desc    Register a new user (Guardian or Admin only - Children accounts are created by Guardians)
// @access  Public
router.post('/register', registerValidation, async (req, res) => {
  try {
    const { userName, email, password, role, ageGroup, preferredLanguage } = req.body;

    // Support Admin as an alias for SystemAdmin (canonical role).
    const normalizedRole = role === 'Admin' ? 'SystemAdmin' : role;

    // Children cannot self-register - they must be created by a guardian
    if (normalizedRole === 'Child') {
      return res.status(403).json({
        success: false,
        message: 'Children accounts can only be created by guardians'
      });
    }

    // Check if user already exists
    if (email) {
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'User with this email already exists'
        });
      }
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = await User.create({
      userName,
      email: normalizedRole === 'Child' ? null : email,
      hashedPassword,
      role: normalizedRole,
      preferredLanguage: preferredLanguage || 'en-US'
    });

    // Create role-specific profile
    if (normalizedRole === 'Child') {
      await ChildProfile.create({
        childId: user._id,
        ageGroup: ageGroup || '6-8',
        knowledgePoints: 0,
        achievements: [],
        timeLimitMinutes: 60
      });
    } else if (normalizedRole === 'Guardian') {
      await GuardianProfile.create({
        guardianId: user._id,
        linkedChildren: [],
        notificationPreferences: 'App'
      });
    }

    // Generate token
    const token = generateToken(user._id, user.role);

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        user: {
          userId: user._id,
          userName: user.userName,
          email: user.email,
          role: user.role,
          preferredLanguage: user.preferredLanguage
        },
        token
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Error during registration',
      error: error.message
    });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', loginValidation, async (req, res) => {
  try {
    const { email, userName, password } = req.body;

    // Find user by email or username
    let user;
    if (email) {
      user = await User.findByEmail(email);
    } else if (userName) {
      user = await User.findOne({ userName });
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated. Please contact support.'
      });
    }

    // Generate token
    const token = generateToken(user._id, user.role);

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Get profile based on role
    let profile = null;
    if (user.role === 'Child') {
      const childProfile = await ChildProfile.findOne({ childId: user._id });
      if (childProfile) {
        await childProfile.resetDailyTime();
        // Format profile data to include userName
        profile = {
          userId: user._id,
          childId: user._id,
          userName: user.userName,
          role: 'Child',
          ageGroup: childProfile.ageGroup,
          knowledgePoints: childProfile.knowledgePoints,
          achievements: childProfile.achievements,
          timeLimitMinutes: childProfile.timeLimitMinutes,
          timeUsedToday: childProfile.timeUsedToday,
          timeRemaining: Math.max(0, childProfile.timeLimitMinutes - childProfile.timeUsedToday),
          totalGamesPlayed: childProfile.totalGamesPlayed,
          totalTimeSpent: childProfile.totalTimeSpent
        };
      }
    } else if (user.role === 'Guardian') {
      const guardianProfile = await GuardianProfile.findOne({ guardianId: user._id })
        .populate({
          path: 'linkedChildren',
          populate: {
            path: 'childId',
            select: 'userName'
          }
        });
      if (guardianProfile) {
        profile = {
          userId: user._id,
          userName: user.userName,
          email: user.email,
          role: 'Guardian',
          linkedChildren: guardianProfile.linkedChildren || [],
          notificationPreferences: guardianProfile.notificationPreferences,
          defaultTimeLimit: guardianProfile.defaultTimeLimit
        };
      }
    }

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          userId: user._id,
          userName: user.userName,
          email: user.email,
          role: user.role,
          preferredLanguage: user.preferredLanguage
        },
        profile,
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Error during login',
      error: error.message
    });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Private
router.post('/logout', authenticate, async (req, res) => {
  try {
    // Clear cookie
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });

    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Error during logout'
    });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = req.user;

    // Get profile based on role
    let profile = null;
    if (user.role === 'Child') {
      profile = await ChildProfile.findOne({ childId: user._id });
      if (profile) {
        await profile.resetDailyTime();
      }
    } else if (user.role === 'Guardian') {
      profile = await GuardianProfile.findOne({ guardianId: user._id })
        .populate({
          path: 'linkedChildren',
          populate: {
            path: 'childId',
            select: 'userName'
          }
        });
    }

    res.json({
      success: true,
      data: {
        user: {
          userId: user._id,
          userName: user.userName,
          email: user.email,
          role: user.role,
          preferredLanguage: user.preferredLanguage,
          lastLogin: user.lastLogin
        },
        profile
      }
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting user data'
    });
  }
});

// @route   PUT /api/auth/change-password
// @desc    Change user password
// @access  Private
router.put('/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Validate new password
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character'
      });
    }

    // Verify current password
    const user = await User.findById(req.user._id);
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Hash and save new password
    const salt = await bcrypt.genSalt(12);
    user.hashedPassword = await bcrypt.hash(newPassword, salt);
    await user.save();

    // Log the action
    await SystemAuditLog.log(user._id, 'PASSWORD_CHANGE', 'User', user._id, {}, req);

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error changing password'
    });
  }
});

module.exports = router;
