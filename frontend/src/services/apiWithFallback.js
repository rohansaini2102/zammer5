import axios from 'axios';

// API fallback configuration
const FALLBACK_ENABLED = process.env.REACT_APP_ENABLE_API_FALLBACK === 'true';
const PRIMARY_API_URL = process.env.REACT_APP_API_URL || 'http://zammer2.ap-south-1.elasticbeanstalk.com/api';
const FALLBACK_API_URL = process.env.REACT_APP_LOCAL_API_URL || 'http://localhost:5000/api';
const STORAGE_KEY = 'api_endpoint_preference';
const PREFERENCE_TTL = 5 * 60 * 1000; // 5 minutes

// Helper to get stored preference
const getStoredPreference = () => {
  if (!FALLBACK_ENABLED) return null;
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    
    const preference = JSON.parse(stored);
    const now = Date.now();
    
    // Check if preference is still valid
    if (preference.timestamp && (now - preference.timestamp) < PREFERENCE_TTL) {
      return preference.url;
    }
    
    // Clear expired preference
    localStorage.removeItem(STORAGE_KEY);
    return null;
  } catch (error) {
    console.error('Error reading API preference:', error);
    return null;
  }
};

// Helper to store preference
const storePreference = (url) => {
  if (!FALLBACK_ENABLED) return;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      url,
      timestamp: Date.now()
    }));
  } catch (error) {
    console.error('Error storing API preference:', error);
  }
};

// Helper to show toast notification
const showToast = (message, type = 'info') => {
  // Check if a toast library is available
  if (window.toast) {
    window.toast[type](message);
  } else {
    console.log(`[API ${type.toUpperCase()}] ${message}`);
  }
};

// Create axios instance with fallback logic
class ApiWithFallback {
  constructor() {
    this.primaryUrl = PRIMARY_API_URL;
    this.fallbackUrl = FALLBACK_API_URL;
    this.currentUrl = null;
    this.isRetrying = false;
    this.lastPrimaryCheck = 0;
    this.primaryCheckInterval = 60 * 1000; // Check primary every minute
  }

  // Get the current working URL
  getCurrentUrl() {
    if (!FALLBACK_ENABLED) {
      return this.primaryUrl;
    }

    // Check if we should retry primary
    const now = Date.now();
    if (this.currentUrl === this.fallbackUrl && 
        (now - this.lastPrimaryCheck) > this.primaryCheckInterval) {
      this.lastPrimaryCheck = now;
      this.checkPrimaryEndpoint();
    }

    // If we have a current working URL, use it
    if (this.currentUrl) {
      return this.currentUrl;
    }

    // Check stored preference
    const storedUrl = getStoredPreference();
    if (storedUrl) {
      this.currentUrl = storedUrl;
      return storedUrl;
    }

    // Default to primary
    return this.primaryUrl;
  }

  // Check if primary endpoint is available
  async checkPrimaryEndpoint() {
    try {
      await axios.get(`${this.primaryUrl}/health`, { timeout: 3000 });
      if (this.currentUrl !== this.primaryUrl) {
        this.currentUrl = this.primaryUrl;
        storePreference(this.primaryUrl);
        showToast('Connected to primary server', 'success');
      }
      return true;
    } catch (error) {
      return false;
    }
  }

  // Create axios instance with interceptor
  createInstance() {
    const instance = axios.create({
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      },
      withCredentials: true
    });

    // Request interceptor to set base URL
    instance.interceptors.request.use(
      (config) => {
        // Set the base URL dynamically
        const baseURL = this.getCurrentUrl();
        config.baseURL = baseURL;
        
        // Log the request if in debug mode
        if (process.env.REACT_APP_DEBUG_MODE === 'true') {
          console.log(`[API Request] ${config.method?.toUpperCase()} ${baseURL}${config.url}`);
        }
        
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor to handle failures and fallback
    instance.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // If fallback is not enabled, just reject
        if (!FALLBACK_ENABLED) {
          return Promise.reject(error);
        }

        // Check if this is a network error and we haven't already retried
        if (!error.response && !originalRequest._retry && !this.isRetrying) {
          originalRequest._retry = true;
          this.isRetrying = true;

          // If we were using primary, try fallback
          if (originalRequest.baseURL === this.primaryUrl) {
            console.log('[API] Primary endpoint failed, trying fallback...');
            
            try {
              // Test fallback endpoint
              await axios.get(`${this.fallbackUrl}/health`, { timeout: 3000 });
              
              // Fallback is working, use it
              this.currentUrl = this.fallbackUrl;
              storePreference(this.fallbackUrl);
              showToast('Switched to local server', 'info');
              
              // Retry the original request with fallback URL
              originalRequest.baseURL = this.fallbackUrl;
              this.isRetrying = false;
              return instance(originalRequest);
            } catch (fallbackError) {
              console.error('[API] Both primary and fallback endpoints failed');
              this.isRetrying = false;
              showToast('Unable to connect to any server', 'error');
            }
          }
          // If we were using fallback and it failed, try primary
          else if (originalRequest.baseURL === this.fallbackUrl) {
            console.log('[API] Fallback endpoint failed, trying primary...');
            
            try {
              // Test primary endpoint
              await axios.get(`${this.primaryUrl}/health`, { timeout: 3000 });
              
              // Primary is working again, use it
              this.currentUrl = this.primaryUrl;
              storePreference(this.primaryUrl);
              showToast('Reconnected to primary server', 'success');
              
              // Retry the original request with primary URL
              originalRequest.baseURL = this.primaryUrl;
              this.isRetrying = false;
              return instance(originalRequest);
            } catch (primaryError) {
              console.error('[API] Both fallback and primary endpoints failed');
              this.isRetrying = false;
              showToast('Unable to connect to any server', 'error');
            }
          }
        }

        // Return the error for other error types or after retry
        return Promise.reject(error);
      }
    );

    return instance;
  }
}

// Create and export a single instance
const apiWithFallback = new ApiWithFallback();
export const apiInstance = apiWithFallback.createInstance();

// Export helper to manually check endpoints
export const checkApiEndpoints = async () => {
  const results = {
    primary: false,
    fallback: false,
    current: apiWithFallback.getCurrentUrl()
  };

  try {
    await axios.get(`${PRIMARY_API_URL}/health`, { timeout: 3000 });
    results.primary = true;
  } catch (error) {
    console.log('Primary endpoint not available');
  }

  try {
    await axios.get(`${FALLBACK_API_URL}/health`, { timeout: 3000 });
    results.fallback = true;
  } catch (error) {
    console.log('Fallback endpoint not available');
  }

  return results;
};

// Export configuration for debugging
export const getFallbackConfig = () => ({
  enabled: FALLBACK_ENABLED,
  primaryUrl: PRIMARY_API_URL,
  fallbackUrl: FALLBACK_API_URL,
  currentUrl: apiWithFallback.getCurrentUrl(),
  storedPreference: getStoredPreference()
});

export default apiInstance;