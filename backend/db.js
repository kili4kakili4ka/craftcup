const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.RAILWAY_VOLUME_MOUNT_PATH
  ? path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, 'craftcup.db')
  : path.join(__dirname, 'craftcup.db');
const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

// ---------- СОЗДАНИЕ ТАБЛИЦ ----------
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS drinks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER REFERENCES categories(id),
    name TEXT NOT NULL,
    description TEXT,
    base_price REAL NOT NULL,
    price_from INTEGER DEFAULT 0,
    image TEXT,
    is_available INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    number TEXT NOT NULL,
    expiry TEXT,
    holder TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    total REAL NOT NULL,
    location TEXT,
    time_slot TEXT,
    comment TEXT,
    card_masked TEXT,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    qty INTEGER NOT NULL,
    mods TEXT
  );
`);

// ---------- ЗАПОЛНЕНИЕ МЕНЮ (только один раз) ----------
const count = db.prepare('SELECT COUNT(*) AS c FROM drinks').get().c;
if (count === 0) {
  const insertCat = db.prepare('INSERT INTO categories (name, sort_order) VALUES (?, ?)');
  const coffee   = insertCat.run('Кофе', 1).lastInsertRowid;
  const tea      = insertCat.run('Чай', 2).lastInsertRowid;
  const desserts = insertCat.run('Десерты и сэндвичи', 3).lastInsertRowid;

  const insertDrink = db.prepare(`
    INSERT INTO drinks (category_id, name, description, base_price, price_from, image)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const drinks = [
    [coffee, 'Айс Кофе', 'Холодный эспрессо с молоком и льдом.', 179, 0, 'ays-coffee.png'],
    [coffee, 'Айс Кофе с карамелью', 'Айс кофе с карамельным сиропом.', 189, 0, 'ays-caramel.png'],
    [coffee, 'Айс Кофе кокос', 'Холодный кофе с кокосовым молоком.', 189, 0, 'ays-coconut.png'],
    [coffee, 'Капучино', 'Классика: эспрессо и молочная пена.', 149, 1, 'cappuccino.png'],
    [coffee, 'Латте малина', 'Мягкий латте с малиновым сиропом.', 159, 1, 'latte-raspberry.png'],
    [coffee, 'Латте с карамелью', 'Тёплый латте с карамелью.', 159, 1, 'latte-caramel.png'],
    [coffee, 'Раф орех', 'Нежный раф с ореховым сиропом.', 189, 0, 'raf-nut.png'],
    [coffee, 'Раф малина', 'Раф с малиновым сиропом.', 189, 0, 'raf-raspberry.png'],
    [tea, 'Чёрный чай', 'Классический чёрный чай.', 149, 1, 'tea-black.png'],
    [tea, 'Чёрный чай малина', 'Чай с малиной.', 159, 1, 'tea-raspberry.png'],
    [tea, 'Чёрный чай лимон', 'Чай с лимоном.', 159, 1, 'tea-lemon.png'],
    [desserts, 'Сэндвич', 'С ветчиной, сыром и овощами.', 179, 0, 'sandwich.png'],
    [desserts, 'Маффин шоколадный', 'Влажный шоколадный маффин.', 119, 0, 'muffin.png'],
    [desserts, 'Синнабон', 'Булочка с корицей и глазурью.', 159, 0, 'cinnamon.png'],
    [desserts, 'Сырники', 'Домашние сырники.', 139, 0, 'syrniki.png']
  ];

  const insertMany = db.transaction(rows => {
    for (const r of rows) insertDrink.run(...r);
  });
  insertMany(drinks);

  console.log('✅ База данных создана и заполнена меню');
} else {
  console.log('✅ База данных уже существует — меню не перезаписано');
}

module.exports = db;