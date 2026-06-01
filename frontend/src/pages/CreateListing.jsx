import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { get, postForm } from '../api';
import { ToastContext } from '../context/ToastContext';

const CONDITIONS = ['Mint', 'Excellent', 'Very Good', 'Good', 'Fair', 'Poor'];

const CreateListing = () => {
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ title:'', category:'', description:'', starting_value:'', end_time:'', condition:'Good', reserve_price:'' });
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const { showToast } = useContext(ToastContext);
  const navigate = useNavigate();

  useEffect(() => { get('/categories/').then(setCategories).catch(console.error); }, []);

  const handleImage = (e) => {
    const f = e.target.files[0];
    if (f) { setImage(f); setPreview(URL.createObjectURL(f)); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.category) { showToast('Select a category', 'error'); return; }
    if (new Date(form.end_time) <= new Date()) { showToast('End time must be in the future', 'error'); return; }

    setLoading(true);
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => { if (v !== '') fd.append(k, v); });
    if (image) fd.append('image', image);

    try {
      const res = await postForm('/listings/', fd);
      showToast('Listing created', 'success');
      navigate(`/listings/${res.id}`);
    } catch (err) {
      showToast(err.toString(), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ paddingTop:32, paddingBottom:64, maxWidth:800 }}>
      <div style={{ marginBottom:28 }}>
        <div className="section-label" style={{ marginBottom:4 }}>New Listing</div>
        <h1 className="page-title">Create Auction</h1>
      </div>

      <div className="card" style={{ padding:32 }}>
        <form onSubmit={handleSubmit}>

          <div className="form-group">
            <label>Title</label>
            <input type="text" className="input-field" required autoFocus placeholder="Descriptive title for your item"
              value={form.title} onChange={e => setForm({...form, title:e.target.value})} />
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            <div className="form-group">
              <label>Category</label>
              <select className="input-field" required value={form.category} onChange={e => setForm({...form, category:e.target.value})}>
                <option value="" disabled>Select category</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Condition</label>
              <select className="input-field" value={form.condition} onChange={e => setForm({...form, condition:e.target.value})}>
                {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:16 }}>
            <div className="form-group">
              <label>Starting Price (INR)</label>
              <input type="number" className="input-field" required min="1" placeholder="0"
                value={form.starting_value} onChange={e => setForm({...form, starting_value:e.target.value})} />
            </div>
            <div className="form-group">
              <label>Reserve Price (optional)</label>
              <input type="number" className="input-field" min="1" placeholder="No reserve"
                value={form.reserve_price} onChange={e => setForm({...form, reserve_price:e.target.value})} />
            </div>
            <div className="form-group">
              <label>Auction End</label>
              <input type="datetime-local" className="input-field" required
                value={form.end_time} onChange={e => setForm({...form, end_time:e.target.value})} />
            </div>
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea className="input-field" required rows={5} placeholder="Describe condition, provenance, included accessories, dimensions, etc."
              value={form.description} onChange={e => setForm({...form, description:e.target.value})} />
          </div>

          <div className="form-group">
            <label>Item Photo</label>
            <div style={{ display:'flex', gap:16, alignItems:'flex-start' }}>
              <div style={{ flex:1 }}>
                <input type="file" className="input-field" accept="image/*" onChange={handleImage} style={{ padding:8, cursor:'pointer' }} />
                <div style={{ fontSize:'0.75rem', color:'var(--text-muted)', marginTop:5 }}>JPG, PNG, WebP or GIF</div>
              </div>
              {preview && (
                <div style={{ width:96, height:96, borderRadius:'var(--radius)', overflow:'hidden', border:'1px solid var(--border-subtle)', flexShrink:0 }}>
                  <img src={preview} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                </div>
              )}
            </div>
          </div>

          <div className="divider" />

          <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ minWidth:140 }}>
              {loading ? 'Creating…' : 'Create Listing'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateListing;
