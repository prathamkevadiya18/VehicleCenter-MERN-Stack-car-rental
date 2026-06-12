import { Link } from "react-router-dom";
import Logo from "../images/logo/logo.png";
import { useEffect, useMemo, useState } from "react";
import { apiUtils } from "../services/api";

function Navbar() {
  const [nav, setNav] = useState(false);
  const [user, setUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('authToken'));

  const refreshAuthState = () => {
    setIsLoggedIn(!!localStorage.getItem('authToken'));
    const raw = localStorage.getItem('user');
    try {
      setUser(raw ? JSON.parse(raw) : null);
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    // Initial load
    refreshAuthState();

    // Listen for custom auth changes and cross-tab storage updates
    const onAuthChanged = () => refreshAuthState();
    const onStorage = (e) => {
      if (e.key === 'authToken' || e.key === 'user') {
        refreshAuthState();
      }
    };

    window.addEventListener('authChanged', onAuthChanged);
    window.addEventListener('storage', onStorage);

    return () => {
      window.removeEventListener('authChanged', onAuthChanged);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const displayName = useMemo(() => {
    if (!user) return '';
    // Show Admin explicitly for admin role
    if (user.role === 'admin') return 'Admin';
    // For regular users, prefer first name only
    if (user.firstName) return user.firstName;
    if (user.fullName) return String(user.fullName).split(' ')[0];
    if (user.name) return String(user.name).split(' ')[0];
    if (user.email) return user.email.split('@')[0];
    return '';
  }, [user]);

  const openNav = () => {
    setNav(!nav);
  };
  const handleLogout = () => {
    // This will clear auth state, dispatch 'authChanged', and redirect to /signin
    apiUtils.logout();
  };

  return (
    <>
      <nav>
        {/* mobile */}
        <div className={`mobile-navbar${nav ? ' open-nav' : ''}`}>
          <div className="mobile-navbar__header">
            <div className="mobile-navbar__img">
              <i className="fa-solid fa-bars" onClick={() => setNav(false)}></i>
            </div>
            <span className="mobile-navbar__close" onClick={() => setNav(false)}>
              <i className="fa-solid fa-xmark"></i>
            </span>
          </div>
          <ul className="mobile-navbar__links">
            <li>
              <Link onClick={openNav} to="/">
                Home
              </Link>
            </li>
            <li>
              <Link onClick={openNav} to="/about">
                About
              </Link>
            </li>
            <li>
              <Link onClick={openNav} to="/models">
                Models
              </Link>
            </li>
            <li>
              <Link onClick={openNav} to="/testimonials">
                Testimonials
              </Link>
            </li>
            <li>
              <Link onClick={openNav} to="/team">
                Our Team
              </Link>
            </li>
            <li>
              <Link onClick={openNav} to="/contact">
                Contact
              </Link>
            </li>
            {/* Removed extra Admin link from mobile main links to avoid duplication */}
            {!isLoggedIn ? (
              <>
                <li>
                  <Link onClick={openNav} to="/signin">
                    Sign In
                  </Link>
                </li>
                <li>
                  <Link onClick={openNav} to="/register">
                    Register
                  </Link>
                </li>
              </>
            ) : (
              <>
                <li className="navbar__user mobile">
                  <span className="name-badge">
                    {user?.role === 'admin' ? 'Admin' : displayName}
                  </span>
                </li>
                <li>
                  <button onClick={handleLogout} className="navbar__buttons__sign-out">
                    Sign Out
                  </button>
                </li>
              </>
            )}
          </ul>
        </div>

        {/* desktop */}

        <div className="navbar">
          <div className="navbar__img">
            <Link to="/" onClick={() => window.scrollTo(0, 0)}>
              <img src={Logo} alt="logo-img" />
            </Link>
          </div>
          <ul className="navbar__links">
            <li>
              <Link className="home-link" to="/">
                Home
              </Link>
            </li>
            <li>
              {" "}
              <Link className="about-link" to="/about">
                About
              </Link>
            </li>
            <li>
              {" "}
              <Link className="models-link" to="/models">
                Vehicle Models
              </Link>
            </li>
            <li>
              {" "}
              <Link className="testi-link" to="/testimonials">
                Testimonials
              </Link>
            </li>
            <li>
              {" "}
              <Link className="team-link" to="/team">
                Our Team
              </Link>
            </li>
            <li>
              {" "}
              <Link className="contact-link" to="/contact">
                Contact
              </Link>
            </li>
            {/* Removed extra Admin link from desktop main links; Admin is shown in user spot when logged in as admin */}
          </ul>
          <div className="navbar__buttons">
            {!isLoggedIn ? (
              <>
                <Link className="navbar__buttons__sign-in" to="/signin">
                  Sign In
                </Link>
                <Link className="navbar__buttons__register" to="/register">
                  Register
                </Link>
              </>
            ) : (
              <>
                {user?.role === 'admin' ? (
                  <Link className="navbar__user" to="/admin" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <span className="name-badge">Admin</span>
                  </Link>
                ) : (
                  <div className="navbar__user">
                    <span className="name-badge">{displayName}</span>
                  </div>
                )}
                <button onClick={handleLogout} className="navbar__buttons__sign-out">
                  Sign Out
                </button>
              </>
            )}
          </div>

          {/* mobile */}
          <div className="mobile-hamb" onClick={() => setNav(true)}>
            <i className="fa-solid fa-bars"></i>
          </div>
        </div>
      </nav>
    </>
  );
}

export default Navbar;
