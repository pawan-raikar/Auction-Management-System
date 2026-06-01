import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { get } from '../api';
import ListingCard from '../components/ListingCard';
import CountdownTimer from '../components/CountdownTimer';
import Spinner from '../components/Spinner';

const SORTS = [
  { value: 'newest',      label: 'Newest' },
  { value: 'ending_soon', label: 'Ending Soon' },
  { value: 'most_bids',   label: 'Most Active' },
  { value: 'price_asc',   label: 'Price: Low → High' },
  { value: 'price_desc',  label: 'Price: High → Low' },
];

/* ── Static Promo Banners ─────────────────────────────────────────────────── */
const BANNERS = [
  {
    id: 1,
    tag: 'New Arrivals',
    headline: 'Discover Rare\nCollectibles & Art',
    sub: 'Authenticated items from trusted sellers. Every lot verified before listing.',
    cta: 'Browse Collectibles',
    ctaLink: '/?category=Collectibles',
    gradient: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
    accent: '#a78bfa',
    pill: '#a78bfa22',
    icon: (
      <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
        <circle cx="60" cy="60" r="52" stroke="#a78bfa" strokeWidth="1.5" strokeDasharray="6 4" opacity="0.3"/>
        <circle cx="60" cy="60" r="36" stroke="#a78bfa" strokeWidth="1" opacity="0.2"/>
        <path d="M60 28 L72 52 L98 56 L79 74 L83 100 L60 88 L37 100 L41 74 L22 56 L48 52 Z" fill="#a78bfa" opacity="0.15" stroke="#a78bfa" strokeWidth="1.5"/>
        <path d="M60 38 L69 56 L89 59 L75 72 L78 92 L60 83 L42 92 L45 72 L31 59 L51 56 Z" fill="#a78bfa" opacity="0.25"/>
        <circle cx="60" cy="60" r="8" fill="#a78bfa" opacity="0.6"/>
      </svg>
    ),
  },
  {
    id: 2,
    tag: 'Live Now',
    headline: 'Top Electronics\nUp for Auction',
    sub: 'Laptops, cameras, gadgets — bid live against thousands of active buyers.',
    cta: 'View Electronics',
    ctaLink: '/?category=Electronics',
    gradient: 'linear-gradient(135deg, #020c1b 0%, #0a2540 50%, #0d3b66 100%)',
    accent: '#38bdf8',
    pill: '#38bdf822',
    icon: (
      <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
        <rect x="18" y="28" width="84" height="54" rx="6" stroke="#38bdf8" strokeWidth="1.5" opacity="0.3"/>
        <rect x="26" y="36" width="68" height="38" rx="3" fill="#38bdf8" opacity="0.06" stroke="#38bdf8" strokeWidth="1" opacity="0.2"/>
        <line x1="40" y1="90" x2="80" y2="90" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" opacity="0.4"/>
        <line x1="60" y1="82" x2="60" y2="90" stroke="#38bdf8" strokeWidth="2" opacity="0.3"/>
        <path d="M48 60 L58 48 L65 56 L72 44 L80 60" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.7"/>
        <circle cx="58" cy="48" r="3" fill="#38bdf8" opacity="0.8"/>
        <circle cx="72" cy="44" r="3" fill="#38bdf8" opacity="0.8"/>
      </svg>
    ),
  },
  {
    id: 3,
    tag: 'Trending',
    headline: 'Premium Fashion\n& Luxury Goods',
    sub: 'Authenticated sneakers, designer pieces and rare fashion — no fakes, ever.',
    cta: 'Shop Fashion',
    ctaLink: '/?category=Fashion',
    gradient: 'linear-gradient(135deg, #1a0533 0%, #4a0e6b 50%, #6b21a8 100%)',
    accent: '#f0abfc',
    pill: '#f0abfc22',
    icon: (
      <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
        <path d="M30 85 L40 35 L55 50 L60 30 L65 50 L80 35 L90 85 Z" stroke="#f0abfc" strokeWidth="1.5" fill="#f0abfc" opacity="0.08"/>
        <path d="M35 82 L44 42 L55 55 L60 36 L65 55 L76 42 L85 82" stroke="#f0abfc" strokeWidth="1.5" strokeLinejoin="round" opacity="0.5"/>
        <circle cx="60" cy="36" r="5" fill="#f0abfc" opacity="0.6"/>
        <line x1="30" y1="85" x2="90" y2="85" stroke="#f0abfc" strokeWidth="2" strokeLinecap="round" opacity="0.4"/>
        <circle cx="44" cy="60" r="3" fill="#f0abfc" opacity="0.4"/>
        <circle cx="76" cy="60" r="3" fill="#f0abfc" opacity="0.4"/>
      </svg>
    ),
  },
  {
    id: 4,
    tag: 'Sell Today',
    headline: 'Got Something\nWorth Selling?',
    sub: 'List your item in under 2 minutes. Reach thousands of active bidders instantly.',
    cta: 'Create a Listing',
    ctaLink: '/create',
    gradient: 'linear-gradient(135deg, #052e16 0%, #064e3b 50%, #065f46 100%)',
    accent: '#34d399',
    pill: '#34d39922',
    icon: (
      <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
        <rect x="28" y="32" width="64" height="76" rx="6" stroke="#34d399" strokeWidth="1.5" opacity="0.3"/>
        <rect x="36" y="24" width="64" height="76" rx="6" stroke="#34d399" strokeWidth="1" opacity="0.2"/>
        <line x1="44" y1="56" x2="76" y2="56" stroke="#34d399" strokeWidth="2" strokeLinecap="round" opacity="0.5"/>
        <line x1="44" y1="68" x2="68" y2="68" stroke="#34d399" strokeWidth="2" strokeLinecap="round" opacity="0.4"/>
        <line x1="44" y1="80" x2="72" y2="80" stroke="#34d399" strokeWidth="2" strokeLinecap="round" opacity="0.3"/>
        <circle cx="64" cy="44" r="12" stroke="#34d399" strokeWidth="1.5" opacity="0.4"/>
        <line x1="64" y1="38" x2="64" y2="50" stroke="#34d399" strokeWidth="2" strokeLinecap="round" opacity="0.7"/>
        <line x1="58" y1="44" x2="70" y2="44" stroke="#34d399" strokeWidth="2" strokeLinecap="round" opacity="0.7"/>
      </svg>
    ),
  },
];

const PromoBanner = () => {
  const [active, setActive] = useState(0);
  const [prev,   setPrev]   = useState(null);
  const [dir,    setDir]    = useState(1); // 1=forward, -1=backward
  const timerRef = useRef(null);

  const goTo = (i, direction = 1) => {
    if (i === active) return;
    setPrev(active);
    setDir(direction);
    setActive(i);
  };

  const next = () => goTo((active + 1) % BANNERS.length, 1);
  const prev2 = () => goTo((active - 1 + BANNERS.length) % BANNERS.length, -1);

  // Auto-advance every 5s
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setActive(a => {
        setPrev(a);
        setDir(1);
        return (a + 1) % BANNERS.length;
      });
    }, 5000);
    return () => clearInterval(timerRef.current);
  }, []);

  const resetTimer = () => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setActive(a => {
        setPrev(a);
        setDir(1);
        return (a + 1) % BANNERS.length;
      });
    }, 5000);
  };

  const banner = BANNERS[active];

  return (
    <div style={{ position: 'relative', overflow: 'hidden', background: banner.gradient, transition: 'background 0.6s ease', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="container" style={{ minHeight: 320, display: 'flex', alignItems: 'center', gap: 40, padding: '48px 24px', position: 'relative', zIndex: 1 }}>

        {/* Text side */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: banner.pill, border: `1px solid ${banner.accent}44`, borderRadius: 100, padding: '4px 12px', marginBottom: 16 }}>
            <span className="live-dot" style={{ background: banner.accent, boxShadow: `0 0 6px ${banner.accent}` }} />
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: banner.accent, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{banner.tag}</span>
          </div>

          <h1 style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.6rem)', fontWeight: 800, lineHeight: 1.18, letterSpacing: '-0.6px', color: '#f1f5f9', marginBottom: 14, whiteSpace: 'pre-line' }}>
            {banner.headline}
          </h1>

          <p style={{ fontSize: '0.95rem', color: 'rgba(241,245,249,0.65)', lineHeight: 1.65, maxWidth: 480, marginBottom: 28 }}>
            {banner.sub}
          </p>

          <Link
            to={banner.ctaLink}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: banner.accent, color: '#000', padding: '12px 24px', borderRadius: 'var(--radius)', fontWeight: 700, fontSize: '0.9rem', textDecoration: 'none', boxShadow: `0 4px 20px ${banner.accent}55`, transition: 'transform 0.15s, box-shadow 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 28px ${banner.accent}66`; }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = `0 4px 20px ${banner.accent}55`; }}
          >
            {banner.cta}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
          </Link>
        </div>

        {/* Illustration */}
        <div style={{ width: 180, height: 180, flexShrink: 0, opacity: 0.9 }}>
          {banner.icon}
        </div>
      </div>

      {/* Decorative blobs */}
      <div style={{ position: 'absolute', top: -60, right: '30%', width: 300, height: 300, borderRadius: '50%', background: banner.accent, opacity: 0.04, filter: 'blur(60px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -80, left: '10%', width: 240, height: 240, borderRadius: '50%', background: banner.accent, opacity: 0.06, filter: 'blur(50px)', pointerEvents: 'none' }} />

      {/* Prev / Next arrows */}
      <button onClick={() => { prev2(); resetTimer(); }}
        style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', zIndex: 10, width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.18)', color: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'background 0.15s', backdropFilter: 'blur(8px)' }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <button onClick={() => { next(); resetTimer(); }}
        style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', zIndex: 10, width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.18)', color: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'background 0.15s', backdropFilter: 'blur(8px)' }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
      </button>

      {/* Dots */}
      <div style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 6, zIndex: 10 }}>
        {BANNERS.map((_, i) => (
          <button key={i} onClick={() => { goTo(i, i > active ? 1 : -1); resetTimer(); }}
            style={{ width: i === active ? 24 : 8, height: 8, borderRadius: 100, background: i === active ? banner.accent : 'rgba(255,255,255,0.3)', border: 'none', cursor: 'pointer', transition: 'all 0.3s', padding: 0 }} />
        ))}
      </div>
    </div>
  );
};

/* ── Stats bar ────────────────────────────────────────────────────────────── */
const StatsBar = ({ stats }) => {
  if (!stats) return null;
  const items = [
    { icon: '🔴', value: stats.live_auctions,  label: 'Live Auctions' },
    { icon: '🏷️', value: stats.total_bids,     label: 'Total Bids' },
    { icon: '👥', value: stats.active_bidders, label: 'Active Bidders' },
    { icon: '📦', value: stats.categories,     label: 'Categories' },
  ];
  return (
    <div className="hero-stats-bar">
      <div className="container">
        <div style={{ display: 'flex', alignItems: 'center', overflowX: 'auto' }}>
          {items.map((s, i) => (
            <div key={i} className="hero-stat-item">
              <span style={{ fontSize: '0.9rem' }}>{s.icon}</span>
              <span className="hero-stat-value">{Number(s.value).toLocaleString('en-IN')}</span>
              <span className="hero-stat-label">{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ── Ending Soon strip ────────────────────────────────────────────────────── */
const EndingSoonStrip = () => {
  const [items, setItems] = useState([]);
  useEffect(() => { get('/listings/ending-soon').then(setItems).catch(() => {}); }, []);
  if (!items.length) return null;

  return (
    <div style={{ background: 'var(--warning-soft)', borderBottom: '1px solid var(--warning-border)', padding: '12px 0' }}>
      <div className="container">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--warning)', textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>Ending Soon</span>
          </div>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
            {items.map(item => (
              <Link key={item.id} to={`/listings/${item.id}`}
                style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg-surface)', border: '1px solid var(--warning-border)', borderRadius: 'var(--radius)', padding: '6px 12px', textDecoration: 'none', flexShrink: 0 }}>
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-strong)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 140 }}>{item.title}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: "'DM Mono',monospace" }}>₹{item.current_price.toLocaleString('en-IN')}</div>
                </div>
                <CountdownTimer endTime={item.end_time} isActive />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── Category helpers ─────────────────────────────────────────────────────── */
function getCatEmoji(cat) {
  return { Electronics:'💻', Fashion:'👗', 'Home & Garden':'🏡', Sports:'⚽', Collectibles:'🏺', Art:'🎨', Vehicles:'🚗', Other:'📦' }[cat] || '🏷️';
}

/* ── Pagination ───────────────────────────────────────────────────────────── */
const Pagination = ({ page, pages, onPage }) => {
  if (pages <= 1) return null;
  const nums = [];
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || Math.abs(i - page) <= 2) nums.push(i);
    else if (nums[nums.length - 1] !== '…') nums.push('…');
  }
  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 40, alignItems: 'center' }}>
      <button className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => onPage(page - 1)}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      {nums.map((n, i) => n === '…'
        ? <span key={`e${i}`} style={{ padding: '0 4px', color: 'var(--text-muted)' }}>…</span>
        : <button key={n} onClick={() => onPage(n)}
            style={{ minWidth: 36, height: 34, borderRadius: 'var(--radius-sm)', border: `1px solid ${n === page ? 'var(--accent)' : 'var(--border-ui)'}`, background: n === page ? 'var(--accent)' : 'var(--bg-surface)', color: n === page ? '#fff' : 'var(--text-base)', fontWeight: n === page ? 700 : 500, fontSize: '0.84rem', cursor: 'pointer' }}>
            {n}
          </button>
      )}
      <button className="btn btn-secondary btn-sm" disabled={page === pages} onClick={() => onPage(page + 1)}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
    </div>
  );
};

/* ── Main Page ────────────────────────────────────────────────────────────── */
const Home = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [listings,    setListings]    = useState([]);
  const [total,       setTotal]       = useState(0);
  const [pages,       setPages]       = useState(1);
  const [loading,     setLoading]     = useState(true);
  const [categories,  setCategories]  = useState([]);
  const [stats,       setStats]       = useState(null);
  const [searchDraft, setSearchDraft] = useState(searchParams.get('search') || '');

  const search   = searchParams.get('search')   || '';
  const category = searchParams.get('category') || '';
  const status   = searchParams.get('status')   || '';
  const sort     = searchParams.get('sort')      || 'newest';
  const minPrice = searchParams.get('min_price') || '';
  const maxPrice = searchParams.get('max_price') || '';
  const page     = parseInt(searchParams.get('page') || '1');

  useEffect(() => {
    get('/categories/').then(setCategories).catch(() => {});
    get('/listings/stats').then(setStats).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const q = new URLSearchParams({ search, category, status, sort, min_price: minPrice, max_price: maxPrice, page, per_page: 20 }).toString();
    get(`/listings/?${q}`)
      .then(d => { setListings(d.listings); setTotal(d.total); setPages(d.pages || 1); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [search, category, status, sort, minPrice, maxPrice, page]);

  const setP = (k, v) => {
    const p = new URLSearchParams(searchParams);
    v ? p.set(k, v) : p.delete(k);
    if (k !== 'page') p.delete('page');
    setSearchParams(p);
  };
  const clearAll = () => { setSearchParams({}); setSearchDraft(''); };
  const hasFilters = search || category || status || minPrice || maxPrice;

  const handleWatchToggle = (id) =>
    setListings(prev => prev.map(l => l.id === id ? { ...l, is_watched: !l.is_watched } : l));

  return (
    <div>
      <PromoBanner />
      <StatsBar stats={stats} />
      <EndingSoonStrip />

      <div className="container page-body">
        {/* Section header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div className="section-label">All Auctions</div>
            <h2 className="t-heading-lg" style={{ marginTop: 2 }}>
              {loading ? 'Loading…' : `${total.toLocaleString()} listing${total !== 1 ? 's' : ''}`}
            </h2>
          </div>
        </div>

        {/* Category pills */}
        <div className="cat-pills">
          <button className={`cat-pill${!category ? ' active' : ''}`} onClick={() => setP('category', '')}>All</button>
          {categories.map(c => (
            <button key={c} className={`cat-pill${category === c ? ' active' : ''}`} onClick={() => setP('category', c)}>
              {getCatEmoji(c)} {c}
            </button>
          ))}
        </div>

        {/* Filter bar */}
        <div className="filter-bar">
          <form onSubmit={e => { e.preventDefault(); setP('search', searchDraft); }} style={{ display: 'flex', gap: 6, flex: '2 1 240px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }}>
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input type="text" className="input-field" placeholder="Search listings…" value={searchDraft}
                onChange={e => setSearchDraft(e.target.value)} style={{ paddingLeft: 32 }} />
            </div>
            <button type="submit" className="btn btn-primary btn-sm">Search</button>
          </form>

          <select className="input-field" value={status} onChange={e => setP('status', e.target.value)} style={{ flex: '0 1 130px' }}>
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="ended">Ended</option>
          </select>

          <select className="input-field" value={sort} onChange={e => setP('sort', e.target.value)} style={{ flex: '0 1 170px' }}>
            {SORTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          <div style={{ display: 'flex', gap: 6 }}>
            <input type="number" className="input-field" placeholder="Min ₹" value={minPrice}
              onChange={e => setP('min_price', e.target.value)} style={{ width: 90 }} />
            <input type="number" className="input-field" placeholder="Max ₹" value={maxPrice}
              onChange={e => setP('max_price', e.target.value)} style={{ width: 90 }} />
          </div>

          {hasFilters && (
            <button className="btn btn-ghost btn-sm" onClick={clearAll}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              Clear
            </button>
          )}
        </div>

        {/* Grid */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}><Spinner large /></div>
        ) : listings.length > 0 ? (
          <>
            <div className="grid-cards">
              {listings.map(l => <ListingCard key={l.id} listing={l} onWatchToggle={handleWatchToggle} />)}
            </div>
            <Pagination page={page} pages={pages} onPage={p => setP('page', p > 1 ? String(p) : '')} />
          </>
        ) : (
          <div className="empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <h3>No listings found</h3>
            <p>Try adjusting your filters or search terms.</p>
            {hasFilters && <button className="btn btn-primary" onClick={clearAll} style={{ marginTop: 16 }}>Clear filters</button>}
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
