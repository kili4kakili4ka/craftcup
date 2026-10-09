/* ================================================================
   Личный кабинет — защита входа, данные пользователя,
   карты через API (добавление/удаление), выход
   ================================================================ */

// ---------- МАСКИРОВАНИЕ НОМЕРА ----------
function maskCardNumber(num) {
  const digits = (num || '').replace(/\D/g, '');
  if (digits.length < 4) return '**** **** **** ****';
  return `**** **** **** ${digits.slice(-4)}`;
}

// ---------- ФОРМАТИРОВАНИЕ ВВОДА ----------
function formatCardInput(value) {
  const digits = value.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(.{4})/g, '$1 ').trim();
}
function formatExpiry(value) {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return digits.slice(0, 2) + '/' + digits.slice(2);
}

// ---------- РЕНДЕР СПИСКА КАРТ ----------
async function renderCards() {
  const root = document.getElementById('cardsList');
  if (!root) return;

  root.innerHTML = '<div class="no-cards">Загрузка…</div>';

  let cards = [];
  try {
    cards = await Api.getCards();
  } catch {
    root.innerHTML = `<div class="no-cards">Не удалось загрузить карты</div>`;
    return;
  }

  if (!cards.length) {
    root.innerHTML = `<div class="no-cards">Нет привязанных карт</div>`;
    return;
  }

  root.innerHTML = cards.map((card, i) => `
    <div class="card-item" style="animation-delay:${i * 0.05}s">
      <div>
        <div class="card-number">${maskCardNumber(card.number)}</div>
        <div class="card-label">${card.holder || 'Без имени'} · до ${card.expiry || '—'}</div>
      </div>
      <button class="trash-btn" data-remove-card="${card.id}" title="Удалить">
        <svg viewBox="0 0 24 24">
          <path d="M3 6h18"/>
          <path d="M8 6V4h8v2"/>
          <path d="M6 6l1 14h10l1-14"/>
        </svg>
      </button>
    </div>
  `).join('');

  // Удаление
  root.querySelectorAll('[data-remove-card]').forEach(btn => {
    btn.addEventListener('click', async () => {
      try {
        await Api.removeCard(btn.dataset.removeCard);
        showToast('Карта удалена');
        renderCards();
      } catch (e) {
        showToast(e.message || 'Ошибка удаления');
      }
    });
  });
}

// ---------- ИНИЦИАЛИЗАЦИЯ ----------
document.addEventListener('DOMContentLoaded', () => {
  // Если не авторизован — показываем модалку
  if (!Store.isAuthorized()) {
    openAuthModal(() => location.reload());
  }

  // Заполняем профиль
  updateProfileUI();
  const user = Store.getUser();
  if (user) {
    const nameField = document.getElementById('profileName');
    if (nameField) nameField.value = user.name || '';
    const phoneEl = document.querySelector('[data-user-phone]');
    if (phoneEl) phoneEl.textContent = user.phone || '—';
  }

  // Сохранить имя (локально + в localStorage)
  const saveBtn = document.getElementById('saveProfile');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const u = Store.getUser();
      if (!u) return;
      const name = document.getElementById('profileName').value.trim();
      if (!name) { showToast('Введите имя'); return; }
      u.name = name;
      Store.setUser(u);
      updateProfileUI();
      showToast('Данные сохранены');
    });
  }

  // ---------- КАРТЫ ----------
  renderCards();

  const addCardBtn = document.getElementById('addCardBtn');
  if (addCardBtn) {
    addCardBtn.addEventListener('click', () => {
      document.getElementById('cardNumber').value = '';
      document.getElementById('cardExpiry').value = '';
      document.getElementById('cardName').value = '';
      openModal('cardModal');
    });
  }

  // Форматирование ввода
  const cardNumberInput = document.getElementById('cardNumber');
  if (cardNumberInput) {
    cardNumberInput.addEventListener('input', e => {
      e.target.value = formatCardInput(e.target.value);
    });
  }
  const cardExpiryInput = document.getElementById('cardExpiry');
  if (cardExpiryInput) {
    cardExpiryInput.addEventListener('input', e => {
      e.target.value = formatExpiry(e.target.value);
    });
  }

  // Сохранить карту через API
  const saveCardBtn = document.getElementById('saveCardBtn');
  if (saveCardBtn) {
    saveCardBtn.addEventListener('click', async () => {
      const number = document.getElementById('cardNumber').value.replace(/\s/g, '');
      const expiry = document.getElementById('cardExpiry').value.trim();
      const holder = document.getElementById('cardName').value.trim();

      if (number.length !== 16) { showToast('Номер карты — 16 цифр'); return; }
      if (expiry.length !== 5)  { showToast('Срок действия — ММ/ГГ'); return; }

      try {
        await Api.addCard({ number, expiry, holder });
        closeModal('cardModal');
        showToast('Карта добавлена');
        renderCards();
      } catch (e) {
        showToast(e.message || 'Ошибка добавления');
      }
    });
  }

  // Выход
  const logout = document.getElementById('logoutBtn');
  if (logout) {
    logout.addEventListener('click', () => {
      Store.logout();
      showToast('Вы вышли из аккаунта');
      setTimeout(() => location.href = 'index.html', 800);
    });
  }
});