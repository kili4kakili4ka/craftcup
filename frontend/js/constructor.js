/* ================================================================
   Конструктор напитков — расчёт стоимости
   ================================================================ */

// Базовая цена напитка и цены на компоненты
const BASE_PRICE = 199;     // базовая цена "конструктора"
const PRICE_ESPRESSO = 40;  // за каждый доп. шот эспрессо
const PRICE_MILK = 30;      // за каждый шот молока
const PRICE_SUGAR = 0;      // сахар бесплатно

const state = {
  espresso: 1,
  milk: 0,
  sugar: 0,
  syrup: 0,
  syrupName: 'none',
  volume: 200,
  volumeExtra: 0,
  milkType: 'regular',
  milkTypeExtra: 0
};

function updateTotal() {
  const total =
    BASE_PRICE +
    Math.max(0, state.espresso - 1) * PRICE_ESPRESSO +
    state.milk * PRICE_MILK +
    state.sugar * PRICE_SUGAR +
    state.syrup +
    state.volumeExtra +
    state.milkTypeExtra;

  document.getElementById('totalValue').textContent = total + 'р.';
  return total;
}

document.addEventListener('DOMContentLoaded', () => {
  // Счётчики
  document.querySelectorAll('.counter button').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.count;
      const delta = parseInt(btn.dataset.delta, 10);
      state[key] = Math.max(0, state[key] + delta);
      document.getElementById(key).textContent = state[key];
      updateTotal();
    });
  });

  // Сироп
  const syrup = document.getElementById('syrup');
  syrup.addEventListener('change', () => {
    const [name, price] = syrup.value.split('|');
    state.syrupName = name;
    state.syrup = parseInt(price, 10);
    updateTotal();
  });

  // Объём
  const volume = document.getElementById('volume');
  volume.addEventListener('change', () => {
    const [vol, extra] = volume.value.split('|');
    state.volume = parseInt(vol, 10);
    state.volumeExtra = parseInt(extra, 10);
    updateTotal();
  });

  // Тип молока
  const milkType = document.getElementById('milkType');
  milkType.addEventListener('change', () => {
    const [name, extra] = milkType.value.split('|');
    state.milkType = name;
    state.milkTypeExtra = parseInt(extra, 10);
    updateTotal();
  });

  // Добавить в корзину
  document.getElementById('addConstructor').addEventListener('click', () => {
    const total = updateTotal();
    const mods = {
      espresso: state.espresso,
      milk: state.milk,
      sugar: state.sugar,
      syrup: state.syrupName,
      volume: state.volume,
      milkType: state.milkType
    };

    Store.addToCart({
      id: 'custom-' + Date.now(),
      name: 'Крафт Кофе',
      img: 'cup-hero.png',
      price: total,
      qty: 1,
      mods
    });

    showToast('Крафт Кофе добавлен в корзину');
  });

  updateTotal();
});