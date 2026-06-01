import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { get, put } from '../api';
import Spinner from '../components/Spinner';

const icons = {
  won:    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>,
  outbid: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
  bid:    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 13L3 22h10l7-7"/><path d="m14.5 2.5 7 7-4.5 4.5-7-7z"/></svg>,
  system: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
};

const colors = {
  won:    'var(--success)',
  outbid: 'var(--warning)',
  bid:    'var(--accent)',
  system: 'var(--violet)',
};

const bgs = {
  won:    'var(--success-soft)',
  outbid: 'var(--warning-soft)',
  bid:    'var(--accent-soft)',
  system: 'var(--violet-soft)',
};

function timeAgo(ts) {
  const diff = Math.floor((Date.now() - new Date(ts + 'Z')) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const Notifications = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    get('/notifications/')
      .then(d => setItems(d.notifications))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const markAllRead = async () => {
    await put('/notifications/read-all').catch(() => {});
    setItems(prev => prev.map(n => ({ ...n, is_read: 1 })));
  };

  const markRead = async (id) => {
    await put(`/notifications/${id}/read`).catch(() => {});
    setItems(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
  };

  const unread = items.filter(n => !n.is_read).length;

  return (
    <div className="container page-body">
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
        <div>
          <div className="section-label" style={{ marginBottom:4 }}>Activity</div>
          <h1 className="page-title">
            Notifications
            {unread > 0 && (
              <span style={{ marginLeft:10, fontSize:'0.75rem', fontWeight:700, background:'var(--accent)', color:'#fff', borderRadius:'100px', padding:'2px 8px', verticalAlign:'middle' }}>
                {unread}
              </span>
            )}
          </h1>
        </div>
        {unread > 0 && (
          <button className="btn btn-secondary btn-sm" onClick={markAllRead}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            Mark all read
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ display:'flex', justifyContent:'center', padding:'80px 0' }}><Spinner large /></div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          <h3>No notifications yet</h3>
          <p>You'll see bid alerts, auction wins, and updates here.</p>
        </div>
      ) : (
        <div className="card" style={{ overflow:'hidden' }}>
          {items.map((n, i) => {
            const type = n.type || 'system';
            const color = colors[type] || colors.system;
            const bg = bgs[type] || bgs.system;
            const icon = icons[type] || icons.system;

            return (
              <div
                key={n.id}
                onClick={() => !n.is_read && markRead(n.id)}
                style={{
                  display:'flex', alignItems:'flex-start', gap:14,
                  padding:'16px 20px',
                  borderBottom: i < items.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                  background: n.is_read ? 'transparent' : 'var(--accent-soft)',
                  cursor: n.is_read ? 'default' : 'pointer',
                  transition:'background 0.15s',
                }}
              >
                <div style={{ width:36, height:36, borderRadius:'50%', background:bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, color }}>
                  {icon}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, marginBottom:2 }}>
                    <span style={{ fontWeight: n.is_read ? 500 : 700, fontSize:'0.875rem', color:'var(--text-strong)' }}>
                      {n.title}
                    </span>
                    <span style={{ fontSize:'0.72rem', color:'var(--text-muted)', flexShrink:0 }}>{timeAgo(n.created_at)}</span>
                  </div>
                  <p style={{ fontSize:'0.82rem', color:'var(--text-soft)', margin:0 }}>{n.body}</p>
                  {n.link && (
                    <Link to={n.link} style={{ fontSize:'0.78rem', color:'var(--accent)', fontWeight:600, marginTop:6, display:'inline-block' }}>
                      View →
                    </Link>
                  )}
                </div>
                {!n.is_read && (
                  <div style={{ width:8, height:8, borderRadius:'50%', background:'var(--accent)', flexShrink:0, marginTop:6 }} />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Notifications;
