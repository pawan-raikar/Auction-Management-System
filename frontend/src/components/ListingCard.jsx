import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ToastContext } from '../context/ToastContext';
import { post, MEDIA_BASE } from '../api';
import CountdownTimer from './CountdownTimer';

const PlaceholderIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
    <circle cx="8.5" cy="8.5" r="1.5"/>
    <polyline points="21 15 16 10 5 21"/>
  </svg>
);

const HeartIcon = ({ filled }) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
  </svg>
);

const ListingCard = ({ listing, onWatchToggle }) => {
  const { user } = useContext(AuthContext);
  const { showToast } = useContext(ToastContext);
  const navigate = useNavigate();

  const isEnded = listing.auction_active === 0 || listing.time_left_seconds <= 0;

  const handleWatch = async (e) => {
    e.preventDefault(); e.stopPropagation();
    if (!user) { showToast('Sign in to save items', 'error'); navigate('/login'); return; }
    try {
      const res = await post(`/listings/${listing.id}/watch`);
      showToast(res.message, 'success');
      if (onWatchToggle) onWatchToggle(listing.id);
    } catch (err) { showToast(err.toString(), 'error'); }
  };

  return (
    <Link to={`/listings/${listing.id}`} className="listing-card">
      {/* Image */}
      <div className="lc-img">
        {listing.image
          ? <img src={`${MEDIA_BASE}/${listing.image}`} alt={listing.title} loading="lazy" />
          : <div className="lc-placeholder" style={{ background: 'var(--bg-raised)' }}><PlaceholderIcon /></div>
        }

        {!isEnded && (
          <div className="lc-quick-bid">
            <span className="btn btn-primary">Place Bid</span>
          </div>
        )}

        {isEnded && (
          <div className="lc-ended-overlay">
            <span className="lc-ended-label">Closed</span>
          </div>
        )}

        <div className="lc-badges">
          {!isEnded && <span className="badge badge-live"><span className="live-dot" />Live</span>}
          {isEnded && <span className="badge badge-ended">Ended</span>}
          {listing.is_trending && !isEnded && <span className="badge badge-trending">Hot</span>}
          {listing.is_featured && <span className="badge badge-featured">Featured</span>}
        </div>

        <button onClick={handleWatch} className={`lc-watch${listing.is_watched ? ' saved' : ''}`} title={listing.is_watched ? 'Remove from watchlist' : 'Add to watchlist'}>
          <HeartIcon filled={listing.is_watched} />
        </button>
      </div>

      {/* Body */}
      <div className="lc-body">
        <div className="lc-lot">{listing.lot_number || `LOT-${String(listing.id).padStart(4,'0')}`}</div>
        <div className="lc-title">{listing.title}</div>
        <div className="lc-seller">by {listing.seller_name || 'Seller'}</div>

        <div style={{ marginTop: 'auto' }}>
          <div className="lc-price-row">
            <div>
              <div style={{ fontSize:'0.7rem', color:'var(--text-muted)', marginBottom:2 }}>Current Bid</div>
              <div className="lc-price">
                &#x20B9;{(listing.current_price ?? listing.starting_value).toLocaleString('en-IN')}
              </div>
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontSize:'0.7rem', color:'var(--text-muted)', marginBottom:2 }}>Bids</div>
              <div style={{ fontFamily:"'DM Mono',monospace", fontSize:'0.95rem', fontWeight:500, color:'var(--text-strong)' }}>{listing.bid_count}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="lc-footer">
        <span className="lc-time-label">{isEnded ? 'Status' : 'Ends'}</span>
        <CountdownTimer endTime={listing.end_time} isActive={!isEnded} />
      </div>
    </Link>
  );
};

export default ListingCard;
