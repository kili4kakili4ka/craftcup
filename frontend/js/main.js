/* ================================================================
   CraftCup — общий модуль
   Авторизация через API, корзина в localStorage,
   модалки, подсветка меню, тосты
   ================================================================ */

// ---------- ХРАНИЛИЩЕ ----------
const Store = {
  // ---------- Пользователь ----------
  getUser() {
    try { return JSON.parse(localStorage.getItem('craftcup_user')) || null; }
    catch { return null; }
  },
  setUser(user) { localStorage.setItem('craftcup_user', JSON.stringify(user)); },
  logout() {
    if (typeof Api !== 'undefined') Api.logout();
    else {
      localStorage.removeItem('craftcup_user');
      localStorage.removeItem('craftcup_token');
    }
  },
  isAuthorized() { return !!this.getUser(); },

  // ---------- Корзина ----------
  getCart() {
    try { return JSON.parse(localStorage.getItem('craftcup_cart')) || []; }
    catch { return []; }
  },
  setCart(cart) {
    localStorage.setItem('craftcup_cart', JSON.stringify(cart));
    updateCartCount();
  },
  clearCart() {
    localStorage.removeItem('craftcup_cart');
    updateCartCount();
  },
  addToCart(item) {
    const cart = this.getCart();
    const key = JSON.stringify({ id: item.id, mods: item.mods || null });
    const existing = cart.find(c => JSON.stringify({ id: c.id, mods: c.mods || null }) === key);
    if (existing) existing.qty += item.qty || 1;
    else cart.push({ ...item, qty: item.qty || 1 });
    this.setCart(cart);
  },
  removeFromCart(index) {
    const cart = this.getCart();
    cart.splice(index, 1);
    this.setCart(cart);
  },
  updateQty(index, delta) {
    const cart = this.getCart();
    if (!cart[index]) return;
    cart[index].qty += delta;
    if (cart[index].qty <= 0) cart.splice(index, 1);
    this.setCart(cart);
  }
};

// ---------- СЧЁТЧИК КОРЗИНЫ ----------
function updateCartCount() {
  const el = document.querySelector('.cart-count');
  if (!el) return;
  const total = Store.getCart().reduce((s, i) => s + i.qty, 0);
  if (total > 0) {
    el.textContent = total;
    el.classList.add('show');
  } else {
    el.classList.remove('show');
  }
}

// ---------- ПОДСВЕТКА АКТИВНОГО ПУНКТА МЕНЮ ----------
function highlightNav() {
  const path = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav a').forEach(a => {
    const href = a.getAttribute('href');
    if (href === path ||
        (path === '' && href === 'index.html') ||
        (path === 'index.html' && href === 'index.html')) {
      a.classList.add('active');
    }
  });
}

// ---------- МОДАЛЬНЫЕ ОКНА ----------
function openModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.add('show');
}
function closeModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.remove('show');
}

document.addEventListener('click', e => {
  if (e.target.classList && e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('show');
  }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.show')
      .forEach(m => m.classList.remove('show'));
  }
});

// ---------- АВТОРИЗАЦИЯ ----------
function openAuthModal(callback) {
  window._authCallback = callback || null;
  openModal('authModal');
}

function requireAuth(action) {
  if (Store.isAuthorized()) action();
  else openAuthModal(action);
}

// ---------- ОБНОВЛЕНИЕ UI ПРОФИЛЯ ----------
function updateProfileUI() {
  const nameEl = document.querySelector('[data-user-name]');
  const phoneEl = document.querySelector('[data-user-phone]');
  const user = Store.getUser();
  if (!user) return;
  if (nameEl) nameEl.value = user.name || '';
  if (phoneEl) phoneEl.textContent = user.phone || '—';
}

// ---------- УВЕДОМЛЕНИЯ ----------
let toastTimer;
function showToast(msg) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2400);
}

// ---------- ФОРМАТ ЦЕНЫ ----------
function formatPrice(n) {
  return Math.round(n) + 'р.';
}

// ---------- ИНИЦИАЛИЗАЦИЯ ----------
document.addEventListener('DOMContentLoaded', () => {
  // ---------- Форма авторизации ----------
  const authForm = document.getElementById('authForm');
  if (authForm) {
    authForm.addEventListener('submit', async e => {
      e.preventDefault();
      const phone = document.getElementById('authPhone').value.trim();
      const name = document.getElementById('authName').value.trim();
      if (!phone || !name) { showToast('Заполните все поля'); return; }

      try {
        await Api.login(phone, name);
        closeModal('authModal');
        showToast(`Добро пожаловать, ${name}!`);
        updateProfileUI();
        if (typeof window._authCallback === 'function') {
          const cb = window._authCallback;
          window._authCallback = null;
          cb();
        }
      } catch (err) {
        showToast(err.message || 'Ошибка входа');
      }
    });
  }

  // ---------- Бургер-меню ----------
  const burger = document.querySelector('.burger');
  const nav = document.querySelector('.nav');
  if (burger && nav) {
    burger.addEventListener('click', () => nav.classList.toggle('open'));
    document.addEventListener('click', e => {
      if (!nav.contains(e.target) && !burger.contains(e.target)) {
        nav.classList.remove('open');
      }
    });
  }

  // ---------- Иконка профиля ----------
  const profileBtn = document.querySelector('[data-profile-btn]');
  if (profileBtn) {
    profileBtn.addEventListener('click', e => {
      e.preventDefault();
      if (Store.isAuthorized()) location.href = 'profile.html';
      else openAuthModal(() => location.href = 'profile.html');
    });
  }

  highlightNav();
  updateCartCount();
  updateProfileUI();
});