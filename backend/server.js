const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = 4000;
const JWT_SECRET = 'craftcup-secret-change-me';

app.use(cors());
app.use(express.json());

// Раздаём фронтенд с того же сервера
app.use(express.static(path.join(__dirname, '../frontend')));

// ---------- ПРОВЕРКА ТОКЕНА ----------
function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'Нет токена' });
  try {
    req.user = jwt.verify(header.replace('Bearer ', ''), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Токен недействителен' });
  }
}

// ---------- АВТОРИЗАЦИЯ ----------
app.post('/api/auth', (req, res) => {
  const { phone, name } = req.body;
  if (!phone || !name) return res.status(400).json({ error: 'Заполните поля' });

  let user = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone);
  if (!user) {
    const r = db.prepare('INSERT INTO users (phone, name) VALUES (?, ?)').run(phone, name);
    user = { id: r.lastInsertRowid, phone, name };
  }

  const token = jwt.sign(
    { id: user.id, phone: user.phone, name: user.name },
    JWT_SECRET,
    { expiresIn: '30d' }
  );

  res.json({ token, user: { id: user.id, phone: user.phone, name: user.name } });
});

// ---------- МЕНЮ ----------
app.get('/api/menu', (req, res) => {
  const cats = db.prepare('SELECT * FROM categories ORDER BY sort_order').all();
  const stmt = db.prepare('SELECT * FROM drinks WHERE category_id = ? AND is_available = 1');

  res.json(cats.map(c => ({
    id: c.id,
    title: c.name,
    items: stmt.all(c.id).map(d => ({
      id: String(d.id),
      name: d.name,
      desc: d.description,
      price: d.base_price,
      priceFrom: !!d.price_from,
      img: d.image
    }))
  })));
});

// ---------- КАРТЫ ----------
app.get('/api/cards', auth, (req, res) => {
  const cards = db.prepare(
    'SELECT id, number, expiry, holder FROM cards WHERE user_id = ?'
  ).all(req.user.id);
  res.json(cards);
});

app.post('/api/cards', auth, (req, res) => {
  const { number, expiry, holder } = req.body;
  if (!number || number.length !== 16) {
    return res.status(400).json({ error: 'Неверный номер карты' });
  }
  const r = db.prepare(`
    INSERT INTO cards (user_id, number, expiry, holder) VALUES (?, ?, ?, ?)
  `).run(req.user.id, number, expiry || '', holder || '');
  res.json({ id: r.lastInsertRowid });
});

app.delete('/api/cards/:id', auth, (req, res) => {
  db.prepare('DELETE FROM cards WHERE id = ? AND user_id = ?')
    .run(req.params.id, req.user.id);
  res.json({ ok: true });
});

// ---------- ЗАКАЗЫ ----------
app.post('/api/orders', auth, (req, res) => {
  const { items, total, location, time, comment, cardMasked } = req.body;
  if (!items || !items.length) {
    return res.status(400).json({ error: 'Корзина пуста' });
  }

  const tx = db.transaction(() => {
    const orderId = db.prepare(`
      INSERT INTO orders (user_id, total, location, time_slot, comment, card_masked)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(req.user.id, total, location, time, comment || '', cardMasked || '')
      .lastInsertRowid;

    const insItem = db.prepare(`
      INSERT INTO order_items (order_id, name, price, qty, mods)
      VALUES (?, ?, ?, ?, ?)
    `);

    for (const it of items) {
      insItem.run(orderId, it.name, it.price, it.qty, JSON.stringify(it.mods || null));
    }
    return orderId;
  });

  res.json({ orderId: tx() });
});

app.get('/api/orders', auth, (req, res) => {
  const orders = db.prepare(
    'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC'
  ).all(req.user.id);
  res.json(orders);
});

// ---------- СТАРТ ----------
app.listen(PORT, () => {
  console.log(`🚀 CraftCup сервер запущен: http://localhost:${PORT}`);
  console.log(`📋 Меню из БД:               http://localhost:${PORT}/api/menu`);
});