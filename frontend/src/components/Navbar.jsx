import React, { useContext, useState, useRef, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { MEDIA_BASE, get } from '../api';

const Logo = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 13L3 22h10l7-7"/>
    <path d="m14.5 2.5 7 7-4.5 4.5-7-7z"/>
  </svg>
);

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const { theme, toggleTheme } = useContext(ThemeContext);
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => {
    if (!user) { setUnread(0); return; }
    const poll = () => {
      get('/notifications/unread-count').then(d => setUnread(d.unread_count || 0)).catch(() => {});
    };
    poll();
    const t = setInterval(poll, 30000);
    return () => clearInterval(t);
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="nav-inner">
        <Link to="/" className="nav-logo">
          <Logo />
          AuctionEdge
        </Link>

        <div className="nav-links">
          {user?.is_admin ? (
            <NavLink to="/admin" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              Admin Panel
            </NavLink>
          ) : (
            <>
              <NavLink to="/" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} end>Auctions</NavLink>
              {user && <NavLink to="/create"      className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>New Listing</NavLink>}
              {user && <NavLink to="/watchlist"   className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>Watchlist</NavLink>}
              {user && <NavLink to="/my-listings" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>My Activity</NavLink>}
            </>
          )}
        </div>

        <div className="nav-spacer" />

        <div className="nav-actions">
          <button className="theme-btn" onClick={toggleTheme} title="Toggle theme">
            {theme === 'dark'
              ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
              : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            }
          </button>

          {!user ? (
            <>
              <Link to="/login"    className="btn btn-ghost btn-sm">Sign in</Link>
              <Link to="/register" className="btn btn-primary btn-sm">Get started</Link>
            </>
          ) : (
            <>
              {/* Notifications bell */}
              <NavLink to="/notifications" title="Notifications"
                style={{ position:'relative', width:34, height:34, borderRadius:'var(--radius-sm)', display:'flex', alignItems:'center', justifyContent:'center', background:'transparent', border:'1px solid var(--border-subtle)', color:'var(--text-soft)', transition:'all 0.15s', textDecoration:'none' }}
                className={({ isActive }) => isActive ? 'theme-btn active' : 'theme-btn'}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                {unread > 0 && (
                  <span style={{ position:'absolute', top:3, right:3, minWidth:16, height:16, borderRadius:'100px', background:'var(--danger)', color:'#fff', fontSize:'0.6rem', fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center', padding:'0 3px', lineHeight:1 }}>
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </NavLink>

              <div className="dropdown" ref={ref}>
                <button className="user-btn" onClick={() => setOpen(v => !v)}>
                  <div className="avatar">
                    {user.profile_picture
                      ? <img src={`${MEDIA_BASE}/${user.profile_picture}`} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                      : user.username.charAt(0).toUpperCase()}
                  </div>
                  <span className="uname">{user.username}</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                </button>

                {open && (
                  <div className="dropdown-panel" onClick={() => setOpen(false)}>
                    <div style={{ padding:'10px 14px 8px', borderBottom:'1px solid var(--border-subtle)' }}>
                      <div style={{ fontSize:'0.8rem', fontWeight:700, color:'var(--text-strong)' }}>{user.username}</div>
                      <div style={{ fontSize:'0.75rem', color:'var(--text-muted)' }}>{user.email}</div>
                    </div>
                    {user.is_admin ? (
                      <>
                        <Link to="/admin" className="dropdown-item" style={{ color:'var(--violet)' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                          Admin Panel
                        </Link>
                      </>
                    ) : (
                      <>
                        <Link to="/profile" className="dropdown-item">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                          Profile
                        </Link>
                        <Link to="/my-listings" className="dropdown-item">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                          My Activity
                        </Link>
                        <Link to="/watchlist" className="dropdown-item">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                          Watchlist
                        </Link>
                        <Link to="/notifications" className="dropdown-item">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                          Notifications
                          {unread > 0 && <span style={{ marginLeft:'auto', background:'var(--danger)', color:'#fff', borderRadius:'100px', padding:'1px 6px', fontSize:'0.65rem', fontWeight:800 }}>{unread}</span>}
                        </Link>
                      </>
                    )}
                    <div className="dropdown-sep"/>
                    <button onClick={handleLogout} className="dropdown-item danger" style={{ width:'100%', textAlign:'left', background:'none' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
