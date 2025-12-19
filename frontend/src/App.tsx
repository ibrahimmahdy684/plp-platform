import React, { useState, useEffect } from 'react';
import { LoginScreen } from './components/LoginScreen';
import { ChildDashboard } from './components/ChildDashboard';
import { GuardianDashboard } from './components/GuardianDashboard';
import { GameScreen } from './components/GameScreen';
import { CreateChildScreen } from './components/CreateChildScreen';
import { AdminDashboard } from './components/AdminDashboard';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Toaster } from 'sonner';
import { ChildProfileData, GameData } from './services/api';

// Re-export types for backward compatibility
export type UserRole = 'Child' | 'Guardian' | 'SystemAdmin';
export type AgeGroup = '3-5' | '6-8' | '9-12';
export type GameType = 'Math' | 'Physics' | 'Language' | 'Coding';
export type DifficultyLevel = 'Easy' | 'Medium' | 'Hard';

export interface User {
  userId: string;
  role: UserRole;
  userName: string;
  email?: string;
}

export interface ChildProfile extends User {
  id?: string;
  odId?: string;
  ageGroup: AgeGroup;
  knowledgePoints: number;
  achievements: string[];
  timeLimitMinutes: number;
  timeUsedToday: number;
  allowedGames?: string[];
}

export interface GuardianProfile extends User {
  linkedChildren: string[];
}

export interface SeriousGame {
  gameId: string;
  gameType: GameType;
  difficultyLevel: DifficultyLevel;
  maxPoints: number;
  name: string;
  description: string;
  icon: string;
  color: string;
}

// Transform API child profile to ChildProfile format
function transformChildProfile(profile: ChildProfileData): ChildProfile {
  return {
    userId: profile.userId || profile.childId || '',
    userName: profile.userName,
    role: 'Child',
    ageGroup: profile.ageGroup,
    knowledgePoints: profile.knowledgePoints,
    achievements: profile.achievements,
    timeLimitMinutes: profile.timeLimitMinutes,
    timeUsedToday: profile.timeUsedToday,
  };
}

interface AppState {
  currentScreen: 'login' | 'childDashboard' | 'guardianDashboard' | 'adminDashboard' | 'createChild' | 'game';
  selectedGame: SeriousGame | null;
  currentSessionId: string | null;
  guardianDashboardNonce: number;
}

function AppContent() {
  const { user, profile, isLoading, isAuthenticated, logout, refreshProfile } = useAuth();
  
  const [state, setState] = useState<AppState>({
    currentScreen: 'login',
    selectedGame: null,
    currentSessionId: null,
    guardianDashboardNonce: 0,
  });

  // Update screen based on authentication state
  useEffect(() => {
    console.log('Auth state changed:', { isAuthenticated, user, isLoading });
    if (isAuthenticated && user) {
      console.log('Redirecting to dashboard for role:', user.role);
      setState(prev => ({
        ...prev,
        currentScreen:
          user.role === 'Child'
            ? 'childDashboard'
            : user.role === 'SystemAdmin'
              ? 'adminDashboard'
              : 'guardianDashboard',
      }));
    } else if (!isLoading) {
      console.log('Showing login screen');
      setState(prev => ({
        ...prev,
        currentScreen: 'login',
        selectedGame: null,
        currentSessionId: null,
      }));
    }
  }, [isAuthenticated, user, isLoading]);

  const handleLogin = () => {
    // Login is now handled by AuthContext
    // The useEffect above will automatically redirect based on user state
  };

  const handleLogout = async () => {
    await logout();
    setState({
      currentScreen: 'login',
      selectedGame: null,
      currentSessionId: null,
      guardianDashboardNonce: 0,
    });
  };

  const handleGoToCreateChild = () => {
    setState(prev => ({
      ...prev,
      currentScreen: 'createChild',
    }));
  };

  const handleChildCreated = () => {
    setState(prev => ({
      ...prev,
      currentScreen: 'guardianDashboard',
      guardianDashboardNonce: prev.guardianDashboardNonce + 1,
    }));
  };

  const handleSelectGame = (game: SeriousGame, sessionId?: string) => {
    setState(prev => ({
      ...prev,
      selectedGame: game,
      currentSessionId: sessionId || null,
      currentScreen: 'game',
    }));
  };

  const handleBackToDashboard = () => {
    setState(prev => ({
      ...prev,
      currentScreen: user?.role === 'Child' ? 'childDashboard' : 'guardianDashboard',
      selectedGame: null,
      currentSessionId: null,
    }));
  };

  const handleGameComplete = async (pointsEarned: number, newBadge?: string) => {
    await refreshProfile();
    setState(prev => ({
      ...prev,
      currentScreen: 'childDashboard',
      selectedGame: null,
      currentSessionId: null,
    }));
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-100 to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-purple-800 text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  // Get child profile data
  const childProfile: ChildProfile | null = 
    user?.role === 'Child' && profile 
      ? transformChildProfile(profile as ChildProfileData)
      : null;

  // Get guardian profile data
  const guardianProfile: GuardianProfile | null =
    user?.role === 'Guardian' && profile
      ? {
          userId: user.userId,
          userName: user.userName,
          email: user.email,
          role: 'Guardian' as const,
          linkedChildren: (profile as any).linkedChildren || [],
        }
      : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-100 to-blue-100">
      <Toaster position="top-center" richColors />
      
      {state.currentScreen === 'login' && (
        <LoginScreen onLogin={handleLogin} />
      )}

      {state.currentScreen === 'childDashboard' && childProfile && (
        <ChildDashboard
          childProfile={childProfile}
          onSelectGame={handleSelectGame}
          onLogout={handleLogout}
        />
      )}

      {state.currentScreen === 'guardianDashboard' && guardianProfile && (
        <GuardianDashboard
          key={`guardian-${state.guardianDashboardNonce}`}
          guardianProfile={guardianProfile}
          onLogout={handleLogout}
          onCreateChild={handleGoToCreateChild}
        />
      )}

      {state.currentScreen === 'adminDashboard' && user?.role === 'SystemAdmin' && (
        <AdminDashboard adminName={user.userName} onLogout={handleLogout} />
      )}

      {state.currentScreen === 'createChild' && guardianProfile && (
        <CreateChildScreen
          onBack={() => setState(prev => ({ ...prev, currentScreen: 'guardianDashboard' }))}
          onCreated={handleChildCreated}
        />
      )}

      {state.currentScreen === 'game' && state.selectedGame && childProfile && (
        <GameScreen
          game={state.selectedGame}
          childProfile={childProfile}
          onBack={handleBackToDashboard}
          onGameComplete={handleGameComplete}
        />
      )}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
