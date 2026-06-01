import React, { useState, useEffect, useContext } from 'react';
import { get, post, del } from '../api';
import { ToastContext } from '../context/ToastContext';
import Spinner from '../components/Spinner';
import Badge from '../components/Badge';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  AreaChart, Area, CartesianGrid 
} from 'recharts';

const AdminDashboard = () => {
  const { showToast } = useContext(ToastContext);
  const [activeTab, setActiveTab] = useState('overview');
  
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [userSearch, setUserSearch] = useState('');
  const [listingSearch, setListingSearch] = useState('');

  const fetchStats = async () => {
    try {
      const data = await get('/admin/stats');
      setStats(data);
    } catch (err) {
      showToast("Error fetching stats", "error");
    }
  };

  const fetchUsers = async () => {
    try {
      const data = await get('/admin/users');
      setUsers(data);
    } catch (err) {
      showToast("Error fetching users", "error");
    }
  };

  const fetchListings = async () => {
    try {
      const data = await get('/admin/listings');
      setListings(data);
    } catch (err) {
      showToast("Error fetching listings", "error");
    }
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([fetchStats(), fetchUsers(), fetchListings()]);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDeleteUser = async (id) => {
    if (!window.confirm("Delete this user?")) return;
    try {
      await del(`/admin/users/${id}`);
      showToast("User deleted", "success");
      fetchUsers();
      fetchStats();
    } catch (err) {
      showToast(err.toString(), "error");
    }
  };

  const handleDeactivateListing = async (id) => {
    if (!window.confirm("Force-close this listing?")) return;
    try {
      await post(`/admin/listings/${id}/deactivate`);
      showToast("Listing deactivated", "success");
      fetchListings();
      fetchStats();
    } catch (err) {
      showToast(err.toString(), "error");
    }
  };

  const handleDeleteListing = async (id) => {
    if (!window.confirm("Delete this listing?")) return;
    try {
      await del(`/admin/listings/${id}`);
      showToast("Listing deleted", "success");
      fetchListings();
      fetchStats();
    } catch (err) {
      showToast(err.toString(), "error");
    }
  };

  if (loading || !stats) {
    return <div className="flex-center" style={{ height: 'calc(100vh - 70px)' }}><Spinner large /></div>;
  }

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(userSearch.toLowerCase()) || 
    u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  const filteredListings = listings.filter(l => 
    l.title.toLowerCase().includes(listingSearch.toLowerCase()) || 
    l.seller_name.toLowerCase().includes(listingSearch.toLowerCase())
  );

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ backgroundColor: 'var(--bg-card)', padding: '10px', border: '1px solid var(--border-glass)', borderRadius: '8px' }}>
          <p style={{ margin: '0 0 5px 0', color: 'var(--text-secondary)' }}>{label}</p>
          <p style={{ margin: 0, color: 'white', fontWeight: 'bold' }}>{payload[0].value}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="container" style={{ padding: '40px 20px' }}>
      <h1 className="page-title" style={{ marginBottom: '30px' }}>Admin Dashboard</h1>
      
      <div style={{ display: 'flex', gap: '20px', borderBottom: '1px solid var(--border-glass)', marginBottom: '30px' }}>
        {['overview', 'users', 'listings'].map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{ 
              background: 'none', border: 'none', padding: '15px 20px', fontSize: '1.1rem',
              color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-secondary)',
              borderBottom: activeTab === tab ? '2px solid var(--accent)' : '2px solid transparent',
              fontWeight: activeTab === tab ? 'bold' : 'normal',
              textTransform: 'capitalize'
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div>
          {/* Stat Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '40px' }}>
            <div className="card" style={{ padding: '20px', backgroundColor: 'rgba(79, 114, 245, 0.1)', border: '1px solid rgba(79, 114, 245, 0.3)' }}>
              <div style={{ color: 'var(--text-secondary)' }}>Total Users</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--accent)' }}>{stats.total_users}</div>
            </div>
            <div className="card" style={{ padding: '20px', backgroundColor: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
              <div style={{ color: 'var(--text-secondary)' }}>Total Listings</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#a78bfa' }}>{stats.total_listings}</div>
            </div>
            <div className="card" style={{ padding: '20px', backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
              <div style={{ color: 'var(--text-secondary)' }}>Active Auctions</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--success)' }}>{stats.active_listings}</div>
            </div>
            <div className="card" style={{ padding: '20px', backgroundColor: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
              <div style={{ color: 'var(--text-secondary)' }}>Total Bids</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--warning)' }}>{stats.total_bids}</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '30px' }}>
            <div className="card glass" style={{ padding: '20px' }}>
              <h3 style={{ marginBottom: '20px' }}>Listings by Category</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.categories}>
                  <XAxis dataKey="category" stroke="var(--text-muted)" />
                  <YAxis stroke="var(--text-muted)" allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="card glass" style={{ padding: '20px' }}>
              <h3 style={{ marginBottom: '20px' }}>Monthly Bid Activity</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={stats.monthly_bids}>
                  <defs>
                    <linearGradient id="colorBids" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--success)" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="var(--success)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" stroke="var(--text-muted)" />
                  <YAxis stroke="var(--text-muted)" allowDecimals={false} />
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-glass)" vertical={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="count" stroke="var(--success)" fillOpacity={1} fill="url(#colorBids)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="card glass" style={{ padding: '20px' }}>
          <input 
            type="text" className="input-field" placeholder="Search users by name or email..."
            value={userSearch} onChange={e => setUserSearch(e.target.value)}
            style={{ marginBottom: '20px', maxWidth: '400px' }}
          />
          
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-glass)' }}>
                  <th style={{ padding: '15px', color: 'var(--text-secondary)' }}>User</th>
                  <th style={{ padding: '15px', color: 'var(--text-secondary)' }}>Email</th>
                  <th style={{ padding: '15px', color: 'var(--text-secondary)' }}>Joined</th>
                  <th style={{ padding: '15px', color: 'var(--text-secondary)' }}>Role</th>
                  <th style={{ padding: '15px', color: 'var(--text-secondary)', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--border-glass)' }}>
                    <td style={{ padding: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--bg-card)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold'
                      }}>
                        {u.username.charAt(0).toUpperCase()}
                      </div>
                      {u.username}
                    </td>
                    <td style={{ padding: '15px' }}>{u.email}</td>
                    <td style={{ padding: '15px', color: 'var(--text-muted)' }}>{new Date(u.created_at).toLocaleDateString()}</td>
                    <td style={{ padding: '15px' }}>
                      {u.is_admin ? <Badge type="admin">Admin</Badge> : <Badge type="active">User</Badge>}
                    </td>
                    <td style={{ padding: '15px', textAlign: 'right' }}>
                      {!u.is_admin && (
                        <button onClick={() => handleDeleteUser(u.id)} className="btn-danger" style={{ padding: '6px 12px' }}>
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'listings' && (
        <div className="card glass" style={{ padding: '20px' }}>
          <input 
            type="text" className="input-field" placeholder="Search listings..."
            value={listingSearch} onChange={e => setListingSearch(e.target.value)}
            style={{ marginBottom: '20px', maxWidth: '400px' }}
          />
          
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-glass)' }}>
                  <th style={{ padding: '15px', color: 'var(--text-secondary)' }}>Listing</th>
                  <th style={{ padding: '15px', color: 'var(--text-secondary)' }}>Seller</th>
                  <th style={{ padding: '15px', color: 'var(--text-secondary)' }}>Category</th>
                  <th style={{ padding: '15px', color: 'var(--text-secondary)' }}>Status</th>
                  <th style={{ padding: '15px', color: 'var(--text-secondary)', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredListings.map(l => (
                  <tr key={l.id} style={{ borderBottom: '1px solid var(--border-glass)' }}>
                    <td style={{ padding: '15px' }}>
                      <div style={{ fontWeight: '500', marginBottom: '4px' }}>{l.title}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(l.created_at).toLocaleDateString()}</div>
                    </td>
                    <td style={{ padding: '15px' }}>{l.seller_name}</td>
                    <td style={{ padding: '15px' }}>{l.category}</td>
                    <td style={{ padding: '15px' }}>
                      {l.auction_active ? <Badge type="active">Active</Badge> : <Badge type="ended">Ended</Badge>}
                    </td>
                    <td style={{ padding: '15px', textAlign: 'right', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                      {l.auction_active === 1 && (
                        <button onClick={() => handleDeactivateListing(l.id)} className="btn-secondary" style={{ padding: '6px 12px' }}>
                          Force Close
                        </button>
                      )}
                      <button onClick={() => handleDeleteListing(l.id)} className="btn-danger" style={{ padding: '6px 12px' }}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
