# Play, Learn & Protect (PLP-Platform)

A child-friendly educational gaming platform with guardian monitoring capabilities.

## Features

- **For Children:**
  - Educational games (Math, Physics, Language, Coding)
  - Age-appropriate content (3-5, 6-8, 9-12 years)
  - Knowledge points and achievements system
  - Screen time management

- **For Guardians:**
  - Monitor children's progress and activities
  - Set screen time limits
  - View safety alerts
  - Manage children's accounts

## Tech Stack

- **Frontend:** React 18 + TypeScript + Tailwind CSS + Vite
- **Backend:** Node.js + Express.js + MongoDB
- **Authentication:** JWT with HTTP-only cookies

## Setup Instructions

### Prerequisites

- Node.js 18+ installed
- MongoDB installed and running locally (or MongoDB Atlas connection)

### 1. Frontend Setup

```bash
# Install frontend dependencies
npm install

# Start the frontend dev server
npm run dev
```

The frontend will run at `http://localhost:5173`

### 2. Backend Setup

```bash
# Navigate to server directory
cd server

# Install backend dependencies
npm install

# Configure environment variables
# Edit .env file with your MongoDB URI and JWT secret

# Start the backend server
npm run dev
```

The backend API will run at `http://localhost:5000`

### 3. Database Seeding

To seed the database with test data:

```bash
cd server
npm run seed
```

This will create:
- Guardian account: `parent@example.com` / `Test123!@`
- Child accounts: `Sara`, `Ahmed`, `Layla` / `Child123!`
- Admin account: `admin@plp-platform.com` / `Test123!@`
- Sample games for all categories

## Project Structure

```
├── src/                    # Frontend source
│   ├── components/         # React components
│   │   ├── LoginScreen.tsx
│   │   ├── ChildDashboard.tsx
│   │   ├── GuardianDashboard.tsx
│   │   └── GameScreen.tsx
│   ├── contexts/           # React contexts
│   │   └── AuthContext.tsx
│   ├── services/           # API client
│   │   └── api.ts
│   └── App.tsx
│
├── server/                 # Backend source
│   ├── config/             # Database configuration
│   │   └── db.js
│   ├── middleware/         # Express middleware
│   │   ├── auth.js
│   │   └── validators.js
│   ├── models/             # MongoDB models
│   │   ├── User.js
│   │   ├── ChildProfile.js
│   │   ├── GuardianProfile.js
│   │   ├── SeriousGame.js
│   │   ├── GameSession.js
│   │   ├── SafetyAlert.js
│   │   └── ...
│   ├── routes/             # API routes
│   │   ├── auth.js
│   │   ├── child.js
│   │   ├── guardian.js
│   │   ├── games.js
│   │   └── admin.js
│   ├── seeders/            # Database seeders
│   │   └── seed.js
│   └── server.js           # Express server entry
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user

### Child Routes
- `GET /api/child/profile` - Get child profile
- `GET /api/child/games` - Get available games
- `POST /api/child/games/:gameId/start` - Start game session
- `POST /api/child/games/session/:sessionId/complete` - Complete game session
- `GET /api/child/time-status` - Get screen time status

### Guardian Routes
- `GET /api/guardian/children` - Get linked children
- `GET /api/guardian/alerts` - Get safety alerts
- `GET /api/guardian/dashboard-stats` - Get dashboard statistics
- `PUT /api/guardian/children/:id/settings` - Update child settings

## License

This project is for educational purposes.
  