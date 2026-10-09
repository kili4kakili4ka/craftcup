/* ================================================================
   Корзина + оформление заказа
   Проверка авторизации → проверка карты (API) → заказ на сервер
   ================================================================ */

// ---------- ОТРИСОВКА КОРЗИНЫ ----------
function renderCart() {
  const root = document.getElementById('cartRoot');
  if (!root) return;

  const cart = Store.getCart();

  if (cart.length === 0) {
    root.innerHTML = `
      <div class="empty-cart">
        <p>Ваша корзина пуста</p>
        <a href="menu.html" class="btn" style="margin-top:24px;">Перейти в меню</a>
      </div>`;
    return;
  }

  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);

  root.innerHTML = `
    ${cart.map((item, i) => `
      <div class="cart-item" style="animation-delay:${i * 0.08}s">
        <img src="images/${item.img}" alt="${item.name}">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-counter">
          <button data-index="${i}" data-delta="-1">−</button>
          <span>${item.qty}</span>
          <button data-index="${i}" data-delta="1">+</button>
        </div>
        <div class="cart-item-price">${formatPrice(item.price * item.qty)}</div>
        <button class="trash-btn" data-remove="${i}" title="Удалить">
          <svg viewBox="0 0 24 24">
            <path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M6 6l1 14h10l1-14"/>
          </svg>
        </button>
      </div>
    `).join('')}

    <div class="cart-footer">
      <a href="menu.html" class="btn btn-outline">Меню</a>
      <div class="total">Итого: ${formatPrice(total)}</div>
      <button class="btn" id="checkoutBtn">Оформить</button>
    </div>
  `;

  // Изменение количества
  root.querySelectorAll('.cart-counter button').forEach(btn => {
    btn.addEventListener('click', () => {
      Store.updateQty(
        parseInt(btn.dataset.index, 10),
        parseInt(btn.dataset.delta, 10)
      );
      renderCart();
    });
  });

  // Удаление позиции
  root.querySelectorAll('[data-remove]').forEach(btn => {
    btn.addEventListener('click', () => {
      Store.removeFromCart(parseInt(btn.dataset.remove, 10));
      showToast('Позиция удалена');
      renderCart();
    });
  });

  // Кнопка "Оформить"
  const checkout = document.getElementById('checkoutBtn');
  if (checkout) checkout.addEventListener('click', startCheckout);
}

// ================================================================
//   ОФОРМЛЕНИЕ
// ================================================================

function startCheckout() {
  // Шаг 1: проверка авторизации
  if (!Store.isAuthorized()) {
    openAuthModal(() => checkCardAndOpenCheckout());
    return;
  }
  checkCardAndOpenCheckout();
}

async function checkCardAndOpenCheckout() {
  // Шаг 2: проверка привязанной карты через API
  try {
    const cards = await Api.getCards();
    if (!cards.length) {
      openModal('noCardModal');
      return;
    }
    // Шаг 3: открываем модалку оформления
    openCheckoutModal(cards);
  } catch (e) {
    showToast('Не удалось загрузить карты');
  }
}

function goToProfile() {
  closeModal('noCardModal');
  setTimeout(() => location.href = 'profile.html', 200);
}

function openCheckoutModal(cards) {
  const cart = Store.getCart();
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);

  // Сводка заказа
  const summary = document.getElementById('checkoutSummary');
  summary.innerHTML = `
    ${cart.map(i => `
      <div class="summary-row">
        <span>${i.name} × ${i.qty}</span>
        <span>${formatPrice(i.price * i.qty)}</span>
      </div>
    `).join('')}
    <div class="summary-row">
      <span>Итого</span>
      <span>${formatPrice(total)}</span>
    </div>
  `;

  // Первая карта
  const card = cards[0];
  const masked = '**** **** **** ' + card.number.slice(-4);
  document.getElementById('checkoutCardInfo').innerHTML = `
    <svg viewBox="0 0 34 22" fill="none" stroke="currentColor" stroke-width="1.5">
      <rect x="1" y="1" width="32" height="20" rx="3"/>
      <line x1="1" y1="7" x2="33" y2="7"/>
      <line x1="5" y1="14" x2="12" y2="14"/>
    </svg>
    <span>${masked}</span>
    <span class="card-hint">по умолчанию</span>
  `;

  document.getElementById('checkoutComment').value = '';
  openModal('checkoutModal');
}

// ---------- ПОДТВЕРЖДЕНИЕ ЗАКАЗА ----------
document.addEventListener('DOMContentLoaded', () => {
  renderCart();

  const confirmBtn = document.getElementById('confirmOrderBtn');
  if (!confirmBtn) return;

  confirmBtn.addEventListener('click', async () => {
    const cart = Store.getCart();
    if (!cart.length) { showToast('Корзина пуста'); return; }

    let cards;
    try {
      cards = await Api.getCards();
    } catch {
      showToast('Не удалось получить карты');
      return;
    }

    if (!cards.length) {
      closeModal('checkoutModal');
      openModal('noCardModal');
      return;
    }

    const total = cart.reduce((s, i) => s + i.price * i.qty, 0);

    const order = {
      items: cart.map(i => ({
        name: i.name,
        price: i.price,
        qty: i.qty,
        mods: i.mods || null
      })),
      total,
      location: document.getElementById('checkoutLocation').value,
      time: document.getElementById('checkoutTime').value,
      comment: document.getElementById('checkoutComment').value.trim(),
      cardMasked: '**** **** **** ' + cards[0].number.slice(-4)
    };

    try {
      const { orderId } = await Api.createOrder(order);
      Store.clearCart();
      closeModal('checkoutModal');
      showToast(`Заказ №${orderId} оформлен ☕`);
      renderCart();
      setTimeout(() => location.href = 'index.html', 2200);
    } catch (e) {
      showToast('Ошибка: ' + e.message);
    }
  });
});