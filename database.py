import sqlite3
from werkzeug.security import generate_password_hash

DB_NAME = 'products.db'


def get_db_connection():
    """Create and return a database connection"""
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Initialize the database and create tables if they don't exist"""
    conn = get_db_connection()
    cursor = conn.cursor()

    # Products table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            specs TEXT,
            price REAL NOT NULL,
            logo_url TEXT,
            category_id INTEGER,
            description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (category_id) REFERENCES categories(id)
        )
    ''')

    # Users table with extended fields
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            full_name TEXT,
            email TEXT,
            phone TEXT,
            role TEXT NOT NULL DEFAULT 'user',
            is_active INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Categories table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Logos table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS logos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            filename TEXT NOT NULL,
            logo_type TEXT NOT NULL DEFAULT 'custom',
            uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Print settings table with font options
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS print_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            page_size TEXT DEFAULT 'A4',
            custom_width REAL,
            custom_height REAL,
            card_color_start TEXT DEFAULT '#1e3c72',
            card_color_end TEXT DEFAULT '#2a5298',
            logo_id INTEGER,
            logo_position TEXT DEFAULT 'top-center',
            logo_size INTEGER DEFAULT 100,
            font_size INTEGER DEFAULT 28,
            font_color TEXT DEFAULT '#ffffff',
            border_enabled INTEGER DEFAULT 0,
            border_color TEXT DEFAULT '#ffffff',
            border_width INTEGER DEFAULT 2,
            card_mode TEXT DEFAULT 'grid',
            card_width INTEGER DEFAULT 50,
            card_height INTEGER DEFAULT 50,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (logo_id) REFERENCES logos(id)
        )
    ''')

    # Migration: Add new columns if they don't exist (for existing databases)
    migrate_database(cursor)

    # Create default admin user if no users exist
    cursor.execute('SELECT COUNT(*) as count FROM users')
    user_count = cursor.fetchone()['count']

    if user_count == 0:
        admin_hash = generate_password_hash('admin123')
        cursor.execute('''
            INSERT INTO users
            (username, password_hash, full_name, role, is_active)
            VALUES (?, ?, ?, ?, ?)
        ''', ('admin', admin_hash, 'المدير', 'admin', 1))

    # Create default categories if none exist
    cursor.execute('SELECT COUNT(*) as count FROM categories')
    cat_count = cursor.fetchone()['count']

    if cat_count == 0:
        default_categories = [
            ('إكسسوارات',),
            ('أجهزة كمبيوتر',),
            ('شاشات',),
            ('طابعات',),
            ('شبكات',)
        ]
        cursor.executemany(
            'INSERT INTO categories (name) VALUES (?)',
            default_categories
        )

    # Create default logos if none exist
    cursor.execute('SELECT COUNT(*) as count FROM logos')
    logo_count = cursor.fetchone()['count']

    if logo_count == 0:
        default_logos = [
            ('شعار أبيض', 'logowhite.png', 'white'),
            ('شعار أسود', 'logo-black.png', 'black')
        ]
        cursor.executemany('''
            INSERT INTO logos (name, filename, logo_type)
            VALUES (?, ?, ?)
        ''', default_logos)

    # Insert sample products if table is empty
    cursor.execute('SELECT COUNT(*) as count FROM products')
    count = cursor.fetchone()['count']

    if count == 0:
        # Get the first category ID
        cursor.execute('SELECT id FROM categories LIMIT 1')
        cat = cursor.fetchone()
        cat_id = cat['id'] if cat else None

        sample_products = [
            ('1001', 'Mouse Gaming RGB', 'إضاءة RGB – 7200 DPI – USB',
             350.0, 'logowhite.png', cat_id, 'ماوس ألعاب بإضاءة RGB'),
            ('1002', 'Mechanical Keyboard', 'Blue Switch – Anti-Ghosting',
             1200.0, 'logowhite.png', cat_id, 'لوحة مفاتيح ميكانيكية'),
            ('1003', 'Headset Gaming', '7.1 Surround – Mic HD',
             850.0, 'logowhite.png', cat_id, 'سماعات ألعاب محيطية'),
            ('1004', 'Webcam HD', '1080p – USB – Mic Built-in',
             500.0, 'logowhite.png', cat_id, 'كاميرا ويب عالية الدقة')
        ]

        cursor.executemany('''
            INSERT INTO products (code, name, specs, price, logo_url,
                                  category_id, description)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', sample_products)

    # Create default print settings if none exist
    cursor.execute('SELECT COUNT(*) as count FROM print_settings')
    settings_count = cursor.fetchone()['count']

    if settings_count == 0:
        # Get the white logo ID
        cursor.execute(
            "SELECT id FROM logos WHERE logo_type = 'white' LIMIT 1"
        )
        logo = cursor.fetchone()
        logo_id = logo['id'] if logo else None

        cursor.execute('''
            INSERT INTO print_settings
            (page_size, card_color_start, card_color_end, logo_id,
             logo_position, logo_size, font_size, font_color,
             border_enabled, border_color, border_width,
             card_mode, card_width, card_height)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', ('A4', '#1e3c72', '#2a5298', logo_id,
              'top-center', 100, 28, '#ffffff',
              0, '#ffffff', 2, 'grid', 50, 50))

    conn.commit()
    conn.close()


def migrate_database(cursor):
    """Add new columns to existing tables if they don't exist"""
    # Check and add columns to users table
    cursor.execute("PRAGMA table_info(users)")
    user_columns = [col[1] for col in cursor.fetchall()]

    if 'full_name' not in user_columns:
        cursor.execute('ALTER TABLE users ADD COLUMN full_name TEXT')
    if 'email' not in user_columns:
        cursor.execute('ALTER TABLE users ADD COLUMN email TEXT')
    if 'phone' not in user_columns:
        cursor.execute('ALTER TABLE users ADD COLUMN phone TEXT')
    if 'is_active' not in user_columns:
        cursor.execute(
            'ALTER TABLE users ADD COLUMN is_active INTEGER DEFAULT 1'
        )

    # Check and add columns to print_settings table
    cursor.execute("PRAGMA table_info(print_settings)")
    settings_columns = [col[1] for col in cursor.fetchall()]

    if 'font_size' not in settings_columns:
        cursor.execute(
            'ALTER TABLE print_settings '
            'ADD COLUMN font_size INTEGER DEFAULT 28'
        )
    if 'font_color' not in settings_columns:
        cursor.execute(
            'ALTER TABLE print_settings '
            "ADD COLUMN font_color TEXT DEFAULT '#ffffff'"
        )
    if 'border_enabled' not in settings_columns:
        cursor.execute(
            'ALTER TABLE print_settings '
            'ADD COLUMN border_enabled INTEGER DEFAULT 0'
        )
    if 'border_color' not in settings_columns:
        cursor.execute(
            'ALTER TABLE print_settings '
            "ADD COLUMN border_color TEXT DEFAULT '#ffffff'"
        )
    if 'border_width' not in settings_columns:
        cursor.execute(
            'ALTER TABLE print_settings '
            'ADD COLUMN border_width INTEGER DEFAULT 2'
        )
    if 'logo_size' not in settings_columns:
        cursor.execute(
            'ALTER TABLE print_settings '
            'ADD COLUMN logo_size INTEGER DEFAULT 100'
        )
    if 'card_mode' not in settings_columns:
        cursor.execute(
            'ALTER TABLE print_settings '
            "ADD COLUMN card_mode TEXT DEFAULT 'grid'"
        )
    if 'card_width' not in settings_columns:
        cursor.execute(
            'ALTER TABLE print_settings '
            'ADD COLUMN card_width INTEGER DEFAULT 50'
        )
    if 'card_height' not in settings_columns:
        cursor.execute(
            'ALTER TABLE print_settings '
            'ADD COLUMN card_height INTEGER DEFAULT 50'
        )


def update_timestamp(code):
    """Update the updated_at timestamp for a product"""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        UPDATE products
        SET updated_at = CURRENT_TIMESTAMP
        WHERE code = ?
    ''', (code,))
    conn.commit()
    conn.close()
