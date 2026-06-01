import React from 'react';

const Spinner = ({ large = false }) => {
  return (
    <div className={`spinner ${large ? 'large' : ''}`}></div>
  );
};

export default Spinner;
