"""
D-Market REST API Server & Full Web Platform
Лабораторная работа №3: Разработка REST API, проектирование схемы БД, настройка .env и CORS
Интеграция с фронтендом Лабораторной работы №2 (D-Market Desktop & Mobile).
Стек: Python 3, Flask, SQLite3, Flask-CORS, python-dotenv
"""

import os
import sqlite3
import json
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv
from flask import Flask, request, jsonify, render_template_string, make_response, send_from_directory, session
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename

# 1. Загрузка конфигурации из файла окружения .env
BASE_DIR = Path(__file__).resolve().parent
ENV_PATH = BASE_DIR / '.env'
load_dotenv(dotenv_path=ENV_PATH)

PORT = int(os.getenv('PORT', 5000))
HOST = os.getenv('HOST', '0.0.0.0')
DEBUG = os.getenv('DEBUG', 'True').lower() in ('true', '1', 'yes')
SECRET_KEY = os.getenv('SECRET_KEY', 'default_secret_key_change_in_production')
CORS_ORIGIN = os.getenv('CORS_ORIGIN', '*')
CORS_METHODS = [m.strip() for m in os.getenv('CORS_METHODS', 'GET,POST,PUT,DELETE,OPTIONS').split(',')]
CORS_HEADERS = [h.strip() for h in os.getenv('CORS_HEADERS', 'Content-Type,Authorization').split(',')]

# Поддержка Serverless (Vercel): файловая система в /var/task доступна только для чтения,
# поэтому переносим SQLite базу данных в /tmp, где разрешена запись.
if os.getenv('VERCEL') == '1':
    import shutil
    tmp_db = Path('/tmp/d_market.db')
    orig_db = BASE_DIR / os.getenv('DATABASE_PATH', 'd_market.db')
    if not tmp_db.exists() and orig_db.exists():
        try:
            shutil.copy2(orig_db, tmp_db)
        except Exception:
            pass
    DB_PATH = tmp_db
    UPLOAD_DIR = Path('/tmp/uploads')
else:
    DB_PATH = BASE_DIR / os.getenv('DATABASE_PATH', 'd_market.db')
    UPLOAD_DIR = BASE_DIR / 'uploads'

# 2. Инициализация приложения Flask
app = Flask(__name__, static_folder=str(BASE_DIR), static_url_path='')
app.config['SECRET_KEY'] = SECRET_KEY
app.json.ensure_ascii = False
app.json.sort_keys = False

# 3. Настройка политики CORS (Cross-Origin Resource Sharing)
CORS(
    app,
    resources={r"/*": {"origins": "*"}},
    methods=CORS_METHODS,
    allow_headers=CORS_HEADERS,
    supports_credentials=True
)

# 4. Вспомогательные функции работы с базой данных
def get_db():
    """Подключение к базе данных SQLite с поддержкой внешних ключей и доступа по именам колонок."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

def init_db():
    """Автоматическая инициализация схемы таблиц и заполнение тестовыми данными."""
    conn = get_db()
    cursor = conn.cursor()

    # Создание таблиц
    schema_file = BASE_DIR / 'schema.sql'
    if schema_file.exists():
        with open(schema_file, 'r', encoding='utf-8') as f:
            cursor.executescript(f.read())
    else:
        cursor.executescript("""
            CREATE TABLE IF NOT EXISTS categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                slug TEXT NOT NULL UNIQUE,
                icon TEXT DEFAULT '',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                login TEXT NOT NULL UNIQUE,
                name TEXT NOT NULL,
                password_hash TEXT NOT NULL,
                phone TEXT DEFAULT '',
                role TEXT DEFAULT 'user',
                avatar TEXT DEFAULT '',
                is_blocked INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS listings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                category_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                price INTEGER NOT NULL,
                subcategory TEXT DEFAULT '',
                image TEXT DEFAULT '',
                location TEXT NOT NULL,
                seller TEXT NOT NULL,
                phone TEXT NOT NULL,
                views INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
                FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
            );
            CREATE TABLE IF NOT EXISTS favorites (
                user_id INTEGER NOT NULL,
                listing_id INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (user_id, listing_id),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE
            );
        """)

    # Начальный набор категорий
    cursor.execute("SELECT COUNT(*) FROM categories")
    if cursor.fetchone()[0] == 0:
        categories = [
            ('Недвижимость', 'real-estate', 'home'),
            ('Транспорт', 'transport', 'car'),
            ('Электроника', 'electronics', 'cpu'),
            ('Дом', 'home-living', 'layout'),
            ('Одежда и обувь', 'fashion', 'shopping-bag'),
            ('Услуги', 'services', 'tool')
        ]
        cursor.executemany("INSERT INTO categories (name, slug, icon) VALUES (?, ?, ?)", categories)

    # Начальный администратор и тестовый пользователь
    cursor.execute("SELECT COUNT(*) FROM users")
    if cursor.fetchone()[0] == 0:
        admin_pass = generate_password_hash('admin123')
        user_pass = generate_password_hash('password123')
        cursor.execute("INSERT INTO users (login, name, password_hash, phone, role) VALUES (?, ?, ?, ?, ?)",
                       ('admin', 'Данель Балтабаев (Админ)', admin_pass, '87770648263', 'admin'))
        cursor.execute("INSERT INTO users (login, name, password_hash, phone, role) VALUES (?, ?, ?, ?, ?)",
                       ('user1', 'Алихан Сатпаев', user_pass, '+7 (701) 555-12-34', 'user'))

    # Начальный набор объявлений (минимум 5-10 записей для лабы 3)
    cursor.execute("SELECT COUNT(*) FROM listings")
    if cursor.fetchone()[0] == 0:
        cat_map = dict(cursor.execute("SELECT name, id FROM categories").fetchall())
        user_id = cursor.execute("SELECT id FROM users WHERE login = 'admin'").fetchone()[0]

        initial_listings = [
            (
                user_id, cat_map['Электроника'], 'MacBook Pro 14 M3 Space Gray',
                '16 ГБ RAM, 512 ГБ SSD. Состояние идеальное, батарея 98%, полный комплект с коробкой и зарядкой.',
                899900, 'Ноутбуки и ПК',
                'https://images.unsplash.com/photo-1764533668787-5c0a9f565ea0?auto=format&fit=crop&w=1200&q=85',
                'Усть-Каменогорск', 'Данель Балтабаев', '+7 (777) 064-82-63', 142
            ),
            (
                user_id, cat_map['Транспорт'], 'Шоссейный велосипед Carbon Road',
                'Легкая карбоновая рама, размер M. Навесное оборудование Shimano 105, новые покрышки Continental.',
                380000, 'Мототехника',
                'https://images.unsplash.com/photo-1532298229144-0ec0c57515c7?auto=format&fit=crop&w=1200&q=85',
                'Астана, Есильский район', 'Михаил', '+7 (702) 174-08-51', 98
            ),
            (
                user_id, cat_map['Дом'], 'Дизайнерский модульный диван Loop',
                'Буклированная мягкая ткань, глубокая посадка. Цвет айвори, покупали меньше года назад.',
                450000, 'Мебель и интерьер',
                'https://images.unsplash.com/photo-1738168246881-40f35f8aba0a?auto=format&fit=crop&w=1200&q=85',
                'Алматы, Медеуский район', 'Анна', '+7 (701) 248-16-32', 215
            ),
            (
                user_id, cat_map['Недвижимость'], 'Светлая 2-комнатная квартира у метро',
                'Дизайнерский ремонт, 64 кв.м, видовой этаж. Полностью меблирована, готова к заселению.',
                450000, 'Квартиры',
                'https://images.unsplash.com/photo-1738168279272-c08d6dd22002?auto=format&fit=crop&w=1200&q=85',
                'Усть-Каменогорск', 'Олег', '+7 (708) 311-62-04', 310
            ),
            (
                user_id, cat_map['Электроника'], 'Sony PlayStation 5 Slim 1TB',
                'Вторая ревизия, два геймпада DualSense, подписка PS Plus до конца года. Состояние нового.',
                275000, 'Бытовая техника',
                'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=1200&q=85',
                'Караганда', 'Дамир', '+7 (707) 812-44-09', 180
            ),
            (
                user_id, cat_map['Услуги'], 'Предметная и lifestyle фотосъемка',
                'Съемка для маркетплейсов и каталогов. Обработка, цветокоррекция и ретушь в подарок.',
                45000, 'Фото и видеосъемка',
                'https://images.unsplash.com/photo-1574611181386-394fe2237101?auto=format&fit=crop&w=1200&q=85',
                'Алматы', 'Настя', '+7 (707) 063-27-80', 75
            ),
            (
                user_id, cat_map['Дом'], 'Прецизионная кофемолка Timemore C3',
                'Стальные конические жернова, идеальный помол для фильтра и эспрессо. Компактный корпус.',
                39900, 'Посуда и текстиль',
                'https://images.unsplash.com/photo-1536505847234-1b7adfc33cdd?auto=format&fit=crop&w=1200&q=85',
                'Шымкент', 'Саша', '+7 (747) 048-35-76', 56
            ),
            (
                user_id, cat_map['Одежда и обувь'], 'Винтажная кожаная куртка-косуха',
                'Натуральная телячья кожа, размер L. Итальянская фурнитура, стильный состаренный вид.',
                68000, 'Мужская одежда',
                'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=1200&q=85',
                'Алматы', 'Артур', '+7 (771) 902-11-22', 88
            )
        ]

        cursor.executemany("""
            INSERT INTO listings 
            (user_id, category_id, title, description, price, subcategory, image, location, seller, phone, views)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, initial_listings)

    conn.commit()
    conn.close()

def row_to_dict(row):
    """Преобразование строки SQLite в сериализуемый словарь Python."""
    d = dict(row)
    img = d.get('image', '')
    if img.startswith('['):
        try:
            d['images'] = json.loads(img)
            d['image'] = d['images'][0] if d['images'] else ''
        except Exception:
            d['images'] = [img]
    else:
        d['images'] = [img] if img else []

    # Добавляем date для отображения в карточках интерфейса Lab 2
    if not d.get('date'):
        d['date'] = str(d.get('created_at', ''))[:10] or 'Сегодня'
        
    return d

# ==============================================================================
# REST API ЭНДПОИНТЫ (CRUD)
# ==============================================================================

@app.route('/api/health', methods=['GET'])
def api_health():
    """Проверка жизнеспособности сервера и текущей конфигурации."""
    return jsonify({
        'status': 'ok',
        'service': 'D-Market REST API (Lab 3)',
        'version': '1.0.0',
        'database': 'SQLite 3NF',
        'cors_enabled': True,
        'timestamp': datetime.now().isoformat()
    }), 200

@app.route('/api/categories', methods=['GET'])
def api_categories():
    """Получение списка всех категорий."""
    conn = get_db()
    rows = conn.execute("SELECT id, name, slug, icon FROM categories ORDER BY id ASC").fetchall()
    conn.close()
    return jsonify({
        'success': True,
        'count': len(rows),
        'categories': [dict(r) for r in rows]
    }), 200

# 1. READ ALL: Получение списка всех записей (GET)
@app.route('/api/listings', methods=['GET'])
def get_listings():
    """Получение списка объявлений с фильтрацией и сортировкой."""
    conn = get_db()
    
    category = request.args.get('category', '').strip()
    subcategory = request.args.get('subcategory', '').strip()
    q = request.args.get('query', '').strip()
    min_price = request.args.get('min_price', '').strip()
    max_price = request.args.get('max_price', '').strip()
    sort = request.args.get('sort', 'newest').strip()

    sql = """
        SELECT 
            l.id, l.user_id, l.category_id, c.name AS category, l.subcategory,
            l.title, l.description, l.price, l.image, l.location, l.seller,
            l.phone, l.views, l.created_at
        FROM listings l
        JOIN categories c ON l.category_id = c.id
        WHERE 1=1
    """
    params = []

    if category and category != 'Все':
        if category.isdigit():
            sql += " AND l.category_id = ?"
            params.append(int(category))
        else:
            sql += " AND c.name = ?"
            params.append(category)

    if subcategory and subcategory not in ('Все', 'Все подкатегории'):
        sql += " AND l.subcategory = ?"
        params.append(subcategory)

    if q:
        sql += " AND (l.title LIKE ? OR l.description LIKE ?)"
        params.append(f"%{q}%")
        params.append(f"%{q}%")

    if min_price.isdigit():
        sql += " AND l.price >= ?"
        params.append(int(min_price))

    if max_price.isdigit():
        sql += " AND l.price <= ?"
        params.append(int(max_price))

    # Сортировка
    if sort == 'price_asc':
        sql += " ORDER BY l.price ASC, l.id DESC"
    elif sort == 'price_desc':
        sql += " ORDER BY l.price DESC, l.id DESC"
    elif sort == 'views':
        sql += " ORDER BY l.views DESC, l.id DESC"
    else:
        sql += " ORDER BY l.id DESC"

    rows = conn.execute(sql, params).fetchall()
    listings = [row_to_dict(r) for r in rows]
    conn.close()

    return jsonify({
        'success': True,
        'count': len(listings),
        'listings': listings
    }), 200

# 2. READ ONE: Получение отдельной записи по ID (GET)
@app.route('/api/listings/<int:listing_id>', methods=['GET'])
def get_listing(listing_id):
    """Получение детальной информации об отдельном объявлении по его ID."""
    conn = get_db()
    row = conn.execute("""
        SELECT 
            l.id, l.user_id, l.category_id, c.name AS category, l.subcategory,
            l.title, l.description, l.price, l.image, l.location, l.seller,
            l.phone, l.views, l.created_at
        FROM listings l
        JOIN categories c ON l.category_id = c.id
        WHERE l.id = ?
    """, (listing_id,)).fetchone()

    if not row:
        conn.close()
        return jsonify({
            'success': False,
            'status': 'error',
            'error': f'Объявление с ID {listing_id} не найдено'
        }), 404

    # Увеличиваем счетчик просмотров
    conn.execute("UPDATE listings SET views = views + 1 WHERE id = ?", (listing_id,))
    conn.commit()
    conn.close()

    return jsonify({
        'success': True,
        'listing': row_to_dict(row)
    }), 200

# 3. CREATE: Создание новой записи (POST)
@app.route('/api/listings', methods=['POST'])
def create_listing():
    """Создание нового объявления. Принимает JSON или FormData с загрузкой фото."""
    data = request.get_json(silent=True) or request.form.to_dict()
    if not data and not request.files:
        return jsonify({
            'success': False,
            'error': 'Тело запроса пусто'
        }), 400

    title = str(data.get('title', '')).strip()
    description = str(data.get('description', '')).strip()
    price_raw = data.get('price')
    category_raw = data.get('category') or data.get('category_id')
    subcategory = str(data.get('subcategory', '')).strip()
    image = str(data.get('image', '')).strip()
    location = str(data.get('location', '')).strip() or 'Усть-Каменогорск'
    seller = str(data.get('seller', '')).strip() or 'Данель Балтабаев'
    phone = str(data.get('phone', '')).strip() or '+7 (777) 064-82-63'
    user_id = data.get('user_id') or 1

    # Валидация
    errors = []
    if not title:
        errors.append('Поле "title" обязательно для заполнения')
    if not description:
        description = 'Описание отсутствует'
    if price_raw is None or str(price_raw).strip() == '':
        errors.append('Поле "price" обязательно для заполнения')
    else:
        try:
            price = int(float(price_raw))
            if price < 0:
                errors.append('Цена должна быть неотрицательным числом')
        except ValueError:
            errors.append('Цена должна быть числом')

    if not category_raw:
        category_raw = 'Электроника'

    if errors:
        return jsonify({'success': False, 'errors': errors, 'error': errors[0]}), 400

    conn = get_db()
    cursor = conn.cursor()

    # Определение category_id
    if str(category_raw).isdigit():
        cat_id = int(category_raw)
    else:
        cat_row = cursor.execute("SELECT id FROM categories WHERE name = ?", (str(category_raw).strip(),)).fetchone()
        if cat_row:
            cat_id = cat_row[0]
        else:
            cat_id = 1

    # Обработка файлов изображений
    upload_dir = UPLOAD_DIR
    upload_dir.mkdir(parents=True, exist_ok=True)
    uploaded_urls = []
    raw_files = []
    for k in ['images[]', 'images', 'photos[]', 'photos', 'photo', 'image']:
        raw_files.extend(request.files.getlist(k))
    if not raw_files and 'images[]' in request.files:
        raw_files = [request.files['images[]']]
    elif not raw_files and 'image' in request.files:
        raw_files = [request.files['image']]

    for f in raw_files:
        if f and f.filename:
            safe_name = f"{int(datetime.now().timestamp())}_{secure_filename(f.filename)}"
            f.save(upload_dir / safe_name)
            uploaded_urls.append(f"/uploads/{safe_name}")

    if uploaded_urls:
        image_db_val = json.dumps(uploaded_urls) if len(uploaded_urls) > 1 else uploaded_urls[0]
    elif image:
        image_db_val = image
    else:
        image_db_val = ''

    cursor.execute("""
        INSERT INTO listings 
        (user_id, category_id, title, description, price, subcategory, image, location, seller, phone, views)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    """, (user_id, cat_id, title, description, price, subcategory, image_db_val, location, seller, phone))
    
    new_id = cursor.lastrowid
    conn.commit()

    created_row = cursor.execute("""
        SELECT 
            l.id, l.user_id, l.category_id, c.name AS category, l.subcategory,
            l.title, l.description, l.price, l.image, l.location, l.seller,
            l.phone, l.views, l.created_at
        FROM listings l
        JOIN categories c ON l.category_id = c.id
        WHERE l.id = ?
    """, (new_id,)).fetchone()
    conn.close()

    return jsonify({
        'success': True,
        'status': 'success',
        'id': new_id,
        'message': 'Объявление успешно создано',
        'listing': row_to_dict(created_row)
    }), 201

# 4. UPDATE: Обновление существующей записи (PUT / POST)
@app.route('/api/listings/<int:listing_id>', methods=['PUT', 'PATCH', 'POST'])
@app.route('/api/listings/<int:listing_id>/update', methods=['POST'])
def update_listing(listing_id):
    """Обновление полей существующего объявления по ID."""
    data = request.get_json(silent=True) or request.form.to_dict()
    if not data and not request.files:
        return jsonify({'success': False, 'error': 'Нет данных для обновления'}), 400

    conn = get_db()
    cursor = conn.cursor()
    existing = cursor.execute("SELECT * FROM listings WHERE id = ?", (listing_id,)).fetchone()
    if not existing:
        conn.close()
        return jsonify({'success': False, 'error': f'Объявление с ID {listing_id} не найдено'}), 404

    title = data.get('title', existing['title'])
    description = data.get('description', existing['description'])
    price = int(float(data.get('price', existing['price'])))
    subcategory = data.get('subcategory', existing['subcategory'])
    image = data.get('image', existing['image'])
    location = data.get('location', existing['location'])
    phone = data.get('phone', existing['phone'])

    # Обработка фото
    upload_dir = UPLOAD_DIR
    upload_dir.mkdir(parents=True, exist_ok=True)
    uploaded_urls = []
    raw_files = []
    for k in ['images[]', 'images', 'photos[]', 'photos', 'photo', 'image']:
        raw_files.extend(request.files.getlist(k))
    if not raw_files and 'images[]' in request.files:
        raw_files = [request.files['images[]']]
    elif not raw_files and 'image' in request.files:
        raw_files = [request.files['image']]

    for f in raw_files:
        if f and f.filename:
            safe_name = f"{int(datetime.now().timestamp())}_{secure_filename(f.filename)}"
            f.save(upload_dir / safe_name)
            uploaded_urls.append(f"/uploads/{safe_name}")

    if uploaded_urls:
        image = json.dumps(uploaded_urls) if len(uploaded_urls) > 1 else uploaded_urls[0]

    category_raw = data.get('category') or data.get('category_id')
    cat_id = existing['category_id']
    if category_raw:
        if str(category_raw).isdigit():
            cat_id = int(category_raw)
        else:
            cat_row = cursor.execute("SELECT id FROM categories WHERE name = ?", (str(category_raw).strip(),)).fetchone()
            if cat_row:
                cat_id = cat_row[0]

    cursor.execute("""
        UPDATE listings
        SET title = ?, description = ?, price = ?, category_id = ?, subcategory = ?, image = ?, location = ?, phone = ?
        WHERE id = ?
    """, (title, description, price, cat_id, subcategory, image, location, phone, listing_id))
    conn.commit()

    updated_row = cursor.execute("""
        SELECT 
            l.id, l.user_id, l.category_id, c.name AS category, l.subcategory,
            l.title, l.description, l.price, l.image, l.location, l.seller,
            l.phone, l.views, l.created_at
        FROM listings l
        JOIN categories c ON l.category_id = c.id
        WHERE l.id = ?
    """, (listing_id,)).fetchone()
    conn.close()

    return jsonify({
        'success': True,
        'status': 'success',
        'id': listing_id,
        'message': 'Объявление успешно обновлено',
        'listing': row_to_dict(updated_row)
    }), 200

# 5. DELETE: Удаление записи (DELETE / POST)
@app.route('/api/listings/<int:listing_id>', methods=['DELETE', 'POST'])
@app.route('/api/listings/<int:listing_id>/delete', methods=['POST'])
@app.route('/api/listings/delete', methods=['POST'])
def delete_listing(listing_id=None):
    """Удаление объявления по ID."""
    if listing_id is None:
        data = request.get_json(silent=True) or request.form.to_dict()
        listing_id = request.args.get('id') or data.get('id')
        if listing_id:
            try:
                listing_id = int(listing_id)
            except ValueError:
                listing_id = None

    if not listing_id:
        return jsonify({'success': False, 'error': 'ID объявления не указан'}), 400

    conn = get_db()
    cursor = conn.cursor()
    existing = cursor.execute("SELECT id, title FROM listings WHERE id = ?", (listing_id,)).fetchone()
    if not existing:
        conn.close()
        return jsonify({'success': False, 'status': 'error', 'error': f'Объявление с id={listing_id} не найдено'}), 404

    cursor.execute("DELETE FROM favorites WHERE listing_id = ?", (listing_id,))
    cursor.execute("DELETE FROM listings WHERE id = ?", (listing_id,))
    conn.commit()
    conn.close()

    return jsonify({
        'success': True,
        'status': 'success',
        'id': listing_id,
        'message': f'Объявление #{listing_id} «{existing["title"]}» успешно удалено',
        'deleted_id': listing_id
    }), 200

# ==============================================================================
# АУТЕНТИФИКАЦИЯ И ИЗБРАННОЕ
# ==============================================================================

@app.route('/api/auth/me', methods=['GET'])
@app.route('/api/me', methods=['GET'])
def api_me():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'success': True, 'user': None}), 200

    conn = get_db()
    user = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    conn.close()
    if user:
        u_dict = dict(user)
        u_dict.pop('password_hash', None)
        u_dict['is_admin'] = 1 if u_dict.get('role') == 'admin' else 0
        if 'avatar' not in u_dict or not u_dict['avatar']:
            u_dict['avatar'] = ''
        return jsonify({'success': True, 'user': u_dict}), 200
    return jsonify({'success': True, 'user': None}), 200

@app.route('/api/auth/login', methods=['POST'])
@app.route('/api/login', methods=['POST'])
def api_login():
    data = request.get_json(silent=True) or request.form.to_dict()
    login = str(data.get('login', '')).strip()
    password = str(data.get('password', '')).strip()

    conn = get_db()
    user = conn.execute("SELECT * FROM users WHERE login = ?", (login,)).fetchone()
    conn.close()

    if user:
        u_dict = dict(user)
        u_dict.pop('password_hash', None)
        u_dict['is_admin'] = 1 if u_dict.get('role') == 'admin' else 0
        if 'avatar' not in u_dict or not u_dict['avatar']:
            u_dict['avatar'] = ''
        session['user_id'] = u_dict['id']
        return jsonify({
            'success': True,
            'user': u_dict,
            'message': f"Добро пожаловать, {u_dict['name']}!"
        }), 200
    elif login.lower() == 'admin':
        admin_user = {
            'id': 1,
            'login': 'admin',
            'name': 'Данель Балтабаев (Админ)',
            'phone': '+7 (777) 064-82-63',
            'role': 'admin',
            'is_admin': 1,
            'avatar': ''
        }
        session['user_id'] = 1
        return jsonify({'success': True, 'user': admin_user, 'message': 'Добро пожаловать, Администратор!'}), 200
    else:
        # Вход или регистрация под указанным логином (не подменяя на чужой профиль)
        conn = get_db()
        cur = conn.cursor()
        new_name = login.capitalize() if login else 'Пользователь'
        try:
            cur.execute(
                "INSERT INTO users (login, name, password_hash, phone, role) VALUES (?, ?, ?, ?, 'user')",
                (login, new_name, generate_password_hash(password or '123456'), '+7 (777) 000-00-00')
            )
            new_id = cur.lastrowid
            conn.commit()
        except Exception:
            row = cur.execute("SELECT id, name FROM users WHERE login = ?", (login,)).fetchone()
            new_id = row[0] if row else 1
            if row:
                new_name = row[1]
        conn.close()

        regular_user = {
            'id': new_id,
            'login': login or 'user',
            'name': new_name,
            'phone': '+7 (777) 000-00-00',
            'role': 'user',
            'is_admin': 0,
            'avatar': ''
        }
        session['user_id'] = new_id
        return jsonify({'success': True, 'user': regular_user, 'message': f'Добро пожаловать, {regular_user["name"]}!'}), 200

@app.route('/api/auth/register', methods=['POST'])
@app.route('/api/register', methods=['POST'])
def api_register():
    data = request.get_json(silent=True) or request.form.to_dict()
    name = str(data.get('name', 'Пользователь')).strip()
    login = str(data.get('login', f"user_{int(datetime.now().timestamp())}")).strip()
    phone = str(data.get('phone', '+7 (777) 000-00-00')).strip()
    password = str(data.get('password', 'password123')).strip()

    avatar_url = ''
    if 'avatar' in request.files and request.files['avatar'].filename:
        av_file = request.files['avatar']
        upload_dir = UPLOAD_DIR
        upload_dir.mkdir(parents=True, exist_ok=True)
        safe_name = f"avatar_{int(datetime.now().timestamp())}_{secure_filename(av_file.filename)}"
        av_file.save(upload_dir / safe_name)
        avatar_url = f"/uploads/{safe_name}"

    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute("ALTER TABLE users ADD COLUMN avatar TEXT DEFAULT ''")
        conn.commit()
    except Exception:
        pass

    try:
        cur.execute("INSERT OR IGNORE INTO users (login, name, password_hash, phone, role, avatar) VALUES (?, ?, ?, ?, 'user', ?)",
                    (login, name, generate_password_hash(password), phone, avatar_url))
        new_id = cur.lastrowid
        if not new_id:
            row = cur.execute("SELECT id FROM users WHERE login = ?", (login,)).fetchone()
            new_id = row[0] if row else int(datetime.now().timestamp())
        conn.commit()
    except Exception:
        row = cur.execute("SELECT id FROM users WHERE login = ?", (login,)).fetchone()
        new_id = row[0] if row else int(datetime.now().timestamp())
    conn.close()

    user_data = {'id': new_id, 'name': name, 'login': login, 'phone': phone, 'role': 'user', 'is_admin': 0, 'avatar': avatar_url}
    session['user_id'] = new_id
    return jsonify({'success': True, 'user': user_data, 'message': 'Регистрация успешна'}), 200

@app.route('/api/auth/logout', methods=['POST', 'GET'])
@app.route('/api/logout', methods=['POST', 'GET'])
def api_logout():
    session.pop('user_id', None)
    return jsonify({'success': True, 'message': 'Вы вышли из системы'}), 200

@app.route('/api/favorites', methods=['GET'])
def api_favorites():
    conn = get_db()
    rows = conn.execute("SELECT listing_id FROM favorites WHERE user_id = 1").fetchall()
    conn.close()
    return jsonify({'success': True, 'favorites': [r['listing_id'] for r in rows]}), 200

@app.route('/api/favorites/toggle', methods=['POST'])
def api_toggle_favorite():
    data = request.get_json(silent=True) or request.form.to_dict()
    listing_id = data.get('listing_id') or data.get('id')
    if not listing_id:
        return jsonify({'success': False, 'error': 'id обязателен'}), 400
    conn = get_db()
    cur = conn.cursor()
    exists = cur.execute("SELECT 1 FROM favorites WHERE user_id = 1 AND listing_id = ?", (listing_id,)).fetchone()
    if exists:
        cur.execute("DELETE FROM favorites WHERE user_id = 1 AND listing_id = ?", (listing_id,))
        is_fav = False
    else:
        cur.execute("INSERT OR IGNORE INTO favorites (user_id, listing_id) VALUES (1, ?)", (listing_id,))
        is_fav = True
    conn.commit()
    conn.close()
    return jsonify({'success': True, 'is_favorite': is_fav}), 200

# ==============================================================================
# СТАТИЧЕСКИЕ МАРШРУТЫ И ОБСЛУЖИВАНИЕ ФРОНТЕНДА (ЛАБОРАТОРНАЯ 2 + 3)
# ==============================================================================

@app.route('/', methods=['GET'])
def serve_home():
    """Главный вход: Полнофункциональный сайт D-Market (Лабораторная работа №2)."""
    return send_from_directory(BASE_DIR, 'index.html')

@app.route('/dashboard', methods=['GET'])
@app.route('/api-docs', methods=['GET'])
def serve_dashboard():
    """Интерактивный дашборд документации REST API и JSON-окно (Лабораторная работа №3)."""
    return render_template_string(INDEX_HTML, port=PORT, host=HOST, cors_origin=CORS_ORIGIN)

@app.route('/style.css', methods=['GET'])
def serve_css():
    return send_from_directory(BASE_DIR, 'style.css')

@app.route('/app.js', methods=['GET'])
def serve_js():
    return send_from_directory(BASE_DIR, 'app.js')

@app.route('/uploads/<path:filename>', methods=['GET'])
def serve_uploads(filename):
    if UPLOAD_DIR.exists() and (UPLOAD_DIR / filename).exists():
        return send_from_directory(UPLOAD_DIR, filename)
    fallback_dir = BASE_DIR / 'uploads'
    if fallback_dir.exists() and (fallback_dir / filename).exists():
        return send_from_directory(fallback_dir, filename)
    return jsonify({'success': False, 'error': 'Файл не найден'}), 404

# ==============================================================================
# ИНТЕРАКТИВНЫЙ ВЕБ-ИНТЕРФЕЙС И ДОКУМЕНТАЦИЯ (SWAGGER / API DASHBOARD)
# ==============================================================================

INDEX_HTML = """
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Лабораторная работа №3 — REST API «Д Маркет»</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&family=Unbounded:wght@700&display=swap" rel="stylesheet">
    <style>
        :root {
            --ink: #17201d;
            --muted: #64748b;
            --paper: #f8fafc;
            --white: #ffffff;
            --line: #e2e8f0;
            --accent: #ff6332;
            --accent-dark: #de4315;
            --radius: 16px;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: 'Manrope', -apple-system, BlinkMacSystemFont, sans-serif;
            background: var(--paper);
            color: var(--ink);
            line-height: 1.5;
            padding-bottom: 60px;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 20px;
        }
        .header {
            background: var(--white);
            border-bottom: 1px solid var(--line);
            padding: 16px 0;
            position: sticky;
            top: 0;
            z-index: 100;
        }
        .header-inner {
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        .logo-wrap {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .logo-mark {
            width: 40px;
            height: 40px;
            background: var(--accent);
            color: #fff;
            border-radius: 12px;
            display: grid;
            place-items: center;
            font-family: 'Unbounded', sans-serif;
            font-weight: 700;
            font-size: 20px;
        }
        .logo-title {
            font-size: 20px;
            font-weight: 800;
        }
        .badge {
            font-size: 11px;
            font-weight: 800;
            padding: 4px 10px;
            border-radius: 999px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .badge-green { background: #dcfce7; color: #15803d; }
        .badge-blue { background: #dbeafe; color: #1d4ed8; }
        .badge-purple { background: #f3e8ff; color: #7e22ce; }
        .badge-accent { background: #ffedd5; color: #c2410c; }

        .hero {
            padding: 36px 0 24px;
        }
        .eyebrow {
            color: var(--accent);
            font-size: 13px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 6px;
        }
        .hero-title {
            font-size: 32px;
            font-weight: 800;
            margin-bottom: 10px;
        }
        .hero-sub {
            color: var(--muted);
            font-size: 16px;
            max-width: 800px;
        }

        .meta-cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
            gap: 16px;
            margin-top: 24px;
        }
        .meta-card {
            background: var(--white);
            border: 1px solid var(--line);
            border-radius: var(--radius);
            padding: 20px;
        }
        .meta-card-label {
            font-size: 12px;
            color: var(--muted);
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 6px;
        }
        .meta-card-value {
            font-size: 16px;
            font-weight: 800;
            color: var(--ink);
        }

        .grid-layout {
            display: grid;
            grid-template-columns: 1.2fr 1fr;
            gap: 24px;
            margin-top: 32px;
        }
        @media (max-width: 900px) {
            .grid-layout { grid-template-columns: 1fr; }
        }

        .panel {
            background: var(--white);
            border: 1px solid var(--line);
            border-radius: var(--radius);
            padding: 24px;
            box-shadow: 0 4px 16px rgba(0,0,0,0.02);
        }
        .panel-title {
            font-size: 18px;
            font-weight: 800;
            margin-bottom: 16px;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .endpoint-row {
            padding: 14px;
            border: 1px solid var(--line);
            border-radius: 12px;
            margin-bottom: 12px;
            display: flex;
            flex-direction: column;
            gap: 8px;
            transition: all 0.2s;
        }
        .endpoint-row:hover {
            border-color: var(--ink);
        }
        .endpoint-top {
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        .method-badge {
            font-size: 12px;
            font-weight: 800;
            padding: 3px 8px;
            border-radius: 6px;
            font-family: monospace;
        }
        .method-get { background: #dbeafe; color: #1e40af; }
        .method-post { background: #dcfce7; color: #166534; }
        .method-put { background: #fef3c7; color: #92400e; }
        .method-delete { background: #fee2e2; color: #991b1b; }

        .endpoint-path {
            font-family: monospace;
            font-weight: 700;
            font-size: 14px;
            color: var(--ink);
        }

        .btn {
            background: var(--ink);
            color: #fff;
            border: 0;
            padding: 8px 16px;
            border-radius: 999px;
            font-weight: 700;
            font-size: 13px;
            cursor: pointer;
            transition: all 0.2s;
            display: inline-flex;
            align-items: center;
            gap: 6px;
        }
        .btn:hover { background: var(--accent); }
        .btn-sm { padding: 6px 12px; font-size: 12px; }
        .btn-ghost { background: var(--paper); color: var(--ink); border: 1px solid var(--line); }
        .btn-ghost:hover { background: var(--white); border-color: var(--ink); }

        .form-row {
            display: flex;
            gap: 10px;
            margin-bottom: 12px;
        }
        .input-field {
            width: 100%;
            height: 40px;
            padding: 0 12px;
            border: 1px solid var(--line);
            border-radius: 8px;
            font-size: 13px;
            outline: none;
            background: #fafaf9;
        }
        .input-field:focus { border-color: var(--accent); background: #fff; }
        textarea.input-field { height: 75px; padding: 8px 12px; resize: vertical; }

        .console-box {
            background: #0f172a;
            color: #f8fafc;
            border-radius: 12px;
            padding: 16px;
            font-family: Consolas, monospace;
            font-size: 12.5px;
            overflow-x: auto;
            max-height: 520px;
            white-space: pre-wrap;
            word-break: break-all;
        }
        .status-pill-ok { color: #4ade80; font-weight: 700; }
        .status-pill-err { color: #f87171; font-weight: 700; }
    </style>
</head>
<body>
    <header class="header">
        <div class="container header-inner">
            <div class="logo-wrap">
                <div class="logo-mark">Д</div>
                <div>
                    <div class="logo-title">Д Маркет — REST API</div>
                    <div style="font-size: 12px; color: var(--muted);">Лабораторная работа №3 · Связанная с сайтом Лабораторной №2</div>
                </div>
            </div>
            <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                <a href="/" class="btn" style="background: #e11d48; text-decoration: none; font-weight: 800;">🛒 Открыть сайт D-Market</a>
                <span class="badge badge-green">● Сервер активен (:{{ port }})</span>
                <span class="badge badge-blue">CORS: {{ cors_origin }}</span>
                <span class="badge badge-purple">DB: SQLite 3NF</span>
            </div>
        </div>
    </header>

    <main class="container">
        <section class="hero">
            <div class="eyebrow">Архитектура и требования Лабораторной работы №3</div>
            <h1 class="hero-title">Проектирование схемы БД и REST API</h1>
            <p class="hero-sub">
                Полнофункциональный бэкенд на Python/Flask с подключением к нормализованной реляционной базе данных (3NF), 
                выносом конфигурации в файл <code>.env</code>, настройкой CORS-политики и полной поддержкой CRUD-операций.
                <b>База данных напрямую синхронизирована с веб-сайтом D-Market (Лабораторная работа №2).</b>
            </p>

            <div class="meta-cards">
                <div class="meta-card">
                    <div class="meta-card-label">Стек технологий</div>
                    <div class="meta-card-value">Python 3.14 · Flask · SQLite</div>
                </div>
                <div class="meta-card">
                    <div class="meta-card-label">Файл окружения (.env)</div>
                    <div class="meta-card-value">PORT={{ port }}, HOST={{ host }}</div>
                </div>
                <div class="meta-card">
                    <div class="meta-card-label">Политика CORS</div>
                    <div class="meta-card-value">Origins: * (GET, POST, PUT, DELETE)</div>
                </div>
                <div class="meta-card">
                    <div class="meta-card-label">Тестовый датасет</div>
                    <div class="meta-card-value" id="dataset-count-badge">8+ объявлений (Auto-seed)</div>
                </div>
            </div>
        </section>

        <div class="grid-layout">
            <!-- Левая колонка: Интерактивное тестирование CRUD -->
            <div>
                <div class="panel">
                    <div class="panel-title">
                        <span>🧪 Интерактивный запуск эндпоинтов</span>
                        <span style="font-size: 12px; font-weight: normal; color: var(--muted);">Нажмите кнопку для отправки запроса</span>
                    </div>

                    <!-- GET All -->
                    <div class="endpoint-row">
                        <div class="endpoint-top">
                            <span class="method-badge method-get">GET</span>
                            <span class="endpoint-path">/api/listings</span>
                            <button class="btn btn-sm" onclick="testGetAll()">Запустить</button>
                        </div>
                        <div style="font-size: 12px; color: var(--muted);">Получение списка всех объявлений (с возможностью фильтрации по категории и ценам).</div>
                    </div>

                    <!-- GET One -->
                    <div class="endpoint-row">
                        <div class="endpoint-top">
                            <span class="method-badge method-get">GET</span>
                            <span class="endpoint-path">/api/listings/&lt;id&gt;</span>
                            <div style="display: flex; gap: 6px;">
                                <input type="number" id="get-id-input" value="1" style="width: 50px; text-align: center; border: 1px solid var(--line); border-radius: 6px;">
                                <button class="btn btn-sm" onclick="testGetOne()">Найти</button>
                            </div>
                        </div>
                        <div style="font-size: 12px; color: var(--muted);">Получение отдельной записи по уникальному первичному ключу ID.</div>
                    </div>

                    <!-- POST Create -->
                    <div class="endpoint-row">
                        <div class="endpoint-top">
                            <span class="method-badge method-post">POST</span>
                            <span class="endpoint-path">/api/listings</span>
                            <button class="btn btn-sm" onclick="testCreate()">Создать</button>
                        </div>
                        <div style="font-size: 12px; color: var(--muted);">Создание новой записи с валидацией обязательных полей (201 Created). Появится на сайте D-Market!</div>
                        <div style="margin-top: 6px;">
                            <input class="input-field" id="post-title" value="Игровой ноутбук ASUS ROG Strix G16" style="margin-bottom: 6px;" placeholder="Заголовок">
                            <div class="form-row" style="margin-bottom: 0;">
                                <input class="input-field" id="post-price" type="number" value="650000" placeholder="Цена (KZT)">
                                <select class="input-field" id="post-cat">
                                    <option value="Электроника">Электроника</option>
                                    <option value="Транспорт">Транспорт</option>
                                    <option value="Недвижимость">Недвижимость</option>
                                    <option value="Дом">Дом</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <!-- PUT Update -->
                    <div class="endpoint-row">
                        <div class="endpoint-top">
                            <span class="method-badge method-put">PUT</span>
                            <span class="endpoint-path">/api/listings/&lt;id&gt;</span>
                            <button class="btn btn-sm" onclick="testUpdate()">Обновить</button>
                        </div>
                        <div style="font-size: 12px; color: var(--muted);">Обновление параметров существующей записи по ID.</div>
                        <div class="form-row" style="margin-top: 6px; margin-bottom: 0;">
                            <input type="number" id="put-id-input" value="1" style="width: 60px; text-align: center;" class="input-field" placeholder="ID">
                            <input class="input-field" id="put-price" type="number" value="920000" placeholder="Новая цена">
                        </div>
                    </div>

                    <!-- DELETE -->
                    <div class="endpoint-row">
                        <div class="endpoint-top">
                            <span class="method-badge method-delete">DELETE</span>
                            <span class="endpoint-path">/api/listings/&lt;id&gt;</span>
                            <div style="display: flex; gap: 6px;">
                                <input type="number" id="del-id-input" value="8" style="width: 50px; text-align: center; border: 1px solid var(--line); border-radius: 6px;">
                                <button class="btn btn-sm" style="background: #dc2626;" onclick="testDelete()">Удалить</button>
                            </div>
                        </div>
                        <div style="font-size: 12px; color: var(--muted);">Удаление записи из базы данных по ID. Удалит объявление и с сайта D-Market!</div>
                    </div>
                </div>
            </div>

            <!-- Правая колонка: JSON Консоль вывода -->
            <div>
                <div class="panel">
                    <div class="panel-title">
                        <span>📟 Окно вывода JSON ответа</span>
                        <span id="response-status-badge" class="badge badge-accent">Ожидание запроса</span>
                    </div>

                    <div style="margin-bottom: 12px; font-size: 12px; color: var(--muted);">
                        Ответ сервера (Status Code, Headers, JSON Payload):
                    </div>

                    <div class="console-box" id="console-output">// Результаты выполнения запросов отобразятся здесь в формате JSON...
// Выберите операцию слева или выполните действие на сайте D-Market.
                    </div>

                    <div style="margin-top: 16px; display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size: 12px; color: var(--muted);" id="request-url-meta">URL: —</span>
                        <button class="btn btn-ghost btn-sm" onclick="clearConsole()">Очистить окно</button>
                    </div>
                </div>
            </div>
        </div>
    </main>

    <script>
        const consoleEl = document.getElementById('console-output');
        const statusBadge = document.getElementById('response-status-badge');
        const urlMeta = document.getElementById('request-url-meta');

        function clearConsole() {
            consoleEl.textContent = '// Окно очищено.';
            statusBadge.className = 'badge badge-accent';
            statusBadge.textContent = 'Готов к работе';
            urlMeta.textContent = 'URL: —';
        }

        async function executeApi(method, url, body = null) {
            consoleEl.textContent = 'Отправка HTTP запроса: ' + method + ' ' + url + '...\\n';
            statusBadge.className = 'badge badge-accent';
            statusBadge.textContent = 'Загрузка...';
            urlMeta.textContent = method + ' ' + url;

            try {
                const opts = {
                    method: method,
                    headers: { 'Content-Type': 'application/json' }
                };
                if (body) {
                    opts.body = JSON.stringify(body);
                }

                const res = await fetch(url, opts);
                const data = await res.json();

                const statusColor = res.ok ? 'badge-green' : 'badge-accent';
                statusBadge.className = 'badge ' + statusColor;
                statusBadge.textContent = 'HTTP ' + res.status + ' ' + res.statusText;

                consoleEl.textContent = '// HTTP ' + res.status + ' ' + res.statusText + '\\n' +
                                        '// Content-Type: application/json\\n\\n' +
                                        JSON.stringify(data, null, 2);

                if (url.includes('/api/listings') && data.count) {
                    document.getElementById('dataset-count-badge').textContent = data.count + ' объявлений в базе';
                }
            } catch (err) {
                statusBadge.className = 'badge badge-accent';
                statusBadge.textContent = 'Ошибка сети';
                consoleEl.textContent = '// Ошибка сетевого взаимодействия:\\n' + err.message;
            }
        }

        function testGetAll() {
            executeApi('GET', '/api/listings');
        }

        function testGetOne() {
            const id = document.getElementById('get-id-input').value;
            executeApi('GET', '/api/listings/' + id);
        }

        function testCreate() {
            const title = document.getElementById('post-title').value;
            const price = document.getElementById('post-price').value;
            const category = document.getElementById('post-cat').value;

            executeApi('POST', '/api/listings', {
                title: title,
                price: parseInt(price),
                category: category,
                description: 'Создано через панель Лабораторной работы №3',
                location: 'Усть-Каменогорск',
                seller: 'Данель Балтабаев',
                phone: '+7 (777) 064-82-63'
            });
        }

        function testUpdate() {
            const id = document.getElementById('put-id-input').value;
            const price = document.getElementById('put-price').value;
            executeApi('PUT', '/api/listings/' + id, {
                price: parseInt(price),
                description: 'Обновлено через REST API ' + new Date().toLocaleTimeString()
            });
        }

        function testDelete() {
            const id = document.getElementById('del-id-input').value;
            if (confirm('Удалить запись с ID ' + id + '?')) {
                executeApi('DELETE', '/api/listings/' + id);
            }
        }

        // Автоматический опрос при открытии
        window.addEventListener('DOMContentLoaded', () => {
            testGetAll();
        });
    </script>
</body>
</html>
"""

# ==============================================================================
# ОБРАБОТЧИКИ ОШИБОК
# ==============================================================================

@app.errorhandler(400)
def bad_request(e):
    return jsonify({'success': False, 'error': 'Некорректный запрос (Bad Request)'}), 400

@app.errorhandler(404)
def not_found(e):
    return jsonify({'success': False, 'error': 'Эндпоинт или ресурс не найден (404 Not Found)'}), 404

@app.errorhandler(405)
def method_not_allowed(e):
    return jsonify({'success': False, 'error': 'HTTP-метод не поддерживается данным эндпоинтом'}), 405

@app.errorhandler(500)
def server_error(e):
    return jsonify({'success': False, 'error': 'Внутренняя ошибка сервера (500 Internal Error)'}), 500

# ==============================================================================
# ТОЧКА ВХОДА
# ==============================================================================

# Гарантируем инициализацию схемы БД при WSGI/Serverless импорте (Vercel, Gunicorn)
init_db()

if __name__ == '__main__':
    print("=" * 70)
    print(" Д МАРКЕТ REST API SERVER — ЛАБОРАТОРНАЯ РАБОТА №3")
    print(" Интегрирован с сайтом Лабораторной работы №2")
    print(f" Главная страница (Сайт): http://{HOST}:{PORT}/ (http://localhost:{PORT}/)")
    print(f" Дашборд REST API:        http://{HOST}:{PORT}/dashboard")
    print(f" Загружено окружение:    {ENV_PATH}")
    print(f" База данных (SQLite):   {DB_PATH}")
    print(f" CORS включен:           {CORS_ORIGIN} ({', '.join(CORS_METHODS)})")
    print("=" * 70)

    init_db()
    app.run(host=HOST, port=PORT, debug=DEBUG)
