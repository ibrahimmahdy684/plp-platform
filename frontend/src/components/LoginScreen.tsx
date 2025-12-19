import React, { useState } from 'react';
import { User, Sparkles, Shield, Mail, Lock, Eye, EyeOff, ArrowLeft, UserPlus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

interface LoginScreenProps {
  onLogin: () => void;
}

type AuthMode = 'select' | 'childLogin' | 'guardianLogin' | 'adminLogin' | 'register';

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<AuthMode>('select');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Login form state
  const [loginForm, setLoginForm] = useState({
    emailOrUsername: '',
    password: '',
  });

  // Register form state - Only guardians can self-register (children are created by guardians)
  const [registerForm, setRegisterForm] = useState({
    userName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const isEmail = loginForm.emailOrUsername.includes('@');
      const result = await login(loginForm.emailOrUsername, loginForm.password, isEmail);
      
      if (result.success) {
        toast.success('Welcome back! 🎉');
        onLogin();
      } else {
        toast.error(result.message || 'Invalid credentials');
      }
    } catch (error) {
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (registerForm.password !== registerForm.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;
    if (!passwordRegex.test(registerForm.password)) {
      toast.error('Password must be at least 8 characters with uppercase, lowercase, number, and special character');
      return;
    }

    setIsLoading(true);

    try {
      const result = await register({
        userName: registerForm.userName,
        email: registerForm.email,
        password: registerForm.password,
        role: 'Guardian',
      });

      if (result.success) {
        toast.success('Account created successfully! Please log in. 🎉');
        // Reset form and redirect to guardian login screen
        setRegisterForm({
          userName: '',
          email: '',
          password: '',
          confirmPassword: '',
        });
        // Redirect to guardian login screen
        setMode('guardianLogin');
      } else {
        toast.error(result.message || 'Registration failed');
      }
    } catch (error) {
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Child login screen
  if (mode === 'childLogin') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-yellow-300 to-orange-400 rounded-full mb-4">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Hello, Little Star! ⭐</h1>
            <p className="text-purple-800">Enter your name and password to play!</p>
          </div>

          <form onSubmit={handleLoginSubmit} className="bg-white rounded-3xl p-8 shadow-xl border-4 border-purple-200">
            <div className="space-y-6">
              <div>
                <label className="block text-purple-800 font-semibold mb-2">Your Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-purple-400" />
                  <input
                    type="text"
                    value={loginForm.emailOrUsername}
                    onChange={(e) => setLoginForm({ ...loginForm, emailOrUsername: e.target.value })}
                    className="w-full pl-12 pr-4 py-4 border-2 border-purple-200 rounded-2xl focus:border-purple-500 focus:outline-none text-lg"
                    placeholder="Enter your name"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-purple-800 font-semibold mb-2">Secret Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-purple-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    className="w-full pl-12 pr-12 py-4 border-2 border-purple-200 rounded-2xl focus:border-purple-500 focus:outline-none text-lg"
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-purple-400"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 bg-gradient-to-r from-yellow-400 to-orange-400 text-white font-bold rounded-2xl hover:from-yellow-500 hover:to-orange-500 transition-all shadow-lg disabled:opacity-50 text-lg"
              >
                {isLoading ? 'Loading...' : "Let's Play! 🎮"}
              </button>
            </div>
          </form>

          <button
            onClick={() => setMode('select')}
            className="mt-6 mx-auto flex items-center gap-2 text-purple-800 hover:text-purple-600"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to selection
          </button>
        </div>
      </div>
    );
  }

  // Guardian login screen
  if (mode === 'guardianLogin') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full mb-4">
              <Shield className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Guardian Login</h1>
            <p className="text-purple-800">Sign in to monitor your children</p>
          </div>

          <form onSubmit={handleLoginSubmit} className="bg-white rounded-3xl p-8 shadow-xl border-4 border-blue-200">
            <div className="space-y-6">
              <div>
                <label className="block text-purple-800 font-semibold mb-2">Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-blue-400" />
                  <input
                    type="email"
                    value={loginForm.emailOrUsername}
                    onChange={(e) => setLoginForm({ ...loginForm, emailOrUsername: e.target.value })}
                    className="w-full pl-12 pr-4 py-4 border-2 border-blue-200 rounded-2xl focus:border-blue-500 focus:outline-none"
                    placeholder="Enter your email"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-purple-800 font-semibold mb-2">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-blue-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    className="w-full pl-12 pr-12 py-4 border-2 border-blue-200 rounded-2xl focus:border-blue-500 focus:outline-none"
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-blue-400"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-bold rounded-2xl hover:from-blue-600 hover:to-indigo-600 transition-all shadow-lg disabled:opacity-50"
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  Don't have an account? Register
                </button>
              </div>
            </div>
          </form>

          <button
            onClick={() => setMode('select')}
            className="mt-6 mx-auto flex items-center gap-2 text-purple-800 hover:text-purple-600"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to selection
          </button>
        </div>
      </div>
    );
  }

  // System admin login screen
  if (mode === 'adminLogin') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full mb-4">
              <Shield className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">System Admin Login</h1>
            <p className="text-purple-800">Sign in to manage games</p>
          </div>

          <form onSubmit={handleLoginSubmit} className="bg-white rounded-3xl p-8 shadow-xl border-4 border-blue-200">
            <div className="space-y-6">
              <div>
                <label className="block text-purple-800 font-semibold mb-2">Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-blue-400" />
                  <input
                    type="email"
                    value={loginForm.emailOrUsername}
                    onChange={(e) => setLoginForm({ ...loginForm, emailOrUsername: e.target.value })}
                    className="w-full pl-12 pr-4 py-4 border-2 border-blue-200 rounded-2xl focus:border-blue-500 focus:outline-none"
                    placeholder="Enter admin email"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-purple-800 font-semibold mb-2">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-blue-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    className="w-full pl-12 pr-12 py-4 border-2 border-blue-200 rounded-2xl focus:border-blue-500 focus:outline-none"
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-blue-400"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-bold rounded-2xl hover:from-blue-600 hover:to-indigo-600 transition-all shadow-lg disabled:opacity-50"
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </button>
            </div>
          </form>

          <button
            onClick={() => setMode('select')}
            className="mt-6 mx-auto flex items-center gap-2 text-purple-800 hover:text-purple-600"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to selection
          </button>
        </div>
      </div>
    );
  }

  // Register screen
  if (mode === 'register') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full mb-4">
              <UserPlus className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Create Account</h1>
            <p className="text-purple-800">Join the Play, Learn & Protect family!</p>
          </div>

          <form onSubmit={handleRegisterSubmit} className="bg-white rounded-3xl p-8 shadow-xl border-4 border-green-200">
            <div className="space-y-4">
              <div className="text-center mb-2">
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                  👨‍👩‍👧 Guardian Registration
                </span>
                <p className="text-xs text-gray-500 mt-2">Children accounts are created from your dashboard after registration</p>
              </div>

              <div>
                <label className="block text-purple-800 font-semibold mb-2">Username</label>
                <input
                  type="text"
                  value={registerForm.userName}
                  onChange={(e) => setRegisterForm({ ...registerForm, userName: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none"
                  placeholder="Choose a username"
                  required
                />
              </div>

              <div>
                <label className="block text-purple-800 font-semibold mb-2">Email</label>
                <input
                  type="email"
                  value={registerForm.email}
                  onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none"
                  placeholder="Enter your email"
                  required
                />
              </div>

              <div>
                <label className="block text-purple-800 font-semibold mb-2">Password</label>
                <input
                  type="password"
                  value={registerForm.password}
                  onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none"
                  placeholder="Create a password"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Min 8 chars, uppercase, lowercase, number, special char</p>
              </div>

              <div>
                <label className="block text-purple-800 font-semibold mb-2">Confirm Password</label>
                <input
                  type="password"
                  value={registerForm.confirmPassword}
                  onChange={(e) => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none"
                  placeholder="Confirm your password"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold rounded-2xl hover:from-green-600 hover:to-emerald-600 transition-all shadow-lg disabled:opacity-50"
              >
                {isLoading ? 'Creating account...' : 'Create Account 🚀'}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setMode('guardianLogin')}
                  className="text-green-600 hover:text-green-800 font-medium"
                >
                  Already have an account? Sign in
                </button>
              </div>
            </div>
          </form>

          <button
            onClick={() => setMode('select')}
            className="mt-6 mx-auto flex items-center gap-2 text-purple-800 hover:text-purple-600"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to selection
          </button>
        </div>
      </div>
    );
  }

  // Role selection screen (default)
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full mb-6 shadow-xl">
            <Sparkles className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">Play, Learn & Protect</h1>
          <p className="text-purple-800 text-lg">A safe place for children to learn and grow</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button
            onClick={() => setMode('childLogin')}
            className="bg-white rounded-3xl p-10 shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 border-4 border-yellow-300 hover:border-yellow-400"
          >
            <div className="w-20 h-20 bg-gradient-to-br from-yellow-300 to-orange-400 rounded-full mx-auto mb-4 flex items-center justify-center">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-purple-800 mb-2">I'm a Child</h2>
            <p className="text-gray-600 text-sm">Play games and learn new things!</p>
          </button>

          <button
            onClick={() => setMode('guardianLogin')}
            className="bg-white rounded-3xl p-10 shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 border-4 border-blue-300 hover:border-blue-400"
          >
            <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full mx-auto mb-4 flex items-center justify-center">
              <Shield className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-purple-800 mb-2">I'm a Guardian</h2>
            <p className="text-gray-600 text-sm">Monitor and protect your children</p>
          </button>
        </div>

        <div className="text-center mt-8">
          <button
            onClick={() => setMode('register')}
            className="text-purple-800 hover:text-purple-600 font-medium underline"
          >
            New here? Create an account
          </button>

          <div className="mt-3">
            <button
              onClick={() => setMode('adminLogin')}
              className="text-purple-800 hover:text-purple-600 font-medium underline"
            >
              System Admin? Sign in
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
