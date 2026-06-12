import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Footer from '../components/Footer';
import { authAPI, apiUtils } from '../services/api';
import './Auth.css';

function AdminLogin() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // Check if user is already logged in and redirect appropriately
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const userRaw = localStorage.getItem('user');
    
    if (token && userRaw) {
      try {
        const user = JSON.parse(userRaw);
        if (user.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/');
        }
      } catch (e) {
        // Invalid user data, clear it
        apiUtils.clearAuthState();
      }
    }
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.email) newErrors.email = 'Email is required';
    if (!formData.password) newErrors.password = 'Password is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    try {
      const response = await authAPI.adminLogin({
        email: formData.email,
        password: formData.password,
      });
      if (response.success) {
        // Clear any existing authentication state first
        apiUtils.clearAuthState();
        
        // Store new token and user data
        apiUtils.setAuthToken(response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
        // Notify app about auth state change so Navbar updates immediately
        try {
          window.dispatchEvent(new Event('authChanged'));
        } catch (e) {
          // noop in non-browser environments
        }
        navigate('/admin');
      }
    } catch (error) {
      setErrors({ general: error.message || 'Invalid admin credentials' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="auth-page">
        <div className="auth-container">
          <div className="auth-form-container">
            <div className="auth-header">
              <h1>Admin Sign In</h1>
              <p>Only authorized administrators can access the admin panel.</p>
            </div>
            <form className="auth-form" onSubmit={handleSubmit}>
              {errors.general && (
                <div className="form-group">
                  <span className="error-message">{errors.general}</span>
                </div>
              )}
              <div className="form-group">
                <label htmlFor="email">Admin Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={errors.email ? 'error' : ''}
                  placeholder="Enter admin email"
                  disabled={loading}
                />
                {errors.email && <span className="error-message">{errors.email}</span>}
              </div>
              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={errors.password ? 'error' : ''}
                  placeholder="Enter password"
                  disabled={loading}
                />
                {errors.password && <span className="error-message">{errors.password}</span>}
              </div>
              <button type="submit" className="auth-btn" disabled={loading}>
                {loading ? 'Signing In...' : 'Sign In as Admin'}
              </button>
            </form>
            <div className="auth-footer">
              <p>Are you a customer? <Link to="/signin" className="auth-link">Sign in here</Link></p>
            </div>
          </div>
          <div className="auth-image">
            <div className="auth-image-content">
              <h2>Admin Access</h2>
              <p>Manage bookings, users, cars, and reports securely.</p>
              <div className="auth-features">
                <div className="feature">
                  <i className="fa-solid fa-shield"></i>
                  <span>Secure Admin Portal</span>
                </div>
                <div className="feature">
                  <i className="fa-solid fa-chart-line"></i>
                  <span>Analytics & Reports</span>
                </div>
                <div className="feature">
                  <i className="fa-solid fa-car"></i>
                  <span>Fleet Management</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    </>
  );
}

export default AdminLogin;
