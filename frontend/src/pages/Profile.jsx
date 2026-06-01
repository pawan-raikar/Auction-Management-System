import React, { useState, useEffect, useContext } from 'react';
import { get, postForm, MEDIA_BASE } from '../api';
import { AuthContext } from '../context/AuthContext';
import { ToastContext } from '../context/ToastContext';
import Spinner from '../components/Spinner';

const Profile = () => {
  const { user, setUser } = useContext(AuthContext);
  const { showToast } = useContext(ToastContext);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ username: '', address: '', bio: '' });
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState('');

  const fetchProfile = async () => {
    try {
      const d = await get('/profile/');
      setProfile(d);
      setForm({ username: d.username, address: d.address || '', bio: d.bio || '' });
      if (d.profile_picture) setPreview(`${MEDIA_BASE}/${d.profile_picture}`);
    } catch (err) {
      showToast(err.toString(), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProfile(); }, []);

  const handleImageChange = (e) => {
    const f = e.target.files[0];
    if (f) { setImage(f); setPreview(URL.createObjectURL(f)); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData();
    fd.append('username', form.username);
    fd.append('address', form.address);
    fd.append('bio', form.bio);
    if (image) fd.append('profile_picture', image);
    try {
      await postForm('/profile/', fd, true);
      showToast('Profile updated!', 'success');
      if (user) setUser({ ...user, username: form.username });
      fetchProfile();
    } catch (err) {
      showToast(err.toString(), 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 60px)' }}>
      <Spinner large />
    </div>
  );
  if (!profile) return null;

  const STAT_ITEMS = [
    { value: profile.stats.listings_created, label: 'Listings Created',    color: 'var(--accent)' },
    { value: profile.stats.auctions_won,     label: 'Auctions Won',        color: 'var(--success)' },
    { value: profile.stats.bids_placed,      label: 'Bids Placed',         color: 'var(--warning)' },
    { value: profile.stats.watchlist_count,  label: 'Watchlisted Items',   color: 'var(--violet)' },
  ];

  return (
    <div className="container page-body" style={{ maxWidth: 960 }}>
      <div style={{ marginBottom: 28 }}>
        <div className="section-label" style={{ marginBottom: 4 }}>Account</div>
        <h1 className="page-title">My Profile</h1>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>

        {/* Edit form */}
        <div className="card" style={{ flex: '1 1 400px', padding: 28 }}>
          <div className="section-label" style={{ marginBottom: 20 }}>Edit Details</div>
          <form onSubmit={handleSubmit}>
            {/* Avatar */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
              <div style={{ position: 'relative' }}>
                <div style={{
                  width: 100, height: 100, borderRadius: '50%', overflow: 'hidden',
                  border: '3px solid var(--accent)',
                  background: preview ? 'none' : 'linear-gradient(135deg, var(--accent), var(--violet))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '2.5rem', fontWeight: 800, color: 'white',
                }}>
                  {preview
                    ? <img src={preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : profile.username.charAt(0).toUpperCase()
                  }
                </div>
                <label style={{
                  position: 'absolute', bottom: 0, right: 0,
                  width: 30, height: 30, borderRadius: '50%',
                  background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', border: '2px solid var(--bg-surface)', boxShadow: 'var(--shadow-sm)',
                }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  <input type="file" style={{ display: 'none' }} accept="image/*" onChange={handleImageChange} />
                </label>
              </div>
            </div>

            <div className="form-group">
              <label>Email</label>
              <input type="email" className="input-field" value={profile.email} disabled />
            </div>
            <div className="form-group">
              <label>Username</label>
              <input type="text" className="input-field" required value={form.username}
                onChange={e => setForm({ ...form, username: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Bio</label>
              <textarea className="input-field" rows={3} placeholder="Tell others about yourself…"
                value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Address</label>
              <textarea className="input-field" rows={2} placeholder="Your city / address"
                value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
            </div>

            <button type="submit" className="btn btn-primary btn-full" style={{ padding: '11px' }} disabled={saving}>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </form>
        </div>

        {/* Stats */}
        <div style={{ flex: '1 1 260px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {STAT_ITEMS.map(s => (
            <div key={s.label} className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 'var(--radius)', background: `${s.color}18`, border: `1px solid ${s.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <div className="stat-val" style={{ color: s.color, fontSize: '1.2rem', lineHeight: 1, marginBottom: 0 }}>{s.value}</div>
              </div>
              <div>
                <div className="stat-lbl">{s.label}</div>
              </div>
            </div>
          ))}

          <div className="card" style={{ padding: '14px 18px' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Member since {new Date(profile.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'long' })}
            </div>
            {profile.bio && (
              <p style={{ fontSize: '0.84rem', color: 'var(--text-base)', marginTop: 8, lineHeight: 1.5 }}>{profile.bio}</p>
            )}
            {profile.address && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: '0.8rem', color: 'var(--text-soft)' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                {profile.address}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
