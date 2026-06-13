import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Footer from '../components/Footer';
import { authAPI } from '../services/api';
import './Auth.css';

function ForgotPassword() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    if (!formData.currentPassword) newErrors.currentPassword = 'Old Password is required';
    if (!formData.newPassword) {
      newErrors.newPassword = 'New Password is required';
    } else if (formData.newPassword.length < 6) {
      newErrors.newPassword = 'New Password must be at least 6 characters';
    }
    if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    setSuccess('');
    try {
      const response = await authAPI.resetPassword({
        email: formData.email,
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword
      });
      if (response.success) {
        setSuccess('Password updated successfully! Redirecting to sign in page...');
        setTimeout(() => {
          navigate('/signin');
        }, 3000);
      }
    } catch (error) {
      setErrors({ general: error.message || 'Verification failed. Please check your credentials.' });
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
              <h1>Reset Password</h1>
              <p>Verify your details to set a new password</p>
            </div>
            <form className="auth-form" onSubmit={handleSubmit}>
              {errors.general && (
                <div className="form-group">
                  <span className="error-message">{errors.general}</span>
                </div>
              )}
              {success && (
                <div className="form-group" style={{ background: '#e6f7f1', color: '#0f5132', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: '14px' }}>
                  {success}
                </div>
              )}
              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={errors.email ? 'error' : ''}
                  placeholder="Enter your registered email"
                  disabled={loading}
                />
                {errors.email && <span className="error-message">{errors.email}</span>}
              </div>
              <div className="form-group">
                <label htmlFor="currentPassword">Old Password</label>
                <input
                  type="password"
                  id="currentPassword"
                  name="currentPassword"
                  value={formData.currentPassword}
                  onChange={handleChange}
                  className={errors.currentPassword ? 'error' : ''}
                  placeholder="Enter old password"
                  disabled={loading}
                />
                {errors.currentPassword && <span className="error-message">{errors.currentPassword}</span>}
              </div>
              <div className="form-group">
                <label htmlFor="newPassword">New Password</label>
                <input
                  type="password"
                  id="newPassword"
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleChange}
                  className={errors.newPassword ? 'error' : ''}
                  placeholder="Min. 6 characters"
                  disabled={loading}
                />
                {errors.newPassword && <span className="error-message">{errors.newPassword}</span>}
              </div>
              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm New Password</label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={errors.confirmPassword ? 'error' : ''}
                  placeholder="Re-enter new password"
                  disabled={loading}
                />
                {errors.confirmPassword && <span className="error-message">{errors.confirmPassword}</span>}
              </div>
              <button type="submit" className="auth-btn" disabled={loading}>
                {loading ? 'Resetting Password...' : 'Reset Password'}
              </button>
            </form>
            <div className="auth-footer">
              <p>Remember your password? <Link to="/signin" className="auth-link">Sign in here</Link></p>
            </div>
          </div>
          <div className="auth-image">
            <div className="auth-image-content">
              <h2>Reset Password Securely</h2>
              <p>Provide your old credentials to quickly change your login password.</p>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    </>
  );
}

export default ForgotPassword;
