import React, { useState, useEffect, useContext } from 'react';
import { get, postForm } from '../api';
import { AuthContext } from '../context/AuthContext';
import { ToastContext } from '../context/ToastContext';
import Spinner from '../components/Spinner';

const Profile = () => {
  const { user, setUser } = useContext(AuthContext);
  const { showToast } = useContext(ToastContext);
  
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({ username: '', address: '' });
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState('');

  const fetchProfile = async () => {
    try {
      const data = await get('/profile/');
      setProfile(data);
      setFormData({ username: data.username, address: data.address || '' });
      if (data.profile_picture) {
        setImagePreview(`http://localhost:5000/media/images/${data.profile_picture}`);
      }
    } catch (err) {
      showToast(err.toString(), "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    const data = new FormData();
    data.append('username', formData.username);
    data.append('address', formData.address);
    if (image) data.append('profile_picture', image);

    try {
      await postForm('/profile/', data, true); // Put request
      showToast("Profile updated successfully", "success");
      // Update context user so navbar avatar changes if needed
      setUser({ ...user, username: formData.username });
      fetchProfile();
    } catch (err) {
      showToast(err.toString(), "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex-center" style={{ height: 'calc(100vh - 70px)' }}><Spinner large /></div>;
  if (!profile) return null;

  return (
    <div className="container" style={{ padding: '40px 20px', maxWidth: '800px' }}>
      <h1 className="page-title" style={{ marginBottom: '40px' }}>My Profile</h1>
      
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '30px' }}>
        
        {/* Left Column: Form */}
        <div className="card glass" style={{ flex: '1 1 400px', padding: '30px' }}>
          <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Edit Details</h3>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '30px' }}>
              <div style={{ position: 'relative' }}>
                <div style={{
                  width: '120px', height: '120px', borderRadius: '50%', overflow: 'hidden',
                  backgroundColor: 'var(--bg-primary)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', fontSize: '3rem', fontWeight: 'bold',
                  border: '2px solid var(--accent)', backgroundImage: imagePreview ? `url(${imagePreview})` : 'none',
                  backgroundSize: 'cover', backgroundPosition: 'center'
                }}>
                  {!imagePreview && profile.username.charAt(0).toUpperCase()}
                </div>
                <label style={{
                  position: 'absolute', bottom: 0, right: 0, backgroundColor: 'var(--accent)',
                  width: '36px', height: '36px', borderRadius: '50%', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                  border: '2px solid var(--bg-card)'
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                  <input type="file" style={{ display: 'none' }} accept="image/*" onChange={handleImageChange} />
                </label>
              </div>
            </div>

            <div className="form-group">
              <label>Email</label>
              <input type="email" className="input-field" value={profile.email} disabled style={{ opacity: 0.7 }} />
            </div>
            
            <div className="form-group">
              <label>Username</label>
              <input type="text" className="input-field" required
                value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})}
              />
            </div>
            
            <div className="form-group">
              <label>Address</label>
              <textarea className="input-field" style={{ minHeight: '80px' }}
                value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})}
              />
            </div>
            
            <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={saving}>
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </form>
        </div>
        
        {/* Right Column: Stats */}
        <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="card" style={{ padding: '30px', textAlign: 'center', backgroundColor: 'rgba(79, 114, 245, 0.1)', border: '1px solid rgba(79, 114, 245, 0.3)' }}>
            <div style={{ fontSize: '3rem', fontWeight: 'bold', color: 'var(--accent)', lineHeight: 1 }}>
              {profile.stats.listings_created}
            </div>
            <div style={{ color: 'var(--text-secondary)', marginTop: '10px', fontWeight: '500' }}>Listings Created</div>
          </div>
          
          <div className="card" style={{ padding: '30px', textAlign: 'center', backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
            <div style={{ fontSize: '3rem', fontWeight: 'bold', color: 'var(--success)', lineHeight: 1 }}>
              {profile.stats.auctions_won}
            </div>
            <div style={{ color: 'var(--text-secondary)', marginTop: '10px', fontWeight: '500' }}>Auctions Won</div>
          </div>
          
          <div className="card" style={{ padding: '30px', textAlign: 'center', backgroundColor: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
            <div style={{ fontSize: '3rem', fontWeight: 'bold', color: 'var(--warning)', lineHeight: 1 }}>
              {profile.stats.bids_placed}
            </div>
            <div style={{ color: 'var(--text-secondary)', marginTop: '10px', fontWeight: '500' }}>Total Bids Placed</div>
          </div>
          
          <div className="card glass" style={{ padding: '20px', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
              Member since {new Date(profile.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
        
      </div>
    </div>
  );
};

export default Profile;
