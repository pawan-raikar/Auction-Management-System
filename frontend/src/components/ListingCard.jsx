import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import CountdownTimer from './CountdownTimer';
import Badge from './Badge';
import { AuthContext } from '../context/AuthContext';
import { ToastContext } from '../context/ToastContext';
import { post } from '../api';

const ListingCard = ({ listing, onWatchToggle }) => {
  const { user } = useContext(AuthContext);
  const { showToast } = useContext(ToastContext);
  const navigate = useNavigate();

  const handleWatchToggle = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) {
      showToast("Please login to add to watchlist", "error");
      navigate('/login');
      return;
    }
    
    try {
      const res = await post(`/listings/${listing.id}/watch`);
      showToast(res.message, "success");
      if (onWatchToggle) {
        onWatchToggle(listing.id);
      }
    } catch (err) {
      showToast(err.toString(), "error");
    }
  };

  const isEnded = listing.auction_active === 0 || listing.time_left_seconds <= 0;

  return (
    <Link to={`/listings/${listing.id}`} style={{ display: 'block', position: 'relative' }}>
      <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        
        {/* Image Container */}
        <div style={{ 
          height: '200px', 
          backgroundColor: 'var(--bg-primary)',
          backgroundImage: listing.image ? `url(http://localhost:5000/media/images/${listing.image})` : 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          position: 'relative'
        }}>
          {isEnded && (
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', zIndex: 1
            }}>
              <span style={{ 
                color: 'white', fontWeight: 'bold', fontSize: '1.5rem', 
                border: '2px solid white', padding: '8px 16px', borderRadius: '8px',
                transform: 'rotate(-10deg)'
              }}>
                ENDED
              </span>
            </div>
          )}
          
          <div style={{ position: 'absolute', top: '10px', left: '10px', zIndex: 2 }}>
            <Badge type="active">{listing.category}</Badge>
          </div>
          
          <button 
            onClick={handleWatchToggle}
            style={{ 
              position: 'absolute', top: '10px', right: '10px', zIndex: 2,
              background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%',
              width: '36px', height: '36px', display: 'flex',
              alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              color: listing.is_watched ? 'var(--danger)' : 'white',
              backdropFilter: 'blur(4px)', transition: 'transform 0.2s'
            }}
            onMouseOver={e => e.currentTarget.style.transform = 'scale(1.1)'}
            onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill={listing.is_watched ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
          </button>
        </div>

        {/* Content Container */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', flex: 1 }}>
          <h3 style={{ 
            fontSize: '1.1rem', margin: '0 0 10px 0', 
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', 
            overflow: 'hidden', height: '3.2em', color: 'var(--text-primary)'
          }}>
            {listing.title}
          </h3>
          
          <div style={{ marginTop: 'auto' }}>
            <div className="flex-between" style={{ marginBottom: '12px' }}>
              <div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Current Price</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--success)' }}>
                  ₹{listing.current_price?.toLocaleString() || listing.starting_value?.toLocaleString()}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Bids</div>
                <div style={{ fontWeight: '500' }}>{listing.bid_count}</div>
              </div>
            </div>
            
            <div style={{ 
              padding: '10px', backgroundColor: 'var(--bg-primary)', 
              borderRadius: '8px', display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', fontSize: '0.9rem'
            }}>
              <span style={{ color: 'var(--text-secondary)' }}>Time left:</span>
              <CountdownTimer endTime={listing.end_time} />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default ListingCard;
