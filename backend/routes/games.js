const express = require('express');
const router = express.Router();
const { SeriousGame, GameSession } = require('../models');
const { authenticate, authorize } = require('../middleware');

// @route   GET /api/games
// @desc    Get all active games
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { gameType, difficultyLevel, ageGroup } = req.query;
    
    const query = { isActive: true };
    
    if (gameType) {
      query.gameType = gameType;
    }
    if (difficultyLevel) {
      query.difficultyLevel = difficultyLevel;
    }
    if (ageGroup) {
      query.appropriateAgeGroups = ageGroup;
    }

    const games = await SeriousGame.find(query)
      .select('-questions') // Don't send questions in list
      .sort({ gameType: 1, difficultyLevel: 1 });

    res.json({
      success: true,
      data: games
    });
  } catch (error) {
    console.error('Get games error:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting games'
    });
  }
});

// @route   GET /api/games/:gameId
// @desc    Get specific game details
// @access  Private
router.get('/:gameId', authenticate, async (req, res) => {
  try {
    const { gameId } = req.params;

    const game = await SeriousGame.findById(gameId);
    
    if (!game || !game.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Game not found'
      });
    }

    // Only include questions if user is a child or admin
    const includeQuestions = req.user.role === 'Child' || req.user.role === 'SystemAdmin';

    res.json({
      success: true,
      data: includeQuestions ? game : { ...game.toObject(), questions: undefined }
    });
  } catch (error) {
    console.error('Get game error:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting game'
    });
  }
});

// @route   POST /api/games
// @desc    Create a new game (Admin only)
// @access  Private (SystemAdmin only)
router.post('/', authenticate, authorize('SystemAdmin'), async (req, res) => {
  try {
    const { 
      name, 
      description, 
      gameType, 
      difficultyLevel, 
      maxPoints, 
      appropriateAgeGroups,
      icon,
      color,
      questions 
    } = req.body;

    // Validate required fields
    if (!name || !gameType || !difficultyLevel || !maxPoints || !appropriateAgeGroups) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    const game = await SeriousGame.create({
      name,
      description,
      gameType,
      difficultyLevel,
      maxPoints,
      appropriateAgeGroups,
      icon: icon || '🎮',
      color: color || 'from-purple-400 to-pink-400',
      questions: questions || []
    });

    res.status(201).json({
      success: true,
      message: 'Game created successfully',
      data: game
    });
  } catch (error) {
    console.error('Create game error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating game'
    });
  }
});

// @route   PUT /api/games/:gameId
// @desc    Update a game (Admin only)
// @access  Private (SystemAdmin only)
router.put('/:gameId', authenticate, authorize('SystemAdmin'), async (req, res) => {
  try {
    const { gameId } = req.params;
    const updates = req.body;

    // Remove fields that shouldn't be updated
    delete updates._id;
    delete updates.totalPlays;
    delete updates.averageScore;

    const game = await SeriousGame.findByIdAndUpdate(
      gameId,
      updates,
      { new: true, runValidators: true }
    );

    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Game not found'
      });
    }

    res.json({
      success: true,
      message: 'Game updated successfully',
      data: game
    });
  } catch (error) {
    console.error('Update game error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating game'
    });
  }
});

// @route   DELETE /api/games/:gameId
// @desc    Deactivate a game (Admin only)
// @access  Private (SystemAdmin only)
router.delete('/:gameId', authenticate, authorize('SystemAdmin'), async (req, res) => {
  try {
    const { gameId } = req.params;

    // Soft delete - just mark as inactive
    const game = await SeriousGame.findByIdAndUpdate(
      gameId,
      { isActive: false },
      { new: true }
    );

    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Game not found'
      });
    }

    res.json({
      success: true,
      message: 'Game deactivated successfully'
    });
  } catch (error) {
    console.error('Delete game error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deactivating game'
    });
  }
});

// @route   GET /api/games/:gameId/stats
// @desc    Get game statistics (Admin only)
// @access  Private (SystemAdmin only)
router.get('/:gameId/stats', authenticate, authorize('SystemAdmin'), async (req, res) => {
  try {
    const { gameId } = req.params;

    const game = await SeriousGame.findById(gameId);
    
    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Game not found'
      });
    }

    // Get session statistics
    const sessions = await GameSession.find({ gameId, isCompleted: true });
    
    const stats = {
      totalPlays: game.totalPlays,
      averageScore: game.averageScore,
      completedSessions: sessions.length,
      averageAccuracy: sessions.length > 0 
        ? Math.round((sessions.reduce((sum, s) => sum + (s.correctAnswers / s.questionsAnswered), 0) / sessions.length) * 100)
        : 0,
      totalPointsAwarded: sessions.reduce((sum, s) => sum + s.kpEarned, 0)
    };

    res.json({
      success: true,
      data: {
        game: {
          name: game.name,
          gameType: game.gameType,
          difficultyLevel: game.difficultyLevel,
          maxPoints: game.maxPoints
        },
        stats
      }
    });
  } catch (error) {
    console.error('Get game stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting game statistics'
    });
  }
});

// @route   POST /api/games/:gameId/questions
// @desc    Add questions to a game (Admin only)
// @access  Private (SystemAdmin only)
router.post('/:gameId/questions', authenticate, authorize('SystemAdmin'), async (req, res) => {
  try {
    const { gameId } = req.params;
    const { questions } = req.body;

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Questions must be a non-empty array'
      });
    }

    const game = await SeriousGame.findById(gameId);
    
    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Game not found'
      });
    }

    // Add questions
    game.questions.push(...questions);
    await game.save();

    res.json({
      success: true,
      message: `${questions.length} question(s) added successfully`,
      data: {
        totalQuestions: game.questions.length
      }
    });
  } catch (error) {
    console.error('Add questions error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding questions'
    });
  }
});

module.exports = router;
