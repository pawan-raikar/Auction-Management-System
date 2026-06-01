import React, { useState, useEffect, useContext } from 'react';
import { get } from '../api';
import { ToastContext } from '../context/ToastContext';
import ListingCard from '../components/ListingCard';
import Spinner from '../components/Spinner';

const Watchlist = () => {
  const { showToast } = useContext(ToastContext);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchWatchlist = async () => {
    try {
      const data = await get('/watchlist/');
      setListings(data);
    } catch (err) {
      showToast(err.toString(), "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWatchlist();
  }, []);

  const handleWatchToggle = (id) => {
    // Remove from UI immediately when unwatched
    setListings(prev => prev.filter(l => l.id !== id));
  };

  return (
    <div className="container" style={{ padding: '40px 20px' }}>
      <h1 className="page-title" style={{ marginBottom: '30px' }}>My Watchlist</h1>
      
      {loading ? (
        <div className="flex-center" style={{ height: '200px' }}><Spinner large /></div>
      ) : listings.length > 0 ? (
        <div className="grid-cards">
          {listings.map(listing => (
            <ListingCard 
              key={listing.id} 
              listing={listing} 
              onWatchToggle={handleWatchToggle} 
            />
          ))}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '20px', opacity: 0.5 }}>
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
          </svg>
          <h3 style={{ fontSize: '1.5rem', marginBottom: '10px' }}>Your watchlist is empty</h3>
          <p>Find items you love and add them to your watchlist to keep track of them.</p>
        </div>
      )}
    </div>
  );
};

export default Watchlist;
