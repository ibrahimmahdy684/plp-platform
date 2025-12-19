const express = require('express');
const router = express.Router();
const { 
  User,
  ChildProfile, 
  GuardianProfile, 
  SeriousGame, 
  GameSession, 
  TimeUsageLog,
  SafetyAlert,
  Notification,
  KnowledgePointsTransaction
} = require('../models');
const { authenticate, authorize, canAccessChild } = require('../middleware');
const bcrypt = require('bcryptjs');

// @route   GET /api/guardian/profile
// @desc    Get guardian's own profile
// @access  Private (Guardian only)
router.get('/profile', authenticate, authorize('Guardian'), async (req, res) => {
  try {
    const guardianProfile = await GuardianProfile.findOne({ guardianId: req.user._id });
    
    if (!guardianProfile) {
      return res.status(404).json({
        success: false,
        message: 'Guardian profile not found'
      });
    }

    res.json({
      success: true,
      data: {
        userId: req.user._id,
        userName: req.user.userName,
        email: req.user.email,
        role: 'Guardian',
        linkedChildren: guardianProfile.linkedChildren,
        notificationPreferences: guardianProfile.notificationPreferences,
        defaultTimeLimit: guardianProfile.defaultTimeLimit
      }
    });
  } catch (error) {
    console.error('Get guardian profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting guardian profile'
    });
  }
});

// @route   GET /api/guardian/children
// @desc    Get all linked children with their profiles
// @access  Private (Guardian only)
router.get('/children', authenticate, authorize('Guardian'), async (req, res) => {
  try {
    const guardianProfile = await GuardianProfile.findOne({ guardianId: req.user._id });
    
    if (!guardianProfile) {
      return res.status(404).json({
        success: false,
        message: 'Guardian profile not found'
      });
    }

    // Get all child profiles
    const childProfiles = await ChildProfile.find({ 
      _id: { $in: guardianProfile.linkedChildren } 
    }).populate('childId', 'userName email lastLogin');

    // Reset daily time for each child and format response
    const children = await Promise.all(childProfiles.map(async (profile) => {
      await profile.resetDailyTime();
      
      return {
        profileId: profile._id,
        childId: profile.childId._id,
        userName: profile.childId.userName,
        lastLogin: profile.childId.lastLogin,
        ageGroup: profile.ageGroup,
        knowledgePoints: profile.knowledgePoints,
        achievements: profile.achievements,
        timeLimitMinutes: profile.timeLimitMinutes,
        timeUsedToday: profile.timeUsedToday,
        timeRemaining: Math.max(0, profile.timeLimitMinutes - profile.timeUsedToday),
        totalGamesPlayed: profile.totalGamesPlayed,
        totalTimeSpent: profile.totalTimeSpent,
        allowedGames: profile.allowedGames || []
      };
    }));

    res.json({
      success: true,
      data: children
    });
  } catch (error) {
    console.error('Get children error:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting children'
    });
  }
});

// @route   POST /api/guardian/children/create
// @desc    Create a new child account linked to guardian
// @access  Private (Guardian only)
router.post('/children/create', authenticate, authorize('Guardian'), async (req, res) => {
  try {
    const { userName, password, ageGroup } = req.body;

    // Validate input
    if (!userName || !password || !ageGroup) {
      return res.status(400).json({
        success: false,
        message: 'Username, password, and age group are required'
      });
    }

    if (!['3-5', '6-8', '9-12'].includes(ageGroup)) {
      return res.status(400).json({
        success: false,
        message: 'Age group must be 3-5, 6-8, or 9-12'
      });
    }

    // Check if username exists
    const existingUser = await User.findOne({ userName });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Username already exists'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create child user
    const childUser = await User.create({
      userName,
      hashedPassword,
      role: 'Child'
    });

    // Create child profile
    const guardianProfile = await GuardianProfile.findOne({ guardianId: req.user._id });
    
    const childProfile = await ChildProfile.create({
      childId: childUser._id,
      ageGroup,
      guardianId: req.user._id,
      timeLimitMinutes: guardianProfile.defaultTimeLimit
    });

    // Link to guardian
    await guardianProfile.linkChild(childProfile._id);

    res.status(201).json({
      success: true,
      message: 'Child account created successfully',
      data: {
        profileId: childProfile._id,
        childId: childUser._id,
        userName: childUser.userName,
        ageGroup: childProfile.ageGroup,
        timeLimitMinutes: childProfile.timeLimitMinutes
      }
    });
  } catch (error) {
    console.error('Create child error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating child account'
    });
  }
});

// @route   GET /api/guardian/children/:childProfileId
// @desc    Get specific child's detailed profile
// @access  Private (Guardian only)
router.get('/children/:childProfileId', authenticate, authorize('Guardian'), canAccessChild, async (req, res) => {
  try {
    const { childProfileId } = req.params;

    const childProfile = await ChildProfile.findById(childProfileId)
      .populate('childId', 'userName lastLogin createdAt');
    
    if (!childProfile) {
      return res.status(404).json({
        success: false,
        message: 'Child profile not found'
      });
    }

    await childProfile.resetDailyTime();

    // Get additional stats
    const stats = await GameSession.getChildStats(childProfile.childId._id);
    const recentSessions = await GameSession.getRecentSessions(childProfile.childId._id, 5);
    const weeklyUsage = await TimeUsageLog.getWeeklySummary(childProfile.childId._id);

    res.json({
      success: true,
      data: {
        profile: {
          profileId: childProfile._id,
          childId: childProfile.childId._id,
          userName: childProfile.childId.userName,
          lastLogin: childProfile.childId.lastLogin,
          createdAt: childProfile.childId.createdAt,
          ageGroup: childProfile.ageGroup,
          knowledgePoints: childProfile.knowledgePoints,
          achievements: childProfile.achievements,
          timeLimitMinutes: childProfile.timeLimitMinutes,
          timeUsedToday: childProfile.timeUsedToday,
          timeRemaining: Math.max(0, childProfile.timeLimitMinutes - childProfile.timeUsedToday),
          totalGamesPlayed: childProfile.totalGamesPlayed,
          totalTimeSpent: childProfile.totalTimeSpent
        },
        stats,
        recentSessions,
        weeklyUsage
      }
    });
  } catch (error) {
    console.error('Get child profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting child profile'
    });
  }
});

// @route   PUT /api/guardian/children/:childProfileId/time-limit
// @desc    Update child's screen time limit
// @access  Private (Guardian only)
router.put('/children/:childProfileId/time-limit', authenticate, authorize('Guardian'), canAccessChild, async (req, res) => {
  try {
    const { childProfileId } = req.params;
    const { timeLimitMinutes } = req.body;

    if (!timeLimitMinutes || timeLimitMinutes < 15 || timeLimitMinutes > 240) {
      return res.status(400).json({
        success: false,
        message: 'Time limit must be between 15 and 240 minutes'
      });
    }

    const childProfile = await ChildProfile.findByIdAndUpdate(
      childProfileId,
      { timeLimitMinutes },
      { new: true }
    );

    res.json({
      success: true,
      message: 'Time limit updated successfully',
      data: {
        timeLimitMinutes: childProfile.timeLimitMinutes
      }
    });
  } catch (error) {
    console.error('Update time limit error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating time limit'
    });
  }
});

// @route   PUT /api/guardian/children/:childProfileId/allowed-games
// @desc    Update child's allowed games
// @access  Private (Guardian only)
router.put('/children/:childProfileId/allowed-games', authenticate, authorize('Guardian'), canAccessChild, async (req, res) => {
  try {
    const { childProfileId } = req.params;
    const { allowedGames } = req.body; // Array of game IDs

    if (!Array.isArray(allowedGames)) {
      return res.status(400).json({
        success: false,
        message: 'Allowed games must be an array of game IDs'
      });
    }

    const childProfile = await ChildProfile.findByIdAndUpdate(
      childProfileId,
      { allowedGames },
      { new: true }
    );

    res.json({
      success: true,
      message: 'Allowed games updated successfully',
      data: {
        allowedGames: childProfile.allowedGames
      }
    });
  } catch (error) {
    console.error('Update allowed games error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating allowed games'
    });
  }
});

// @route   PUT /api/guardian/children/:childProfileId/settings
// @desc    Update child's settings (time limit and/or allowed games)
// @access  Private (Guardian only)
router.put('/children/:childProfileId/settings', authenticate, authorize('Guardian'), canAccessChild, async (req, res) => {
  try {
    const { childProfileId } = req.params;
    const { timeLimitMinutes, allowedGames } = req.body;

    const updates = {};
    
    if (timeLimitMinutes !== undefined) {
      if (timeLimitMinutes < 15 || timeLimitMinutes > 240) {
        return res.status(400).json({
          success: false,
          message: 'Time limit must be between 15 and 240 minutes'
        });
      }
      updates.timeLimitMinutes = timeLimitMinutes;
    }
    
    if (allowedGames !== undefined) {
      if (!Array.isArray(allowedGames)) {
        return res.status(400).json({
          success: false,
          message: 'Allowed games must be an array of game IDs'
        });
      }
      updates.allowedGames = allowedGames;
    }

    const childProfile = await ChildProfile.findByIdAndUpdate(
      childProfileId,
      updates,
      { new: true }
    );

    res.json({
      success: true,
      message: 'Settings updated successfully',
      data: {
        timeLimitMinutes: childProfile.timeLimitMinutes,
        allowedGames: childProfile.allowedGames
      }
    });
  } catch (error) {
    console.error('Update child settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating child settings'
    });
  }
});

// @route   POST /api/guardian/children/:childProfileId/add-time
// @desc    Add extra time to child's daily limit (approve time extension)
// @access  Private (Guardian only)
router.post('/children/:childProfileId/add-time', authenticate, authorize('Guardian'), canAccessChild, async (req, res) => {
  try {
    const { childProfileId } = req.params;
    const { additionalMinutes, alertId } = req.body;

    if (!additionalMinutes || additionalMinutes < 5 || additionalMinutes > 60) {
      return res.status(400).json({
        success: false,
        message: 'Additional minutes must be between 5 and 60'
      });
    }

    const childProfile = await ChildProfile.findById(childProfileId);
    
    // Increase today's limit temporarily
    childProfile.timeLimitMinutes += additionalMinutes;
    await childProfile.save();

    // Resolve the alert if provided
    if (alertId) {
      const alert = await SafetyAlert.findById(alertId);
      if (alert) {
        await alert.resolve(req.user._id);
      }
    }

    res.json({
      success: true,
      message: 'Extra time added successfully',
      data: {
        newTimeLimit: childProfile.timeLimitMinutes,
        timeRemaining: childProfile.timeLimitMinutes - childProfile.timeUsedToday
      }
    });
  } catch (error) {
    console.error('Add time error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding extra time'
    });
  }
});

// @route   GET /api/guardian/alerts
// @desc    Get all safety alerts for guardian's children
// @access  Private (Guardian only)
router.get('/alerts', authenticate, authorize('Guardian'), async (req, res) => {
  try {
    const { resolved, limit = 50 } = req.query;

    const guardianProfile = await GuardianProfile.findOne({ guardianId: req.user._id });
    const childProfiles = await ChildProfile.find({ _id: { $in: guardianProfile.linkedChildren } });
    const childUserIds = childProfiles.map(cp => cp.childId);

    const query = { childId: { $in: childUserIds } };
    if (resolved !== undefined) {
      query.resolved = resolved === 'true';
    }

    const alerts = await SafetyAlert.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .populate('childId', 'userName');

    // Map child names
    const alertsWithChildNames = alerts.map(alert => {
      const childProfile = childProfiles.find(cp => 
        cp.childId.toString() === alert.childId._id.toString()
      );
      return {
        ...alert.toObject(),
        childName: alert.childId.userName
      };
    });

    res.json({
      success: true,
      data: alertsWithChildNames
    });
  } catch (error) {
    console.error('Get alerts error:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting alerts'
    });
  }
});

// @route   PUT /api/guardian/alerts/:alertId/resolve
// @desc    Resolve a safety alert
// @access  Private (Guardian only)
router.put('/alerts/:alertId/resolve', authenticate, authorize('Guardian'), async (req, res) => {
  try {
    const { alertId } = req.params;

    const alert = await SafetyAlert.findById(alertId);
    
    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }

    // Verify guardian has access to this child
    const guardianProfile = await GuardianProfile.findOne({ guardianId: req.user._id });
    const childProfile = await ChildProfile.findOne({ childId: alert.childId });
    
    if (!guardianProfile.linkedChildren.includes(childProfile._id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to resolve this alert'
      });
    }

    await alert.resolve(req.user._id);

    res.json({
      success: true,
      message: 'Alert resolved successfully'
    });
  } catch (error) {
    console.error('Resolve alert error:', error);
    res.status(500).json({
      success: false,
      message: 'Error resolving alert'
    });
  }
});

// @route   GET /api/guardian/notifications
// @desc    Get guardian's notifications
// @access  Private (Guardian only)
router.get('/notifications', authenticate, authorize('Guardian'), async (req, res) => {
  try {
    const { unreadOnly = false, limit = 50 } = req.query;

    const query = { guardianId: req.user._id };
    if (unreadOnly === 'true') {
      query.isRead = false;
    }

    const notifications = await Notification.find(query)
      .sort({ sentAt: -1 })
      .limit(parseInt(limit))
      .populate('alertId');

    res.json({
      success: true,
      data: notifications
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting notifications'
    });
  }
});

// @route   PUT /api/guardian/notifications/:notificationId/read
// @desc    Mark notification as read
// @access  Private (Guardian only)
router.put('/notifications/:notificationId/read', authenticate, authorize('Guardian'), async (req, res) => {
  try {
    const { notificationId } = req.params;

    const notification = await Notification.findOne({ 
      _id: notificationId,
      guardianId: req.user._id
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    await notification.markAsRead();

    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking notification as read'
    });
  }
});

// @route   GET /api/guardian/dashboard-stats
// @desc    Get dashboard statistics for guardian
// @access  Private (Guardian only)
router.get('/dashboard-stats', authenticate, authorize('Guardian'), async (req, res) => {
  try {
    const guardianProfile = await GuardianProfile.findOne({ guardianId: req.user._id });
    const childProfiles = await ChildProfile.find({ _id: { $in: guardianProfile.linkedChildren } })
      .populate('childId', 'userName');

    // Calculate aggregated stats
    let totalPoints = 0;
    let totalScreenTimeToday = 0;
    let totalGamesPlayed = 0;

    const childrenSummary = childProfiles.map(profile => {
      totalPoints += profile.knowledgePoints;
      totalScreenTimeToday += profile.timeUsedToday;
      totalGamesPlayed += profile.totalGamesPlayed;

      return {
        profileId: profile._id,
        childId: profile.childId._id,
        userName: profile.childId.userName,
        knowledgePoints: profile.knowledgePoints,
        timeUsedToday: profile.timeUsedToday,
        timeLimitMinutes: profile.timeLimitMinutes
      };
    });

    // Get unresolved alerts count
    const childUserIds = childProfiles.map(cp => cp.childId._id);
    const unresolvedAlerts = await SafetyAlert.countDocuments({
      childId: { $in: childUserIds },
      resolved: false
    });

    res.json({
      success: true,
      data: {
        totalChildren: childProfiles.length,
        totalPoints,
        totalScreenTime: totalScreenTimeToday,
        totalGamesPlayed,
        activeAlerts: unresolvedAlerts,
        childrenSummary
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting dashboard stats'
    });
  }
});

// @route   PUT /api/guardian/settings
// @desc    Update guardian settings
// @access  Private (Guardian only)
router.put('/settings', authenticate, authorize('Guardian'), async (req, res) => {
  try {
    const { notificationPreferences, defaultTimeLimit } = req.body;

    const updates = {};
    if (notificationPreferences) {
      if (!['Email', 'App', 'Both'].includes(notificationPreferences)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid notification preference'
        });
      }
      updates.notificationPreferences = notificationPreferences;
    }
    if (defaultTimeLimit) {
      if (defaultTimeLimit < 15 || defaultTimeLimit > 240) {
        return res.status(400).json({
          success: false,
          message: 'Default time limit must be between 15 and 240 minutes'
        });
      }
      updates.defaultTimeLimit = defaultTimeLimit;
    }

    const guardianProfile = await GuardianProfile.findOneAndUpdate(
      { guardianId: req.user._id },
      updates,
      { new: true }
    );

    res.json({
      success: true,
      message: 'Settings updated successfully',
      data: {
        notificationPreferences: guardianProfile.notificationPreferences,
        defaultTimeLimit: guardianProfile.defaultTimeLimit
      }
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating settings'
    });
  }
});

module.exports = router;
