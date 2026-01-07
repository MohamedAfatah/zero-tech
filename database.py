import sqlite3
from datetime import datetime
import os

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
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            specs TEXT,
            price REAL NOT NULL,
            logo_url TEXT,
            category TEXT,
            description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Insert sample data if table is empty
    cursor.execute('SELECT COUNT(*) as count FROM products')
    count = cursor.fetchone()['count']
    
    if count == 0:
        sample_products = [
            ('1001', 'Mouse Gaming RGB', 'إضاءة RGB – 7200 DPI – USB', 350.0, 'logo.png', 'إكسسوارات', 'ماوس ألعاب بإضاءة RGB'),
            ('1002', 'Mechanical Keyboard', 'Blue Switch – Anti-Ghosting', 1200.0, 'logo.png', 'إكسسوارات', 'لوحة مفاتيح ميكانيكية'),
            ('1003', 'Headset Gaming', '7.1 Surround – Mic HD', 850.0, 'logo.png', 'إكسسوارات', 'سماعات ألعاب محيطية'),
            ('1004', 'Webcam HD', '1080p – USB – Mic Built-in', 500.0, 'logo.png', 'إكسسوارات', 'كاميرا ويب عالية الدقة')
        ]
        
        cursor.executemany('''
            INSERT INTO products (code, name, specs, price, logo_url, category, description)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', sample_products)
    
    conn.commit()
    conn.close()

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

