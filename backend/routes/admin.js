const express = require('express');
const router = express.Router();
const { 
  User, 
  ChildProfile, 
  GuardianProfile, 
  SeriousGame, 
  SafetyAlert,
  SafetyThreatDictionary,
  SystemAuditLog
} = require('../models');
const { authenticate, authorize } = require('../middleware');
const bcrypt = require('bcryptjs');

// @route   GET /api/admin/users
// @desc    Get all users with pagination
// @access  Private (SystemAdmin only)
router.get('/users', authenticate, authorize('SystemAdmin'), async (req, res) => {
  try {
    const { role, page = 1, limit = 20, search } = req.query;

    const query = {};
    if (role) {
      query.role = role;
    }
    if (search) {
      query.$or = [
        { userName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const users = await User.find(query)
      .select('-hashedPassword')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting users'
    });
  }
});

// @route   GET /api/admin/users/:userId
// @desc    Get specific user details
// @access  Private (SystemAdmin only)
router.get('/users/:userId', authenticate, authorize('SystemAdmin'), async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select('-hashedPassword');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    let profile = null;
    if (user.role === 'Child') {
      profile = await ChildProfile.findOne({ childId: user._id });
    } else if (user.role === 'Guardian') {
      profile = await GuardianProfile.findOne({ guardianId: user._id })
        .populate({
          path: 'linkedChildren',
          populate: { path: 'childId', select: 'userName' }
        });
    }

    res.json({
      success: true,
      data: { user, profile }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting user'
    });
  }
});

// @route   PUT /api/admin/users/:userId/deactivate
// @desc    Deactivate a user account
// @access  Private (SystemAdmin only)
router.put('/users/:userId/deactivate', authenticate, authorize('SystemAdmin'), async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Cannot deactivate yourself
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot deactivate your own account'
      });
    }

    user.isActive = false;
    await user.save();

    // Log the action
    await SystemAuditLog.log(
      req.user._id, 
      'USER_DEACTIVATE', 
      'User', 
      user._id, 
      { userName: user.userName, role: user.role },
      req
    );

    res.json({
      success: true,
      message: 'User deactivated successfully'
    });
  } catch (error) {
    console.error('Deactivate user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deactivating user'
    });
  }
});

// @route   PUT /api/admin/users/:userId/activate
// @desc    Activate a user account
// @access  Private (SystemAdmin only)
router.put('/users/:userId/activate', authenticate, authorize('SystemAdmin'), async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.isActive = true;
    await user.save();

    // Log the action
    await SystemAuditLog.log(
      req.user._id, 
      'USER_ACTIVATE', 
      'User', 
      user._id, 
      { userName: user.userName, role: user.role },
      req
    );

    res.json({
      success: true,
      message: 'User activated successfully'
    });
  } catch (error) {
    console.error('Activate user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error activating user'
    });
  }
});

// @route   DELETE /api/admin/users/:userId
// @desc    Delete a user account (permanent)
// @access  Private (SystemAdmin only)
router.delete('/users/:userId', authenticate, authorize('SystemAdmin'), async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Cannot delete yourself
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    // Delete associated profiles
    if (user.role === 'Child') {
      await ChildProfile.deleteOne({ childId: user._id });
    } else if (user.role === 'Guardian') {
      await GuardianProfile.deleteOne({ guardianId: user._id });
    }

    await User.findByIdAndDelete(userId);

    // Log the action
    await SystemAuditLog.log(
      req.user._id, 
      'USER_DELETE', 
      'User', 
      userId, 
      { userName: user.userName, role: user.role },
      req
    );

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting user'
    });
  }
});

// @route   GET /api/admin/safety-threats
// @desc    Get all safety threat keywords
// @access  Private (SystemAdmin only)
router.get('/safety-threats', authenticate, authorize('SystemAdmin'), async (req, res) => {
  try {
    const { severity, isActive = true } = req.query;

    const query = {};
    if (severity) query.severity = severity;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const threats = await SafetyThreatDictionary.find(query).sort({ severity: -1, keyword: 1 });

    res.json({
      success: true,
      data: threats
    });
  } catch (error) {
    console.error('Get safety threats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting safety threats'
    });
  }
});

// @route   POST /api/admin/safety-threats
// @desc    Add a new safety threat keyword
// @access  Private (SystemAdmin only)
router.post('/safety-threats', authenticate, authorize('SystemAdmin'), async (req, res) => {
  try {
    const { keyword, severity, category } = req.body;

    if (!keyword || !severity) {
      return res.status(400).json({
        success: false,
        message: 'Keyword and severity are required'
      });
    }

    const threat = await SafetyThreatDictionary.create({
      keyword: keyword.toLowerCase().trim(),
      severity,
      category: category || 'Other'
    });

    // Log the action
    await SystemAuditLog.log(
      req.user._id, 
      'SAFETY_THREAT_CREATE', 
      'Other', 
      threat._id, 
      { keyword: threat.keyword, severity: threat.severity },
      req
    );

    res.status(201).json({
      success: true,
      message: 'Safety threat added successfully',
      data: threat
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'This keyword already exists'
      });
    }
    console.error('Add safety threat error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding safety threat'
    });
  }
});

// @route   DELETE /api/admin/safety-threats/:threatId
// @desc    Remove a safety threat keyword
// @access  Private (SystemAdmin only)
router.delete('/safety-threats/:threatId', authenticate, authorize('SystemAdmin'), async (req, res) => {
  try {
    const { threatId } = req.params;

    const threat = await SafetyThreatDictionary.findByIdAndUpdate(
      threatId,
      { isActive: false },
      { new: true }
    );

    if (!threat) {
      return res.status(404).json({
        success: false,
        message: 'Safety threat not found'
      });
    }

    // Log the action
    await SystemAuditLog.log(
      req.user._id, 
      'SAFETY_THREAT_DEACTIVATE', 
      'Other', 
      threatId, 
      { keyword: threat.keyword },
      req
    );

    res.json({
      success: true,
      message: 'Safety threat deactivated successfully'
    });
  } catch (error) {
    console.error('Delete safety threat error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deactivating safety threat'
    });
  }
});

// @route   GET /api/admin/alerts
// @desc    Get all safety alerts (for monitoring)
// @access  Private (SystemAdmin only)
router.get('/alerts', authenticate, authorize('SystemAdmin'), async (req, res) => {
  try {
    const { severity, resolved, page = 1, limit = 50 } = req.query;

    const query = {};
    if (severity) query.severity = severity;
    if (resolved !== undefined) query.resolved = resolved === 'true';

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const alerts = await SafetyAlert.find(query)
      .populate('childId', 'userName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await SafetyAlert.countDocuments(query);

    res.json({
      success: true,
      data: {
        alerts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get all alerts error:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting alerts'
    });
  }
});

// @route   GET /api/admin/audit-logs
// @desc    Get system audit logs
// @access  Private (SystemAdmin only)
router.get('/audit-logs', authenticate, authorize('SystemAdmin'), async (req, res) => {
  try {
    const { action, page = 1, limit = 100 } = req.query;

    const query = {};
    if (action) query.action = { $regex: action, $options: 'i' };

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const logs = await SystemAuditLog.find(query)
      .populate('performedBy', 'userName role')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await SystemAuditLog.countDocuments(query);

    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting audit logs'
    });
  }
});

// @route   GET /api/admin/dashboard-stats
// @desc    Get system-wide statistics
// @access  Private (SystemAdmin only)
router.get('/dashboard-stats', authenticate, authorize('SystemAdmin'), async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ isActive: true });
    const totalChildren = await User.countDocuments({ role: 'Child', isActive: true });
    const totalGuardians = await User.countDocuments({ role: 'Guardian', isActive: true });
    const totalGames = await SeriousGame.countDocuments({ isActive: true });
    const unresolvedAlerts = await SafetyAlert.countDocuments({ resolved: false });
    
    // Get today's stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const newUsersToday = await User.countDocuments({ 
      createdAt: { $gte: today } 
    });

    const alertsToday = await SafetyAlert.countDocuments({
      createdAt: { $gte: today }
    });

    res.json({
      success: true,
      data: {
        totalUsers,
        totalChildren,
        totalGuardians,
        totalGames,
        unresolvedAlerts,
        newUsersToday,
        alertsToday
      }
    });
  } catch (error) {
    console.error('Get admin dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting dashboard statistics'
    });
  }
});

// @route   POST /api/admin/create-admin
// @desc    Create a new admin account
// @access  Private (SystemAdmin only)
router.post('/create-admin', authenticate, authorize('SystemAdmin'), async (req, res) => {
  try {
    const { userName, email, password } = req.body;

    if (!userName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username, email, and password are required'
      });
    }

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create admin user
    const admin = await User.create({
      userName,
      email,
      hashedPassword,
      role: 'SystemAdmin'
    });

    // Log the action
    await SystemAuditLog.log(
      req.user._id, 
      'ADMIN_CREATE', 
      'User', 
      admin._id, 
      { userName: admin.userName, createdBy: req.user.userName },
      req
    );

    res.status(201).json({
      success: true,
      message: 'Admin account created successfully',
      data: {
        userId: admin._id,
        userName: admin.userName,
        email: admin.email,
        role: admin.role
      }
    });
  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating admin account'
    });
  }
});

module.exports = router;
