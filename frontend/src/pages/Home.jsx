import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { get } from '../api';
import ListingCard from '../components/ListingCard';
import Spinner from '../components/Spinner';

const Home = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);

  const search = searchParams.get('search') || '';
  const category = searchParams.get('category') || '';
  const status = searchParams.get('status') || '';
  const sort = searchParams.get('sort') || 'newest';
  const minPrice = searchParams.get('min_price') || '';
  const maxPrice = searchParams.get('max_price') || '';

  useEffect(() => {
    get('/categories').then(data => setCategories(data)).catch(console.error);
  }, []);

  useEffect(() => {
    const fetchListings = async () => {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams({
          search, category, status, sort, min_price: minPrice, max_price: maxPrice
        }).toString();
        const res = await get(`/listings/?${queryParams}`);
        setListings(res.listings);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchListings();
  }, [search, category, status, sort, minPrice, maxPrice]);

  const handleFilterChange = (key, value) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    setSearchParams(newParams);
  };

  return (
    <div>
      <div className="hero">
        <div className="container">
          <h1 className="page-title">Discover Unique Items</h1>
          <p>Bid on exclusive electronics, rare collectibles, and more from verified sellers around the world.</p>
        </div>
      </div>

      <div className="container" style={{ padding: '40px 20px' }}>
        <div className="glass" style={{ padding: '20px', borderRadius: 'var(--radius)', marginBottom: '30px', display: 'flex', flexWrap: 'wrap', gap: '15px' }}>
          <input 
            type="text" 
            className="input-field" 
            placeholder="Keyword..." 
            value={search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            style={{ flex: '1 1 200px' }}
          />
          <select 
            className="input-field" 
            value={category} 
            onChange={(e) => handleFilterChange('category', e.target.value)}
            style={{ flex: '1 1 150px' }}
          >
            <option value="">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select 
            className="input-field" 
            value={status} 
            onChange={(e) => handleFilterChange('status', e.target.value)}
            style={{ flex: '1 1 120px' }}
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="ended">Ended</option>
          </select>
          <select 
            className="input-field" 
            value={sort} 
            onChange={(e) => handleFilterChange('sort', e.target.value)}
            style={{ flex: '1 1 150px' }}
          >
            <option value="newest">Newest First</option>
            <option value="ending_soon">Ending Soon</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
          </select>
          <input 
            type="number" 
            className="input-field" 
            placeholder="Min ₹" 
            value={minPrice}
            onChange={(e) => handleFilterChange('min_price', e.target.value)}
            style={{ flex: '0 1 100px' }}
          />
          <input 
            type="number" 
            className="input-field" 
            placeholder="Max ₹" 
            value={maxPrice}
            onChange={(e) => handleFilterChange('max_price', e.target.value)}
            style={{ flex: '0 1 100px' }}
          />
        </div>

        {loading ? (
          <div className="flex-center" style={{ height: '200px' }}><Spinner large /></div>
        ) : listings.length > 0 ? (
          <div className="grid-cards">
            {listings.map(listing => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '20px', opacity: 0.5 }}>
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '10px' }}>No listings found</h3>
            <p>Try adjusting your search or filters to find what you're looking for.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
