import os
import time
from flask import (Flask, render_template, request, jsonify,
                   session, redirect, url_for)
from flask_cors import CORS
from werkzeug.utils import secure_filename
import database
import auth
import sqlite3

app = Flask(__name__)
app.secret_key = 'zerotech-secret-key-2024'
CORS(app)

# Upload configuration
UPLOAD_FOLDER = os.path.join(app.static_folder, 'uploads')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 5 * 1024 * 1024  # 5MB max

# Ensure upload folder exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Initialize database on startup
database.init_db()


def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


# ============== Page Routes ==============

@app.route('/login', methods=['GET'])
def login():
    """Serve the login page"""
    if 'user_id' in session:
        return redirect(url_for('index'))
    return render_template('login.html')


@app.route('/')
@auth.login_required
def index():
    """Serve the main page"""
    user = auth.get_current_user()
    return render_template('index.html', user=user)


@app.route('/admin')
@auth.admin_required
def admin():
    """Serve the admin page"""
    user = auth.get_current_user()
    return render_template('admin.html', user=user)


# ============== Auth API Routes ==============

@app.route('/api/auth/login', methods=['POST'])
def api_login():
    """API login endpoint"""
    data = request.get_json()
    username = data.get('username', '')
    password = data.get('password', '')

    user, error = auth.login_user(username, password)
    if user:
        session['user_id'] = user['id']
        return jsonify({
            'message': 'Login successful',
            'user': {
                'id': user['id'],
                'username': user['username'],
                'role': user['role']
            }
        }), 200
    return jsonify({'error': error or 'Invalid username or password'}), 401


@app.route('/api/auth/logout', methods=['POST'])
def api_logout():
    """API logout endpoint"""
    session.pop('user_id', None)
    return jsonify({'message': 'Logged out successfully'}), 200


@app.route('/api/auth/me', methods=['GET'])
@auth.login_required
def api_me():
    """Get current user info"""
    user = auth.get_current_user()
    return jsonify(user), 200


# ============== Users API Routes ==============

@app.route('/api/users', methods=['GET'])
@auth.admin_required
def get_users():
    """Get all users (admin only)"""
    users = auth.get_all_users()
    return jsonify(users), 200


@app.route('/api/users', methods=['POST'])
@auth.admin_required
def create_user():
    """Create a new user (admin only)"""
    data = request.get_json()
    username = data.get('username', '')
    password = data.get('password', '')
    role = data.get('role', 'user')
    full_name = data.get('full_name', '')
    email = data.get('email', '')
    phone = data.get('phone', '')

    if not username or not password:
        return jsonify({'error': 'Username and password are required'}), 400

    if role not in ['admin', 'user']:
        return jsonify({'error': 'Invalid role'}), 400

    user_id, error = auth.create_user(
        username, password, role, full_name, email, phone
    )
    if error:
        return jsonify({'error': error}), 400

    return jsonify({'message': 'User created successfully', 'id': user_id}), 201


@app.route('/api/users/<int:user_id>', methods=['PUT'])
@auth.admin_required
def update_user(user_id):
    """Update a user (admin only)"""
    data = request.get_json()

    auth.update_user(
        user_id,
        full_name=data.get('full_name'),
        email=data.get('email'),
        phone=data.get('phone'),
        role=data.get('role', 'user')
    )

    return jsonify({'message': 'User updated successfully'}), 200


@app.route('/api/users/<int:user_id>', methods=['DELETE'])
@auth.admin_required
def delete_user(user_id):
    """Delete a user (admin only)"""
    # Don't allow deleting yourself
    if session.get('user_id') == user_id:
        return jsonify({'error': 'Cannot delete your own account'}), 400

    success, error = auth.delete_user(user_id)
    if not success:
        return jsonify({'error': error}), 400

    return jsonify({'message': 'User deleted successfully'}), 200


@app.route('/api/users/<int:user_id>/toggle-status', methods=['POST'])
@auth.admin_required
def toggle_user_status(user_id):
    """Toggle user active status (admin only)"""
    # Don't allow toggling yourself
    if session.get('user_id') == user_id:
        return jsonify({'error': 'Cannot change your own status'}), 400

    success, result = auth.toggle_user_status(user_id)
    if not success:
        return jsonify({'error': result}), 400

    status = 'activated' if result else 'deactivated'
    return jsonify({
        'message': f'User {status} successfully',
        'is_active': result
    }), 200


# ============== Categories API Routes ==============

@app.route('/api/categories', methods=['GET'])
@auth.login_required
def get_categories():
    """Get all categories"""
    try:
        conn = database.get_db_connection()
        categories = conn.execute(
            'SELECT * FROM categories ORDER BY name'
        ).fetchall()
        conn.close()
        return jsonify([dict(cat) for cat in categories]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/categories', methods=['POST'])
@auth.admin_required
def create_category():
    """Create a new category"""
    try:
        data = request.get_json()
        name = data.get('name', '').strip()

        if not name:
            return jsonify({'error': 'Category name is required'}), 400

        conn = database.get_db_connection()
        cursor = conn.cursor()
        cursor.execute('INSERT INTO categories (name) VALUES (?)', (name,))
        cat_id = cursor.lastrowid
        conn.commit()
        conn.close()

        return jsonify({'message': 'Category created', 'id': cat_id}), 201
    except sqlite3.IntegrityError:
        return jsonify({'error': 'Category already exists'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/categories/<int:cat_id>', methods=['PUT'])
@auth.admin_required
def update_category(cat_id):
    """Update a category"""
    try:
        data = request.get_json()
        name = data.get('name', '').strip()

        if not name:
            return jsonify({'error': 'Category name is required'}), 400

        conn = database.get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            'UPDATE categories SET name = ? WHERE id = ?',
            (name, cat_id)
        )
        conn.commit()
        conn.close()

        return jsonify({'message': 'Category updated'}), 200
    except sqlite3.IntegrityError:
        return jsonify({'error': 'Category name already exists'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/categories/<int:cat_id>', methods=['DELETE'])
@auth.admin_required
def delete_category(cat_id):
    """Delete a category"""
    try:
        conn = database.get_db_connection()
        cursor = conn.cursor()

        # Set products with this category to null
        cursor.execute(
            'UPDATE products SET category_id = NULL WHERE category_id = ?',
            (cat_id,)
        )
        cursor.execute('DELETE FROM categories WHERE id = ?', (cat_id,))

        conn.commit()
        conn.close()

        return jsonify({'message': 'Category deleted'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ============== Logos API Routes ==============

@app.route('/api/logos', methods=['GET'])
@auth.login_required
def get_logos():
    """Get all logos"""
    try:
        conn = database.get_db_connection()
        logos = conn.execute(
            'SELECT * FROM logos ORDER BY uploaded_at DESC'
        ).fetchall()
        conn.close()
        return jsonify([dict(logo) for logo in logos]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/logos', methods=['POST'])
@auth.admin_required
def upload_logo():
    """Upload a new logo"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400

        file = request.files['file']
        name = request.form.get('name', '').strip()

        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400

        if not name:
            name = file.filename.rsplit('.', 1)[0]

        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            # Add timestamp to make filename unique
            timestamp = int(time.time())
            filename = f"{timestamp}_{filename}"

            file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))

            conn = database.get_db_connection()
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO logos (name, filename, logo_type)
                VALUES (?, ?, 'custom')
            ''', (name, filename))
            logo_id = cursor.lastrowid
            conn.commit()
            conn.close()

            return jsonify({
                'message': 'Logo uploaded successfully',
                'id': logo_id,
                'filename': filename
            }), 201

        return jsonify({'error': 'Invalid file type'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/logos/<int:logo_id>', methods=['DELETE'])
@auth.admin_required
def delete_logo(logo_id):
    """Delete a logo"""
    try:
        conn = database.get_db_connection()
        cursor = conn.cursor()

        # Get logo info
        logo = cursor.execute(
            'SELECT * FROM logos WHERE id = ?', (logo_id,)
        ).fetchone()
        if not logo:
            conn.close()
            return jsonify({'error': 'Logo not found'}), 404

        # Don't delete default logos
        if logo['logo_type'] in ['white', 'black']:
            conn.close()
            return jsonify({'error': 'Cannot delete default logos'}), 400

        # Delete file
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], logo['filename'])
        if os.path.exists(filepath):
            os.remove(filepath)

        # Update print settings that use this logo
        cursor.execute(
            'UPDATE print_settings SET logo_id = NULL WHERE logo_id = ?',
            (logo_id,)
        )
        cursor.execute('DELETE FROM logos WHERE id = ?', (logo_id,))

        conn.commit()
        conn.close()

        return jsonify({'message': 'Logo deleted'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ============== Print Settings API Routes ==============

@app.route('/api/print-settings', methods=['GET'])
@auth.login_required
def get_print_settings():
    """Get print settings"""
    try:
        conn = database.get_db_connection()
        settings = conn.execute('''
            SELECT ps.*, l.filename as logo_filename, l.name as logo_name
            FROM print_settings ps
            LEFT JOIN logos l ON ps.logo_id = l.id
            ORDER BY ps.id DESC LIMIT 1
        ''').fetchone()
        conn.close()

        if settings:
            return jsonify(dict(settings)), 200
        return jsonify({}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/print-settings', methods=['POST'])
@auth.login_required
def save_print_settings():
    """Save print settings including font, border, and card size options"""
    try:
        data = request.get_json()

        conn = database.get_db_connection()
        cursor = conn.cursor()

        # Check if settings exist
        existing = cursor.execute(
            'SELECT id FROM print_settings LIMIT 1'
        ).fetchone()

        if existing:
            cursor.execute('''
                UPDATE print_settings SET
                    page_size = ?,
                    custom_width = ?,
                    custom_height = ?,
                    card_color_start = ?,
                    card_color_end = ?,
                    logo_id = ?,
                    logo_position = ?,
                    logo_size = ?,
                    font_size = ?,
                    font_color = ?,
                    border_enabled = ?,
                    border_color = ?,
                    border_width = ?,
                    card_mode = ?,
                    card_width = ?,
                    card_height = ?
                WHERE id = ?
            ''', (
                data.get('page_size', 'A4'),
                data.get('custom_width'),
                data.get('custom_height'),
                data.get('card_color_start', '#1e3c72'),
                data.get('card_color_end', '#2a5298'),
                data.get('logo_id'),
                data.get('logo_position', 'top-center'),
                data.get('logo_size', 100),
                data.get('font_size', 28),
                data.get('font_color', '#ffffff'),
                1 if data.get('border_enabled') else 0,
                data.get('border_color', '#ffffff'),
                data.get('border_width', 2),
                data.get('card_mode', 'grid'),
                data.get('card_width', 50),
                data.get('card_height', 50),
                existing['id']
            ))
        else:
            cursor.execute('''
                INSERT INTO print_settings
                (page_size, custom_width, custom_height, card_color_start,
                 card_color_end, logo_id, logo_position, logo_size,
                 font_size, font_color, border_enabled, border_color,
                 border_width, card_mode, card_width, card_height)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                data.get('page_size', 'A4'),
                data.get('custom_width'),
                data.get('custom_height'),
                data.get('card_color_start', '#1e3c72'),
                data.get('card_color_end', '#2a5298'),
                data.get('logo_id'),
                data.get('logo_position', 'top-center'),
                data.get('logo_size', 100),
                data.get('font_size', 28),
                data.get('font_color', '#ffffff'),
                1 if data.get('border_enabled') else 0,
                data.get('border_color', '#ffffff'),
                data.get('border_width', 2),
                data.get('card_mode', 'grid'),
                data.get('card_width', 50),
                data.get('card_height', 50)
            ))

        conn.commit()
        conn.close()

        return jsonify({'message': 'Settings saved'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ============== Products API Routes ==============

@app.route('/api/products', methods=['GET'])
@auth.login_required
def get_products():
    """Get all products"""
    try:
        conn = database.get_db_connection()
        products = conn.execute('''
            SELECT p.*, c.name as category_name
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            ORDER BY p.code
        ''').fetchall()
        conn.close()

        products_list = [dict(product) for product in products]
        return jsonify(products_list), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/products/<code>', methods=['GET'])
@auth.login_required
def get_product(code):
    """Get a single product by code"""
    try:
        conn = database.get_db_connection()
        product = conn.execute('''
            SELECT p.*, c.name as category_name
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.code = ?
        ''', (code,)).fetchone()
        conn.close()

        if product:
            return jsonify(dict(product)), 200
        else:
            return jsonify({'error': 'Product not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/products', methods=['POST'])
@auth.admin_required
def create_product():
    """Create a new product"""
    try:
        data = request.get_json()

        required_fields = ['code', 'name', 'price']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({'error': f'Field {field} is required'}), 400

        conn = database.get_db_connection()
        cursor = conn.cursor()

        existing = cursor.execute(
            'SELECT code FROM products WHERE code = ?', (data['code'],)
        ).fetchone()

        if existing:
            conn.close()
            return jsonify({'error': 'Product code already exists'}), 400

        cursor.execute('''
            INSERT INTO products
            (code, name, specs, price, logo_url, category_id, description)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            data['code'],
            data['name'],
            data.get('specs', ''),
            float(data['price']),
            data.get('logo_url', 'logowhite.png'),
            data.get('category_id'),
            data.get('description', '')
        ))

        conn.commit()
        product_id = cursor.lastrowid
        conn.close()

        return jsonify({
            'message': 'Product created successfully',
            'id': product_id
        }), 201
    except sqlite3.IntegrityError:
        return jsonify({'error': 'Product code already exists'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/products/<code>', methods=['PUT'])
@auth.admin_required
def update_product(code):
    """Update an existing product"""
    try:
        data = request.get_json()

        conn = database.get_db_connection()
        cursor = conn.cursor()

        existing = cursor.execute(
            'SELECT code FROM products WHERE code = ?', (code,)
        ).fetchone()

        if not existing:
            conn.close()
            return jsonify({'error': 'Product not found'}), 404

        cursor.execute('''
            UPDATE products
            SET name = ?, specs = ?, price = ?, logo_url = ?,
                category_id = ?, description = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE code = ?
        ''', (
            data.get('name', ''),
            data.get('specs', ''),
            float(data.get('price', 0)),
            data.get('logo_url', 'logowhite.png'),
            data.get('category_id'),
            data.get('description', ''),
            code
        ))

        conn.commit()
        conn.close()

        return jsonify({'message': 'Product updated successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/products/<code>', methods=['DELETE'])
@auth.admin_required
def delete_product(code):
    """Delete a product"""
    try:
        conn = database.get_db_connection()
        cursor = conn.cursor()

        existing = cursor.execute(
            'SELECT code FROM products WHERE code = ?', (code,)
        ).fetchone()

        if not existing:
            conn.close()
            return jsonify({'error': 'Product not found'}), 404

        cursor.execute('DELETE FROM products WHERE code = ?', (code,))
        conn.commit()
        conn.close()

        return jsonify({'message': 'Product deleted successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True, port=5000)
