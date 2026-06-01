import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { get, post, MEDIA_BASE } from '../api';
import { AuthContext } from '../context/AuthContext';
import { ToastContext } from '../context/ToastContext';
import Spinner from '../components/Spinner';
import CountdownTimer from '../components/CountdownTimer';

function calcIncs(price) {
  if (price >= 500000) return [10000, 25000, 50000, 100000];
  if (price >= 100000) return [2000,   5000, 10000,  25000];
  if (price >= 50000)  return [1000,   2000,  5000,  10000];
  if (price >= 10000)  return [500,    1000,  2000,   5000];
  return [100, 250, 500, 1000];
}

const fmt = (n) => Number(n).toLocaleString('en-IN');

const ListingDetail = () => {
  const { id }      = useParams();
  const { user }    = useContext(AuthContext);
  const { showToast } = useContext(ToastContext);
  const navigate    = useNavigate();
  const priceRef    = useRef(null);

  const [data,        setData]        = useState(null);
  const [similar,     setSimilar]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [bidAmount,   setBidAmount]   = useState('');
  const [commentText, setCommentText] = useState('');
  const [bidding,     setBidding]     = useState(false);
  const [commenting,  setCommenting]  = useState(false);

  const [livePrice,    setLivePrice]    = useState(null);
  const [liveBidCount, setLiveBidCount] = useState(null);
  const [liveFeed,     setLiveFeed]     = useState([]);
  const [biddingWar,   setBiddingWar]   = useState(false);
  const [watchers,     setWatchers]     = useState(null);
  const prevPrice     = useRef(null);
  const prevTopBidder = useRef(null);

  const flashPrice = useCallback(() => {
    if (!priceRef.current) return;
    priceRef.current.classList.remove('flash');
    void priceRef.current.offsetWidth;
    priceRef.current.classList.add('flash');
  }, []);

  const fetchDetail = useCallback(async () => {
    try {
      const res = await get(`/listings/${id}`);
      setData(res);
      setSimilar(res.similar || []);
      setLivePrice(res.listing.current_price);
      setLiveBidCount(res.bids.length);
      setLiveFeed(res.bids.slice(0, 10));
      prevPrice.current = res.listing.current_price;
      setBidAmount(res.listing.current_price + (res.bids.length ? 100 : 0));
      if (!watchers) setWatchers(res.listing.watcher_count);
    } catch (err) {
      showToast(err.toString(), 'error');
      navigate('/');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  useEffect(() => {
    if (!data) return;
    const { listing } = data;
    if (listing.auction_active !== 1 || listing.time_left_seconds <= 0) return;

    const poll = setInterval(async () => {
      try {
        const live = await get(`/listings/${id}/live`);
        if (live.current_price > (prevPrice.current || 0)) {
          const wasTop = user && prevTopBidder.current === user.id;
          const isTop  = live.top_bidder_id === user?.id;
          if (wasTop && !isTop) showToast(`Outbid by ${live.top_bidder} — ₹${fmt(live.current_price)}`, 'error');
          else if (!isTop)      showToast(`New bid: ₹${fmt(live.current_price)} by ${live.top_bidder}`, 'info');
          setLivePrice(live.current_price);
          setLiveBidCount(live.bid_count);
          setLiveFeed(live.recent_bids);
          flashPrice();
          prevPrice.current = live.current_price;
          prevTopBidder.current = live.top_bidder_id;
          setBidAmount(live.current_price + 100);
        }
        setBiddingWar(live.bidding_war);
        if (!live.auction_active) fetchDetail();
      } catch (_) {}
    }, 2000);

    return () => clearInterval(poll);
  }, [data, user, id, flashPrice]);

  const handleBid = async (e) => {
    e.preventDefault();
    if (!user) { showToast('Sign in to place a bid', 'error'); navigate('/login'); return; }
    setBidding(true);
    try {
      const amt = parseFloat(bidAmount);
      await post(`/listings/${id}/bid`, { amount: amt });
      showToast(`Bid of ₹${fmt(amt)} placed`, 'success');
      prevTopBidder.current = user.id;
      flashPrice();
      fetchDetail();
    } catch (err) { showToast(err.toString(), 'error'); }
    finally { setBidding(false); }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!user) { showToast('Sign in to comment', 'error'); return; }
    if (!commentText.trim()) return;
    setCommenting(true);
    try { await post(`/listings/${id}/comments`, { comment: commentText }); setCommentText(''); fetchDetail(); }
    catch (err) { showToast(err.toString(), 'error'); }
    finally { setCommenting(false); }
  };

  const handleWatch = async () => {
    if (!user) { showToast('Sign in to save', 'error'); return; }
    try { const res = await post(`/listings/${id}/watch`); showToast(res.message, 'success'); fetchDetail(); }
    catch (err) { showToast(err.toString(), 'error'); }
  };

  const handleClose = async () => {
    if (!window.confirm('Close this auction? This action cannot be undone.')) return;
    try { await post(`/listings/${id}/close`); showToast('Auction closed', 'success'); fetchDetail(); }
    catch (err) { showToast(err.toString(), 'error'); }
  };

  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'calc(100vh - 60px)' }}><Spinner large /></div>;
  if (!data) return null;

  const { listing, bids, comments } = data;
  const cp      = livePrice ?? listing.current_price;
  const bc      = liveBidCount ?? bids.length;
  const isOwner = user?.id === listing.user_id;
  const isLive  = listing.auction_active === 1 && listing.time_left_seconds > 0;
  const incs    = calcIncs(cp);
  const feed    = liveFeed.length ? liveFeed : bids.slice(0, 10);

  return (
    <div className="container" style={{ paddingTop:28, paddingBottom:64 }}>

      {!isLive && listing.winner_id && (
        <div className="winner-banner">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          {user?.id === listing.winner_id ? 'You won this auction.' : 'This auction has ended.'}
        </div>
      )}

      {biddingWar && isLive && (
        <div className="bid-war-banner">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
          <div>
            <div className="bid-war-title">Active Bidding</div>
            <div className="bid-war-sub">Multiple bidders competing — prices are rising</div>
          </div>
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'1fr 340px', gap:28, alignItems:'start' }}>

        {/* ── Left ── */}
        <div>
          {/* Image */}
          <div style={{ width:'100%', aspectRatio:'16/9', maxHeight:460, borderRadius:'var(--radius-lg)', overflow:'hidden', background:'var(--bg-raised)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:24, position:'relative' }}>
            {listing.image
              ? <img src={`${MEDIA_BASE}/${listing.image}`} alt={listing.title} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
              : <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ opacity:0.2 }}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            }
            {isLive && watchers && (
              <div style={{ position:'absolute', bottom:12, left:12, background:'rgba(0,0,0,0.55)', backdropFilter:'blur(6px)', color:'white', padding:'4px 10px', borderRadius:100, fontSize:'0.75rem', fontWeight:600, display:'flex', alignItems:'center', gap:6 }}>
                <span className="live-dot" />
                {watchers} watching
              </div>
            )}
          </div>

          {/* Header */}
          <div style={{ marginBottom:20 }}>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:10 }}>
              <span className="badge badge-cat">{listing.category}</span>
              {isLive ? <span className="badge badge-live"><span className="live-dot"/>Live</span> : <span className="badge badge-ended">Ended</span>}
              {listing.is_trending && <span className="badge badge-trending">High Activity</span>}
              {listing.condition && <span className="badge badge-condition">{listing.condition}</span>}
            </div>
            <div style={{ fontFamily:"'DM Mono',monospace", fontSize:'0.7rem', color:'var(--text-muted)', marginBottom:6, letterSpacing:'0.06em' }}>{listing.lot_number}</div>
            <h1 style={{ fontSize:'1.6rem', fontWeight:700, letterSpacing:'-0.4px', lineHeight:1.25, color:'var(--text-strong)', marginBottom:8 }}>{listing.title}</h1>
            <div style={{ fontSize:'0.84rem', color:'var(--text-soft)' }}>
              Sold by <strong style={{ color:'var(--text-base)' }}>{listing.seller_name}</strong>
              <span style={{ color:'var(--text-muted)' }}> · {listing.watcher_count} watching</span>
            </div>
          </div>

          {/* Description */}
          <div className="card" style={{ padding:24, marginBottom:20 }}>
            <div className="section-label" style={{ marginBottom:12 }}>Item Details</div>
            <p style={{ fontSize:'0.9rem', color:'var(--text-base)', lineHeight:1.75, whiteSpace:'pre-wrap' }}>{listing.description}</p>

            {listing.reserve_price && (
              <div style={{ marginTop:18, padding:'10px 14px', background:'var(--bg-raised)', borderRadius:'var(--radius-sm)', border:'1px solid var(--border-subtle)', display:'flex', gap:10, alignItems:'center', fontSize:'0.82rem' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                <span style={{ color:'var(--text-soft)' }}>
                  Reserve price set ·{' '}
                  {listing.reserve_met
                    ? <span style={{ color:'var(--success)', fontWeight:600 }}>Reserve met</span>
                    : <span style={{ color:'var(--warning)', fontWeight:600 }}>Reserve not yet met</span>}
                </span>
              </div>
            )}
          </div>

          {/* Comments */}
          <div className="card" style={{ padding:24 }}>
            <div className="section-label" style={{ marginBottom:16 }}>Questions & Comments ({comments.length})</div>

            <form onSubmit={handleComment} style={{ display:'flex', gap:8, marginBottom:24 }}>
              <input type="text" className="input-field" placeholder={user ? 'Ask a question or leave a comment…' : 'Sign in to comment'}
                value={commentText} onChange={e => setCommentText(e.target.value)} disabled={!user} style={{ flex:1 }} />
              <button type="submit" className="btn btn-primary" disabled={commenting || !user || !commentText.trim()}>Post</button>
            </form>

            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              {comments.length === 0 && <p style={{ fontSize:'0.84rem', color:'var(--text-muted)', textAlign:'center', padding:'16px 0' }}>No questions yet.</p>}
              {comments.map(c => (
                <div key={c.id} style={{ display:'flex', gap:12 }}>
                  <div style={{ width:32, height:32, borderRadius:'50%', background:'var(--accent-soft)', border:'1px solid var(--accent-border)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:'0.8rem', color:'var(--accent)', flexShrink:0 }}>
                    {c.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ display:'flex', gap:8, alignItems:'baseline', marginBottom:3 }}>
                      <span style={{ fontWeight:600, fontSize:'0.84rem', color:'var(--text-strong)' }}>{c.username}</span>
                      <span style={{ fontSize:'0.72rem', color:'var(--text-muted)' }}>{new Date(c.created_at).toLocaleString('en-IN')}</span>
                    </div>
                    <p style={{ fontSize:'0.875rem', color:'var(--text-base)' }}>{c.comment}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right sidebar ──────────────────────────────────────────── */}
        <div style={{ position:'sticky', top:76 }}>

          {/* Bid panel */}
          <div className="bid-panel" style={{ marginBottom:12 }}>

            {/* Price header */}
            <div className="bid-panel-header">
              <div className="section-label" style={{ marginBottom:6 }}>Current Bid</div>
              <div ref={priceRef} className="bid-price">
                &#x20B9;{fmt(cp)}
              </div>
              <div className="bid-meta-row">
                <span className="bid-count-label">{bc} bid{bc !== 1 ? 's' : ''}</span>
                {listing.has_reserve && (
                  <span className={`badge ${listing.reserve_met ? 'badge-reserve-met' : 'badge-reserve-unmet'}`}>
                    {listing.reserve_met ? 'Reserve met' : 'Reserve not met'}
                  </span>
                )}
              </div>
            </div>

            {/* Countdown */}
            {isLive && (
              <div style={{ padding:'14px 20px', borderBottom:'1px solid var(--border-subtle)', background:'var(--bg-raised)' }}>
                <div className="section-label" style={{ marginBottom:10, textAlign:'center' }}>Time Remaining</div>
                <div style={{ display:'flex', justifyContent:'center' }}>
                  <CountdownTimer endTime={listing.end_time} isActive onExpire={fetchDetail} showBlocks />
                </div>
              </div>
            )}

            {/* Bid form */}
            <div className="bid-panel-body">
              {isLive && !isOwner ? (
                <form onSubmit={handleBid}>
                  <div className="form-group" style={{ marginBottom:10 }}>
                    <label>Your bid (INR)</label>
                    <input type="number" className="input-field bid-input" value={bidAmount}
                      onChange={e => setBidAmount(e.target.value)}
                      min={cp + 1} step="1"
                      style={{ fontFamily:"'DM Mono',monospace", fontSize:'1.05rem', fontWeight:500, textAlign:'right' }} />
                  </div>
                  <div style={{ marginBottom:14 }}>
                    <div className="section-label" style={{ marginBottom:8 }}>Quick increment</div>
                    <div className="bid-incs">
                      {incs.map(inc => (
                        <button key={inc} type="button" className="bid-inc"
                          onClick={() => setBidAmount(v => parseFloat(v || cp) + inc)}>
                          +{inc >= 1000 ? `${(inc/1000).toLocaleString('en-IN')}k` : inc}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={bidding}>
                    {bidding ? 'Placing bid…' : 'Place Bid'}
                  </button>
                  <div style={{ marginTop:8, textAlign:'center', fontSize:'0.73rem', color:'var(--text-muted)' }}>
                    Minimum bid: &#x20B9;{fmt(cp + 1)}
                  </div>
                </form>
              ) : isOwner ? (
                <div style={{ textAlign:'center', color:'var(--text-muted)', fontSize:'0.84rem', padding:'8px 0' }}>You own this listing</div>
              ) : (
                <div style={{ textAlign:'center', color:'var(--text-muted)', fontSize:'0.84rem', padding:'8px 0' }}>Auction closed</div>
              )}
            </div>

            {/* Actions */}
            <div className="bid-panel-footer">
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={handleWatch} className="btn btn-secondary" style={{ flex:1, fontSize:'0.82rem' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill={listing.is_watched ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                  {listing.is_watched ? 'Saved' : 'Save'}
                </button>
                {isOwner && isLive && (
                  <button onClick={handleClose} className="btn btn-danger" style={{ flex:1, fontSize:'0.82rem' }}>
                    Close Auction
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Bid feed */}
          <div className="card" style={{ padding:16 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
              <div className="section-label">Bid History</div>
              {isLive && (
                <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:'0.72rem', fontWeight:700, color:'var(--success)', textTransform:'uppercase', letterSpacing:'0.06em' }}>
                  <span className="live-dot" />Live
                </div>
              )}
            </div>
            <div className="bid-feed" style={{ maxHeight:260, overflowY:'auto' }}>
              {feed.length === 0 && (
                <div style={{ textAlign:'center', color:'var(--text-muted)', fontSize:'0.82rem', padding:'16px 0' }}>No bids yet</div>
              )}
              {feed.map((b, i) => (
                <div key={b.id || i} className={`bid-feed-item${i === 0 ? ' top' : ''}`}>
                  <div>
                    <div className="bfi-user">{b.username}</div>
                    <div className="bfi-time">{new Date(b.created_at).toLocaleString('en-IN')}</div>
                  </div>
                  <div className={`bfi-amount${i === 0 ? ' top' : ''}`}>&#x20B9;{fmt(b.value)}</div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* ── Similar Listings ─────────────────────────────────────────── */}
      {similar.length > 0 && (
        <div style={{ marginTop: 40 }}>
          <div style={{ marginBottom: 16 }}>
            <div className="section-label" style={{ marginBottom: 4 }}>More in {listing.category}</div>
            <h3 className="t-heading-md">Similar Listings</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
            {similar.map(s => (
              <Link key={s.id} to={`/listings/${s.id}`}
                style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', transition: 'border-color 0.15s, box-shadow 0.15s', color: 'inherit' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-border)'; e.currentTarget.style.boxShadow = 'var(--shadow-lg)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.boxShadow = 'none'; }}>
                <div style={{ height: 140, background: 'var(--bg-raised)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ opacity: 0.2 }}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                </div>
                <div style={{ padding: '12px 14px' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-strong)', marginBottom: 4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{s.title}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.9rem', fontWeight: 500, color: 'var(--accent)' }}>₹{s.current_price.toLocaleString('en-IN')}</div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{s.bid_count} bid{s.bid_count !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ListingDetail;
