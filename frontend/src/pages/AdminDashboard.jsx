import React, { useState, useEffect, useContext } from 'react';
import { get, post, del } from '../api';
import { ToastContext } from '../context/ToastContext';
import Spinner from '../components/Spinner';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, CartesianGrid, Cell, LineChart, Line, Legend,
  PieChart, Pie
} from 'recharts';

const C = ['#6366f1','#8b5cf6','#10b981','#f87171','#fbbf24','#0891b2','#db2777','#65a30d'];

const ChartTip = ({ active, payload, label, prefix = '' }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'var(--bg-surface)', border:'1px solid var(--border-ui)', borderRadius:'var(--radius)', padding:'8px 12px', fontSize:'0.8rem', boxShadow:'var(--shadow-md)' }}>
      <div style={{ color:'var(--text-muted)', marginBottom:3 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ fontFamily:"'DM Mono',monospace", fontWeight:600, color: p.color || 'var(--text-strong)' }}>
          {p.name}: {prefix}{Number(p.value).toLocaleString('en-IN')}
        </div>
      ))}
    </div>
  );
};

const ChartCard = ({ title, children, style }) => (
  <div className="card" style={{ padding:20, ...style }}>
    <div className="section-label" style={{ marginBottom:16 }}>{title}</div>
    {children}
  </div>
);

const AdminDashboard = () => {
  const { showToast } = useContext(ToastContext);
  const [tab,      setTab]      = useState('overview');
  const [stats,    setStats]    = useState(null);
  const [users,    setUsers]    = useState([]);
  const [listings, setListings] = useState([]);
  const [bids,     setBids]     = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [uSearch,  setUSearch]  = useState('');
  const [lSearch,  setLSearch]  = useState('');
  const [bSearch,  setBSearch]  = useState('');
  const [busy,     setBusy]     = useState({});

  const setBusyKey = (k, v) => setBusy(p => ({...p, [k]: v}));

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [s, u, l, b] = await Promise.all([
        get('/admin/stats'), get('/admin/users'), get('/admin/listings'), get('/admin/bids')
      ]);
      setStats(s); setUsers(u); setListings(l); setBids(b);
    } catch { showToast('Dashboard error', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const toggleStatus = async (uid, isActive) => {
    setBusyKey(`u${uid}`, true);
    try {
      const res = await fetch(`http://localhost:5003/api/admin/users/${uid}/status`, {
        method:'PUT', headers:{ Authorization:`Bearer ${localStorage.getItem('ae_token')}`, 'Content-Type':'application/json' }
      }).then(r => r.json());
      showToast(res.message, 'success');
      setUsers(p => p.map(u => u.id === uid ? {...u, is_active: res.is_active ? 1 : 0} : u));
    } catch { showToast('Action failed','error'); }
    finally { setBusyKey(`u${uid}`, false); }
  };

  const deleteUser = async (uid) => {
    if (!window.confirm('Delete this user permanently?')) return;
    try { await del(`/admin/users/${uid}`); showToast('User deleted','success'); setUsers(p => p.filter(u => u.id !== uid)); fetchAll(); }
    catch (err) { showToast(err.toString(),'error'); }
  };

  const toggleFeatured = async (lid, isFeatured) => {
    setBusyKey(`f${lid}`, true);
    try {
      const res = await fetch(`http://localhost:5003/api/admin/listings/${lid}/feature`, {
        method:'PUT', headers:{ Authorization:`Bearer ${localStorage.getItem('ae_token')}` }
      }).then(r => r.json());
      showToast(res.message,'success');
      setListings(p => p.map(l => l.id === lid ? {...l, is_featured: res.is_featured ? 1 : 0} : l));
    } catch { showToast('Action failed','error'); }
    finally { setBusyKey(`f${lid}`, false); }
  };

  const forceClose = async (lid) => {
    if (!window.confirm('Force-close this auction?')) return;
    try { await post(`/admin/listings/${lid}/close`); showToast('Auction closed','success'); fetchAll(); }
    catch (err) { showToast(err.toString(),'error'); }
  };

  const deleteListing = async (lid) => {
    if (!window.confirm('Delete this listing permanently?')) return;
    try { await del(`/admin/listings/${lid}`); showToast('Listing deleted','success'); setListings(p => p.filter(l => l.id !== lid)); fetchAll(); }
    catch (err) { showToast(err.toString(),'error'); }
  };

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'calc(100vh - 60px)' }}>
      <Spinner large />
    </div>
  );

  const fu = users.filter(u => u.username.toLowerCase().includes(uSearch.toLowerCase()) || u.email.toLowerCase().includes(uSearch.toLowerCase()));
  const fl = listings.filter(l => l.title.toLowerCase().includes(lSearch.toLowerCase()) || l.seller_name?.toLowerCase().includes(lSearch.toLowerCase()));
  const fb = bids.filter(b => b.bidder?.toLowerCase().includes(bSearch.toLowerCase()) || b.listing_title?.toLowerCase().includes(bSearch.toLowerCase()));

  const SCARDS = [
    { label:'Total Users',      value: stats.total_users,    sub:`${stats.active_users} active · ${stats.suspended_users} suspended`, accent:'var(--accent)', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
    { label:'Active Auctions',  value: stats.active_listings, sub:`${stats.ended_listings} ended · ${stats.featured_count} featured`, accent:'var(--success)', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 13L3 22h10l7-7"/><path d="m14.5 2.5 7 7-4.5 4.5-7-7z"/></svg> },
    { label:'Total Bids',       value: stats.total_bids,     sub:`Across all listings`, accent:'var(--violet)', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg> },
    { label:'Revenue',          value:`₹${(stats.total_revenue||0).toLocaleString('en-IN')}`, sub:'From closed auctions', accent:'#0891b2', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> },
  ];

  // Build combined monthly data for overlay chart
  const monthMap = {};
  (stats.monthly_bids || []).forEach(r => { monthMap[r.month] = { month: r.month, bids: r.count, listings: 0 }; });
  (stats.monthly_listings || []).forEach(r => {
    if (monthMap[r.month]) monthMap[r.month].listings = r.count;
    else monthMap[r.month] = { month: r.month, bids: 0, listings: r.count };
  });
  const combinedMonthly = Object.values(monthMap).sort((a, b) => a.month.localeCompare(b.month));

  return (
    <div className="container page-body">
      <div style={{ marginBottom:24 }}>
        <div className="section-label" style={{ marginBottom:4 }}>Administration</div>
        <h1 className="page-title">Control Panel</h1>
      </div>

      <div className="tabs">
        {['overview','users','listings','bids'].map(t => (
          <button key={t} className={`tab-btn${tab===t?' active':''}`} onClick={() => setTab(t)} style={{ textTransform:'capitalize' }}>{t}</button>
        ))}
      </div>

      {/* ── Overview ── */}
      {tab === 'overview' && (
        <div>
          {/* Stat cards */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:14, marginBottom:28 }}>
            {SCARDS.map(s => (
              <div key={s.label} className="stat-card" style={{ display:'flex', alignItems:'flex-start', gap:14 }}>
                <div style={{ width:40, height:40, borderRadius:'var(--radius)', background:'var(--bg-raised)', border:'1px solid var(--border-subtle)', display:'flex', alignItems:'center', justifyContent:'center', color: s.accent, flexShrink:0 }}>
                  {s.icon}
                </div>
                <div>
                  <div className="stat-val" style={{ color: s.accent }}>{s.value}</div>
                  <div className="stat-lbl">{s.label}</div>
                  <div className="stat-delta">{s.sub}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Row 1: Bid activity + Category breakdown */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(360px,1fr))', gap:20, marginBottom:20 }}>
            <ChartCard title="Monthly Bid Activity">
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={stats.monthly_bids}>
                  <defs>
                    <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="var(--accent)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="var(--accent)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false}/>
                  <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={10} tickLine={false}/>
                  <YAxis stroke="var(--text-muted)" fontSize={10} allowDecimals={false} tickLine={false} axisLine={false}/>
                  <Tooltip content={<ChartTip/>}/>
                  <Area type="monotone" dataKey="count" name="Bids" stroke="var(--accent)" strokeWidth={2} fill="url(#ag)"/>
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Listings by Category">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={stats.categories} barSize={18}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false}/>
                  <XAxis dataKey="category" stroke="var(--text-muted)" fontSize={9} tickLine={false}/>
                  <YAxis stroke="var(--text-muted)" fontSize={10} allowDecimals={false} tickLine={false} axisLine={false}/>
                  <Tooltip content={<ChartTip/>}/>
                  <Bar dataKey="count" name="Listings" radius={[4,4,0,0]}>
                    {stats.categories.map((_, i) => <Cell key={i} fill={C[i % C.length]}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* Row 2: Combined bids+listings trend + Category pie */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(360px,1fr))', gap:20, marginBottom:20 }}>
            <ChartCard title="Bids vs. New Listings (Monthly)">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={combinedMonthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false}/>
                  <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={10} tickLine={false}/>
                  <YAxis stroke="var(--text-muted)" fontSize={10} allowDecimals={false} tickLine={false} axisLine={false}/>
                  <Tooltip content={<ChartTip/>}/>
                  <Legend wrapperStyle={{ fontSize:'0.78rem', color:'var(--text-muted)' }}/>
                  <Line type="monotone" dataKey="bids"     name="Bids"     stroke="var(--accent)" strokeWidth={2} dot={false}/>
                  <Line type="monotone" dataKey="listings" name="Listings" stroke="var(--success)" strokeWidth={2} dot={false} strokeDasharray="5 3"/>
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Category Distribution">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={stats.categories} dataKey="count" nameKey="category" cx="50%" cy="50%" outerRadius={85} label={({ category, percent }) => `${category} ${(percent*100).toFixed(0)}%`} labelLine={false} fontSize={9}>
                    {stats.categories.map((_, i) => <Cell key={i} fill={C[i % C.length]}/>)}
                  </Pie>
                  <Tooltip formatter={(v, n) => [v, n]}/>
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* Top bidders */}
          {stats.top_bidders?.length > 0 && (
            <div className="card" style={{ padding:20 }}>
              <div className="section-label" style={{ marginBottom:16 }}>Top Bidders</div>
              <table className="data-table">
                <thead><tr><th>#</th><th>User</th><th>Bids Placed</th><th>Highest Bid</th></tr></thead>
                <tbody>
                  {stats.top_bidders.map((b, i) => (
                    <tr key={i}>
                      <td style={{ fontFamily:"'DM Mono',monospace", color:'var(--text-muted)' }}>{i+1}</td>
                      <td style={{ fontWeight:600, color:'var(--text-strong)' }}>{b.username}</td>
                      <td style={{ fontFamily:"'DM Mono',monospace" }}>{b.bid_count}</td>
                      <td style={{ fontFamily:"'DM Mono',monospace", color:'var(--accent)' }}>₹{b.max_bid.toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Users ── */}
      {tab === 'users' && (
        <div className="card" style={{ padding:20 }}>
          <div style={{ display:'flex', gap:10, marginBottom:16 }}>
            <input type="text" className="input-field" placeholder="Search users…" value={uSearch} onChange={e => setUSearch(e.target.value)} style={{ maxWidth:320 }} />
            <span style={{ alignSelf:'center', fontSize:'0.8rem', color:'var(--text-muted)' }}>{fu.length} of {users.length}</span>
          </div>
          <div style={{ overflowX:'auto' }}>
            <table className="data-table">
              <thead><tr><th>User</th><th>Email</th><th>Activity</th><th>Role</th><th>Status</th><th style={{ textAlign:'right' }}>Actions</th></tr></thead>
              <tbody>
                {fu.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <div style={{ width:30, height:30, borderRadius:'50%', background:'var(--accent-soft)', border:'1px solid var(--accent-border)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:'0.78rem', color:'var(--accent)', flexShrink:0 }}>
                          {u.username.charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontWeight:600, fontSize:'0.85rem', color:'var(--text-strong)' }}>{u.username}</span>
                      </div>
                    </td>
                    <td style={{ fontSize:'0.82rem' }}>{u.email}</td>
                    <td style={{ fontSize:'0.78rem', color:'var(--text-muted)', fontFamily:"'DM Mono',monospace" }}>
                      {u.listing_count}L · {u.bid_count}B · {u.auctions_won}W
                    </td>
                    <td>{u.is_admin ? <span className="badge badge-admin">Admin</span> : <span className="badge badge-user">User</span>}</td>
                    <td>
                      <span className={`badge ${u.is_active ? 'badge-live' : 'badge-suspended'}`}>
                        {u.is_active ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td>
                      {!u.is_admin && (
                        <div style={{ display:'flex', gap:6, justifyContent:'flex-end' }}>
                          <button onClick={() => toggleStatus(u.id, u.is_active)} disabled={busy[`u${u.id}`]}
                            className="btn btn-secondary btn-sm" style={{ fontSize:'0.75rem' }}>
                            {u.is_active ? 'Suspend' : 'Activate'}
                          </button>
                          <button onClick={() => deleteUser(u.id)} className="btn btn-danger btn-sm" style={{ fontSize:'0.75rem' }}>
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Listings ── */}
      {tab === 'listings' && (
        <div className="card" style={{ padding:20 }}>
          <div style={{ display:'flex', gap:10, marginBottom:16 }}>
            <input type="text" className="input-field" placeholder="Search listings…" value={lSearch} onChange={e => setLSearch(e.target.value)} style={{ maxWidth:320 }} />
            <span style={{ alignSelf:'center', fontSize:'0.8rem', color:'var(--text-muted)' }}>{fl.length} of {listings.length}</span>
          </div>
          <div style={{ overflowX:'auto' }}>
            <table className="data-table">
              <thead><tr><th>Title</th><th>Seller</th><th>Bids</th><th>Current</th><th>Featured</th><th>Status</th><th style={{ textAlign:'right' }}>Actions</th></tr></thead>
              <tbody>
                {fl.map(l => (
                  <tr key={l.id}>
                    <td>
                      <div style={{ fontWeight:600, fontSize:'0.84rem', color:'var(--text-strong)' }}>{l.title}</div>
                      <div style={{ fontSize:'0.72rem', color:'var(--text-muted)', fontFamily:"'DM Mono',monospace", marginTop:1 }}>
                        {l.lot_number || `LOT-${String(l.id).padStart(4,'0')}`}
                      </div>
                    </td>
                    <td style={{ fontSize:'0.82rem' }}>{l.seller_name}</td>
                    <td style={{ fontFamily:"'DM Mono',monospace", fontSize:'0.85rem' }}>{l.bid_count}</td>
                    <td style={{ fontFamily:"'DM Mono',monospace", fontSize:'0.85rem', color:'var(--accent)' }}>
                      ₹{(l.current_price||l.starting_value).toLocaleString('en-IN')}
                    </td>
                    <td>
                      <button onClick={() => toggleFeatured(l.id, l.is_featured)} disabled={busy[`f${l.id}`]}
                        style={{ background:'none', border:'none', cursor:'pointer', fontSize:'1rem', color: l.is_featured ? 'var(--accent)' : 'var(--text-muted)' }}
                        title={l.is_featured ? 'Remove from featured' : 'Add to featured'}>
                        {l.is_featured
                          ? <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                          : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                        }
                      </button>
                    </td>
                    <td>{l.auction_active ? <span className="badge badge-live">Live</span> : <span className="badge badge-ended">Ended</span>}</td>
                    <td>
                      <div style={{ display:'flex', gap:6, justifyContent:'flex-end' }}>
                        {l.auction_active === 1 && (
                          <button onClick={() => forceClose(l.id)} className="btn btn-secondary btn-sm" style={{ fontSize:'0.75rem' }}>Close</button>
                        )}
                        <button onClick={() => deleteListing(l.id)} className="btn btn-danger btn-sm" style={{ fontSize:'0.75rem' }}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Bids ── */}
      {tab === 'bids' && (
        <div className="card" style={{ padding:20 }}>
          <div style={{ display:'flex', gap:10, marginBottom:16 }}>
            <input type="text" className="input-field" placeholder="Search by bidder or listing…" value={bSearch} onChange={e => setBSearch(e.target.value)} style={{ maxWidth:320 }} />
            <span style={{ alignSelf:'center', fontSize:'0.8rem', color:'var(--text-muted)' }}>{fb.length} records</span>
          </div>
          <div style={{ overflowX:'auto' }}>
            <table className="data-table">
              <thead><tr><th>Bidder</th><th>Listing</th><th>Amount</th><th>Time</th><th>Auction</th></tr></thead>
              <tbody>
                {fb.map(b => (
                  <tr key={b.id}>
                    <td>
                      <div style={{ fontWeight:600, fontSize:'0.84rem' }}>{b.bidder}</div>
                      <div style={{ fontSize:'0.72rem', color:'var(--text-muted)' }}>{b.bidder_email}</div>
                    </td>
                    <td style={{ fontSize:'0.82rem', maxWidth:200 }}>{b.listing_title}</td>
                    <td style={{ fontFamily:"'DM Mono',monospace", fontSize:'0.88rem', fontWeight:500, color:'var(--accent)' }}>
                      ₹{b.value.toLocaleString('en-IN')}
                    </td>
                    <td style={{ fontSize:'0.78rem', color:'var(--text-muted)' }}>{new Date(b.created_at).toLocaleString('en-IN')}</td>
                    <td>{b.auction_active ? <span className="badge badge-live">Live</span> : <span className="badge badge-ended">Settled</span>}</td>
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
