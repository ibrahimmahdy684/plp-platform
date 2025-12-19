import axios, { AxiosInstance, AxiosError } from 'axios';

// API Configuration
const API_BASE_URL = 'http://localhost:3000/api';

// Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  errors?: Array<{ field: string; message: string }>;
}

export interface LoginCredentials {
  email?: string;
  userName?: string;
  password: string;
}

export interface RegisterData {
  userName: string;
  email?: string;
  password: string;
  role: 'Guardian'; // Only guardians can self-register; children are created by guardians
  ageGroup?: '3-5' | '6-8' | '9-12';
  preferredLanguage?: 'en-US' | 'ar-EG';
}

export interface UserData {
  userId: string;
  userName: string;
  email?: string;
  role: 'Child' | 'Guardian' | 'SystemAdmin';
  preferredLanguage: string;
}

export interface ChildProfileData {
  profileId?: string;
  childId?: string;
  userId?: string;
  userName: string;
  role: 'Child';
  ageGroup: '3-5' | '6-8' | '9-12';
  knowledgePoints: number;
  achievements: string[];
  timeLimitMinutes: number;
  timeUsedToday: number;
  timeRemaining: number;
  totalGamesPlayed?: number;
  totalTimeSpent?: number;
}

export interface GuardianProfileData {
  userId: string;
  userName: string;
  email?: string;
  role: 'Guardian';
  linkedChildren: string[];
  notificationPreferences: string;
  defaultTimeLimit: number;
}

export interface GameData {
  _id: string;
  gameId?: string;
  name: string;
  description: string;
  gameType: 'Math' | 'Physics' | 'Language' | 'Coding';
  difficultyLevel: 'Easy' | 'Medium' | 'Hard';
  maxPoints: number;
  icon: string;
  color: string;
  appropriateAgeGroups: string[];
  questions?: QuestionData[];
}

export interface QuestionData {
  question: string;
  options: string[];
  correctAnswer: number;
  hint: string;
  points: number;
}

export interface GameSessionData {
  sessionId: string;
  game: GameData;
  timeRemaining?: number;
}

export interface SafetyAlertData {
  _id: string;
  childId: string;
  childName?: string;
  severity: 'Low' | 'Medium' | 'High';
  alertType: string;
  message: string;
  createdAt: string;
  resolved: boolean;
}

// Additional types for components
export interface Game {
  _id: string;
  name: string;
  description: string;
  gameType: string;
  difficultyLevel: string;
  maxPoints: number;
  appropriateAgeGroups: string[];
}

export interface ChildDetails {
  _id?: string;
  odId?: string;
  userName: string;
  ageGroup: string;
  knowledgePoints: number;
  achievements: string[];
  timeLimitMinutes: number;
  timeUsedToday: number;
}

export interface Alert {
  _id: string;
  childId: string;
  severity: string;
  alertType: string;
  message: string;
  createdAt: string;
  resolved: boolean;
  resolvedAt?: string;
}

// HTTP Client with axios
const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Include cookies in requests
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor to handle errors
axiosInstance.interceptors.response.use(
  (response) => response.data,
  (error: AxiosError<ApiResponse>) => {
    console.error('API Error:', error);
    
    if (error.response) {
      // Server responded with error
      return Promise.resolve({
        success: false,
        message: error.response.data?.message || 'An error occurred',
        errors: error.response.data?.errors,
      });
    } else {
      // Network error
      return Promise.resolve({
        success: false,
        message: error.message || 'Network error',
      });
    }
  }
);

// API Client wrapper
class ApiClient {
  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return axiosInstance.get(endpoint);
  }

  async post<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return axiosInstance.post(endpoint, body);
  }

  async put<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return axiosInstance.put(endpoint, body);
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return axiosInstance.delete(endpoint);
  }
}

const api = new ApiClient();

// Auth API
export const authApi = {
  register: (data: RegisterData) => 
    api.post<{ user: UserData; profile: ChildProfileData | GuardianProfileData; token: string }>('/auth/register', data),
  
  login: (credentials: LoginCredentials) => 
    api.post<{ user: UserData; profile: ChildProfileData | GuardianProfileData; token: string }>('/auth/login', credentials),
  
  logout: () => 
    api.post('/auth/logout'),
  
  getMe: () => 
    api.get<{ user: UserData; profile: ChildProfileData | GuardianProfileData }>('/auth/me'),
  
  changePassword: (currentPassword: string, newPassword: string) =>
    api.put('/auth/change-password', { currentPassword, newPassword }),
};

// Child API
export const childApi = {
  getProfile: () => 
    api.get<ChildProfileData>('/child/profile'),
  
  getGames: () => 
    api.get<{ games: Game[]; timeRemaining: number }>('/child/games'),
  
  startGameSession: (gameId: string) => 
    api.post<{ sessionId: string; game: GameData; timeRemaining?: number }>(`/child/games/${gameId}/start`),
  
  completeGameSession: (sessionId: string, data: {
    score: number;
    correctAnswers: number;
    questionsAnswered: number;
    durationMinutes?: number;
    hintsUsed?: number;
    badgeEarned?: string;
  }) => 
    api.post<{ session: unknown; profile: ChildProfileData }>(`/child/games/session/${sessionId}/complete`, data),
  
  getTimeStatus: () => 
    api.get<{ allowed: boolean; timeRemaining: number; timeLimitMinutes: number; timeUsedToday: number }>('/child/time-status'),
  
  requestTimeExtension: (requestedMinutes: number) => 
    api.post<{ alertId: string; requestedMinutes: number }>('/child/request-time-extension', { requestedMinutes }),
  
  getAchievements: () => 
    api.get<{ achievements: string[]; knowledgePoints: number }>('/child/achievements'),
  
  getHistory: (limit?: number) => 
    api.get<{ sessions: unknown[]; stats: unknown }>(`/child/history?limit=${limit || 10}`),
};

// Guardian API
export const guardianApi = {
  getProfile: () => 
    api.get<GuardianProfileData>('/guardian/profile'),
  
  getChildren: () => 
    api.get<ChildDetails[]>('/guardian/children'),
  
  createChild: (data: { userName: string; password: string; ageGroup: '3-5' | '6-8' | '9-12' }) =>
    api.post<ChildProfileData>('/guardian/children/create', data),
  
  getChildDetails: (childProfileId: string) => 
    api.get<{ profile: ChildProfileData; stats: unknown; recentSessions: unknown[]; weeklyUsage: unknown }>(`/guardian/children/${childProfileId}`),
  
  updateChildSettings: (childProfileId: string, settings: { timeLimitMinutes?: number; allowedGames?: string[] }) =>
    api.put<{ success: boolean }>(`/guardian/children/${childProfileId}/settings`, settings),
  
  updateTimeLimit: (childProfileId: string, timeLimitMinutes: number) =>
    api.put<{ timeLimitMinutes: number }>(`/guardian/children/${childProfileId}/time-limit`, { timeLimitMinutes }),
  
  updateAllowedGames: (childProfileId: string, allowedGames: string[]) =>
    api.put<{ allowedGames: string[] }>(`/guardian/children/${childProfileId}/allowed-games`, { allowedGames }),
  
  addExtraTime: (childProfileId: string, additionalMinutes: number, alertId?: string) =>
    api.post<{ newTimeLimit: number; timeRemaining: number }>(`/guardian/children/${childProfileId}/add-time`, { additionalMinutes, alertId }),
  
  getAlerts: (resolved?: boolean) => 
    api.get<Alert[]>(`/guardian/alerts${resolved !== undefined ? `?resolved=${resolved}` : ''}`),
  
  resolveAlert: (alertId: string) =>
    api.put(`/guardian/alerts/${alertId}/resolve`),
  
  getNotifications: (unreadOnly?: boolean) =>
    api.get<unknown[]>(`/guardian/notifications?unreadOnly=${unreadOnly || false}`),
  
  markNotificationRead: (notificationId: string) =>
    api.put(`/guardian/notifications/${notificationId}/read`),
  
  getDashboardStats: () =>
    api.get<{
      totalChildren: number;
      totalPoints: number;
      totalScreenTime: number;
      totalGamesPlayed: number;
      activeAlerts: number;
      childrenSummary: Array<{
        profileId: string;
        childId: string;
        userName: string;
        knowledgePoints: number;
        timeUsedToday: number;
        timeLimitMinutes: number;
      }>;
    }>('/guardian/dashboard-stats'),
  
  updateSettings: (settings: { notificationPreferences?: string; defaultTimeLimit?: number }) =>
    api.put('/guardian/settings', settings),
};

// Games API
export const gamesApi = {
  getAll: (filters?: { gameType?: string; difficultyLevel?: string; ageGroup?: string }) => {
    const params = new URLSearchParams();
    if (filters?.gameType) params.append('gameType', filters.gameType);
    if (filters?.difficultyLevel) params.append('difficultyLevel', filters.difficultyLevel);
    if (filters?.ageGroup) params.append('ageGroup', filters.ageGroup);
    const queryString = params.toString();
    return api.get<GameData[]>(`/games${queryString ? `?${queryString}` : ''}`);
  },
  
  getById: (gameId: string) => 
    api.get<GameData>(`/games/${gameId}`),

  create: (data: {
    name: string;
    description: string;
    gameType: 'Math' | 'Physics' | 'Language' | 'Coding';
    difficultyLevel: 'Easy' | 'Medium' | 'Hard';
    maxPoints: number;
    appropriateAgeGroups: Array<'3-5' | '6-8' | '9-12'>;
    icon?: string;
    color?: string;
    questions?: QuestionData[];
  }) => api.post<GameData>('/games', data),
};

// Admin API
export const adminApi = {
  getUsers: (params?: { role?: string; page?: number; limit?: number; search?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.role) queryParams.append('role', params.role);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    return api.get<{ users: UserData[]; pagination: unknown }>(`/admin/users?${queryParams.toString()}`);
  },
  
  deactivateUser: (userId: string) =>
    api.put(`/admin/users/${userId}/deactivate`),
  
  activateUser: (userId: string) =>
    api.put(`/admin/users/${userId}/activate`),
  
  deleteUser: (userId: string) =>
    api.delete(`/admin/users/${userId}`),
  
  getSafetyThreats: () =>
    api.get<unknown[]>('/admin/safety-threats'),
  
  addSafetyThreat: (data: { keyword: string; severity: string; category: string }) =>
    api.post('/admin/safety-threats', data),
  
  removeSafetyThreat: (threatId: string) =>
    api.delete(`/admin/safety-threats/${threatId}`),
  
  getDashboardStats: () =>
    api.get<{
      totalUsers: number;
      totalChildren: number;
      totalGuardians: number;
      totalGames: number;
      unresolvedAlerts: number;
      newUsersToday: number;
      alertsToday: number;
    }>('/admin/dashboard-stats'),
  
  getAuditLogs: (params?: { action?: string; page?: number; limit?: number }) =>
    api.get<{ logs: unknown[]; pagination: unknown }>('/admin/audit-logs'),
};

export default api;
