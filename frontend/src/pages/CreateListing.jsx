import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { get, postForm } from '../api';
import { ToastContext } from '../context/ToastContext';

const CreateListing = () => {
  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    description: '',
    starting_value: '',
    end_time: ''
  });
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { showToast } = useContext(ToastContext);
  const navigate = useNavigate();

  useEffect(() => {
    get('/categories').then(setCategories).catch(console.error);
  }, []);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.category) {
      showToast("Please select a category", "error");
      return;
    }
    
    // Validate end time is in future
    const selectedTime = new Date(formData.end_time).getTime();
    if (selectedTime <= Date.now()) {
      showToast("End time must be in the future", "error");
      return;
    }

    setLoading(true);
    const data = new FormData();
    Object.keys(formData).forEach(key => data.append(key, formData[key]));
    if (image) data.append('image', image);

    try {
      const res = await postForm('/listings/', data);
      showToast("Listing created successfully!", "success");
      navigate(`/listings/${res.id}`);
    } catch (err) {
      showToast(err.toString(), "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ padding: '40px 20px', maxWidth: '800px' }}>
      <h1 className="page-title" style={{ textAlign: 'center', marginBottom: '40px' }}>Create New Listing</h1>
      
      <div className="card glass" style={{ padding: '40px' }}>
        <form onSubmit={handleSubmit}>
          
          <div className="form-group">
            <label>Title</label>
            <input 
              type="text" className="input-field" required 
              value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}
              placeholder="e.g. Vintage Rolex Submariner 1972"
            />
          </div>
          
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ flex: '1 1 200px' }}>
              <label>Category</label>
              <select 
                className="input-field" required
                value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}
              >
                <option value="" disabled>Select a category</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            
            <div className="form-group" style={{ flex: '1 1 200px' }}>
              <label>Starting Price (₹)</label>
              <input 
                type="number" className="input-field" required min="1" step="0.01"
                value={formData.starting_value} onChange={e => setFormData({...formData, starting_value: e.target.value})}
              />
            </div>
            
            <div className="form-group" style={{ flex: '1 1 200px' }}>
              <label>End Time</label>
              <input 
                type="datetime-local" className="input-field" required
                value={formData.end_time} onChange={e => setFormData({...formData, end_time: e.target.value})}
              />
            </div>
          </div>
          
          <div className="form-group">
            <label>Description</label>
            <textarea 
              className="input-field" required style={{ minHeight: '150px' }}
              value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}
              placeholder="Describe your item in detail..."
            />
          </div>
          
          <div className="form-group">
            <label>Item Image</label>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <input 
                  type="file" className="input-field" accept="image/*"
                  onChange={handleImageChange}
                  style={{ padding: '10px' }}
                />
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                  Accepted formats: JPG, PNG, GIF
                </p>
              </div>
              
              {imagePreview && (
                <div style={{ 
                  width: '150px', height: '150px', borderRadius: 'var(--radius)',
                  backgroundImage: `url(${imagePreview})`, backgroundSize: 'cover', backgroundPosition: 'center',
                  border: '1px solid var(--border-glass)'
                }} />
              )}
            </div>
          </div>
          
          <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'flex-end', gap: '15px' }}>
            <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create Listing'}
            </button>
          </div>
          
        </form>
      </div>
    </div>
  );
};

export default CreateListing;
