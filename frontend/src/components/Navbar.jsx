import React, { useContext, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    navigate(`/?search=${encodeURIComponent(search)}`);
  };

  return (
    <nav className="navbar flex-between" style={{ padding: '0 40px' }}>
      <Link to="/" style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white' }}>
        AuctionEdge
      </Link>
      
      <form onSubmit={handleSearch} style={{ flex: 1, maxWidth: '400px', margin: '0 20px' }}>
        <input 
          type="text" 
          className="input-field" 
          placeholder="Search items..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ padding: '8px 16px', borderRadius: '20px' }}
        />
      </form>
      
      <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
        {!user ? (
          <>
            <Link to="/login" className="btn-secondary">Login</Link>
            <Link to="/register" className="btn-primary">Register</Link>
          </>
        ) : (
          <>
            <Link to="/watchlist" style={{ color: 'var(--text-secondary)' }}>Watchlist</Link>
            <Link to="/create" className="btn-primary">Sell</Link>
            <div style={{ position: 'relative', cursor: 'pointer', group: 'hover' }}>
              <Link to="/profile" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'white' }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%', 
                  backgroundColor: 'var(--accent)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', fontWeight: 'bold'
                }}>
                  {user.username.charAt(0).toUpperCase()}
                </div>
              </Link>
            </div>
            <Link to="/my-listings" style={{ color: 'var(--text-secondary)' }}>My Listings</Link>
            {user.is_admin && (
              <Link to="/admin" style={{ color: 'var(--warning)' }}>Admin</Link>
            )}
            <button onClick={logout} className="btn-secondary" style={{ padding: '6px 12px' }}>Logout</button>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
