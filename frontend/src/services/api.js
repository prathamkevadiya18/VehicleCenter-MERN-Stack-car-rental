// Resolve API base URL robustly for local/dev/prod without requiring manual .env
const computeApiBaseUrl = () => {
  // If explicitly provided, always honor it
  if (process.env.REACT_APP_API_URL) return process.env.REACT_APP_API_URL;

  try {
    const win = typeof window !== 'undefined' ? window : undefined;
    if (win && win.location) {
      const { protocol, hostname, port, origin } = win.location;

      // If running CRA dev server on 3000, default backend to 5000 on same host
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        // If frontend is on 3000 and no explicit API specified, use 5000
        if (!process.env.REACT_APP_API_URL && (port === '3000' || port === '5173' || !port)) {
          return `${protocol}//${hostname}:5000/api`;
        }
        // Otherwise, assume same origin
        return `${origin}/api`;
      }

      // For deployed environments (custom domain), hit the same origin /api
      return `${origin}/api`;
    }
  } catch (_) {
    // ignore and fall through
  }

  // Fallback for non-browser environments
  return 'http://localhost:5000/api';
};

const API_BASE_URL = computeApiBaseUrl();

// Helper function to get auth token
const getAuthToken = () => {
  return localStorage.getItem('authToken');
};

// Helper function to create headers
const createHeaders = (includeAuth = true) => {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (includeAuth) {
    const token = getAuthToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  return headers;
};

// Generic API request function
const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const config = {
    headers: createHeaders(options.auth !== false),
    ...options,
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      // Include backend-provided error details if available to aid debugging
      const detail = data && (data.error || data.errors);
      const combined = data && data.message ? data.message : 'API request failed';
      throw new Error(detail ? `${combined}: ${typeof detail === 'string' ? detail : JSON.stringify(detail)}` : combined);
    }

    return data;
  } catch (error) {
    console.error('API Request Error:', error);
    throw error;
  }
};

// Authentication API
export const authAPI = {
  // Register new user
  register: async (userData) => {
    return apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
      auth: false,
    });
  },

  // Login user
  login: async (credentials) => {
    return apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
      auth: false,
    });
  },

  // Admin login
  adminLogin: async (credentials) => {
    return apiRequest('/auth/admin/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
      auth: false,
    });
  },

  // Get current user profile
  getProfile: async () => {
    return apiRequest('/auth/me');
  },

  // Update user profile
  updateProfile: async (profileData) => {
    return apiRequest('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  },

  // Change password
  changePassword: async (passwordData) => {
    return apiRequest('/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify(passwordData),
    });
  },
};

// Cars API
export const carsAPI = {
  // Get all cars
  getAllCars: async (filters = {}) => {
    const queryParams = new URLSearchParams(filters).toString();
    const endpoint = queryParams ? `/cars?${queryParams}` : '/cars';
    return apiRequest(endpoint, { auth: false });
  },

  // Get single car
  getCar: async (carId) => {
    return apiRequest(`/cars/${carId}`, { auth: false });
  },

  // Get available cars for location
  getAvailableCars: async (location, startDate, endDate) => {
    const queryParams = new URLSearchParams({ startDate, endDate }).toString();
    return apiRequest(`/cars/available/${location}?${queryParams}`, { auth: false });
  },

  // Get car categories
  getCategories: async () => {
    return apiRequest('/cars/categories/list', { auth: false });
  },

  // Admin: Create car
  createCar: async (carData) => {
    return apiRequest('/cars', {
      method: 'POST',
      body: JSON.stringify(carData),
    });
  },

  // Admin: Update car
  updateCar: async (carId, carData) => {
    return apiRequest(`/cars/${carId}`, {
      method: 'PUT',
      body: JSON.stringify(carData),
    });
  },

  // Admin: Delete car
  deleteCar: async (carId) => {
    return apiRequest(`/cars/${carId}`, {
      method: 'DELETE',
    });
  },
};

// Bookings API
export const bookingsAPI = {
  // Create new booking
  createBooking: async (bookingData) => {
    return apiRequest('/bookings', {
      method: 'POST',
      body: JSON.stringify(bookingData),
    });
  },

  // Get user's bookings
  getUserBookings: async () => {
    return apiRequest('/bookings');
  },

  // Get single booking
  getBooking: async (bookingId) => {
    return apiRequest(`/bookings/${bookingId}`);
  },

  // Update booking
  updateBooking: async (bookingId, bookingData) => {
    return apiRequest(`/bookings/${bookingId}`, {
      method: 'PUT',
      body: JSON.stringify(bookingData),
    });
  },

  // Cancel booking
  cancelBooking: async (bookingId) => {
    return apiRequest(`/bookings/${bookingId}`, {
      method: 'DELETE',
    });
  },

  // Get booking statistics
  getBookingStats: async () => {
    return apiRequest('/bookings/stats/overview');
  },
};

// Admin API
export const adminAPI = {
  // Get dashboard data
  getDashboard: async () => {
    const res = await apiRequest('/admin/dashboard');
    // Backend returns { success, dashboard: { stats, bookingStats, recentBookings } }
    const d = res?.dashboard || {};
    const stats = d.stats || {};
    return {
      totals: {
        revenue: stats.revenue,
        bookings: stats.totalBookings,
        users: stats.totalUsers,
        cars: stats.totalCars,
      },
      bookingStats: d.bookingStats,
      recentBookings: d.recentBookings || [],
    };
  },

  // Booking management
  getAllBookings: async (filters = {}) => {
    const queryParams = new URLSearchParams(filters).toString();
    const endpoint = queryParams ? `/admin/bookings?${queryParams}` : '/admin/bookings';
    const res = await apiRequest(endpoint);
    // Backend returns { success, bookings, pagination, ... }
    return res?.bookings || [];
  },

  updateBookingStatus: async (bookingId, statusData) => {
    // Normalize status casing to match backend expectations (e.g., "Pending", "Confirmed")
    const status = statusData?.status;
    const normalized = status
      ? status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()
      : undefined;
    return apiRequest(`/admin/bookings/${bookingId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ ...statusData, status: normalized }),
    });
  },

  // User management
  getAllUsers: async (filters = {}) => {
    const queryParams = new URLSearchParams(filters).toString();
    const endpoint = queryParams ? `/admin/users?${queryParams}` : '/admin/users';
    const res = await apiRequest(endpoint);
    // Backend returns { success, users }
    return res?.users || [];
  },

  updateUserStatus: async (userId, statusData) => {
    // Convert UI "status" (active/suspended) to backend { isActive: boolean }
    let isActive = undefined;
    if (typeof statusData?.status === 'string') {
      isActive = statusData.status.toLowerCase() === 'active';
    } else if (typeof statusData?.isActive === 'boolean') {
      isActive = statusData.isActive;
    }
    return apiRequest(`/admin/users/${userId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ isActive }),
    });
  },

  // Car management
  getAllCarsAdmin: async (filters = {}) => {
    const queryParams = new URLSearchParams(filters).toString();
    const endpoint = queryParams ? `/admin/cars?${queryParams}` : '/admin/cars';
    const res = await apiRequest(endpoint);
    // Backend returns { success, cars }
    return res?.cars || [];
  },

  updateCarAvailability: async (carId, availabilityData) => {
    // UI passes { available: boolean } -> backend expects { isAvailable, isUnderMaintenance }
    const available = availabilityData?.available;
    return apiRequest(`/admin/cars/${carId}/availability`, {
      method: 'PUT',
      body: JSON.stringify({ isAvailable: !!available, isUnderMaintenance: false }),
    });
  },

  // Create user (admin)
  createUser: async (userData) => {
    const res = await apiRequest('/admin/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    return res?.user;
  },

  // Create car (admin)
  createCarAdmin: async (carData) => {
    const res = await apiRequest('/admin/cars', {
      method: 'POST',
      body: JSON.stringify(carData),
    });
    return res?.car;
  },

  // Reports
  getRevenueReport: async (period = 'month') => {
    const res = await apiRequest(`/admin/reports/revenue?period=${period}`);
    // Backend returns { success, totalRevenue, revenueData }
    return res;
  },
};

// Utility functions
export const apiUtils = {
  // Store auth token
  setAuthToken: (token) => {
    // Clear any existing auth state first
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    
    // Set new token
    localStorage.setItem('authToken', token);
    // Notify app about auth state change
    try {
      window.dispatchEvent(new Event('authChanged'));
    } catch (e) {
      // noop for non-browser environments
    }
  },

  // Remove auth token
  removeAuthToken: () => {
    localStorage.removeItem('authToken');
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    return !!getAuthToken();
  },

  // Clear all authentication data
  clearAuthState: () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    // Notify app about auth state change
    try {
      window.dispatchEvent(new Event('authChanged'));
    } catch (e) {
      // noop for non-browser environments
    }
  },

  // Handle logout
  logout: () => {
    // Clear all authentication data
    apiUtils.clearAuthState();
    // Redirect to signin page
    window.location.href = '/signin';
  },
};

export default {
  authAPI,
  carsAPI,
  bookingsAPI,
  adminAPI,
  apiUtils,
};
