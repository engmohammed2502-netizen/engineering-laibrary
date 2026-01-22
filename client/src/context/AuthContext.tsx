import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { authService } from '../services/auth.service';

// أنواع البيانات
export interface User {
  _id: string;
  universityId?: string;
  username?: string;
  name: string;
  email?: string;
  role: 'student' | 'professor' | 'admin' | 'root' | 'guest';
  department?: string;
  semester?: number;
  lastLogin?: Date;
  isActive: boolean;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (universityId: string, password: string, rememberMe?: boolean) => Promise<void>;
  guestLogin: (name: string) => Promise<void>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState(true);

  // تحميل بيانات المستخدم عند بدء التطبيق
  useEffect(() => {
    const loadUser = async () => {
      if (token) {
        try {
          const userData = await authService.getCurrentUser();
          setUser(userData);
        } catch (error) {
          console.error('Failed to load user:', error);
          localStorage.removeItem('token');
          setToken(null);
        }
      }
      setIsLoading(false);
    };

    loadUser();
  }, [token]);

  // تسجيل الدخول
  const login = async (universityId: string, password: string, rememberMe = false) => {
    setIsLoading(true);
    try {
      const response = await authService.login(universityId, password);
      const { token: newToken, user: userData } = response;
      
      setToken(newToken);
      setUser(userData);
      
      if (rememberMe) {
        localStorage.setItem('token', newToken);
      } else {
        sessionStorage.setItem('token', newToken);
      }
      
      // تخزين في localStorage للمراجعة
      localStorage.setItem('userRole', userData.role);
      localStorage.setItem('userId', userData._id);
      
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // تسجيل دخول الضيف
  const guestLogin = async (name: string) => {
    setIsLoading(true);
    try {
      const response = await authService.guestLogin(name);
      const { token: newToken, user: userData } = response;
      
      setToken(newToken);
      setUser(userData);
      sessionStorage.setItem('token', newToken); // تخزين مؤقت فقط
      
      localStorage.setItem('userRole', 'guest');
      localStorage.setItem('guestName', name);
      
      // إعداد انتهاء الجلسة بعد 30 دقيقة
      setTimeout(() => {
        if (userData.role === 'guest') {
          logout();
        }
      }, 30 * 60 * 1000);
      
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // تسجيل الخروج
  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userId');
    localStorage.removeItem('guestName');
    sessionStorage.removeItem('token');
    
    // إعادة توجيه لصفحة تسجيل الدخول
    window.location.href = '/login';
  };

  // تحديث بيانات المستخدم
  const updateUser = async (userData: Partial<User>) => {
    try {
      const updatedUser = await authService.updateProfile(userData);
      setUser(updatedUser);
    } catch (error) {
      throw error;
    }
  };

  // التحقق من المصادقة
  const checkAuth = async () => {
    if (!token) return;
    
    try {
      const userData = await authService.getCurrentUser();
      setUser(userData);
    } catch (error) {
      logout();
    }
  };

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!user,
    isLoading,
    login,
    guestLogin,
    logout,
    updateUser,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
