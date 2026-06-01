import React, { useState, useEffect, useContext } from 'react';
import { get, del, post } from '../api';
import { AuthContext } from '../context/AuthContext';
import { ToastContext } from '../context/ToastContext';
import ListingCard from '../components/ListingCard';
import Spinner from '../components/Spinner';

const MyListings = () => {
  const { user } = useContext(AuthContext);
  const { showToast } = useContext(ToastContext);
  
  const [activeTab, setActiveTab] = useState('my-listings');
  const [listings, setListings] = useState([]);
  const [wonListings, setWonListings] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Very naive approach: fetch all and filter by user id / winner id
      // A robust app would have specific endpoints for /profile/listings and /profile/won
      const res = await get('/listings/');
      const allListings = res.listings;
      
      setListings(allListings.filter(l => l.user_id === user.id));
      setWonListings(allListings.filter(l => l.winner_id === user.id));
    } catch (err) {
      showToast(err.toString(), "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user.id]);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this listing?")) return;
    try {
      await del(`/listings/${id}`);
      showToast("Listing deleted", "success");
      fetchData();
    } catch (err) {
      showToast(err.toString(), "error");
    }
  };

  const handleClose = async (id) => {
    if (!window.confirm("Are you sure you want to close this auction?")) return;
    try {
      await post(`/listings/${id}/close`);
      showToast("Auction closed", "success");
      fetchData();
    } catch (err) {
      showToast(err.toString(), "error");
    }
  };

  return (
    <div className="container" style={{ padding: '40px 20px' }}>
      <h1 className="page-title" style={{ marginBottom: '30px' }}>My Activity</h1>
      
      <div style={{ display: 'flex', gap: '20px', borderBottom: '1px solid var(--border-glass)', marginBottom: '30px' }}>
        <button 
          onClick={() => setActiveTab('my-listings')}
          style={{ 
            background: 'none', border: 'none', padding: '15px 20px', fontSize: '1.1rem',
            color: activeTab === 'my-listings' ? 'var(--text-primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'my-listings' ? '2px solid var(--accent)' : '2px solid transparent',
            fontWeight: activeTab === 'my-listings' ? 'bold' : 'normal'
          }}
        >
          My Listings ({listings.length})
        </button>
        <button 
          onClick={() => setActiveTab('won')}
          style={{ 
            background: 'none', border: 'none', padding: '15px 20px', fontSize: '1.1rem',
            color: activeTab === 'won' ? 'var(--text-primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'won' ? '2px solid var(--accent)' : '2px solid transparent',
            fontWeight: activeTab === 'won' ? 'bold' : 'normal'
          }}
        >
          Won Auctions ({wonListings.length})
        </button>
      </div>
      
      {loading ? (
        <div className="flex-center" style={{ height: '200px' }}><Spinner large /></div>
      ) : activeTab === 'my-listings' ? (
        listings.length > 0 ? (
          <div className="grid-cards">
            {listings.map(l => (
              <div key={l.id} style={{ position: 'relative' }}>
                <ListingCard listing={l} />
                <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                  {l.auction_active === 1 && l.time_left_seconds > 0 && (
                    <button onClick={() => handleClose(l.id)} className="btn-secondary" style={{ flex: 1 }}>Close Early</button>
                  )}
                  <button onClick={() => handleDelete(l.id)} className="btn-danger" style={{ flex: 1 }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
            <p>You haven't created any listings yet.</p>
          </div>
        )
      ) : (
        wonListings.length > 0 ? (
          <div className="grid-cards">
            {wonListings.map(l => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
            <p>You haven't won any auctions yet.</p>
          </div>
        )
      )}
    </div>
  );
};

export default MyListings;
