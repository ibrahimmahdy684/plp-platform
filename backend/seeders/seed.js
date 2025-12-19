require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('../config/db');
const {
  User,
  ChildProfile,
  GuardianProfile,
  SeriousGame,
  SafetyThreatDictionary
} = require('../models');

const seedDatabase = async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    console.log('Connected to MongoDB');

    // Clear existing data (optional - comment out in production)
    await User.deleteMany({});
    await ChildProfile.deleteMany({});
    await GuardianProfile.deleteMany({});
    await SeriousGame.deleteMany({});
    await SafetyThreatDictionary.deleteMany({});
    console.log('Cleared existing data');

    // Create password hash
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash('Test123!@', salt);
    const childPassword = await bcrypt.hash('Child123!', salt);

    // Create Guardian User
    const guardian = await User.create({
      userName: 'Parent Account',
      email: 'parent@example.com',
      hashedPassword,
      role: 'Guardian',
      preferredLanguage: 'en-US'
    });
    console.log('Created guardian user');

    // Create Guardian Profile
    const guardianProfile = await GuardianProfile.create({
      guardianId: guardian._id,
      linkedChildren: [],
      notificationPreferences: 'App',
      defaultTimeLimit: 60
    });
    console.log('Created guardian profile');

    // Create Child Users and Profiles
    const childrenData = [
      { userName: 'Sara', ageGroup: '6-8', points: 450, achievements: ['First Steps', 'Math Wizard', 'Quick Learner'], timeLimit: 60, timeUsed: 25 },
      { userName: 'Ahmed', ageGroup: '9-12', points: 780, achievements: ['Science Star', 'Code Master', 'Problem Solver', 'Language Expert'], timeLimit: 90, timeUsed: 40 },
      { userName: 'Layla', ageGroup: '3-5', points: 120, achievements: ['Curious Explorer'], timeLimit: 30, timeUsed: 10 }
    ];

    const childProfileIds = [];

    for (const childData of childrenData) {
      const childUser = await User.create({
        userName: childData.userName,
        hashedPassword: childPassword,
        role: 'Child',
        preferredLanguage: 'en-US'
      });

      const childProfile = await ChildProfile.create({
        childId: childUser._id,
        ageGroup: childData.ageGroup,
        knowledgePoints: childData.points,
        achievements: childData.achievements,
        timeLimitMinutes: childData.timeLimit,
        timeUsedToday: childData.timeUsed,
        guardianId: guardian._id
      });

      childProfileIds.push(childProfile._id);
      console.log(`Created child: ${childData.userName}`);
    }

    // Link children to guardian
    guardianProfile.linkedChildren = childProfileIds;
    await guardianProfile.save();
    console.log('Linked children to guardian');

    // Create Admin User
    const admin = await User.create({
      userName: 'Admin',
      email: 'admin@plp-platform.com',
      hashedPassword,
      role: 'SystemAdmin',
      preferredLanguage: 'en-US'
    });
    console.log('Created admin user');

    // Create Serious Games
    const gamesData = [
      {
        name: 'Number Adventure',
        description: 'Solve fun math problems!',
        gameType: 'Math',
        difficultyLevel: 'Easy',
        maxPoints: 100,
        appropriateAgeGroups: ['3-5', '6-8', '9-12'],
        icon: '🔢',
        color: 'from-blue-400 to-cyan-400',
        questions: [
          { question: 'What is 2 + 3?', options: ['4', '5', '6', '7'], correctAnswer: 1, hint: 'Count on your fingers!', points: 20 },
          { question: 'What is 5 - 2?', options: ['2', '3', '4', '5'], correctAnswer: 1, hint: 'Take away 2 from 5!', points: 20 },
          { question: 'What is 4 + 4?', options: ['6', '7', '8', '9'], correctAnswer: 2, hint: 'Double the number 4!', points: 20 },
          { question: 'What is 10 - 5?', options: ['3', '4', '5', '6'], correctAnswer: 2, hint: 'Half of 10!', points: 20 },
          { question: 'What is 3 × 2?', options: ['4', '5', '6', '7'], correctAnswer: 2, hint: '3 groups of 2!', points: 20 }
        ]
      },
      {
        name: 'Science Explorer',
        description: 'Discover how things work!',
        gameType: 'Physics',
        difficultyLevel: 'Medium',
        maxPoints: 120,
        appropriateAgeGroups: ['6-8', '9-12'],
        icon: '🔬',
        color: 'from-green-400 to-emerald-400',
        questions: [
          { question: 'What makes things fall down? 🍎', options: ['Gravity', 'Wind', 'Magic', 'Water'], correctAnswer: 0, hint: "It's the same force that keeps you on the ground!", points: 24 },
          { question: 'What do plants need to grow? 🌱', options: ['Sunlight & Water', 'Only darkness', 'Only rocks', 'Only air'], correctAnswer: 0, hint: 'Think about what you see in a garden!', points: 24 },
          { question: 'What happens when you mix red and blue? 🎨', options: ['Purple', 'Green', 'Orange', 'Yellow'], correctAnswer: 0, hint: 'Think of a grape!', points: 24 },
          { question: 'What makes a ball bounce? ⚽', options: ['Air inside', 'Color', 'Size', 'Weight only'], correctAnswer: 0, hint: "What's inside the ball?", points: 24 },
          { question: 'How do birds fly? 🦅', options: ['Wings', 'Tail only', 'Beak', 'Feet'], correctAnswer: 0, hint: 'What do birds flap?', points: 24 }
        ]
      },
      {
        name: 'Word Wizard',
        description: 'Learn new words and letters!',
        gameType: 'Language',
        difficultyLevel: 'Easy',
        maxPoints: 90,
        appropriateAgeGroups: ['3-5', '6-8', '9-12'],
        icon: '📚',
        color: 'from-purple-400 to-pink-400',
        questions: [
          { question: 'What is "Cat" in Arabic? 🐱', options: ['قطة', 'كلب', 'طائر', 'سمكة'], correctAnswer: 0, hint: 'Think about the sounds in the word!', points: 18 },
          { question: 'What is "Sun" in Arabic? ☀️', options: ['شمس', 'قمر', 'نجم', 'سماء'], correctAnswer: 0, hint: 'It shines bright in the day!', points: 18 },
          { question: 'What is "Water" in Arabic? 💧', options: ['ماء', 'نار', 'هواء', 'تراب'], correctAnswer: 0, hint: 'You drink it!', points: 18 },
          { question: 'What is "Tree" in Arabic? 🌳', options: ['شجرة', 'زهرة', 'عشب', 'ورقة'], correctAnswer: 0, hint: 'It has branches and leaves!', points: 18 },
          { question: 'What is "Moon" in Arabic? 🌙', options: ['قمر', 'شمس', 'نجم', 'كوكب'], correctAnswer: 0, hint: 'You see it at night!', points: 18 }
        ]
      },
      {
        name: 'Code Quest',
        description: 'Build your own creations!',
        gameType: 'Coding',
        difficultyLevel: 'Hard',
        maxPoints: 150,
        appropriateAgeGroups: ['6-8', '9-12'],
        icon: '💻',
        color: 'from-orange-400 to-red-400',
        questions: [
          { question: 'In what order should you brush your teeth? 🪥', options: ['1. Wet brush 2. Add paste 3. Brush', '1. Brush 2. Wet 3. Paste', '1. Paste 2. Brush 3. Wet', '1. Dry brush only'], correctAnswer: 0, hint: 'Think about the steps you do!', points: 30 },
          { question: 'What comes next? 🔵🔴🔵🔴__', options: ['🔵', '🟢', '🟡', '⚫'], correctAnswer: 0, hint: 'Look at the pattern!', points: 30 },
          { question: 'How do you make a sandwich? 🥪', options: ['Bread → Filling → Bread', 'Filling → Bread → Filling', 'Bread only', 'Filling only'], correctAnswer: 0, hint: 'What goes on the outside?', points: 30 },
          { question: 'What shape has 4 equal sides? ⬜', options: ['Square', 'Triangle', 'Circle', 'Rectangle'], correctAnswer: 0, hint: 'Count the sides!', points: 30 },
          { question: "If it's raining, what should you do? ☔", options: ['Take an umbrella', 'Wear sunglasses', 'Go swimming', 'Sleep outside'], correctAnswer: 0, hint: 'What keeps you dry?', points: 30 }
        ]
      }
    ];

    for (const gameData of gamesData) {
      await SeriousGame.create(gameData);
      console.log(`Created game: ${gameData.name}`);
    }

    // Create Safety Threat Dictionary
    const threatsData = [
      { keyword: 'password', severity: 'High', category: 'PersonalInfo' },
      { keyword: 'address', severity: 'High', category: 'PersonalInfo' },
      { keyword: 'phone number', severity: 'High', category: 'PersonalInfo' },
      { keyword: 'hate', severity: 'Medium', category: 'Cyberbullying' },
      { keyword: 'stupid', severity: 'Low', category: 'Cyberbullying' },
      { keyword: 'dumb', severity: 'Low', category: 'Cyberbullying' },
      { keyword: 'ugly', severity: 'Medium', category: 'Cyberbullying' }
    ];

    for (const threat of threatsData) {
      await SafetyThreatDictionary.create(threat);
    }
    console.log('Created safety threat dictionary');

    console.log('\n✅ Database seeded successfully!');
    console.log('\n📋 Test Accounts:');
    console.log('=====================================');
    console.log('Guardian: parent@example.com / Test123!@');
    console.log('Children: Sara, Ahmed, Layla / Child123!');
    console.log('Admin: admin@plp-platform.com / Test123!@');
    console.log('=====================================\n');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
