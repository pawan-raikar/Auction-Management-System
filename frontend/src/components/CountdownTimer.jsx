import React, { useState, useEffect } from 'react';

const CountdownTimer = ({ endTime, onExpire }) => {
  const calculateTimeLeft = () => {
    if (!endTime) return 0;
    // Replace space with T to ensure valid ISO 8601 for Safari/cross-browser
    const parsedEnd = new Date(endTime.replace(' ', 'T')).getTime();
    const now = new Date().getTime();
    const difference = parsedEnd - now;
    return difference > 0 ? Math.floor(difference / 1000) : 0;
  };

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

  useEffect(() => {
    const timer = setInterval(() => {
      const newTime = calculateTimeLeft();
      setTimeLeft(newTime);
      
      if (newTime <= 0) {
        clearInterval(timer);
        if (onExpire) onExpire();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [endTime, onExpire]);

  if (timeLeft <= 0) {
    return <span style={{ color: 'var(--text-muted)' }}>Ended</span>;
  }

  const days = Math.floor(timeLeft / (3600 * 24));
  const hours = Math.floor((timeLeft % (3600 * 24)) / 3600);
  const minutes = Math.floor((timeLeft % 3600) / 60);
  const seconds = timeLeft % 60;

  let color = 'var(--success)';
  if (days < 1 && hours < 24) color = 'var(--warning)';
  if (days === 0 && hours < 1) color = 'var(--danger)';

  let display = "";
  if (days > 0) display += `${days}d `;
  display += `${hours}h ${minutes}m`;
  if (days === 0 && hours < 1) display += ` ${seconds}s`;

  return (
    <span style={{ color, fontWeight: 'bold' }}>
      {display}
    </span>
  );
};

export default CountdownTimer;
