import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { get, post } from '../api';
import { AuthContext } from '../context/AuthContext';
import { ToastContext } from '../context/ToastContext';
import Spinner from '../components/Spinner';
import CountdownTimer from '../components/CountdownTimer';
import Badge from '../components/Badge';

const ListingDetail = () => {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const { showToast } = useContext(ToastContext);
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bidAmount, setBidAmount] = useState('');
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchDetail = async () => {
    try {
      const res = await get(`/listings/${id}`);
      setData(res);
      const minBid = res.listing.current_price + (res.bids.length > 0 ? 1 : 0);
      setBidAmount(minBid);
    } catch (err) {
      showToast(err.toString(), "error");
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const handleBid = async (e) => {
    e.preventDefault();
    if (!user) {
      showToast("Please login to place a bid", "error");
      navigate('/login');
      return;
    }
    setSubmitting(true);
    try {
      const res = await post(`/listings/${id}/bid`, { amount: bidAmount });
      showToast(res.message, "success");
      fetchDetail();
    } catch (err) {
      showToast(err.toString(), "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!user) {
      showToast("Please login to comment", "error");
      return;
    }
    if (!commentText.trim()) return;
    
    setSubmitting(true);
    try {
      await post(`/listings/${id}/comments`, { comment: commentText });
      showToast("Comment added", "success");
      setCommentText('');
      fetchDetail();
    } catch (err) {
      showToast(err.toString(), "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleWatchToggle = async () => {
    if (!user) {
      showToast("Please login to watch", "error");
      return;
    }
    try {
      const res = await post(`/listings/${id}/watch`);
      showToast(res.message, "success");
      fetchDetail();
    } catch (err) {
      showToast(err.toString(), "error");
    }
  };

  const handleCloseAuction = async () => {
    if (!window.confirm("Are you sure you want to close this auction early?")) return;
    try {
      const res = await post(`/listings/${id}/close`);
      showToast(res.message, "success");
      fetchDetail();
    } catch (err) {
      showToast(err.toString(), "error");
    }
  };

  if (loading) return <div className="flex-center" style={{ height: 'calc(100vh - 70px)' }}><Spinner large /></div>;
  if (!data) return null;

  const { listing, bids, comments } = data;
  const isOwner = user?.id === listing.user_id;
  const isActive = listing.auction_active === 1 && listing.time_left_seconds > 0;
  
  return (
    <div className="container" style={{ padding: '40px 20px' }}>
      
      {!isActive && listing.winner_id && (
        <div className="glass" style={{ padding: '15px 20px', borderRadius: 'var(--radius)', marginBottom: '20px', backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--success)', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
          <strong style={{ fontSize: '1.1rem' }}>Auction Ended. {user?.id === listing.winner_id ? "You won this auction!" : "Winner selected."}</strong>
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '40px' }}>
        {/* Left Column */}
        <div style={{ flex: '1 1 60%', minWidth: '300px' }}>
          <div style={{
            width: '100%', height: '400px', borderRadius: 'var(--radius-lg)', marginBottom: '20px',
            backgroundColor: 'var(--bg-card)',
            backgroundImage: listing.image ? `url(http://localhost:5000/media/images/${listing.image})` : 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            backgroundSize: 'cover', backgroundPosition: 'center'
          }} />
          
          <div style={{ marginBottom: '20px' }}>
            <Badge type={isActive ? 'active' : 'ended'}>{listing.category}</Badge>
            <h1 style={{ fontSize: '2.5rem', margin: '10px 0', color: 'var(--text-primary)' }}>{listing.title}</h1>
            <p style={{ color: 'var(--text-secondary)', display: 'flex', gap: '20px', fontSize: '0.9rem' }}>
              <span>Sold by: <strong>{listing.seller_name}</strong></span>
              <span>Watchers: <strong>{listing.watcher_count}</strong></span>
            </p>
          </div>
          
          <div className="card glass" style={{ padding: '30px', marginBottom: '30px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '15px' }}>Description</h3>
            <p style={{ color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{listing.description}</p>
          </div>
          
          {/* Comments Section */}
          <div className="card" style={{ padding: '30px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Comments ({comments.length})</h3>
            
            <form onSubmit={handleComment} style={{ marginBottom: '30px', display: 'flex', gap: '10px' }}>
              <input 
                type="text" className="input-field" placeholder="Ask a question or leave a comment..."
                value={commentText} onChange={e => setCommentText(e.target.value)} required
              />
              <button type="submit" className="btn-primary" disabled={submitting || !user}>Post</button>
            </form>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {comments.map(c => (
                <div key={c.id} style={{ display: 'flex', gap: '15px' }}>
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--bg-glass)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold'
                  }}>
                    {c.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                      <strong style={{ color: 'var(--text-primary)' }}>{c.username}</strong>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(c.created_at).toLocaleString()}</span>
                    </div>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>{c.comment}</p>
                  </div>
                </div>
              ))}
              {comments.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No comments yet.</p>}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div style={{ flex: '1 1 30%', minWidth: '300px' }}>
          <div className="card" style={{ padding: '30px', position: 'sticky', top: '100px' }}>
            
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
              <div style={{ color: 'var(--text-secondary)', marginBottom: '5px' }}>Current Bid</div>
              <div style={{ fontSize: '3rem', fontWeight: '800', color: 'var(--success)', lineHeight: 1 }}>
                ₹{listing.current_price.toLocaleString()}
              </div>
              <div style={{ color: 'var(--text-muted)', marginTop: '5px' }}>
                {bids.length} bid{bids.length !== 1 ? 's' : ''} placed
              </div>
            </div>
            
            <div style={{ padding: '15px', backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius)', marginBottom: '20px', textAlign: 'center' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '5px' }}>Time Left</div>
              <div style={{ fontSize: '1.5rem' }}>
                <CountdownTimer endTime={listing.end_time} onExpire={fetchDetail} />
              </div>
            </div>

            <form onSubmit={handleBid} style={{ marginBottom: '20px' }}>
              <div className="form-group" style={{ marginBottom: '10px' }}>
                <input 
                  type="number" className="input-field" 
                  style={{ fontSize: '1.2rem', textAlign: 'center', padding: '15px' }}
                  value={bidAmount} onChange={e => setBidAmount(e.target.value)}
                  min={listing.current_price + (bids.length > 0 ? 1 : 0)} required
                  disabled={!isActive || isOwner}
                />
              </div>
              <button 
                type="submit" className="btn-primary" 
                style={{ width: '100%', padding: '15px', fontSize: '1.1rem' }} 
                disabled={!isActive || isOwner || submitting}
              >
                {!isActive ? 'Auction Closed' : isOwner ? 'You own this listing' : 'Place Bid'}
              </button>
            </form>

            <button 
              onClick={handleWatchToggle} className="btn-secondary" 
              style={{ width: '100%', marginBottom: '10px' }}
            >
              {listing.is_watched ? 'Remove from Watchlist' : 'Add to Watchlist'}
            </button>
            
            {isOwner && isActive && (
              <button 
                onClick={handleCloseAuction} className="btn-danger" 
                style={{ width: '100%', marginTop: '10px' }}
              >
                Close Auction Early
              </button>
            )}

            <hr style={{ border: 'none', borderTop: '1px solid var(--border-glass)', margin: '30px 0' }} />
            
            <h3 style={{ marginTop: 0, marginBottom: '15px' }}>Bid History</h3>
            <div style={{ maxHeight: '250px', overflowY: 'auto', paddingRight: '10px' }}>
              {bids.length > 0 ? bids.map((b, i) => (
                <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: i !== bids.length-1 ? '1px solid var(--border-glass)' : 'none' }}>
                  <div>
                    <div style={{ color: 'var(--text-primary)', fontWeight: '500' }}>{b.username}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{new Date(b.created_at).toLocaleString()}</div>
                  </div>
                  <div style={{ fontWeight: 'bold', color: 'var(--success)' }}>
                    ₹{b.value.toLocaleString()}
                  </div>
                </div>
              )) : (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>No bids yet. Be the first!</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ListingDetail;
