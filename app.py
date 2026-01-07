from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
import database
import sqlite3

app = Flask(__name__)
CORS(app)  # Enable CORS for API requests

# Initialize database on startup
database.init_db()

@app.route('/')
def index():
    """Serve the main page"""
    return render_template('index.html')

@app.route('/admin')
def admin():
    """Serve the admin page"""
    return render_template('admin.html')

# API Routes

@app.route('/api/products', methods=['GET'])
def get_products():
    """Get all products"""
    try:
        conn = database.get_db_connection()
        products = conn.execute('SELECT * FROM products ORDER BY code').fetchall()
        conn.close()
        
        products_list = [dict(product) for product in products]
        return jsonify(products_list), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/products/<code>', methods=['GET'])
def get_product(code):
    """Get a single product by code"""
    try:
        conn = database.get_db_connection()
        product = conn.execute(
            'SELECT * FROM products WHERE code = ?', (code,)
        ).fetchone()
        conn.close()
        
        if product:
            return jsonify(dict(product)), 200
        else:
            return jsonify({'error': 'Product not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/products', methods=['POST'])
def create_product():
    """Create a new product"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['code', 'name', 'price']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({'error': f'Field {field} is required'}), 400
        
        conn = database.get_db_connection()
        cursor = conn.cursor()
        
        # Check if code already exists
        existing = cursor.execute(
            'SELECT code FROM products WHERE code = ?', (data['code'],)
        ).fetchone()
        
        if existing:
            conn.close()
            return jsonify({'error': 'Product code already exists'}), 400
        
        # Insert new product
        cursor.execute('''
            INSERT INTO products (code, name, specs, price, logo_url, category, description)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            data['code'],
            data['name'],
            data.get('specs', ''),
            float(data['price']),
            data.get('logo_url', 'logo.png'),
            data.get('category', ''),
            data.get('description', '')
        ))
        
        conn.commit()
        product_id = cursor.lastrowid
        conn.close()
        
        return jsonify({'message': 'Product created successfully', 'id': product_id}), 201
    except sqlite3.IntegrityError:
        return jsonify({'error': 'Product code already exists'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/products/<code>', methods=['PUT'])
def update_product(code):
    """Update an existing product"""
    try:
        data = request.get_json()
        
        conn = database.get_db_connection()
        cursor = conn.cursor()
        
        # Check if product exists
        existing = cursor.execute(
            'SELECT code FROM products WHERE code = ?', (code,)
        ).fetchone()
        
        if not existing:
            conn.close()
            return jsonify({'error': 'Product not found'}), 404
        
        # Update product
        cursor.execute('''
            UPDATE products 
            SET name = ?, specs = ?, price = ?, logo_url = ?, category = ?, description = ?, updated_at = CURRENT_TIMESTAMP
            WHERE code = ?
        ''', (
            data.get('name', ''),
            data.get('specs', ''),
            float(data.get('price', 0)),
            data.get('logo_url', 'logo.png'),
            data.get('category', ''),
            data.get('description', ''),
            code
        ))
        
        conn.commit()
        conn.close()
        
        return jsonify({'message': 'Product updated successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/products/<code>', methods=['DELETE'])
def delete_product(code):
    """Delete a product"""
    try:
        conn = database.get_db_connection()
        cursor = conn.cursor()
        
        # Check if product exists
        existing = cursor.execute(
            'SELECT code FROM products WHERE code = ?', (code,)
        ).fetchone()
        
        if not existing:
            conn.close()
            return jsonify({'error': 'Product not found'}), 404
        
        # Delete product
        cursor.execute('DELETE FROM products WHERE code = ?', (code,))
        conn.commit()
        conn.close()
        
        return jsonify({'message': 'Product deleted successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)

