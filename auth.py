from functools import wraps
from flask import session, redirect, url_for, jsonify, request
from werkzeug.security import check_password_hash, generate_password_hash
import database


def login_user(username, password):
    """Authenticate user and return user data if successful"""
    conn = database.get_db_connection()
    user = conn.execute(
        'SELECT * FROM users WHERE username = ?', (username,)
    ).fetchone()
    conn.close()

    if user and check_password_hash(user['password_hash'], password):
        # Check if user is active
        if not user['is_active']:
            return None, 'Account is deactivated'
        return dict(user), None
    return None, 'Invalid username or password'


def get_current_user():
    """Get the current logged-in user from session"""
    if 'user_id' not in session:
        return None

    conn = database.get_db_connection()
    user = conn.execute(
        '''SELECT id, username, full_name, email, phone, role, is_active,
           created_at FROM users WHERE id = ?''',
        (session['user_id'],)
    ).fetchone()
    conn.close()

    return dict(user) if user else None


def login_required(f):
    """Decorator to require login for a route"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            if request.is_json:
                return jsonify({'error': 'Authentication required'}), 401
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function


def admin_required(f):
    """Decorator to require admin role for a route"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            if request.is_json:
                return jsonify({'error': 'Authentication required'}), 401
            return redirect(url_for('login'))

        user = get_current_user()
        if not user or user['role'] != 'admin':
            if request.is_json:
                return jsonify({'error': 'Admin access required'}), 403
            return redirect(url_for('index'))
        return f(*args, **kwargs)
    return decorated_function


def create_user(username, password, role='user', full_name=None,
                email=None, phone=None):
    """Create a new user with extended fields"""
    conn = database.get_db_connection()
    cursor = conn.cursor()

    # Check if username exists
    existing = cursor.execute(
        'SELECT id FROM users WHERE username = ?', (username,)
    ).fetchone()

    if existing:
        conn.close()
        return None, 'Username already exists'

    password_hash = generate_password_hash(password)
    cursor.execute('''
        INSERT INTO users (username, password_hash, full_name, email,
                          phone, role, is_active)
        VALUES (?, ?, ?, ?, ?, ?, 1)
    ''', (username, password_hash, full_name, email, phone, role))

    user_id = cursor.lastrowid
    conn.commit()
    conn.close()

    return user_id, None


def get_all_users():
    """Get all users with extended fields"""
    conn = database.get_db_connection()
    users = conn.execute(
        '''SELECT id, username, full_name, email, phone, role, is_active,
           created_at FROM users ORDER BY created_at DESC'''
    ).fetchall()
    conn.close()
    return [dict(user) for user in users]


def delete_user(user_id):
    """Delete a user by ID"""
    conn = database.get_db_connection()
    cursor = conn.cursor()

    # Don't allow deleting the last admin
    cursor.execute("SELECT COUNT(*) as count FROM users WHERE role = 'admin'")
    admin_count = cursor.fetchone()['count']

    cursor.execute("SELECT role FROM users WHERE id = ?", (user_id,))
    user = cursor.fetchone()

    if user and user['role'] == 'admin' and admin_count <= 1:
        conn.close()
        return False, 'Cannot delete the last admin user'

    cursor.execute('DELETE FROM users WHERE id = ?', (user_id,))
    conn.commit()
    conn.close()
    return True, None


def toggle_user_status(user_id):
    """Toggle user active status"""
    conn = database.get_db_connection()
    cursor = conn.cursor()

    # Get current status
    cursor.execute("SELECT is_active, role FROM users WHERE id = ?", (user_id,))
    user = cursor.fetchone()

    if not user:
        conn.close()
        return False, 'User not found'

    # Don't allow deactivating the last active admin
    if user['is_active'] and user['role'] == 'admin':
        cursor.execute(
            "SELECT COUNT(*) as count FROM users "
            "WHERE role = 'admin' AND is_active = 1"
        )
        active_admin_count = cursor.fetchone()['count']
        if active_admin_count <= 1:
            conn.close()
            return False, 'Cannot deactivate the last active admin'

    new_status = 0 if user['is_active'] else 1
    cursor.execute(
        'UPDATE users SET is_active = ? WHERE id = ?',
        (new_status, user_id)
    )
    conn.commit()
    conn.close()
    return True, new_status


def update_user(user_id, full_name=None, email=None, phone=None, role=None):
    """Update user details"""
    conn = database.get_db_connection()
    cursor = conn.cursor()

    cursor.execute(
        '''UPDATE users SET full_name = ?, email = ?, phone = ?, role = ?
           WHERE id = ?''',
        (full_name, email, phone, role, user_id)
    )
    conn.commit()
    conn.close()


def update_user_password(user_id, new_password):
    """Update user password"""
    conn = database.get_db_connection()
    cursor = conn.cursor()
    password_hash = generate_password_hash(new_password)
    cursor.execute(
        'UPDATE users SET password_hash = ? WHERE id = ?',
        (password_hash, user_id)
    )
    conn.commit()
    conn.close()
