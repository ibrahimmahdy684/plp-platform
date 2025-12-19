import React, { useState, useEffect } from 'react';
import { Shield, User, Clock, AlertTriangle, Star, Trophy, TrendingUp, LogOut, CheckCircle, XCircle, Settings, Loader2, UserPlus } from 'lucide-react';
import { GuardianProfile, ChildProfile, AgeGroup } from '../App';
import { guardianApi, ChildDetails, Alert } from '../services/api';
import { toast } from 'sonner';

interface GuardianDashboardProps {
  guardianProfile: GuardianProfile;
  onLogout: () => void;
  onCreateChild: () => void;
}

export function GuardianDashboard({ guardianProfile, onLogout, onCreateChild }: GuardianDashboardProps) {
  const [childrenData, setChildrenData] = useState<ChildProfile[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string>('');
  const [safetyAlerts, setSafetyAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalChildren: 0,
    totalPoints: 0,
    totalScreenTime: 0,
    activeAlerts: 0,
  });
  const [timeLimitValue, setTimeLimitValue] = useState(60);

  // Fetch children data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch children
        const childrenResponse = await guardianApi.getChildren();
        if (childrenResponse.success && childrenResponse.data) {
          const children: ChildProfile[] = childrenResponse.data.map((child: any) => ({
            id: child.profileId || child._id,
            userId: child.childId || child._id,
            odId: child.childId || child._id,
            role: 'Child' as const,
            userName: child.userName,
            ageGroup: child.ageGroup || '6-8',
            knowledgePoints: child.knowledgePoints || 0,
            achievements: child.achievements || [],
            timeLimitMinutes: child.timeLimitMinutes || 60,
            timeUsedToday: child.timeUsedToday || 0,
          }));
          setChildrenData(children);
          if (children.length > 0 && !selectedChildId) {
            setSelectedChildId(children[0].id || children[0].odId || '');
          }
        }

        // Fetch alerts
        const alertsResponse = await guardianApi.getAlerts();
        if (alertsResponse.success && alertsResponse.data) {
          setSafetyAlerts(alertsResponse.data);
        }

        // Fetch dashboard stats
        const statsResponse = await guardianApi.getDashboardStats();
        if (statsResponse.success && statsResponse.data) {
          setStats({
            totalChildren: statsResponse.data.totalChildren || 0,
            totalPoints: statsResponse.data.totalPoints || 0,
            totalScreenTime: statsResponse.data.totalScreenTime || 0,
            activeAlerts: statsResponse.data.activeAlerts || 0,
          });
        }
      } catch (error) {
        console.error('Failed to fetch guardian data:', error);
        toast.error('Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const selectedChild = childrenData.find(child => (child.id === selectedChildId || child.odId === selectedChildId)) || childrenData[0];
  const childAlerts = safetyAlerts.filter(alert => alert.childId === selectedChildId);

  // Update time limit value when child changes
  useEffect(() => {
    if (selectedChild) {
      setTimeLimitValue(selectedChild.timeLimitMinutes);
    }
  }, [selectedChild]);

  const handleResolveAlert = async (alertId: string) => {
    try {
      const response = await guardianApi.resolveAlert(alertId);
      if (response.success) {
        setSafetyAlerts(prev =>
          prev.map(alert =>
            alert._id === alertId ? { ...alert, resolved: true, resolvedAt: new Date().toISOString() } : alert
          )
        );
        toast.success('Alert resolved');
      }
    } catch (error) {
      toast.error('Failed to resolve alert');
    }
  };

  const handleUpdateTimeLimit = async () => {
    if (!selectedChild?.id && !selectedChild?.odId) return;
    
    try {
      const childId = selectedChild.id || selectedChild.odId || '';
      const response = await guardianApi.updateChildSettings(childId, {
        timeLimitMinutes: timeLimitValue,
      });
      
      if (response.success) {
        setChildrenData(prev =>
          prev.map(child =>
            (child.id === selectedChildId || child.odId === selectedChildId)
              ? { ...child, timeLimitMinutes: timeLimitValue }
              : child
          )
        );
        toast.success('Screen time limit updated!');
      }
    } catch (error) {
      toast.error('Failed to update settings');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'High':
        return 'from-red-400 to-red-500';
      case 'Medium':
        return 'from-orange-400 to-orange-500';
      case 'Low':
        return 'from-blue-400 to-blue-500';
      default:
        return 'from-gray-400 to-gray-500';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-white animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-3xl shadow-xl p-6 mb-8 border-4 border-blue-200">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-purple-800">Guardian Dashboard</h1>
                <p className="text-gray-600">Managing {childrenData.length} children</p>
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

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-400 to-cyan-400 rounded-3xl p-6 shadow-xl text-white">
            <div className="flex items-center gap-3 mb-2">
              <User className="w-8 h-8" />
              <div>
                <p className="text-sm opacity-90">Total Children</p>
                <p className="text-3xl">{stats.totalChildren}</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-400 to-emerald-400 rounded-3xl p-6 shadow-xl text-white">
            <div className="flex items-center gap-3 mb-2">
              <Star className="w-8 h-8" />
              <div>
                <p className="text-sm opacity-90">Total Points</p>
                <p className="text-3xl">{stats.totalPoints}</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-400 to-pink-400 rounded-3xl p-6 shadow-xl text-white">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="w-8 h-8" />
              <div>
                <p className="text-sm opacity-90">Screen Time Today</p>
                <p className="text-3xl">{stats.totalScreenTime}m</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-400 to-red-400 rounded-3xl p-6 shadow-xl text-white">
            <div className="flex items-center gap-3 mb-2">
              <AlertTriangle className="w-8 h-8" />
              <div>
                <p className="text-sm opacity-90">Active Alerts</p>
                <p className="text-3xl">{stats.activeAlerts}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Child Selector */}
        <div className="bg-white rounded-3xl shadow-xl p-6 mb-8 border-4 border-purple-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-purple-800">Select Child to View Details</h2>
            <button
              type="button"
              onClick={onCreateChild}
              className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-full flex items-center gap-2 hover:from-green-600 hover:to-emerald-600 transition-all shadow-lg"
            >
              <UserPlus className="w-4 h-4" />
              Add Child
            </button>
          </div>
          {childrenData.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">No children linked to your account yet.</p>
              <p className="text-sm text-gray-400">Click "Add Child" to create a child account.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {childrenData.map((child) => (
                <button
                  key={child.id || child.odId}
                  onClick={() => setSelectedChildId(child.id || child.odId || '')}
                  className={`p-4 rounded-2xl border-4 transition-all ${
                    selectedChildId === (child.id || child.odId)
                      ? 'bg-purple-50 border-purple-400 shadow-lg'
                      : 'bg-gray-50 border-gray-200 hover:border-purple-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-yellow-300 to-orange-400 rounded-full flex items-center justify-center">
                      <span className="text-2xl">{child.userName.charAt(0)}</span>
                    </div>
                    <div className="text-left">
                      <h3 className="text-purple-800">{child.userName}</h3>
                      <p className="text-sm text-gray-600">Age {child.ageGroup}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column */}
          <div className="space-y-8">
            {/* Child Progress */}
            <div className="bg-white rounded-3xl shadow-xl p-6 border-4 border-green-200">
              <h2 className="text-purple-800 mb-6 flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-green-500" />
                {selectedChild?.userName || 'Child'}'s Progress
              </h2>

              {selectedChild ? (
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-purple-800">Knowledge Points</span>
                      <span className="text-2xl text-orange-600">{selectedChild.knowledgePoints}</span>
                    </div>
                    <div className="bg-gray-200 rounded-full h-3 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-yellow-400 to-orange-400"
                        style={{ width: `${Math.min((selectedChild.knowledgePoints / 1000) * 100, 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-purple-800">Screen Time Today</span>
                      <span className="text-sm text-blue-600">
                        {selectedChild.timeUsedToday} / {selectedChild.timeLimitMinutes} min
                      </span>
                    </div>
                    <div className="bg-gray-200 rounded-full h-3 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-400 to-cyan-400"
                        style={{ width: `${(selectedChild.timeUsedToday / selectedChild.timeLimitMinutes) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-center">Select a child to view progress</p>
              )}
            </div>

            {/* Achievements */}
            <div className="bg-white rounded-3xl shadow-xl p-6 border-4 border-yellow-200">
              <h2 className="text-purple-800 mb-4 flex items-center gap-2">
                <Trophy className="w-6 h-6 text-yellow-500" />
                Earned Badges ({selectedChild?.achievements?.length || 0})
              </h2>
              <div className="flex flex-wrap gap-3">
                {selectedChild?.achievements?.map((badge, idx) => (
                  <div
                    key={idx}
                    className="px-4 py-3 bg-gradient-to-r from-yellow-100 to-orange-100 rounded-2xl border-2 border-yellow-300 flex items-center gap-2"
                  >
                    <Trophy className="w-5 h-5 text-yellow-600" />
                    <span className="text-purple-800">{badge}</span>
                  </div>
                )) || (
                  <p className="text-gray-500">No badges earned yet</p>
                )}
              </div>
            </div>

            {/* Screen Time Controls */}
            <div className="bg-white rounded-3xl shadow-xl p-6 border-4 border-blue-200">
              <h2 className="text-purple-800 mb-4 flex items-center gap-2">
                <Settings className="w-6 h-6 text-blue-500" />
                Screen Time Settings
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-700 mb-2">
                    Daily Time Limit for {selectedChild?.userName || 'Child'}
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="15"
                      max="180"
                      step="15"
                      value={timeLimitValue}
                      onChange={(e) => setTimeLimitValue(parseInt(e.target.value))}
                      className="flex-1"
                    />
                    <span className="text-purple-800 min-w-16">{timeLimitValue} min</span>
                  </div>
                </div>
                <button
                  onClick={handleUpdateTimeLimit}
                  className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-2xl hover:from-blue-600 hover:to-indigo-600 transition-all shadow-lg"
                >
                  Update Settings
                </button>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-8">
            {/* Safety Alerts */}
            <div className="bg-white rounded-3xl shadow-xl p-6 border-4 border-orange-200">
              <h2 className="text-purple-800 mb-6 flex items-center gap-2">
                <AlertTriangle className="w-6 h-6 text-orange-500" />
                Safety Alerts for {selectedChild?.userName || 'Child'}
              </h2>

              {childAlerts.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <p className="text-gray-600">No alerts for this child</p>
                  <p className="text-sm text-gray-500 mt-2">Everything is going great! ✨</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {childAlerts.map((alert) => (
                    <div
                      key={alert._id}
                      className={`bg-gradient-to-r ${getSeverityColor(alert.severity)} rounded-2xl p-4 text-white`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5" />
                          <span>{alert.alertType}</span>
                        </div>
                        {alert.resolved ? (
                          <CheckCircle className="w-5 h-5" />
                        ) : (
                          <XCircle className="w-5 h-5" />
                        )}
                      </div>
                      <p className="text-sm mb-2">{alert.message}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs opacity-75">
                          {new Date(alert.createdAt).toLocaleTimeString()}
                        </span>
                        {!alert.resolved && (
                          <button
                            onClick={() => handleResolveAlert(alert._id)}
                            className="px-3 py-1 bg-white text-purple-800 rounded-full text-xs hover:bg-gray-100"
                          >
                            Resolve
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Content Access Control */}
            <div className="bg-white rounded-3xl shadow-xl p-6 border-4 border-purple-200">
              <h2 className="text-purple-800 mb-4 flex items-center gap-2">
                <Shield className="w-6 h-6 text-purple-500" />
                Content Access Control
              </h2>
              <div className="space-y-3">
                {['Math Games', 'Physics Games', 'Language Games', 'Coding Games'].map((game) => (
                  <div
                    key={game}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                  >
                    <span className="text-gray-700">{game}</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Weekly Activity Summary */}
            <div className="bg-white rounded-3xl shadow-xl p-6 border-4 border-green-200">
              <h2 className="text-purple-800 mb-4">Weekly Activity Summary</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Games Played</span>
                  <span className="text-2xl text-green-600">24</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Avg. Score</span>
                  <span className="text-2xl text-blue-600">85%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Total Time</span>
                  <span className="text-2xl text-purple-600">4h 30m</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">New Badges</span>
                  <span className="text-2xl text-yellow-600">3 🏆</span>
                </div>
              </div>
            </div>
            </div>
          </div>
        </div>
      </div>
      
    </>
  );
}
