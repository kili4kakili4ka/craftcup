/* ================================================================
   Меню — загрузка с API, рендер, попап напитка, выбор объёма,
   добавление в корзину
   ================================================================ */

// Объёмы для напитков с ценой "от"
const VOLUMES = [
  { ml: 200, delta: 0,  label: '200 мл' },
  { ml: 300, delta: 40, label: '300 мл' },
  { ml: 400, delta: 70, label: '400 мл' }
];

let menuCache = [];
let currentDrink = null;
let currentVolume = null;

// ---------- ЗАГРУЗКА МЕНЮ С СЕРВЕРА ----------
async function loadMenu() {
  const root = document.getElementById('menuRoot');
  if (!root) return;

  root.innerHTML = '<p style="text-align:center;padding:60px 0;opacity:0.6;">Загрузка меню…</p>';

  try {
    menuCache = await Api.getMenu();
    renderMenu(menuCache);
  } catch (e) {
    root.innerHTML = `
      <p style="text-align:center;padding:60px 0;color:#b04a3a;">
        Не удалось загрузить меню.<br>
        Проверьте, запущен ли сервер (node server.js).
      </p>`;
  }
}

// ---------- РЕНДЕР МЕНЮ ----------
function renderMenu(menu) {
  const root = document.getElementById('menuRoot');

  root.innerHTML = menu.map((section, si) => `
    <section class="menu-section" data-section="${section.id}"
             style="animation-delay:${si * 0.1}s">
      <div class="section-header" data-toggle>
        <h2>${section.title}</h2>
        <span class="section-toggle">⌄</span>
      </div>
      <div class="section-body">
        <div class="items-grid">
          ${section.items.map((it, i) => `
            <div class="item" data-id="${it.id}"
                 style="animation-delay:${i * 0.05}s">
              <img src="images/${it.img}" alt="${it.name}">
              <div class="item-name">${it.name}</div>
              <span class="item-price">${it.priceFrom ? 'от ' : ''}${it.price}р.</span>
            </div>
          `).join('')}
        </div>
      </div>
    </section>
  `).join('');

  // Сворачивание разделов
  root.querySelectorAll('[data-toggle]').forEach(h => {
    h.addEventListener('click', () => {
      h.closest('.menu-section').classList.toggle('collapsed');
    });
  });

  // Клик по напитку
  root.querySelectorAll('.item').forEach(el => {
    el.addEventListener('click', () => openDrinkModal(el.dataset.id));
  });
}

// ---------- ПОИСК НАПИТКА ПО ID ----------
function findDrink(id) {
  for (const s of menuCache) {
    const item = s.items.find(i => i.id === id);
    if (item) return item;
  }
  return null;
}

// ---------- ОТКРЫТИЕ ПОПАПА НАПИТКА ----------
function openDrinkModal(id) {
  const drink = findDrink(id);
  if (!drink) return;
  currentDrink = drink;
  currentVolume = null;

  document.getElementById('dm-img').src = 'images/' + drink.img;
  document.getElementById('dm-img').alt = drink.name;
  document.getElementById('dm-name').textContent = drink.name;
  document.getElementById('dm-desc').textContent = drink.desc;

  const volumeBlock = document.getElementById('dm-volume-block');
  const volumesRoot = document.getElementById('dm-volumes');

  if (drink.priceFrom) {
    volumeBlock.style.display = 'block';
    volumesRoot.innerHTML = VOLUMES.map((v, i) => `
      <button class="volume-btn ${i === 0 ? 'active' : ''}"
              data-ml="${v.ml}" data-delta="${v.delta}">
        <span class="volume-ml">${v.label}</span>
        <span class="volume-price">${drink.price + v.delta}р.</span>
      </button>
    `).join('');

    currentVolume = { ml: VOLUMES[0].ml, delta: VOLUMES[0].delta };
    updateDrinkPrice();

    volumesRoot.querySelectorAll('.volume-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        volumesRoot.querySelectorAll('.volume-btn')
          .forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentVolume = {
          ml: parseInt(btn.dataset.ml, 10),
          delta: parseInt(btn.dataset.delta, 10)
        };
        updateDrinkPrice();
      });
    });
  } else {
    volumeBlock.style.display = 'none';
    volumesRoot.innerHTML = '';
    updateDrinkPrice();
  }

  openModal('drinkModal');
}

function updateDrinkPrice() {
  if (!currentDrink) return;
  const extra = currentVolume ? currentVolume.delta : 0;
  const total = currentDrink.price + extra;
  document.getElementById('dm-price').textContent =
    (currentDrink.priceFrom ? 'от ' : '') + total + 'р.';
}

// ---------- ИНИЦИАЛИЗАЦИЯ ----------
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('menuRoot')) loadMenu();

  const addBtn = document.getElementById('dm-add');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      if (!currentDrink) return;

      const extra = currentVolume ? currentVolume.delta : 0;
      const total = currentDrink.price + extra;

      let displayName = currentDrink.name;
      if (currentVolume && currentDrink.priceFrom) {
        displayName += ` (${currentVolume.ml} мл)`;
      }

      const cartId = currentDrink.id +
        (currentVolume ? `-${currentVolume.ml}` : '');

      Store.addToCart({
        id: cartId,
        name: displayName,
        img: currentDrink.img,
        price: total,
        qty: 1
      });

      closeModal('drinkModal');
      showToast(`${displayName} — добавлено`);
    });
  }
});