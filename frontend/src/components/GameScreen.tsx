import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Star, Lightbulb, Check, X, Trophy, Sparkles } from 'lucide-react';
import { ChildProfile, SeriousGame } from '../App';
import { toast } from 'sonner';
import { childApi } from '../services/api';

interface GameScreenProps {
  game: SeriousGame;
  childProfile: ChildProfile;
  onBack: () => void;
  onGameComplete: (pointsEarned: number, newBadge?: string) => void;
}

interface Question {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  hint: string;
}

export function GameScreen({ game, childProfile, onBack, onGameComplete }: GameScreenProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [correctAnswersCount, setCorrectAnswersCount] = useState(0);
  const [hintsUsedCount, setHintsUsedCount] = useState(0);
  const [incorrectAttempts, setIncorrectAttempts] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [answered, setAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [gameCompleted, setGameCompleted] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const startTimeRef = useRef<Date>(new Date());

  // Start game session when component mounts
  useEffect(() => {
    const startSession = async () => {
      try {
        const response = await childApi.startGameSession(game.gameId);
        if (response.success && response.data) {
          setSessionId(response.data.sessionId);
        }
      } catch (error) {
        console.error('Failed to start game session:', error);
      }
    };

    startSession();
    startTimeRef.current = new Date();
  }, [game.gameId]);

  useEffect(() => {
    // Generate questions based on game type and difficulty
    const generatedQuestions = generateQuestions(game);
    setQuestions(generatedQuestions);
  }, [game]);

  function generateQuestions(game: SeriousGame): Question[] {
    const questionCount = 5;
    const questions: Question[] = [];

    for (let i = 0; i < questionCount; i++) {
      if (game.gameType === 'Math') {
        questions.push(generateMathQuestion(i, game.difficultyLevel, childProfile.ageGroup));
      } else if (game.gameType === 'Language') {
        questions.push(generateLanguageQuestion(i, game.difficultyLevel, childProfile.ageGroup));
      } else if (game.gameType === 'Physics') {
        questions.push(generatePhysicsQuestion(i, game.difficultyLevel, childProfile.ageGroup));
      } else if (game.gameType === 'Coding') {
        questions.push(generateCodingQuestion(i, game.difficultyLevel, childProfile.ageGroup));
      }
    }

    return questions;
  }

  function generateMathQuestion(id: number, difficulty: string, ageGroup: string): Question {
    const range = ageGroup === '3-5' ? 10 : ageGroup === '6-8' ? 20 : 50;
    const a = Math.floor(Math.random() * range) + 1;
    const b = Math.floor(Math.random() * range) + 1;
    const operations = ['+', '-', '×'];
    const op = operations[Math.floor(Math.random() * operations.length)];
    
    let answer = 0;
    let questionText = '';
    
    if (op === '+') {
      answer = a + b;
      questionText = `What is ${a} + ${b}?`;
    } else if (op === '-') {
      const larger = Math.max(a, b);
      const smaller = Math.min(a, b);
      answer = larger - smaller;
      questionText = `What is ${larger} - ${smaller}?`;
    } else {
      answer = a * b;
      questionText = `What is ${a} × ${b}?`;
    }

    const wrongAnswers = [
      answer + Math.floor(Math.random() * 5) + 1,
      answer - Math.floor(Math.random() * 5) - 1,
      answer + Math.floor(Math.random() * 10) + 5,
    ];

    const options = [answer, ...wrongAnswers].sort(() => Math.random() - 0.5);
    const correctIndex = options.indexOf(answer);

    return {
      id,
      question: questionText,
      options: options.map(String),
      correctAnswer: correctIndex,
      hint: `Try breaking it down into smaller steps!`,
    };
  }

  function generateLanguageQuestion(id: number, difficulty: string, ageGroup: string): Question {
    const wordPairs = [
      { word: 'Cat', arabic: 'قطة', emoji: '🐱' },
      { word: 'Dog', arabic: 'كلب', emoji: '🐕' },
      { word: 'Sun', arabic: 'شمس', emoji: '☀️' },
      { word: 'Moon', arabic: 'قمر', emoji: '🌙' },
      { word: 'Tree', arabic: 'شجرة', emoji: '🌳' },
      { word: 'Water', arabic: 'ماء', emoji: '💧' },
    ];

    const pair = wordPairs[id % wordPairs.length];
    const questionText = `What is "${pair.word}" in Arabic? ${pair.emoji}`;
    
    const wrongAnswers = wordPairs
      .filter(p => p.word !== pair.word)
      .map(p => p.arabic)
      .slice(0, 3);

    const options = [pair.arabic, ...wrongAnswers].sort(() => Math.random() - 0.5);
    const correctIndex = options.indexOf(pair.arabic);

    return {
      id,
      question: questionText,
      options,
      correctAnswer: correctIndex,
      hint: `Think about the sounds in the word!`,
    };
  }

  function generatePhysicsQuestion(id: number, difficulty: string, ageGroup: string): Question {
    const questions = [
      {
        question: 'What makes things fall down? 🍎',
        options: ['Gravity', 'Wind', 'Magic', 'Water'],
        correctAnswer: 0,
        hint: 'It\'s the same force that keeps you on the ground!',
      },
      {
        question: 'What do plants need to grow? 🌱',
        options: ['Sunlight & Water', 'Only darkness', 'Only rocks', 'Only air'],
        correctAnswer: 0,
        hint: 'Think about what you see in a garden!',
      },
      {
        question: 'What happens when you mix red and blue? 🎨',
        options: ['Purple', 'Green', 'Orange', 'Yellow'],
        correctAnswer: 0,
        hint: 'Think of a grape!',
      },
      {
        question: 'What makes a ball bounce? ⚽',
        options: ['Air inside', 'Color', 'Size', 'Weight only'],
        correctAnswer: 0,
        hint: 'What\'s inside the ball?',
      },
      {
        question: 'How do birds fly? 🦅',
        options: ['Wings', 'Tail only', 'Beak', 'Feet'],
        correctAnswer: 0,
        hint: 'What do birds flap?',
      },
    ];

    return { ...questions[id % questions.length], id };
  }

  function generateCodingQuestion(id: number, difficulty: string, ageGroup: string): Question {
    const questions = [
      {
        question: 'In what order should you brush your teeth? 🪥',
        options: ['1. Wet brush 2. Add paste 3. Brush', '1. Brush 2. Wet 3. Paste', '1. Paste 2. Brush 3. Wet', '1. Dry brush only'],
        correctAnswer: 0,
        hint: 'Think about the steps you do!',
      },
      {
        question: 'What comes next? 🔵🔴🔵🔴__',
        options: ['🔵', '🟢', '🟡', '⚫'],
        correctAnswer: 0,
        hint: 'Look at the pattern!',
      },
      {
        question: 'How do you make a sandwich? 🥪',
        options: ['Bread → Filling → Bread', 'Filling → Bread → Filling', 'Bread only', 'Filling only'],
        correctAnswer: 0,
        hint: 'What goes on the outside?',
      },
      {
        question: 'What shape has 4 equal sides? ⬜',
        options: ['Square', 'Triangle', 'Circle', 'Rectangle'],
        correctAnswer: 0,
        hint: 'Count the sides!',
      },
      {
        question: 'If it\'s raining, what should you do? ☔',
        options: ['Take an umbrella', 'Wear sunglasses', 'Go swimming', 'Sleep outside'],
        correctAnswer: 0,
        hint: 'What keeps you dry?',
      },
    ];

    return { ...questions[id % questions.length], id };
  }

  const handleAnswerSelect = (optionIndex: number) => {
    if (answered) return;
    setSelectedAnswer(optionIndex);
  };

  const handleSubmitAnswer = () => {
    if (selectedAnswer === null) {
      toast.error('Please select an answer!');
      return;
    }

    const currentQuestion = questions[currentQuestionIndex];
    const correct = selectedAnswer === currentQuestion.correctAnswer;

    setAnswered(true);
    setIsCorrect(correct);

    if (correct) {
      const pointsForQuestion = Math.floor(game.maxPoints / questions.length);
      setScore(score + pointsForQuestion);
      setCorrectAnswersCount((prev) => prev + 1);
      toast.success('Great job! 🎉', {
        description: `You earned ${pointsForQuestion} points!`,
      });
      setIncorrectAttempts(0);
      setShowHint(false);
    } else {
      const newIncorrectAttempts = incorrectAttempts + 1;
      setIncorrectAttempts(newIncorrectAttempts);
      
      if (newIncorrectAttempts >= 2) {
        setShowHint(true);
        if (!showHint) {
          setHintsUsedCount((prev) => prev + 1);
        }
        toast.info('Here\'s a hint to help you!');
      } else {
        toast.error('Not quite! Try again!');
      }
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer(null);
      setAnswered(false);
      setIsCorrect(false);
      setIncorrectAttempts(0);
      setShowHint(false);
    } else {
      // Game completed
      completeGame();
    }
  };

  const completeGame = async () => {
    setGameCompleted(true);
    
    // Calculate duration in minutes
    const endTime = new Date();
    const durationMinutes = Math.ceil((endTime.getTime() - startTimeRef.current.getTime()) / 60000);
    
    // Award badge if score is high enough
    const scorePercentage = (score / game.maxPoints) * 100;
    let newBadge: string | undefined;
    
    if (scorePercentage >= 90) {
      newBadge = `${game.gameType} Master`;
      toast.success('🏆 New Badge Earned!', {
        description: `You're now a ${game.gameType} Master!`,
      });
    } else if (scorePercentage >= 70) {
      newBadge = `${game.gameType} Expert`;
      toast.success('🏆 New Badge Earned!', {
        description: `You're now a ${game.gameType} Expert!`,
      });
    }

    // Complete session on backend
    if (sessionId) {
      try {
        await childApi.completeGameSession(sessionId, {
          score,
          correctAnswers: correctAnswersCount,
          questionsAnswered: questions.length,
          durationMinutes,
          hintsUsed: hintsUsedCount,
          badgeEarned: newBadge,
        });
      } catch (error) {
        console.error('Failed to complete game session:', error);
      }
    }

    // Delay before returning to dashboard
    setTimeout(() => {
      onGameComplete(score, newBadge);
    }, 3000);
  };

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white">Loading game...</div>
      </div>
    );
  }

  if (gameCompleted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border-4 border-yellow-300 text-center">
          <div className="w-24 h-24 bg-gradient-to-br from-yellow-400 to-orange-400 rounded-full mx-auto mb-6 flex items-center justify-center">
            <Trophy className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-purple-800 mb-4">Amazing Work! 🎉</h1>
          <p className="text-gray-600 mb-6">You completed {game.name}!</p>
          <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-2xl p-6 mb-6">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Star className="w-8 h-8 text-yellow-500" />
              <span className="text-4xl text-purple-800">{score}</span>
            </div>
            <p className="text-purple-600">Points Earned!</p>
          </div>
          <div className="flex gap-2 justify-center">
            {[...Array(5)].map((_, i) => (
              <Sparkles key={i} className="w-6 h-6 text-yellow-500 animate-pulse" style={{ animationDelay: `${i * 0.1}s` }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onBack}
            className="px-4 py-2 bg-white rounded-full shadow-lg hover:shadow-xl transition-shadow flex items-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>
          <div className="bg-white rounded-full px-6 py-2 shadow-lg flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500" />
            <span className="text-purple-800">{score} points</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-white rounded-full h-4 shadow-lg mb-8 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-400 to-pink-400 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Question Card */}
        <div className="bg-white rounded-3xl p-8 shadow-2xl border-4 border-purple-200 mb-6">
          <div className="flex items-center justify-between mb-6">
            <span className="text-purple-600">Question {currentQuestionIndex + 1} of {questions.length}</span>
            <span className={`text-2xl`}>{game.icon}</span>
          </div>

          <h2 className="text-purple-800 mb-8 text-center">{currentQuestion.question}</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {currentQuestion.options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleAnswerSelect(index)}
                disabled={answered}
                className={`p-4 rounded-2xl border-4 transition-all text-left ${
                  selectedAnswer === index
                    ? answered
                      ? isCorrect
                        ? 'bg-green-100 border-green-400'
                        : 'bg-red-100 border-red-400'
                      : 'bg-purple-100 border-purple-400'
                    : answered && index === currentQuestion.correctAnswer
                    ? 'bg-green-100 border-green-400'
                    : 'bg-gray-50 border-gray-200 hover:border-purple-300'
                } ${answered ? 'cursor-not-allowed' : 'cursor-pointer hover:scale-105'}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    selectedAnswer === index
                      ? answered
                        ? isCorrect
                          ? 'bg-green-500'
                          : 'bg-red-500'
                        : 'bg-purple-500'
                      : answered && index === currentQuestion.correctAnswer
                      ? 'bg-green-500'
                      : 'bg-gray-300'
                  }`}>
                    {answered && index === currentQuestion.correctAnswer && (
                      <Check className="w-5 h-5 text-white" />
                    )}
                    {answered && selectedAnswer === index && !isCorrect && (
                      <X className="w-5 h-5 text-white" />
                    )}
                  </div>
                  <span className="text-gray-800">{option}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Hint */}
          {showHint && !answered && (
            <div className="bg-blue-50 border-2 border-blue-300 rounded-2xl p-4 mb-6 flex items-start gap-3">
              <Lightbulb className="w-6 h-6 text-blue-500 flex-shrink-0 mt-1" />
              <div>
                <p className="text-blue-800">Hint:</p>
                <p className="text-blue-600">{currentQuestion.hint}</p>
              </div>
            </div>
          )}

          {/* Action Button */}
          {!answered ? (
            <button
              onClick={handleSubmitAnswer}
              className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg hover:shadow-xl"
            >
              Check Answer
            </button>
          ) : (
            <button
              onClick={handleNextQuestion}
              className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-2xl hover:from-green-600 hover:to-emerald-600 transition-all shadow-lg hover:shadow-xl"
            >
              {currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'Finish Game'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
