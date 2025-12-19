import React, { useState, useEffect } from 'react';
import { Star, Trophy, Clock, Sparkles, LogOut, Loader2 } from 'lucide-react';
import { ChildProfile, SeriousGame } from '../App';
import { toast } from 'sonner';
import { childApi, Game } from '../services/api';

interface ChildDashboardProps {
  childProfile: ChildProfile;
  onSelectGame: (game: SeriousGame) => void;
  onLogout: () => void;
}

export function ChildDashboard({ childProfile, onSelectGame, onLogout }: ChildDashboardProps) {
  const [timeRemaining, setTimeRemaining] = useState(
    childProfile.timeLimitMinutes - childProfile.timeUsedToday
  );
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch available games
  useEffect(() => {
    const fetchGames = async () => {
      try {
        const response = await childApi.getGames();
        if (response.success && response.data) {
          const gamesData = response.data.games || [];
          setGames(gamesData);
          if (typeof response.data.timeRemaining === 'number') {
            setTimeRemaining(response.data.timeRemaining);
          }
        }
      } catch (error) {
        console.error('Failed to fetch games:', error);
        toast.error('Failed to load games');
      } finally {
        setIsLoading(false);
      }
    };

    fetchGames();
  }, []);

  // Fetch time status
  useEffect(() => {
    const fetchTimeStatus = async () => {
      try {
        const response = await childApi.getTimeStatus();
        if (response.success && response.data) {
          const remaining = response.data.timeLimitMinutes - response.data.timeUsedToday;
          setTimeRemaining(remaining);
        }
      } catch (error) {
        console.error('Failed to fetch time status:', error);
      }
    };

    fetchTimeStatus();
    // Refresh time status every minute
    const interval = setInterval(fetchTimeStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (timeRemaining <= 5 && timeRemaining > 0) {
      toast.warning(`Only ${timeRemaining} minutes left to play today!`);
    }
  }, [timeRemaining]);

  const getGameColor = (gameType: string): string => {
    const colors: Record<string, string> = {
      Math: 'from-blue-400 to-cyan-400',
      Physics: 'from-green-400 to-emerald-400',
      Language: 'from-purple-400 to-pink-400',
      Coding: 'from-orange-400 to-red-400',
    };
    return colors[gameType] || 'from-gray-400 to-gray-500';
  };

  const getGameIcon = (gameType: string): string => {
    const icons: Record<string, string> = {
      Math: '🔢',
      Physics: '🔬',
      Language: '📚',
      Coding: '💻',
    };
    return icons[gameType] || '🎮';
  };

  const handleGameClick = async (game: Game) => {
    if (timeRemaining <= 0) {
      toast.error('Your screen time is up for today! Ask your guardian for more time.');
      return;
    }

    // Convert API game to SeriousGame format for compatibility
    const seriousGame: SeriousGame = {
      gameId: game._id,
      gameType: game.gameType as any,
      difficultyLevel: game.difficultyLevel as any,
      maxPoints: game.maxPoints,
      name: game.name,
      description: game.description,
      icon: getGameIcon(game.gameType),
      color: getGameColor(game.gameType),
    };

    onSelectGame(seriousGame);
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-3xl shadow-xl p-6 mb-8 border-4 border-purple-200">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-300 to-orange-400 rounded-full flex items-center justify-center">
                <span className="text-3xl">{childProfile.userName.charAt(0)}</span>
              </div>
              <div>
                <h1 className="text-purple-800">Hello, {childProfile.userName}! 👋</h1>
                <p className="text-gray-600">Ready to learn something new?</p>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-full flex items-center gap-2 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Points Card */}
          <div className="bg-gradient-to-br from-yellow-400 to-orange-400 rounded-3xl p-6 shadow-xl transform hover:scale-105 transition-transform">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                <Star className="w-6 h-6 text-orange-500" />
              </div>
              <div className="text-white">
                <p className="text-sm opacity-90">Your Points</p>
                <p className="text-3xl">{childProfile.knowledgePoints}</p>
              </div>
            </div>
          </div>

          {/* Badges Card */}
          <div className="bg-gradient-to-br from-purple-400 to-pink-400 rounded-3xl p-6 shadow-xl transform hover:scale-105 transition-transform">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                <Trophy className="w-6 h-6 text-purple-500" />
              </div>
              <div className="text-white">
                <p className="text-sm opacity-90">Badges Earned</p>
                <p className="text-3xl">{childProfile.achievements.length}</p>
              </div>
            </div>
          </div>

          {/* Time Card */}
          <div className="bg-gradient-to-br from-blue-400 to-cyan-400 rounded-3xl p-6 shadow-xl transform hover:scale-105 transition-transform">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                <Clock className="w-6 h-6 text-blue-500" />
              </div>
              <div className="text-white">
                <p className="text-sm opacity-90">Time Left Today</p>
                <p className="text-3xl">{timeRemaining} min</p>
              </div>
            </div>
          </div>
        </div>

        {/* Badges Section */}
        {childProfile.achievements.length > 0 && (
          <div className="bg-white rounded-3xl shadow-xl p-6 mb-8 border-4 border-yellow-200">
            <h2 className="text-purple-800 mb-4 flex items-center gap-2">
              <Trophy className="w-6 h-6 text-yellow-500" />
              Your Amazing Badges! 🎉
            </h2>
            <div className="flex flex-wrap gap-3">
              {childProfile.achievements.map((badge, idx) => (
                <div
                  key={idx}
                  className="px-4 py-3 bg-gradient-to-r from-yellow-100 to-orange-100 rounded-2xl border-2 border-yellow-300 flex items-center gap-2 transform hover:scale-110 transition-transform"
                >
                  <Trophy className="w-5 h-5 text-yellow-600" />
                  <span className="text-purple-800">{badge}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Games Section */}
        <div className="bg-white rounded-3xl shadow-xl p-6 mb-8 border-4 border-purple-200">
          <h2 className="text-purple-800 mb-4 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-purple-600" />
            Choose Your Adventure!
          </h2>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-12 h-12 text-purple-600 animate-spin" />
            </div>
          ) : games.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-gray-700">No games are available right now.</p>
              <p className="text-gray-600 text-sm">Ask your guardian to allow games or try again later.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {games.map((game) => (
                <button
                  key={game._id}
                  onClick={() => handleGameClick(game)}
                  className="bg-white rounded-3xl p-6 shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 border-4 border-purple-200 hover:border-purple-400 text-left"
                >
                  <div className={`w-16 h-16 bg-gradient-to-br ${getGameColor(game.gameType)} rounded-2xl flex items-center justify-center mb-4 mx-auto`}>
                    <span className="text-4xl">{getGameIcon(game.gameType)}</span>
                  </div>
                  <h3 className="text-purple-800 mb-2 text-center">{game.name}</h3>
                  <p className="text-gray-600 text-sm text-center mb-3">{game.description}</p>
                  <div className="flex items-center justify-center gap-2 text-orange-600 text-sm">
                    <Star className="w-4 h-4" />
                    <span>Up to {game.maxPoints} points!</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Time Warning */}
        {timeRemaining <= 10 && timeRemaining > 0 && (
          <div className="bg-gradient-to-r from-orange-400 to-red-400 rounded-3xl p-6 shadow-xl text-white text-center">
            <Clock className="w-12 h-12 mx-auto mb-3" />
            <h3 className="mb-2">Almost Time to Go! ⏰</h3>
            <p>You have {timeRemaining} minutes left. Finish up your current game!</p>
          </div>
        )}
      </div>
    </div>
  );
}
