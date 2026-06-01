export const API_BASE = 'http://localhost:5003/api';
export const MEDIA_BASE = 'http://localhost:5003/media/images';

const handleResponse = async (res) => {
  if (res.status === 401) {
    localStorage.removeItem('ae_token');
    window.location.href = '/login';
    return Promise.reject(new Error('Unauthorized'));
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return Promise.reject(data.error || 'An error occurred');
  return data;
};

const headers = () => {
  const token = localStorage.getItem('ae_token');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

const authHeader = () => {
  const token = localStorage.getItem('ae_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const get = (ep) =>
  fetch(`${API_BASE}${ep}`, { method: 'GET', headers: headers() }).then(handleResponse);

export const post = (ep, body) =>
  fetch(`${API_BASE}${ep}`, { method: 'POST', headers: headers(), body: JSON.stringify(body) }).then(handleResponse);

export const put = (ep, body) =>
  fetch(`${API_BASE}${ep}`, { method: 'PUT', headers: headers(), body: JSON.stringify(body) }).then(handleResponse);

export const del = (ep) =>
  fetch(`${API_BASE}${ep}`, { method: 'DELETE', headers: headers() }).then(handleResponse);

export const postForm = (ep, formData, isPut = false) =>
  fetch(`${API_BASE}${ep}`, { method: isPut ? 'PUT' : 'POST', headers: authHeader(), body: formData }).then(handleResponse);
