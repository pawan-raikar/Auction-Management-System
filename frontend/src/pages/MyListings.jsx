import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { get, del, post } from '../api';
import { ToastContext } from '../context/ToastContext';
import ListingCard from '../components/ListingCard';
import Spinner from '../components/Spinner';

const MyListings = () => {
  const { showToast } = useContext(ToastContext);
  const [tab, setTab] = useState('my');
  const [myListings, setMyListings] = useState([]);
  const [wonListings, setWonListings] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [myRes, wonRes] = await Promise.all([get('/listings/my'), get('/listings/won')]);
      setMyListings(myRes);
      setWonListings(wonRes);
    } catch (err) {
      showToast(err.toString(), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this listing permanently?')) return;
    try {
      await del(`/listings/${id}`);
      showToast('Listing deleted', 'success');
      setMyListings(prev => prev.filter(l => l.id !== id));
    } catch (err) {
      showToast(err.toString(), 'error');
    }
  };

  const handleClose = async (id) => {
    if (!window.confirm('Close this auction early?')) return;
    try {
      await post(`/listings/${id}/close`);
      showToast('Auction closed', 'success');
      fetchData();
    } catch (err) {
      showToast(err.toString(), 'error');
    }
  };

  return (
    <div className="container page-body">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <div className="section-label" style={{ marginBottom: 4 }}>Dashboard</div>
          <h1 className="page-title">My Activity</h1>
        </div>
        <Link to="/create" className="btn btn-primary">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Listing
        </Link>
      </div>

      <div className="tabs">
        <button className={`tab-btn${tab === 'my' ? ' active' : ''}`} onClick={() => setTab('my')}>
          My Listings ({myListings.length})
        </button>
        <button className={`tab-btn${tab === 'won' ? ' active' : ''}`} onClick={() => setTab('won')}>
          Won Auctions ({wonListings.length})
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}><Spinner large /></div>
      ) : tab === 'my' ? (
        myListings.length > 0 ? (
          <div className="grid-cards">
            {myListings.map(l => (
              <div key={l.id} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <ListingCard listing={l} />
                <div style={{ display: 'flex', gap: 8 }}>
                  {l.auction_active === 1 && l.time_left_seconds > 0 && (
                    <button onClick={() => handleClose(l.id)} className="btn btn-secondary btn-sm" style={{ flex: 1 }}>
                      Close Early
                    </button>
                  )}
                  <button onClick={() => handleDelete(l.id)} className="btn btn-danger btn-sm" style={{ flex: 1 }}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            <h3>No listings yet</h3>
            <p>Create your first auction listing.</p>
            <Link to="/create" className="btn btn-primary" style={{ marginTop: 16 }}>Create Listing</Link>
          </div>
        )
      ) : (
        wonListings.length > 0 ? (
          <div className="grid-cards">
            {wonListings.map(l => <ListingCard key={l.id} listing={l} />)}
          </div>
        ) : (
          <div className="empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            <h3>No auctions won yet</h3>
            <p>Start bidding to win your first auction!</p>
          </div>
        )
      )}
    </div>
  );
};

export default MyListings;
