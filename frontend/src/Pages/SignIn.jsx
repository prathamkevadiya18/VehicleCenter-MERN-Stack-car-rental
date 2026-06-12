import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Footer from '../components/Footer';
import { authAPI, apiUtils } from '../services/api';
import './Auth.css';

function SignIn() {
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
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        // Clear error when user starts typing
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.email) {
            newErrors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = 'Email is invalid';
        }

        if (!formData.password) {
            newErrors.password = 'Password is required';
        } else if (formData.password.length < 6) {
            newErrors.password = 'Password must be at least 6 characters';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (validateForm()) {
            setLoading(true);
            try {
                const response = await authAPI.login(formData);
                
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
                    if (response.user && response.user.role === 'admin') {
                        navigate('/admin');
                    } else {
                        navigate('/');
                    }
                }
            } catch (error) {
                setErrors({ general: error.message || 'Login failed. Please try again.' });
            } finally {
                setLoading(false);
            }
        }
    };

    return (
        <>
            <div className="auth-page">
                <div className="auth-container">
                    <div className="auth-form-container">
                        <div className="auth-header">
                            <p>Welcome back! Please sign in to your account</p>
                        </div>
                        <form className="auth-form" onSubmit={handleSubmit}>
                            {errors.general && (
                                <div className="form-group">
                                    <span className="error-message">{errors.general}</span>
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
                                    placeholder="Enter your email"
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
                                    placeholder="Enter your password"
                                    disabled={loading}
                                />
                                {errors.password && <span className="error-message">{errors.password}</span>}
                            </div>

                            <div className="form-options">
                                <label className="checkbox-container">
                                    <input type="checkbox" />
                                    <span className="checkmark"></span>
                                    Remember me
                                </label>
                                <Link to="/forgot-password" className="forgot-password">
                                    Forgot Password?
                                </Link>
                            </div>

                            <button type="submit" className="auth-btn" disabled={loading}>
                                {loading ? 'Signing In...' : 'Sign In'}
                            </button>
                        </form>

                        <div className="auth-footer">
                            <p>Don't have an account?
                                <Link to="/register" className="auth-link"> Register here</Link>
                            </p>
                            <p>Are you an admin?
                                <Link to="/admin-login" className="auth-link"> Sign in as Admin</Link>
                            </p>
                        </div>
                    </div>

                    <div className="auth-image">
                        <div className="auth-image-content">
                            <h2>Join Our Vehicle Center Community</h2>
                            <p>Access exclusive deals and manage your bookings with ease</p>
                            <div className="auth-features">
                                <div className="feature">
                                    <i className="fa-solid fa-car"></i>
                                    <span>Wide Range of Vehicles</span>
                                </div>
                                <div className="feature">
                                    <i className="fa-solid fa-shield"></i>
                                    <span>Secure & Reliable</span>
                                </div>
                                <div className="feature">
                                    <i className="fa-solid fa-headset"></i>
                                    <span>24/7 Support</span>
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

export default SignIn;
