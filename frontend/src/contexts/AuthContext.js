import React, { createContext, useState, useEffect } from 'react';
import { getCurrentLocation } from '../utils/locationUtils';

// Enhanced debugging with colors
const debugLog = (message, data = null, type = 'info') => {
  if (process.env.NODE_ENV === 'development') {
    const colors = {
      info: '#2196F3',
      success: '#4CAF50', 
      warning: '#FF9800',
      error: '#F44336',
      storage: '#9C27B0'
    };
    
    console.log(
      `%c[AuthContext] ${message}`,
      `color: ${colors[type]}; font-weight: bold;`,
      data
    );
  }
};

// Simple JWT validation - only check basic structure
const isValidJWTStructure = (token) => {
  if (!token || typeof token !== 'string') return false;
  
  try {
    // JWT should have 3 parts separated by dots
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    
    // Each part should be base64-like (basic check)
    for (let part of parts) {
      if (!part || part.length === 0) return false;
    }
    
    return true;
  } catch (error) {
    return false;
  }
};

// Create context
export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [sellerAuth, setSellerAuth] = useState({
    isAuthenticated: false,
    seller: null,
    token: null,
  });

  const [userAuth, setUserAuth] = useState({
    isAuthenticated: false,
    user: null,
    token: null,
  });

  const [loading, setLoading] = useState(true);
  const [initError, setInitError] = useState(null);

  // Safe localStorage operations
  const safeSetItem = (key, value) => {
    try {
      localStorage.setItem(key, value);
      debugLog(`💾 STORED: ${key}`, { success: true, length: value?.length }, 'storage');
      return true;
    } catch (error) {
      debugLog(`❌ STORAGE ERROR: ${key}`, { error: error.message }, 'error');
      return false;
    }
  };

  const safeGetItem = (key) => {
    try {
      const value = localStorage.getItem(key);
      debugLog(`📖 RETRIEVED: ${key}`, { 
        hasValue: !!value,
        length: value?.length || 0 
      }, 'storage');
      return value;
    } catch (error) {
      debugLog(`❌ RETRIEVAL ERROR: ${key}`, { error: error.message }, 'error');
      return null;
    }
  };

  const safeRemoveItem = (key) => {
    try {
      localStorage.removeItem(key);
      debugLog(`🗑️ REMOVED: ${key}`, { success: true }, 'storage');
      return true;
    } catch (error) {
      debugLog(`❌ REMOVAL ERROR: ${key}`, { error: error.message }, 'error');
      return false;
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        debugLog('🚀 INITIALIZING AUTH STATE...', null, 'info');
        
        // 🎯 FIX: Batch localStorage operations
        const [sellerToken, sellerData, userToken, userData] = [
          safeGetItem('sellerToken'),
          safeGetItem('sellerData'),
          safeGetItem('userToken'),
          safeGetItem('userData')
        ];

        // Check seller auth
        if (sellerToken && sellerData && isValidJWTStructure(sellerToken)) {
          try {
            const parsedSellerData = JSON.parse(sellerData);
            debugLog('✅ FOUND VALID SELLER AUTH', {
              sellerName: parsedSellerData?.firstName,
              sellerId: parsedSellerData?._id
            }, 'success');
            
            setSellerAuth({
              isAuthenticated: true,
              seller: parsedSellerData,
              token: sellerToken,
            });
          } catch (error) {
            debugLog('❌ CORRUPTED SELLER DATA', { error: error.message }, 'error');
            safeRemoveItem('sellerToken');
            safeRemoveItem('sellerData');
          }
        }

        // Check user auth
        debugLog('🔍 USER AUTH CHECK', {
          hasUserToken: !!userToken,
          hasUserData: !!userData,
          tokenValid: userToken ? isValidJWTStructure(userToken) : false
        }, 'info');

        if (userToken && userData && isValidJWTStructure(userToken)) {
          try {
            const parsedUserData = JSON.parse(userData);
            
            // 🎯 FIX: Validate user data structure
            if (parsedUserData && parsedUserData._id && parsedUserData.name) {
              debugLog('✅ FOUND VALID USER AUTH', {
                userName: parsedUserData?.name,
                userId: parsedUserData?._id,
                userEmail: parsedUserData?.email
              }, 'success');
              
              setUserAuth({
                isAuthenticated: true,
                user: parsedUserData,
                token: userToken,
              });
            } else {
              debugLog('❌ INVALID USER DATA STRUCTURE', { 
                hasId: !!parsedUserData?._id,
                hasName: !!parsedUserData?.name 
              }, 'error');
              safeRemoveItem('userToken');
              safeRemoveItem('userData');
            }
          } catch (error) {
            debugLog('❌ CORRUPTED USER DATA', { error: error.message }, 'error');
            safeRemoveItem('userToken');
            safeRemoveItem('userData');
          }
        } else if (userToken || userData) {
          debugLog('🧹 Cleaning incomplete user auth data', {
            hasToken: !!userToken,
            hasData: !!userData,
            tokenValid: userToken ? isValidJWTStructure(userToken) : false
          }, 'warning');
          safeRemoveItem('userToken');
          safeRemoveItem('userData');
        }

        debugLog('🏁 AUTH INITIALIZATION COMPLETED', {
          userAuthenticated: !!(userToken && userData),
          sellerAuthenticated: !!(sellerToken && sellerData)
        }, 'success');
        
      } catch (error) {
        debugLog('💥 CRITICAL AUTH INIT ERROR', { error: error.message }, 'error');
        setInitError(error.message);
        
        // 🎯 FIX: Clear all auth data on critical error
        ['userToken', 'userData', 'sellerToken', 'sellerData'].forEach(key => {
          safeRemoveItem(key);
        });
      } finally {
        // 🎯 FIX: Always set loading to false
        setLoading(false);
      }
    };

    // 🎯 FIX: Add timeout to prevent hanging
    const initTimeout = setTimeout(() => {
      debugLog('⏰ AUTH INIT TIMEOUT - Force completing', null, 'warning');
      setLoading(false);
    }, 5000); // 5 second timeout

    initializeAuth().finally(() => {
      clearTimeout(initTimeout);
    });

    // 🎯 FIX: Cleanup timeout on unmount
    return () => {
      clearTimeout(initTimeout);
    };
  }, []); // 🎯 IMPORTANT: Empty dependency array to run only once

  // Enhanced login user function
  const loginUser = async (data) => {
    try {
      debugLog('🔑 USER LOGIN STARTED', {
        hasData: !!data,
        userName: data?.name,
        userEmail: data?.email,
        hasToken: !!data?.token
      }, 'info');

      if (!data) {
        throw new Error('No login data provided');
      }

      if (!data.token) {
        debugLog('❌ LOGIN DATA MISSING TOKEN', {
          providedKeys: Object.keys(data)
        }, 'error');
        throw new Error('Invalid user login data - missing token');
      }

      // Validate token structure
      if (!isValidJWTStructure(data.token)) {
        debugLog('❌ INVALID TOKEN STRUCTURE', {
          tokenLength: data.token.length,
          tokenPreview: data.token.substring(0, 30) + '...'
        }, 'error');
        throw new Error('Invalid token format received from server');
      }

      // Try to get user's location
      try {
        debugLog('📍 ATTEMPTING TO GET USER LOCATION...', null, 'info');
        const location = await getCurrentLocation();
        if (location && data) {
          data.location = {
            ...data.location,
            coordinates: location.coordinates
          };
          debugLog('✅ USER LOCATION OBTAINED', {
            coordinates: location.coordinates
          }, 'success');
        }
      } catch (error) {
        debugLog('⚠️ LOCATION ACCESS DENIED', { error: error.message }, 'warning');
        // Continue without location - not critical for login
      }
      
      // Store the token and user data
      debugLog('💾 STORING USER CREDENTIALS...', {
        tokenLength: data.token.length,
        userName: data.name,
        userEmail: data.email
      }, 'info');
      
      const tokenStored = safeSetItem('userToken', data.token);
      const dataStored = safeSetItem('userData', JSON.stringify(data));
      
      if (!tokenStored || !dataStored) {
        throw new Error('Failed to store authentication data');
      }
      
      // Update auth state
      setUserAuth({
        isAuthenticated: true,
        user: data,
        token: data.token,
      });

      debugLog('✅ USER LOGIN COMPLETED SUCCESSFULLY', {
        userName: data.name,
        userId: data._id,
        isAuthenticated: true
      }, 'success');
      
    } catch (error) {
      debugLog('💥 USER LOGIN FAILED', {
        error: error.message,
        providedData: data ? Object.keys(data) : 'none'
      }, 'error');
      
      // Clean up any partial storage
      safeRemoveItem('userToken');
      safeRemoveItem('userData');
      
      throw error;
    }
  };

  // Login seller
  const loginSeller = (data) => {
    try {
      debugLog('🏪 SELLER LOGIN STARTED', {
        hasData: !!data,
        sellerName: data?.firstName,
        hasToken: !!data?.token
      }, 'info');

      if (!data || !data.token) {
        throw new Error('Invalid seller login data - missing token');
      }

      if (!isValidJWTStructure(data.token)) {
        throw new Error('Invalid token format received from server');
      }

      const tokenStored = safeSetItem('sellerToken', data.token);
      const dataStored = safeSetItem('sellerData', JSON.stringify(data));
      
      if (!tokenStored || !dataStored) {
        throw new Error('Failed to store seller authentication data');
      }
      
      setSellerAuth({
        isAuthenticated: true,
        seller: data,
        token: data.token,
      });

      debugLog('✅ SELLER LOGIN COMPLETED', null, 'success');
    } catch (error) {
      debugLog('❌ SELLER LOGIN FAILED', { error: error.message }, 'error');
      throw error;
    }
  };

  // Logout user
  const logoutUser = () => {
    try {
      debugLog('🚪 USER LOGOUT STARTED', null, 'info');
      
      safeRemoveItem('userToken');
      safeRemoveItem('userData');
      
      setUserAuth({
        isAuthenticated: false,
        user: null,
        token: null,
      });

      debugLog('✅ USER LOGOUT COMPLETED', null, 'success');
    } catch (error) {
      debugLog('❌ USER LOGOUT ERROR', { error: error.message }, 'error');
    }
  };

  // Logout seller
  const logoutSeller = () => {
    try {
      debugLog('🚪 SELLER LOGOUT STARTED', null, 'info');
      
      safeRemoveItem('sellerToken');
      safeRemoveItem('sellerData');
      
      setSellerAuth({
        isAuthenticated: false,
        seller: null,
        token: null,
      });

      debugLog('✅ SELLER LOGOUT COMPLETED', null, 'success');
    } catch (error) {
      debugLog('❌ SELLER LOGOUT ERROR', { error: error.message }, 'error');
    }
  };

  // Handle authentication errors
  const handleAuthError = (error) => {
    try {
      if (!error?.response) {
        debugLog('Non-response error', error);
        return false;
      }
      
      const { status, data } = error.response;
      
      debugLog('🚫 HANDLING AUTH ERROR', {
        status,
        errorMessage: data?.message,
        code: data?.code,
        forceLogout: data?.forceLogout
      }, 'error');
      
      if (status === 401) {
        const isJWTError = data?.code === 'INVALID_TOKEN' || 
                          data?.code === 'TOKEN_EXPIRED' || 
                          data?.code === 'MALFORMED_TOKEN' ||
                          data?.code === 'USER_NOT_FOUND' ||
                          data?.forceLogout === true ||
                          data?.message?.toLowerCase().includes('token');
        
        if (isJWTError) {
          debugLog('🔑 JWT/AUTH ERROR DETECTED - CLEANING AUTH', {
            code: data?.code,
            forceLogout: data?.forceLogout
          }, 'warning');
          
          // Clear both user and seller auth
          safeRemoveItem('userToken');
          safeRemoveItem('userData');
          safeRemoveItem('sellerToken');
          safeRemoveItem('sellerData');
          
          setUserAuth({
            isAuthenticated: false,
            user: null,
            token: null,
          });
          setSellerAuth({
            isAuthenticated: false,
            seller: null,
            token: null,
          });
          
          // 🎯 NEW: Force page refresh if forceLogout is true
          if (data?.forceLogout) {
            debugLog('🔄 FORCE LOGOUT - Refreshing page', null, 'warning');
            setTimeout(() => {
              window.location.href = '/user/login';
            }, 1000);
          }
          
          return true;
        }
      }
      
      return false;
    } catch (handleError) {
      debugLog('❌ ERROR IN AUTH ERROR HANDLER', { error: handleError.message }, 'error');
      return false;
    }
  };

  // Debug function
  const debugAuth = () => {
    const currentState = {
      userAuth: {
        isAuthenticated: userAuth.isAuthenticated,
        hasUser: !!userAuth.user,
        hasToken: !!userAuth.token,
        userName: userAuth.user?.name,
        tokenLength: userAuth.token?.length || 0
      },
      sellerAuth: {
        isAuthenticated: sellerAuth.isAuthenticated,
        hasSeller: !!sellerAuth.seller,
        hasToken: !!sellerAuth.token,
        sellerName: sellerAuth.seller?.firstName,
        tokenLength: sellerAuth.token?.length || 0
      },
      localStorage: {
        userToken: safeGetItem('userToken') ? 'present' : 'missing',
        userData: safeGetItem('userData') ? 'present' : 'missing',
        sellerToken: safeGetItem('sellerToken') ? 'present' : 'missing',
        sellerData: safeGetItem('sellerData') ? 'present' : 'missing'
      }
    };
    
    debugLog('🔧 MANUAL AUTH DEBUG', currentState, 'info');
    return currentState;
  };

  // Update user data in context and localStorage
  const updateUser = (userData) => {
    try {
      debugLog('🔄 Updating user data in context and storage...', { userData: userData ? { id: userData._id, name: userData.name, hasLocation: !!userData.location } : null }, 'info');
      if (!userData || !userData._id) {
        debugLog('❌ updateUser called with invalid data', { userData }, 'error');
        return;
      }

      // Ensure updated user data retains the token if not explicitly provided (common for partial updates)
      const currentToken = userAuth.token || safeGetItem('userToken');
      const dataToStore = { ...userData, token: userData.token || currentToken };

      const dataStored = safeSetItem('userData', JSON.stringify(dataToStore));
      
      if (dataStored) {
        setUserAuth(prevAuth => ({
          ...prevAuth,
          user: dataToStore,
          isAuthenticated: true, // Assume authenticated if we have user data
          token: dataToStore.token || prevAuth.token // Use new token if provided, else keep old
        }));
        debugLog('✅ User data updated successfully', { userId: userData._id, userName: userData.name }, 'success');
      } else {
        debugLog('❌ Failed to store updated user data', null, 'error');
        // Handle error - perhaps a toast or re-fetch mechanism
      }

    } catch (error) {
      debugLog('💥 Error updating user data:', { error: error.message }, 'error');
    }
  };

  // Context value
  const contextValue = {
    // Auth states
    sellerAuth,
    userAuth,
    loading,
    initError,
    
    // Auth functions
    loginSeller,
    logoutSeller,
    loginUser,
    logoutUser,
    handleAuthError,
    
    // Utility functions
    debugAuth,
    
    // Debug helpers (only in development)
    ...(process.env.NODE_ENV === 'development' && {
      debugLog,
      _internalState: {
        sellerAuth,
        userAuth,
        loading,
        initError
      }
    }),

    // New functions
    updateUser
  };

  // Make debug functions available globally in development
  if (process.env.NODE_ENV === 'development') {
    window.debugAuth = debugAuth;
    
    debugLog('🔧 AUTH DEBUG MODE ENABLED', {
      availableFunctions: ['window.debugAuth() - Check complete auth state']
    }, 'info');
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};