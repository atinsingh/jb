import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { API_URL } from '@/config/api';

export const AuthContext = createContext();

// Helper function to decode JWT token
const decodeJWT = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error decoding JWT:', error);
    return null;
  }
};

// Helper function to get user from token or fetch from API
const getUserFromToken = async (token) => {
  // First try to decode token to get user info
  const decoded = decodeJWT(token);
  if (decoded && decoded.id) {
    // Return user object from decoded token
    return {
      id: decoded.id,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role,
    };
  }
  
  // If decoding fails, try to fetch from API (with timeout)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const response = await fetch(`${API_URL}/api/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const data = await response.json();
      return data.user;
    }
  } catch (error) {
    // Silently handle - backend might not be running
    console.debug('Could not fetch user from API:', error.message);
  }
  
  return null;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check if we're on the client side
    if (typeof window !== 'undefined') {
      const initializeAuth = async () => {
        const token = localStorage.getItem('authToken');
        const storedUser = localStorage.getItem('user');
        
        if (token) {
          // If we have a stored user, use it initially
          if (storedUser) {
            try {
              const userData = JSON.parse(storedUser);
              setUser(userData);
            } catch (error) {
              console.error('Error parsing stored user:', error);
            }
          } else {
            // Try to get user from token
            const userData = await getUserFromToken(token);
            if (userData) {
              localStorage.setItem('user', JSON.stringify(userData));
              setUser(userData);
            }
          }
          
          // Fetch full profile data from API to get complete user info (non-blocking)
          // This runs in the background and updates user data if successful
          fetch(`${API_URL}/api/users/profile`, {
              headers: {
                'Authorization': `Bearer ${token}`,
              },
          })
            .then(response => {
            if (response.ok) {
                return response.json();
              }
              return null;
            })
            .then(data => {
              if (data?.user) {
                localStorage.setItem('user', JSON.stringify(data.user));
                setUser(data.user);
              }
            })
            .catch(error => {
              // Silently handle error - backend might not be running
              console.debug('Could not fetch user profile (backend may be offline):', error.message);
            });
        } else {
          // If no token but trying to access protected route, redirect to login
          if (router.pathname.startsWith('/employer') || router.pathname.startsWith('/candidate')) {
            router.push('/login');
          }
        }
        setLoading(false);
      };
      
      initializeAuth();
    }
  }, [router.pathname]);

  const signup = async (signupData) => {
    const { name, email, password, role } = signupData;
    
    const response = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, email, password, role }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Signup failed' }));
      // Handle validation errors - NestJS returns error in message or message array
      const errorMessage = Array.isArray(error.message) 
        ? error.message.join(', ') 
        : error.message || 'Signup failed';
      throw new Error(errorMessage);
    }

    const data = await response.json();
    const token = data.token;
    
    if (!token) {
      throw new Error('No token received from server');
    }

    // Get user info from token
    const userData = await getUserFromToken(token);
    
    if (!userData) {
      throw new Error('Failed to get user information');
    }

    // Store token and user
    localStorage.setItem('authToken', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    
    return { token, user: userData };
  };

  const login = async (email, password) => {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Login failed' }));
      throw new Error(error.message || 'Login failed');
    }

    const data = await response.json();
    const token = data.token;
    
    if (!token) {
      throw new Error('No token received from server');
    }

    // Get user info from token
    const userData = await getUserFromToken(token);
    
    if (!userData) {
      throw new Error('Failed to get user information');
    }

    // Store token and user
    localStorage.setItem('authToken', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    
    return { token, user: userData };
  };

  const loginWithToken = (token, userData) => {
    localStorage.setItem('authToken', token);
    if (userData) {
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
    } else {
      // Try to get user from token
      getUserFromToken(token).then((user) => {
        if (user) {
          localStorage.setItem('user', JSON.stringify(user));
          setUser(user);
        }
      });
    }
  };

  const setAuthData = (authData) => {
    if (authData.token) {
      localStorage.setItem('authToken', authData.token);
      if (authData.user) {
        localStorage.setItem('user', JSON.stringify(authData.user));
        setUser(authData.user);
      } else {
        // Try to get user from token
        getUserFromToken(authData.token).then((user) => {
          if (user) {
            localStorage.setItem('user', JSON.stringify(user));
            setUser(user);
          }
        });
      }
    }
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    localStorage.removeItem('token'); // Also remove 'token' key used by OAuth
    setUser(null);
    router.push('/login');
  };

  const hasRole = (role) => {
    return user?.role === role;
  };

  const refreshUser = async () => {
    const token = localStorage.getItem('authToken');
    if (!token) return;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch(`${API_URL}/api/users/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        if (data.user) {
          localStorage.setItem('user', JSON.stringify(data.user));
          setUser(data.user);
        }
      }
    } catch (error) {
      console.debug('Could not refresh user profile:', error.message);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signup, login, loginWithToken, logout, hasRole, setAuthData, refreshUser }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
