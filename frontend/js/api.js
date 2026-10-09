/* ================================================================
   API-клиент CraftCup
   ================================================================ */

const API_URL = '/api';

function getToken() { return localStorage.getItem('craftcup_token'); }
function setToken(t) { localStorage.setItem('craftcup_token', t); }
function clearToken() { localStorage.removeItem('craftcup_token'); }

async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = 'Bearer ' + token;

  const res = await fetch(API_URL + path, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Ошибка запроса');
  return data;
}

const Api = {
  login: async (phone, name) => {
    const data = await api('/auth', {
      method: 'POST',
      body: JSON.stringify({ phone, name })
    });
    setToken(data.token);
    localStorage.setItem('craftcup_user', JSON.stringify(data.user));
    return data.user;
  },
  logout: () => {
    clearToken();
    localStorage.removeItem('craftcup_user');
  },

  getMenu: () => api('/menu'),

  getCards: () => api('/cards'),
  addCard: (card) => api('/cards', { method: 'POST', body: JSON.stringify(card) }),
  removeCard: (id) => api('/cards/' + id, { method: 'DELETE' }),

  createOrder: (order) => api('/orders', { method: 'POST', body: JSON.stringify(order) }),
  getOrders: () => api('/orders')
};