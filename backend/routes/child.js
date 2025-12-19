const express = require('express');
const router = express.Router();
const { 
  ChildProfile, 
  GuardianProfile, 
  User, 
  SeriousGame, 
  GameSession, 
  TimeUsageLog,
  SafetyAlert,
  KnowledgePointsTransaction
} = require('../models');
const { authenticate, authorize, checkScreenTime } = require('../middleware');

// @route   GET /api/child/profile
// @desc    Get child's own profile
// @access  Private (Child only)
router.get('/profile', authenticate, authorize('Child'), async (req, res) => {
  try {
    const childProfile = await ChildProfile.findOne({ childId: req.user._id });
    
    if (!childProfile) {
      return res.status(404).json({
        success: false,
        message: 'Child profile not found'
      });
    }

    // Reset daily time if needed
    await childProfile.resetDailyTime();

    res.json({
      success: true,
      data: {
        userId: req.user._id,
        userName: req.user.userName,
        role: 'Child',
        ageGroup: childProfile.ageGroup,
        knowledgePoints: childProfile.knowledgePoints,
        achievements: childProfile.achievements,
        timeLimitMinutes: childProfile.timeLimitMinutes,
        timeUsedToday: childProfile.timeUsedToday,
        timeRemaining: Math.max(0, childProfile.timeLimitMinutes - childProfile.timeUsedToday),
        totalGamesPlayed: childProfile.totalGamesPlayed,
        totalTimeSpent: childProfile.totalTimeSpent
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

// @route   GET /api/child/games
// @desc    Get games appropriate for child's age
// @access  Private (Child only)
router.get('/games', authenticate, authorize('Child'), checkScreenTime, async (req, res) => {
  try {
    const childProfile = await ChildProfile.findOne({ childId: req.user._id });
    
    if (!childProfile) {
      return res.status(404).json({
        success: false,
        message: 'Child profile not found'
      });
    }

    // Get games appropriate for age group
    let games = await SeriousGame.getGamesForAgeGroup(childProfile.ageGroup);

    // Filter by allowed games if guardian has set restrictions
    if (childProfile.allowedGames && childProfile.allowedGames.length > 0) {
      games = games.filter(game => 
        childProfile.allowedGames.some(allowed => allowed.toString() === game._id.toString())
      );
    }

    res.json({
      success: true,
      data: {
        games,
        timeRemaining: req.timeStatus?.timeRemaining || 
          Math.max(0, childProfile.timeLimitMinutes - childProfile.timeUsedToday)
      }
    });
  } catch (error) {
    console.error('Get games error:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting games'
    });
  }
});

// @route   POST /api/child/games/:gameId/start
// @desc    Start a game session
// @access  Private (Child only)
router.post('/games/:gameId/start', authenticate, authorize('Child'), checkScreenTime, async (req, res) => {
  try {
    const { gameId } = req.params;

    const game = await SeriousGame.findById(gameId);
    if (!game || !game.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Game not found'
      });
    }

    const childProfile = await ChildProfile.findOne({ childId: req.user._id });
    
    // Check if game is appropriate for age group
    if (!game.appropriateAgeGroups.includes(childProfile.ageGroup)) {
      return res.status(403).json({
        success: false,
        message: 'This game is not available for your age group'
      });
    }

    // Create game session
    const session = await GameSession.create({
      childId: req.user._id,
      gameId: game._id,
      startTime: new Date()
    });

    res.status(201).json({
      success: true,
      data: {
        sessionId: session._id,
        game: {
          gameId: game._id,
          name: game.name,
          gameType: game.gameType,
          difficultyLevel: game.difficultyLevel,
          maxPoints: game.maxPoints,
          icon: game.icon,
          color: game.color,
          questions: game.questions
        },
        timeRemaining: req.timeStatus?.timeRemaining
      }
    });
  } catch (error) {
    console.error('Start game error:', error);
    res.status(500).json({
      success: false,
      message: 'Error starting game'
    });
  }
});

// @route   POST /api/child/games/session/:sessionId/complete
// @desc    Complete a game session
// @access  Private (Child only)
router.post('/games/session/:sessionId/complete', authenticate, authorize('Child'), async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { score, correctAnswers, questionsAnswered, hintsUsed, badgeEarned } = req.body;

    const session = await GameSession.findById(sessionId);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Game session not found'
      });
    }

    if (session.childId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to complete this session'
      });
    }

    if (session.isCompleted) {
      return res.status(400).json({
        success: false,
        message: 'Session already completed'
      });
    }

    // Complete the session
    await session.complete(score, correctAnswers, questionsAnswered, hintsUsed || 0, badgeEarned);

    // Log time usage
    const durationMinutes = session.durationMinutes || Math.ceil((new Date() - session.startTime) / 60000);
    
    const childProfile = await ChildProfile.findOne({ childId: req.user._id });
    await childProfile.addTimeUsed(durationMinutes);

    await TimeUsageLog.create({
      childId: req.user._id,
      durationMinutes,
      sessionType: 'Game',
      gameId: session.gameId
    });

    // Get updated profile
    const updatedProfile = await ChildProfile.findOne({ childId: req.user._id });

    res.json({
      success: true,
      data: {
        session: {
          sessionId: session._id,
          scoreRaw: session.scoreRaw,
          kpEarned: session.kpEarned,
          correctAnswers: session.correctAnswers,
          questionsAnswered: session.questionsAnswered,
          badgeEarned: session.badgeEarned,
          durationMinutes
        },
        profile: {
          knowledgePoints: updatedProfile.knowledgePoints,
          achievements: updatedProfile.achievements,
          timeUsedToday: updatedProfile.timeUsedToday,
          timeRemaining: Math.max(0, updatedProfile.timeLimitMinutes - updatedProfile.timeUsedToday)
        }
      }
    });
  } catch (error) {
    console.error('Complete game error:', error);
    res.status(500).json({
      success: false,
      message: 'Error completing game'
    });
  }
});

// @route   GET /api/child/time-status
// @desc    Get child's screen time status
// @access  Private (Child only)
router.get('/time-status', authenticate, authorize('Child'), async (req, res) => {
  try {
    const timeStatus = await ChildProfile.checkTimeLimit(req.user._id);
    
    res.json({
      success: true,
      data: timeStatus
    });
  } catch (error) {
    console.error('Get time status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting time status'
    });
  }
});

// @route   POST /api/child/request-time-extension
// @desc    Request additional screen time from guardian
// @access  Private (Child only)
router.post('/request-time-extension', authenticate, authorize('Child'), async (req, res) => {
  try {
    const { requestedMinutes } = req.body;

    if (!requestedMinutes || requestedMinutes < 5 || requestedMinutes > 60) {
      return res.status(400).json({
        success: false,
        message: 'Requested minutes must be between 5 and 60'
      });
    }

    // Create safety alert for time extension request
    const alert = await SafetyAlert.createTimeExtensionRequest(req.user._id, requestedMinutes);

    res.json({
      success: true,
      message: 'Time extension request sent to guardian',
      data: {
        alertId: alert._id,
        requestedMinutes
      }
    });
  } catch (error) {
    console.error('Request time extension error:', error);
    res.status(500).json({
      success: false,
      message: 'Error requesting time extension'
    });
  }
});

// @route   GET /api/child/achievements
// @desc    Get child's achievements/badges
// @access  Private (Child only)
router.get('/achievements', authenticate, authorize('Child'), async (req, res) => {
  try {
    const childProfile = await ChildProfile.findOne({ childId: req.user._id });
    
    res.json({
      success: true,
      data: {
        achievements: childProfile.achievements,
        knowledgePoints: childProfile.knowledgePoints
      }
    });
  } catch (error) {
    console.error('Get achievements error:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting achievements'
    });
  }
});

// @route   GET /api/child/history
// @desc    Get child's game history
// @access  Private (Child only)
router.get('/history', authenticate, authorize('Child'), async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const sessions = await GameSession.getRecentSessions(req.user._id, parseInt(limit));
    const stats = await GameSession.getChildStats(req.user._id);

    res.json({
      success: true,
      data: {
        sessions,
        stats
      }
    });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting game history'
    });
  }
});

// @route   GET /api/child/points-history
// @desc    Get child's knowledge points transaction history
// @access  Private (Child only)
router.get('/points-history', authenticate, authorize('Child'), async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    
    const transactions = await KnowledgePointsTransaction.getHistory(req.user._id, parseInt(limit));

    res.json({
      success: true,
      data: transactions
    });
  } catch (error) {
    console.error('Get points history error:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting points history'
    });
  }
});

module.exports = router;
