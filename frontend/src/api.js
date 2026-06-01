const BASE_URL = 'http://localhost:5000/api';

const handleResponse = async (response) => {
  if (response.status === 401) {
    localStorage.removeItem('ae_token');
    window.location.href = '/login';
    return Promise.reject(new Error("Unauthorized"));
  }
  
  const data = await response.json().catch(() => ({}));
  
  if (!response.ok) {
    return Promise.reject(data.error || "An error occurred");
  }
  
  return data;
};

const getHeaders = () => {
  const token = localStorage.getItem('ae_token');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

export const get = async (endpoint) => {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'GET',
    headers: getHeaders()
  });
  return handleResponse(res);
};

export const post = async (endpoint, body) => {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(body)
  });
  return handleResponse(res);
};

export const put = async (endpoint, body) => {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(body)
  });
  return handleResponse(res);
};

export const del = async (endpoint) => {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
  return handleResponse(res);
};

export const postForm = async (endpoint, formData, isPut = false) => {
  const token = localStorage.getItem('ae_token');
  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: isPut ? 'PUT' : 'POST',
    headers,
    body: formData
  });
  return handleResponse(res);
};
