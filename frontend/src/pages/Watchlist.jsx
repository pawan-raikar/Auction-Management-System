import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { get } from '../api';
import { ToastContext } from '../context/ToastContext';
import ListingCard from '../components/ListingCard';
import Spinner from '../components/Spinner';

const Watchlist = () => {
  const { showToast } = useContext(ToastContext);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    get('/watchlist/')
      .then(setListings)
      .catch(err => showToast(err.toString(), 'error'))
      .finally(() => setLoading(false));
  }, []);

  const handleWatchToggle = (id) => setListings(prev => prev.filter(l => l.id !== id));

  return (
    <div className="container page-body">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <div className="section-label" style={{ marginBottom: 4 }}>Saved</div>
          <h1 className="page-title">
            Watchlist
            {listings.length > 0 && (
              <span style={{ marginLeft: 10, fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-muted)' }}>
                {listings.length} item{listings.length !== 1 ? 's' : ''}
              </span>
            )}
          </h1>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}><Spinner large /></div>
      ) : listings.length > 0 ? (
        <div className="grid-cards">
          {listings.map(l => <ListingCard key={l.id} listing={l} onWatchToggle={handleWatchToggle} />)}
        </div>
      ) : (
        <div className="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          <h3>Your watchlist is empty</h3>
          <p>Browse items and click the heart icon to save them here.</p>
          <Link to="/" className="btn btn-primary" style={{ marginTop: 20 }}>Browse Listings</Link>
        </div>
      )}
    </div>
  );
};

export default Watchlist;
