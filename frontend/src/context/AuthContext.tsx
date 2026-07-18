import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import api, { authAPI } from '../services/api';
import type { BacSection } from '../constants/bacSections';

interface User {
  id: string;
  email?: string | null;
  phone?: string | null;
  firstName: string;
  lastName: string;
  bacSection: BacSection;
  role: 'STUDENT' | 'ADMIN';
  status: 'PENDING' | 'APPROVED' | 'SUSPENDED' | 'REJECTED';
  createdAt?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState(true);
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (hasInitialized.current) {
      return;
    }

    hasInitialized.current = true;

    const initAuth = async () => {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        try {
          api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
          const response = await authAPI.getCurrentUser();
          setUser(response.data.user);
          setToken(storedToken);
        } catch (error) {
          // Token invalid or expired
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
          delete api.defaults.headers.common['Authorization'];
        }
      } else {
        setUser(null);
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(newUser);
    api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    delete api.defaults.headers.common['Authorization'];
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
