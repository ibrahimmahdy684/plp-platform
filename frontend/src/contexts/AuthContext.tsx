import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi, childApi, guardianApi, ChildProfileData, GuardianProfileData, UserData } from '../services/api';

export type UserRole = 'Child' | 'Guardian' | 'SystemAdmin';

interface AuthContextType {
  user: UserData | null;
  profile: ChildProfileData | GuardianProfileData | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (emailOrUsername: string, password: string, isEmail?: boolean) => Promise<{ success: boolean; message?: string }>;
  register: (data: {
    userName: string;
    email?: string;
    password: string;
    role: 'Guardian'; // Only guardians can self-register; children are created by guardians
    ageGroup?: '3-5' | '6-8' | '9-12';
  }) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserData | null>(null);
  const [profile, setProfile] = useState<ChildProfileData | GuardianProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const login = async (emailOrUsername: string, password: string, isEmail = true): Promise<{ success: boolean; message?: string }> => {
    try {
      const credentials = isEmail 
        ? { email: emailOrUsername, password }
        : { userName: emailOrUsername, password };
      
      const response = await authApi.login(credentials);
      
      console.log('Login response:', response);
      
      if (response.success && response.data) {
        console.log('Setting user:', response.data.user);
        console.log('Setting profile:', response.data.profile);
        setUser(response.data.user);
        setProfile(response.data.profile);
        return { success: true };
      }
      
      return { success: false, message: response.message || 'Login failed' };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'An error occurred during login' };
    }
  };

  const register = async (data: {
    userName: string;
    email?: string;
    password: string;
    role: 'Guardian'; // Only guardians can self-register; children are created by guardians
    ageGroup?: '3-5' | '6-8' | '9-12';
  }): Promise<{ success: boolean; message?: string }> => {
    try {
      const response = await authApi.register(data);
      
      if (response.success) {
        // Don't auto-login after registration - redirect to login page instead
        return { success: true };
      }
      
      return { success: false, message: response.message || 'Registration failed' };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, message: 'An error occurred during registration' };
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setProfile(null);
    }
  };

  const refreshProfile = async () => {
    if (!user) return;
    
    try {
      if (user.role === 'Child') {
        const response = await childApi.getProfile();
        if (response.success && response.data) {
          setProfile(response.data);
        }
      } else if (user.role === 'Guardian') {
        const response = await guardianApi.getProfile();
        if (response.success && response.data) {
          setProfile(response.data);
        }
      }
    } catch (error) {
      console.error('Refresh profile error:', error);
    }
  };

  const value: AuthContextType = {
    user,
    profile,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    refreshProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
