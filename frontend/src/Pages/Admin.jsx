import React, { useEffect, useMemo, useState } from 'react';
import CarAudi from "../images/cars-big/audia1.jpg";
import CarGolf from "../images/cars-big/golf6.jpg";
import CarToyota from "../images/cars-big/toyotacamry.jpg";
import CarBmw from "../images/cars-big/bmw320.jpg";
import CarMercedes from "../images/cars-big/benz.jpg";
import CarPassat from "../images/cars-big/passatcc.jpg";
import { adminAPI, carsAPI } from '../services/api';
import './Admin.css';

function SectionHeader({ title, subtitle }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h2 style={{ marginBottom: 8 }}>{title}</h2>
      {subtitle && <p style={{ color: '#666' }}>{subtitle}</p>}
    </div>
  );
}

function Pagination({ page, pageSize, total, onChange }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const canPrev = page > 1;
  const canNext = page < totalPages;
  return (
    <div className="pagination">
      <button disabled={!canPrev} onClick={() => onChange(page - 1, pageSize)}>
        <i className="fa-solid fa-angle-left" /> Prev
      </button>
      <span className="page-info">Page {page} of {totalPages} • {total} items</span>
      <button disabled={!canNext} onClick={() => onChange(page + 1, pageSize)}>
        Next <i className="fa-solid fa-angle-right" />
      </button>
    </div>
  );
}

function TableControls({ left, right }) {
  return (
    <div className="table-controls">
      {left}
      <div className="spacer" />
      {right}
    </div>
  );
}

function Card({ title, value, icon }) {
  return (
    <div style={{
      background: '#fff',
      borderRadius: 12,
      padding: 16,
      boxShadow: '0 2px 10px rgba(0,0,0,0.06)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {icon && <i className={`fa-solid ${icon}`} style={{ color: '#ff4d30', fontSize: 20 }}></i>}
        <div style={{ fontSize: 14, color: '#777' }}>{title}</div>
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, marginTop: 6 }}>{value}</div>
    </div>
  );
}

// Safe date formatter to avoid runtime errors
function fmtDate(input) {
  if (!input) return '—';
  try {
    const d = new Date(input);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString();
  } catch {
    return '—';
  }
}

function StatusBadge({ status }) {
  if (!status && status !== false) return <span className="badge">—</span>;
  const normalized = String(status).toLowerCase();
  return <span className={`badge ${normalized}`}>{String(status).charAt(0).toUpperCase() + String(status).slice(1)}</span>;
}

function Loader({ text = 'Loading...' }) {
  return (
    <div className="admin-loading">
      <span className="spinner" />
      <span>{text}</span>
    </div>
  );
}

function Table({ columns, data, emptyText }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="admin-table">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key || c.title} style={{ textAlign: 'left' }}>{c.title}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data && data.length > 0 ? (
            data.map((row, idx) => (
              <tr key={idx}>
                {columns.map((c) => (
                  <td key={c.key || c.title}>
                    {c.render ? c.render(row) : row[c.dataIndex]}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length}>
                <div className="no-data">{emptyText || 'No data'}</div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function Tabs({ active, onChange }) {
  const tabs = useMemo(() => ([
    { key: 'dashboard', label: 'Dashboard', icon: 'fa-gauge' },
    { key: 'bookings', label: 'Bookings', icon: 'fa-receipt' },
    { key: 'users', label: 'Users', icon: 'fa-users' },
    { key: 'cars', label: 'Cars', icon: 'fa-car' },
    { key: 'reports', label: 'Reports', icon: 'fa-chart-line' },
  ]), []);

  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 24 }}>
      {tabs.map(t => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={active === t.key ? 'btn-primary' : 'btn-secondary'}
          style={{
            padding: '10px 14px',
            borderRadius: 10,
            border: '1px solid #eee',
            background: active === t.key ? '#ff4d30' : '#fff',
            color: active === t.key ? '#fff' : '#333',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <i className={`fa-solid ${t.icon}`}></i>
          {t.label}
        </button>
      ))}
    </div>
  );
}
function Admin() {
  const [activeTab, setActiveTab] = useState('dashboard');

  // Shared
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Get current admin user info
  const [adminUser, setAdminUser] = useState(null);

  useEffect(() => {
    const userRaw = localStorage.getItem('user');
    if (userRaw) {
      try {
        const user = JSON.parse(userRaw);
        setAdminUser(user);
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }
  }, []);

  // Dashboard
  const [dashboard, setDashboard] = useState(null);

  // Bookings
  const [bookings, setBookings] = useState([]);
  const [bookingPage, setBookingPage] = useState(1);
  const [bookingPageSize, setBookingPageSize] = useState(10);

  // Users
  const [users, setUsers] = useState([]);
  const [userPage, setUserPage] = useState(1);
  const [userPageSize, setUserPageSize] = useState(10);

  // Cars
  const [cars, setCars] = useState([]);
  const [carPage, setCarPage] = useState(1);
  const [carPageSize, setCarPageSize] = useState(10);
  const [showCarForm, setShowCarForm] = useState(false);
  const [newCar, setNewCar] = useState({ name: '', model: '', brand: '', category: '', location: '', pricePerDay: 2000, available: true });
  
  // Image upload state
  const [selectedImages, setSelectedImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);

  // Reports
  const [reportPeriod, setReportPeriod] = useState('month');
  const [report, setReport] = useState(null);

  const loadDashboard = async () => {
    setLoading(true); setError('');
    try {
      const data = await adminAPI.getDashboard();
      setDashboard(data);
    } catch (e) {
      setError(e.message || 'Failed to load dashboard');
    } finally { setLoading(false); }
  };

  // Create actions

  // Image upload handlers
  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      setSelectedImages(files);
      const previews = files.map(file => {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result);
          reader.readAsDataURL(file);
        });
      });
      Promise.all(previews).then(setImagePreviews);
    }
  };

  const removeImage = (index) => {
    const newImages = selectedImages.filter((_, i) => i !== index);
    const newPreviews = imagePreviews.filter((_, i) => i !== index);
    setSelectedImages(newImages);
    setImagePreviews(newPreviews);
  };

  // Cancel: just close and reset, no save
  const cancelAddCar = () => {
    setShowCarForm(false);
    setNewCar({ name: '', model: '', brand: '', category: '', location: '', pricePerDay: 2000, available: true });
    setSelectedImages([]);
    setImagePreviews([]);
  };

  // Check if car form is valid
  const isCarFormValid = () => {
    return newCar.name.trim() && 
           newCar.model.trim() && 
           newCar.brand.trim() && 
           newCar.category.trim() && 
           newCar.pricePerDay > 0;
  };

  const createCar = async (e) => {
    e && e.preventDefault();
    setLoading(true); setError('');
    try {
      let imageUrls = [];
      
      // Upload images if any
      if (selectedImages.length > 0) {
        const uploadPromises = selectedImages.map(async (file) => {
          const formData = new FormData();
          formData.append('image', file);
          
          const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/cars/upload`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: formData
          });
          
          if (response.ok) {
            const data = await response.json();
            return data.url;
          }
          throw new Error('Image upload failed');
        });
        
        imageUrls = await Promise.all(uploadPromises);
      }
      
      const payload = { 
        ...newCar, 
        pricePerDay: Number(newCar.pricePerDay) || 0,
        images: imageUrls.map(url => ({ url, alt: newCar.name }))
      };
      
      // Use cars API so backend persists images field
      const createdRes = await carsAPI.createCar(payload);
      const created = createdRes?.car || createdRes;
      if (created) {
        const normalized = { ...created, available: !!created.available };
        setCars(prev => [normalized, ...prev]);
        setShowCarForm(false);
        setNewCar({ name: '', model: '', brand: '', category: '', location: '', pricePerDay: 2000, available: true });
        setSelectedImages([]);
        setImagePreviews([]);
        
        // Show success message
        alert('Car added successfully!');
      }
    } catch (e) {
      setError(e.message || 'Failed to create car');
    } finally { setLoading(false); }
  };

  const loadBookings = async () => {
    setLoading(true); setError('');
    try {
      const data = await adminAPI.getAllBookings({});
      setBookings(data?.items || data || []);
    } catch (e) {
      setError(e.message || 'Failed to load bookings');
    } finally { setLoading(false); }
  };

  const loadUsers = async () => {
    setLoading(true); setError('');
    try {
      const data = await adminAPI.getAllUsers({});
      const normalized = (data?.items || data || []).map(u => ({
        ...u,
        status: typeof u.status === 'string' ? u.status : (u.isActive ? 'active' : 'suspended'),
      }));
      setUsers(normalized);
    } catch (e) {
      setError(e.message || 'Failed to load users');
    } finally { setLoading(false); }
  };

  const loadCars = async () => {
    setLoading(true); setError('');
    try {
      const data = await adminAPI.getAllCarsAdmin({});
      const normalized = (data?.items || data || []).map(c => ({
        ...c,
        available: typeof c.available === 'boolean' ? c.available : !!c?.availability?.isAvailable,
      }));
      setCars(normalized);
    } catch (e) {
      setError(e.message || 'Failed to load cars');
    } finally { setLoading(false); }
  };

  const loadReport = async () => {
    setLoading(true); setError('');
    try {
      const data = await adminAPI.getRevenueReport(reportPeriod);
      setReport(data);
    } catch (e) {
      setError(e.message || 'Failed to load report');
    } finally { setLoading(false); }
  };

  useEffect(() => {
    if (activeTab === 'dashboard') loadDashboard();
    if (activeTab === 'bookings') loadBookings();
    if (activeTab === 'users') loadUsers();
    if (activeTab === 'cars') loadCars();
    if (activeTab === 'reports') loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Reload when filters change
  useEffect(() => { if (activeTab === 'reports') loadReport(); /* eslint-disable */ }, [reportPeriod]);

  // Actions
  const updateBookingStatus = async (booking, status) => {
    const prevBookings = [...bookings];
    
    // Optimistic update
    setBookings(prev => prev.map(x => x._id === booking._id ? { ...x, status } : x));
    
    try {
      await adminAPI.updateBookingStatus(booking._id, { status });
    } catch (e) {
      setError(e.message || 'Failed to update status');
      // Rollback to previous state on error
      setBookings(prevBookings);
    }
  };

  const updateUserStatus = async (user, status) => {
    const prev = users;
    // Optimistic update: flip status immediately
    setUsers(u => u.map(x => x._id === user._id ? { ...x, status } : x));
    try {
      const res = await adminAPI.updateUserStatus(user._id, { status });
      // If backend returns updated user with isActive, sync exact state
      const updated = res?.user;
      if (updated && typeof updated.isActive === 'boolean') {
        setUsers(u => u.map(x => x._id === user._id ? { ...x, status: updated.isActive ? 'active' : 'suspended' } : x));
      }
    } catch (e) {
      setError(e.message || 'Failed to update user');
      setUsers(prev);
    }
  };

  const toggleCarAvailability = async (car) => {
    const prev = cars;
    const nextAvailable = !car.available;
    setCars(c => c.map(x => x._id === car._id ? { ...x, available: nextAvailable } : x));
    try {
      await adminAPI.updateCarAvailability(car._id, { available: nextAvailable });
    } catch (e) {
      setError(e.message || 'Failed to update car');
      setCars(prev);
    }
  };


  // Pagination helper function
  const paginate = (array, page, pageSize) => {
    if (!array || !Array.isArray(array)) return [];
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return array.slice(start, end);
  };

  // Filtered data based on search terms

  // Get admin display name
  const getAdminDisplayName = () => {
    if (!adminUser) return 'Admin';
    const first = adminUser.firstName || '';
    const last = adminUser.lastName || '';
    const combined = `${first} ${last}`.trim();
    if (combined) return combined;
    if (adminUser.fullName) return adminUser.fullName;
    if (adminUser.name) return adminUser.name;
    if (adminUser.email) return adminUser.email.split('@')[0];
    return 'Admin';
  };

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="brand">
          <i className="fa-solid fa-car-side" /> Vehicle Center Admin
        </div>
        <nav className="admin-nav">
          {[
            { key: 'dashboard', label: 'Dashboard', icon: 'fa-gauge' },
            { key: 'bookings', label: 'Bookings', icon: 'fa-receipt' },
            { key: 'users', label: 'Users', icon: 'fa-users' },
            { key: 'cars', label: 'Cars', icon: 'fa-car' },
           
          ].map(t => (
            <button
              key={t.key}
              className={activeTab === t.key ? 'active' : ''}
              onClick={() => setActiveTab(t.key)}
            >
              <i className={`fa-solid ${t.icon}`} /> {t.label}
            </button>
          ))}
        </nav>
      </aside>
      <main className="admin-main">
        <div className="admin-panel">
          
          <div className="admin-content" style={{ padding: '10px 0 40px' }}>

      {error && (
        <div style={{ background: '#ffe9e6', color: '#b42318', padding: 12, borderRadius: 8, marginBottom: 16 }}>
          <i className="fa-solid fa-circle-exclamation" style={{ marginRight: 8 }}></i>
          {error}
        </div>
      )}

      {activeTab === 'dashboard' && (
        <>
          <SectionHeader title="Overview" subtitle="Key metrics for your Vehicle Center business" />
          {loading ? (
            <Loader text="Loading dashboard..." />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
              <Card title="Total Revenue" value={dashboard?.totals?.revenue ? `₹${dashboard.totals.revenue.toLocaleString()}` : '—'} icon="fa-indian-rupee-sign" />
              <Card title="Total Bookings" value={dashboard?.totals?.bookings ?? '—'} icon="fa-receipt" />
              <Card title="Active Users" value={dashboard?.totals?.users ?? '—'} icon="fa-users" />
              <Card title="Cars in Fleet" value={dashboard?.totals?.cars ?? '—'} icon="fa-car" />
            </div>
          )}

          <div style={{ marginTop: 24 }}>
            <SectionHeader title="Recent Bookings" />
            <Table
              columns={[
                { title: 'ID', dataIndex: '_id' },
                { title: 'User', render: (r) => r.user?.firstName ? `${r.user.firstName} ${r.user.lastName || ''}` : (r.user?.email || '—') },
                { title: 'Car', render: (r) => r.car?.name || r.car?.model || '—' },
                { title: 'Location', render: (r) => `${r.pickupLocation || '—'}` },
                { title: 'Dates', render: (r) => `${fmtDate(r.startDate)} → ${fmtDate(r.endDate)}` },
                { title: 'Amount', render: (r) => {
                  const amt = (r.totalAmount != null ? r.totalAmount : r.totalPrice);
                  return amt != null ? `₹${amt.toLocaleString()}` : '—';
                } },
                { title: 'Status', render: (r) => <StatusBadge status={r.status} /> },
              ]}
              data={dashboard?.recentBookings || []}
              emptyText="No recent bookings"
            />
          </div>
        </>
      )}

      {activeTab === 'bookings' && (
        <>
          <SectionHeader title="Bookings" subtitle="Manage and track all customer bookings" />
          <TableControls
            left={<div></div>}
            right={
              <>
                <label>Rows:</label>
                <select value={bookingPageSize} onChange={(e) => { setBookingPageSize(parseInt(e.target.value || '10', 10)); setBookingPage(1); }}>
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                </select>
              </>
            }
          />
          {loading ? (
            <Loader text="Loading bookings..." />
          ) : (
            <Table
              columns={[
                { title: 'ID', dataIndex: '_id' },
                { title: 'User', render: (r) => r.user?.firstName ? `${r.user.firstName} ${r.user.lastName || ''}` : (r.user?.email || '—') },
                { title: 'Car', render: (r) => r.car?.name || r.car?.model || '—' },
                { title: 'Location', render: (r) => r.pickupLocation || '—' },
                { title: 'Dates', render: (r) => `${new Date(r.startDate).toLocaleDateString()} → ${new Date(r.endDate).toLocaleDateString()}` },
                { title: 'Amount', render: (r) => {
                  const amt = (r.totalAmount != null ? r.totalAmount : r.totalPrice);
                  return amt != null ? `₹${amt.toLocaleString()}` : '—';
                } },
                { title: 'Status', render: (r) => <StatusBadge status={r.status} /> },
                { title: 'Actions', render: (r) => (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <select value={r.status} onChange={(e) => updateBookingStatus(r, e.target.value)}>
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                ) },
              ]}
              data={paginate(bookings, bookingPage, bookingPageSize)}
              emptyText="No bookings found"
            />
          )}
          <Pagination
            page={bookingPage}
            pageSize={bookingPageSize}
            total={bookings.length}
            onChange={(p, s) => { setBookingPage(p); setBookingPageSize(s); }}
          />
        </>
      )}

      {activeTab === 'users' && (
        <>
          <SectionHeader title="Users" subtitle="Manage customer accounts and statuses" />
          <TableControls
            left={<div></div>}
            right={
              <>
                <label>Rows:</label>
                <select value={userPageSize} onChange={(e) => { setUserPageSize(parseInt(e.target.value || '10', 10)); setUserPage(1); }}>
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                </select>
              </>
            }
          />
          {loading ? (
            <Loader text="Loading users..." />
          ) : (
            <Table
              columns={[
                { title: 'Name', render: (u) => `${u.firstName || ''} ${u.lastName || ''}`.trim() || (u.fullName || '—') },
                { title: 'Email', dataIndex: 'email' },
                { title: 'Phone', dataIndex: 'phone' },
                { title: 'Role', dataIndex: 'role' },
                { title: 'Status', render: (u) => <StatusBadge status={u.status} /> },
                { title: 'Actions', render: (u) => (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => updateUserStatus(u, u.status === 'active' ? 'suspended' : 'active')} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #eee', cursor: 'pointer' }}>
                      {u.status === 'active' ? 'Suspend' : 'Activate'}
                    </button>
                  </div>
                ) },
              ]}
              data={paginate(users, userPage, userPageSize)}
              emptyText="No users found"
            />
          )}
          <Pagination
            page={userPage}
            pageSize={userPageSize}
            total={users.length}
            onChange={(p, s) => { setUserPage(p); setUserPageSize(s); }}
          />
        </>
      )}

      {activeTab === 'cars' && (
        <>
          <SectionHeader title="Cars" subtitle="Manage fleet and availability" />
          {/* Add Car option removed */}
          <TableControls
            left={<div></div>}
            right={
              <>
                <label>Rows:</label>
                <select value={carPageSize} onChange={(e) => { setCarPageSize(parseInt(e.target.value || '10', 10)); setCarPage(1); }}>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                </select>
              </>
            }
          />
          {loading ? (
            <Loader text="Loading cars..." />
          ) : (
            <Table
              columns={[
                { title: 'Photo', render: (c) => {
                  // Prefer backend image URL if present
                  let backendUrl = null;
                  if (Array.isArray(c.images) && c.images.length > 0) {
                    const imageUrl = c.images[0].url || c.images[0];
                    // If it's a relative path, prepend the API base URL
                    if (imageUrl && imageUrl.startsWith('/uploads/')) {
                      const apiBaseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
                      backendUrl = `${apiBaseUrl.replace('/api', '')}${imageUrl}`;
                    } else if (imageUrl && (imageUrl.startsWith('http://') || imageUrl.startsWith('https://'))) {
                      backendUrl = imageUrl;
                    }
                  }
                  
                  let fallback = null;
                  const name = (c.name || '').toLowerCase();
                  const brand = (c.brand || '').toLowerCase();
                  const label = `${brand} ${name}`;
                  if (label.includes('audi') && label.includes('a1')) fallback = CarAudi;
                  else if (label.includes('golf') || name.includes('golf 6') || name === 'golf 6') fallback = CarGolf;
                  else if (label.includes('toyota') || name.includes('camry')) fallback = CarToyota;
                  else if (label.includes('bmw') || name.includes('320')) fallback = CarBmw;
                  else if (label.includes('mercedes') || name.includes('glk')) fallback = CarMercedes;
                  else if (label.includes('passat') || name.includes('passat')) fallback = CarPassat;

                  const placeholder = `data:image/svg+xml;utf8,${encodeURIComponent('<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"56\" height=\"36\"><rect width=\"100%\" height=\"100%\" fill=\"#f0f0f0\"/><text x=\"50%\" y=\"50%\" dominant-baseline=\"middle\" text-anchor=\"middle\" fill=\"#999\" font-size=\"10\">No Image</text></svg>')}`;
                  const src = backendUrl || fallback || placeholder;
                  return (
                    <img
                      src={src}
                      alt={c.name || 'Car'}
                      onError={(e) => { e.currentTarget.src = fallback || placeholder; }}
                      style={{ height: 80, width: 120, objectFit: 'cover', borderRadius: 6, border: '1px solid #eee' }}
                    />
                  );
                } },
                { title: 'Car', render: (c) => c.name || c.model || '—' },
                { title: 'Brand', dataIndex: 'brand' },
                { title: 'Category', dataIndex: 'category' },
                { title: 'Location', dataIndex: 'location' },
                { title: 'Rate/Day', render: (c) => c.pricePerDay != null ? `₹${c.pricePerDay.toLocaleString()}` : '—' },
                { title: 'Available', render: (c) => <StatusBadge status={c.available ? 'available' : 'unavailable'} /> },
                { title: 'Actions', render: (c) => (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => toggleCarAvailability(c)} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #eee', cursor: 'pointer' }}>
                      {c.available ? 'Mark Unavailable' : 'Mark Available'}
                    </button>
                  </div>
                ) },
              ]}
              data={paginate(cars, carPage, carPageSize)}
              emptyText="No cars found"
            />
          )}
          <Pagination
            page={carPage}
            pageSize={carPageSize}
            total={cars.length}
            onChange={(p, s) => { setCarPage(p); setCarPageSize(s); }}
          />
        </>
      )}

          </div>
        </div>
      </main>
    </div>
  );
}

export default Admin;
