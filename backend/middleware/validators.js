const { validationResult, body, param, query } = require('express-validator');

// Middleware to check validation results
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }
  next();
};

// Password validation rules
const passwordRules = () => 
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number')
    .matches(/[!@#$%^&*(),.?":{}|<>]/).withMessage('Password must contain at least one special character');

// User registration validation
const registerValidation = [
  body('userName')
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage('Username must be between 2 and 50 characters'),
  body('role')
    .isIn(['Child', 'Guardian', 'Admin', 'SystemAdmin'])
    .withMessage('Role must be Child, Guardian, Admin, or SystemAdmin'),
  body('email')
    .if(body('role').custom((role) => role === 'Guardian' || role === 'Admin' || role === 'SystemAdmin'))
    .isEmail().withMessage('Valid email is required')
    .normalizeEmail(),
  passwordRules(),
  body('ageGroup')
    .if(body('role').equals('Child'))
    .isIn(['3-5', '6-8', '9-12']).withMessage('Age group must be 3-5, 6-8, or 9-12'),
  validate
];

// Login validation
const loginValidation = [
  body('email')
    .optional()
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
  body('userName')
    .optional()
    .trim()
    .notEmpty().withMessage('Username is required'),
  body('password')
    .notEmpty().withMessage('Password is required'),
  validate
];

// Game session validation
const gameSessionValidation = [
  body('gameId')
    .isMongoId().withMessage('Invalid game ID'),
  validate
];

// Complete game validation
const completeGameValidation = [
  body('score')
    .isInt({ min: 0 }).withMessage('Score must be a non-negative integer'),
  body('correctAnswers')
    .isInt({ min: 0 }).withMessage('Correct answers must be a non-negative integer'),
  body('questionsAnswered')
    .isInt({ min: 1 }).withMessage('Questions answered must be at least 1'),
  body('hintsUsed')
    .optional()
    .isInt({ min: 0 }).withMessage('Hints used must be a non-negative integer'),
  body('badgeEarned')
    .optional()
    .isString().withMessage('Badge earned must be a string'),
  validate
];

// Time limit validation
const timeLimitValidation = [
  body('timeLimitMinutes')
    .isInt({ min: 15, max: 240 }).withMessage('Time limit must be between 15 and 240 minutes'),
  validate
];

// Safety alert validation
const safetyAlertValidation = [
  body('severity')
    .isIn(['Low', 'Medium', 'High']).withMessage('Invalid severity level'),
  body('alertType')
    .isIn(['Cyberbullying', 'ExplicitContent', 'ScreenTime', 'TimeExtensionRequest', 'Other'])
    .withMessage('Invalid alert type'),
  body('message')
    .trim()
    .notEmpty().withMessage('Message is required'),
  validate
];

// Chat message validation
const chatMessageValidation = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 1000 }).withMessage('Message must be between 1 and 1000 characters'),
  body('receiverId')
    .optional()
    .isMongoId().withMessage('Invalid receiver ID'),
  validate
];

// MongoDB ID validation
const mongoIdValidation = (paramName) => [
  param(paramName)
    .isMongoId().withMessage(`Invalid ${paramName}`),
  validate
];

// Pagination validation
const paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  validate
];

module.exports = {
  validate,
  registerValidation,
  loginValidation,
  gameSessionValidation,
  completeGameValidation,
  timeLimitValidation,
  safetyAlertValidation,
  chatMessageValidation,
  mongoIdValidation,
  paginationValidation,
  passwordRules
};
