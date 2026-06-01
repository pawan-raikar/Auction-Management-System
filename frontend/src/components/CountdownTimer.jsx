import React, { useState, useEffect } from 'react';

const CountdownTimer = ({ endTime, isActive = true, onExpire, showBlocks = false }) => {
  const calc = () => {
    if (!endTime || !isActive) return 0;
    const d = new Date(endTime.replace(' ', 'T')) - new Date();
    return d > 0 ? Math.floor(d / 1000) : 0;
  };

  const [secs, setSecs] = useState(calc);

  useEffect(() => {
    setSecs(calc());
    if (!endTime || !isActive) return;
    const t = setInterval(() => {
      setSecs(p => {
        if (p <= 1) { clearInterval(t); if (onExpire) onExpire(); return 0; }
        return p - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [endTime, isActive]);

  if (!isActive || secs <= 0) {
    if (showBlocks) return <span className="countdown cd-ended">Auction closed</span>;
    return <span className="countdown cd-ended">Ended</span>;
  }

  const d = Math.floor(secs / 86400);
  const h = Math.floor((secs % 86400) / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  const cls = secs < 3600 ? 'cd-urgent' : secs < 86400 ? 'cd-warning' : 'cd-normal';

  if (showBlocks) {
    return (
      <div className="cd-blocks">
        {d > 0 && <div className={`cd-block ${cls}`}><span className="cd-val">{String(d).padStart(2,'0')}</span><span className="cd-lbl">Days</span></div>}
        <div className={`cd-block ${cls}`}><span className="cd-val">{String(h).padStart(2,'0')}</span><span className="cd-lbl">Hours</span></div>
        <div className={`cd-block ${cls}`}><span className="cd-val">{String(m).padStart(2,'0')}</span><span className="cd-lbl">Min</span></div>
        <div className={`cd-block ${cls}`}><span className="cd-val">{String(s).padStart(2,'0')}</span><span className="cd-lbl">Sec</span></div>
      </div>
    );
  }

  const label = d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m ${String(s).padStart(2,'0')}s`;
  return <span className={`countdown ${cls}`}>{label}</span>;
};

export default CountdownTimer;
