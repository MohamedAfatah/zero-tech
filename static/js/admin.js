// Admin page JavaScript for CRUD operations with Pagination & Search

const API_BASE_URL = '/api';

// Data arrays
let products = [];
let filteredProducts = [];
let categories = [];
let filteredCategories = [];
let users = [];
let filteredUsers = [];
let logos = [];

// Edit states
let editingProduct = null;
let editingCategory = null;
let editingUser = null;

// Pagination state
const pagination = {
    products: { page: 1, perPage: 10, total: 0 },
    categories: { page: 1, perPage: 10, total: 0 },
    users: { page: 1, perPage: 10, total: 0 }
};

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    loadAllData();
    initForms();
    initLogoPreview();
});

// ============== Tab Management ==============

function initTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;
            
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            document.getElementById(`${tabId}-tab`).classList.add('active');
        });
    });
}

// ============== Data Loading ==============

async function loadAllData() {
    showLoading(true);
    try {
        await Promise.all([
            loadProducts(),
            loadCategories(),
            loadUsers(),
            loadLogos()
        ]);
    } catch (error) {
        console.error('Error loading data:', error);
    } finally {
        showLoading(false);
    }
}

async function loadProducts() {
    try {
        const response = await fetch(`${API_BASE_URL}/products`);
        if (response.status === 401) {
            window.location.href = '/login';
            return;
        }
        products = await response.json();
        filteredProducts = [...products];
        pagination.products.total = filteredProducts.length;
        pagination.products.page = 1;
        renderProductsTable();
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

async function loadCategories() {
    try {
        const response = await fetch(`${API_BASE_URL}/categories`);
        categories = await response.json();
        filteredCategories = [...categories];
        pagination.categories.total = filteredCategories.length;
        pagination.categories.page = 1;
        renderCategoriesTable();
        updateCategoryDropdowns();
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

async function loadUsers() {
    try {
        const response = await fetch(`${API_BASE_URL}/users`);
        users = await response.json();
        filteredUsers = [...users];
        pagination.users.total = filteredUsers.length;
        pagination.users.page = 1;
        renderUsersTable();
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

async function loadLogos() {
    try {
        const response = await fetch(`${API_BASE_URL}/logos`);
        logos = await response.json();
        renderLogosGrid();
    } catch (error) {
        console.error('Error loading logos:', error);
    }
}

// ============== Pagination Functions ==============

function getPaginatedData(data, paginationState) {
    const start = (paginationState.page - 1) * paginationState.perPage;
    const end = start + paginationState.perPage;
    return data.slice(start, end);
}

function renderPagination(containerId, paginationState, onPageChange) {
    const container = document.getElementById(containerId);
    const totalPages = Math.ceil(paginationState.total / paginationState.perPage);
    const start = (paginationState.page - 1) * paginationState.perPage + 1;
    const end = Math.min(paginationState.page * paginationState.perPage, paginationState.total);
    
    if (paginationState.total === 0) {
        container.innerHTML = '';
        return;
    }
    
    let pagesHtml = '';
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= paginationState.page - 1 && i <= paginationState.page + 1)) {
            pagesHtml += `<button class="pagination-btn ${i === paginationState.page ? 'active' : ''}" onclick="${onPageChange}(${i})">${i}</button>`;
        } else if (i === paginationState.page - 2 || i === paginationState.page + 2) {
            pagesHtml += `<span style="color: var(--text-muted); padding: 0 5px;">...</span>`;
        }
    }
    
    container.innerHTML = `
        <div class="pagination-info">
            عرض ${start} - ${end} من ${paginationState.total} عنصر
        </div>
        <div class="pagination-controls">
            <button class="pagination-btn" onclick="${onPageChange}(${paginationState.page - 1})" ${paginationState.page === 1 ? 'disabled' : ''}>
                <i class="bi bi-chevron-right"></i>
            </button>
            ${pagesHtml}
            <button class="pagination-btn" onclick="${onPageChange}(${paginationState.page + 1})" ${paginationState.page === totalPages ? 'disabled' : ''}>
                <i class="bi bi-chevron-left"></i>
            </button>
        </div>
    `;
}

// ============== Products ==============

function filterProducts() {
    const search = document.getElementById('productsSearch').value.toLowerCase().trim();
    
    if (!search) {
        filteredProducts = [...products];
    } else {
        filteredProducts = products.filter(p => 
            p.code.toLowerCase().includes(search) ||
            p.name.toLowerCase().includes(search) ||
            (p.specs && p.specs.toLowerCase().includes(search)) ||
            (p.category_name && p.category_name.toLowerCase().includes(search))
        );
    }
    
    pagination.products.total = filteredProducts.length;
    pagination.products.page = 1;
    renderProductsTable();
}

function changeProductsPerPage() {
    pagination.products.perPage = parseInt(document.getElementById('productsPerPage').value);
    pagination.products.page = 1;
    renderProductsTable();
}

function goToProductsPage(page) {
    const totalPages = Math.ceil(pagination.products.total / pagination.products.perPage);
    if (page < 1 || page > totalPages) return;
    pagination.products.page = page;
    renderProductsTable();
}

function renderProductsTable() {
    const tbody = document.querySelector('#productsTable tbody');
    const paginatedData = getPaginatedData(filteredProducts, pagination.products);
    
    if (filteredProducts.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center" style="padding: 3rem;">
                    <i class="bi bi-inbox" style="font-size: 3rem; opacity: 0.5;"></i>
                    <p>لا توجد منتجات</p>
                </td>
            </tr>
        `;
        document.getElementById('productsPagination').innerHTML = '';
        return;
    }
    
    tbody.innerHTML = paginatedData.map(p => `
        <tr>
            <td><span class="code-badge">${escapeHtml(p.code)}</span></td>
            <td><strong>${escapeHtml(p.name)}</strong></td>
            <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(p.specs || '-')}</td>
            <td><span class="price-badge">${p.price} جنيه</span></td>
            <td>${p.category_name ? `<span class="category-badge">${escapeHtml(p.category_name)}</span>` : '-'}</td>
            <td class="actions-cell">
                <button class="btn-modern btn-primary-custom btn-sm" onclick="editProduct('${p.code}')">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn-modern btn-danger-custom btn-sm" onclick="deleteProduct('${p.code}')">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
    
    renderPagination('productsPagination', pagination.products, 'goToProductsPage');
}

function openProductModal(product = null) {
    editingProduct = product;
    const modal = new bootstrap.Modal(document.getElementById('productModal'));
    
    document.getElementById('productModalTitle').textContent = product ? 'تعديل منتج' : 'إضافة منتج جديد';
    document.getElementById('productSubmitBtn').textContent = product ? 'تحديث' : 'إضافة';
    document.getElementById('productCode').disabled = !!product;
    
    if (product) {
        document.getElementById('productCode').value = product.code;
        document.getElementById('productName').value = product.name;
        document.getElementById('productPrice').value = product.price;
        document.getElementById('productSpecs').value = product.specs || '';
        document.getElementById('productDescription').value = product.description || '';
        $('#productCategory').val(product.category_id).trigger('change');
    } else {
        document.getElementById('productForm').reset();
        $('#productCategory').val(null).trigger('change');
    }
    
    modal.show();
}

function editProduct(code) {
    const product = products.find(p => p.code === code);
    if (product) openProductModal(product);
}

async function deleteProduct(code) {
    if (!confirm('هل أنت متأكد من حذف هذا المنتج؟')) return;
    
    try {
        showLoading(true);
        const response = await fetch(`${API_BASE_URL}/products/${code}`, { method: 'DELETE' });
        const data = await response.json();
        
        if (response.ok) {
            showAlert('تم حذف المنتج بنجاح', 'success');
            await loadProducts();
        } else {
            showAlert(data.error, 'danger');
        }
    } catch (error) {
        showAlert('حدث خطأ', 'danger');
    } finally {
        showLoading(false);
    }
}

// ============== Categories ==============

function filterCategories() {
    const search = document.getElementById('categoriesSearch').value.toLowerCase().trim();
    
    if (!search) {
        filteredCategories = [...categories];
    } else {
        filteredCategories = categories.filter(c => 
            c.name.toLowerCase().includes(search)
        );
    }
    
    pagination.categories.total = filteredCategories.length;
    pagination.categories.page = 1;
    renderCategoriesTable();
}

function changeCategoriesPerPage() {
    pagination.categories.perPage = parseInt(document.getElementById('categoriesPerPage').value);
    pagination.categories.page = 1;
    renderCategoriesTable();
}

function goToCategoriesPage(page) {
    const totalPages = Math.ceil(pagination.categories.total / pagination.categories.perPage);
    if (page < 1 || page > totalPages) return;
    pagination.categories.page = page;
    renderCategoriesTable();
}

function renderCategoriesTable() {
    const tbody = document.querySelector('#categoriesTable tbody');
    const paginatedData = getPaginatedData(filteredCategories, pagination.categories);
    const startIndex = (pagination.categories.page - 1) * pagination.categories.perPage;
    
    if (filteredCategories.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center" style="padding: 3rem;">
                    <i class="bi bi-folder" style="font-size: 3rem; opacity: 0.5;"></i>
                    <p>لا توجد فئات</p>
                </td>
            </tr>
        `;
        document.getElementById('categoriesPagination').innerHTML = '';
        return;
    }
    
    tbody.innerHTML = paginatedData.map((c, i) => `
        <tr>
            <td>${startIndex + i + 1}</td>
            <td><span class="category-badge">${escapeHtml(c.name)}</span></td>
            <td>${formatDate(c.created_at)}</td>
            <td class="actions-cell">
                <button class="btn-modern btn-primary-custom btn-sm" onclick="editCategory(${c.id})">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn-modern btn-danger-custom btn-sm" onclick="deleteCategory(${c.id})">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
    
    renderPagination('categoriesPagination', pagination.categories, 'goToCategoriesPage');
}

function updateCategoryDropdowns() {
    const options = categories.map(c => ({ id: c.id, text: c.name }));
    
    $('#productCategory').select2({
        data: options,
        placeholder: 'اختر الفئة',
        allowClear: true,
        dropdownParent: $('#productModal'),
        dir: 'rtl'
    });
}

function openCategoryModal(category = null) {
    editingCategory = category;
    const modal = new bootstrap.Modal(document.getElementById('categoryModal'));
    
    document.getElementById('categoryModalTitle').textContent = category ? 'تعديل فئة' : 'إضافة فئة جديدة';
    document.getElementById('categorySubmitBtn').textContent = category ? 'تحديث' : 'إضافة';
    
    if (category) {
        document.getElementById('categoryName').value = category.name;
    } else {
        document.getElementById('categoryForm').reset();
    }
    
    modal.show();
}

function editCategory(id) {
    const category = categories.find(c => c.id === id);
    if (category) openCategoryModal(category);
}

async function deleteCategory(id) {
    if (!confirm('هل أنت متأكد من حذف هذه الفئة؟')) return;
    
    try {
        showLoading(true);
        const response = await fetch(`${API_BASE_URL}/categories/${id}`, { method: 'DELETE' });
        
        if (response.ok) {
            showAlert('تم حذف الفئة بنجاح', 'success');
            await loadCategories();
        } else {
            const data = await response.json();
            showAlert(data.error, 'danger');
        }
    } catch (error) {
        showAlert('حدث خطأ', 'danger');
    } finally {
        showLoading(false);
    }
}

// ============== Users ==============

function filterUsers() {
    const search = document.getElementById('usersSearch').value.toLowerCase().trim();
    
    if (!search) {
        filteredUsers = [...users];
    } else {
        filteredUsers = users.filter(u => 
            u.username.toLowerCase().includes(search) ||
            (u.full_name && u.full_name.toLowerCase().includes(search)) ||
            (u.email && u.email.toLowerCase().includes(search)) ||
            (u.phone && u.phone.includes(search))
        );
    }
    
    pagination.users.total = filteredUsers.length;
    pagination.users.page = 1;
    renderUsersTable();
}

function changeUsersPerPage() {
    pagination.users.perPage = parseInt(document.getElementById('usersPerPage').value);
    pagination.users.page = 1;
    renderUsersTable();
}

function goToUsersPage(page) {
    const totalPages = Math.ceil(pagination.users.total / pagination.users.perPage);
    if (page < 1 || page > totalPages) return;
    pagination.users.page = page;
    renderUsersTable();
}

function renderUsersTable() {
    const tbody = document.querySelector('#usersTable tbody');
    const paginatedData = getPaginatedData(filteredUsers, pagination.users);
    const startIndex = (pagination.users.page - 1) * pagination.users.perPage;
    
    if (filteredUsers.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center" style="padding: 3rem;">
                    <i class="bi bi-people" style="font-size: 3rem; opacity: 0.5;"></i>
                    <p>لا يوجد مستخدمين</p>
                </td>
            </tr>
        `;
        document.getElementById('usersPagination').innerHTML = '';
        return;
    }
    
    tbody.innerHTML = paginatedData.map((u, i) => `
        <tr>
            <td>${startIndex + i + 1}</td>
            <td><strong>${escapeHtml(u.username)}</strong></td>
            <td>${escapeHtml(u.full_name || '-')}</td>
            <td>${escapeHtml(u.email || '-')}</td>
            <td>${escapeHtml(u.phone || '-')}</td>
            <td><span class="role-badge role-${u.role}">${u.role === 'admin' ? 'مدير' : 'مستخدم'}</span></td>
            <td>
                <span class="status-badge ${u.is_active ? 'active' : 'inactive'}" onclick="toggleUserStatus(${u.id})">
                    <i class="bi bi-${u.is_active ? 'check-circle' : 'x-circle'}"></i>
                    ${u.is_active ? 'نشط' : 'معطل'}
                </span>
            </td>
            <td class="actions-cell">
                <button class="btn-modern btn-primary-custom btn-sm" onclick="editUser(${u.id})">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn-modern btn-danger-custom btn-sm" onclick="deleteUser(${u.id})">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
    
    renderPagination('usersPagination', pagination.users, 'goToUsersPage');
}

function openUserModal(user = null) {
    editingUser = user;
    const modal = new bootstrap.Modal(document.getElementById('userModal'));
    
    document.getElementById('userModalTitle').textContent = user ? 'تعديل مستخدم' : 'إضافة مستخدم جديد';
    document.getElementById('userSubmitBtn').textContent = user ? 'تحديث' : 'إضافة';
    
    // Handle password field visibility
    const passwordRequired = document.getElementById('passwordRequired');
    const passwordHint = document.getElementById('passwordHint');
    const passwordInput = document.getElementById('userPassword');
    
    if (user) {
        passwordRequired.style.display = 'none';
        passwordHint.style.display = 'block';
        passwordInput.required = false;
        
        document.getElementById('userId').value = user.id;
        document.getElementById('userName').value = user.username;
        document.getElementById('userPassword').value = '';
        document.getElementById('userFullName').value = user.full_name || '';
        document.getElementById('userEmail').value = user.email || '';
        document.getElementById('userPhone').value = user.phone || '';
        document.getElementById('userRole').value = user.role;
        
        // Disable username editing
        document.getElementById('userName').disabled = true;
    } else {
        passwordRequired.style.display = 'inline';
        passwordHint.style.display = 'none';
        passwordInput.required = true;
        
        document.getElementById('userForm').reset();
        document.getElementById('userId').value = '';
        document.getElementById('userName').disabled = false;
    }
    
    modal.show();
}

function editUser(id) {
    const user = users.find(u => u.id === id);
    if (user) openUserModal(user);
}

async function toggleUserStatus(id) {
    try {
        showLoading(true);
        const response = await fetch(`${API_BASE_URL}/users/${id}/toggle-status`, { method: 'POST' });
        const data = await response.json();
        
        if (response.ok) {
            showAlert(data.message, 'success');
            await loadUsers();
        } else {
            showAlert(data.error, 'danger');
        }
    } catch (error) {
        showAlert('حدث خطأ', 'danger');
    } finally {
        showLoading(false);
    }
}

async function deleteUser(id) {
    if (!confirm('هل أنت متأكد من حذف هذا المستخدم؟')) return;
    
    try {
        showLoading(true);
        const response = await fetch(`${API_BASE_URL}/users/${id}`, { method: 'DELETE' });
        const data = await response.json();
        
        if (response.ok) {
            showAlert('تم حذف المستخدم بنجاح', 'success');
            await loadUsers();
        } else {
            showAlert(data.error, 'danger');
        }
    } catch (error) {
        showAlert('حدث خطأ', 'danger');
    } finally {
        showLoading(false);
    }
}

// ============== Logos ==============

function renderLogosGrid() {
    const grid = document.getElementById('logosGrid');
    
    if (logos.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <i class="bi bi-image"></i>
                <p>لا توجد شعارات</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = logos.map(logo => `
        <div class="logo-card">
            <div class="logo-preview-img">
                <img src="/static/uploads/${logo.filename}" alt="${escapeHtml(logo.name)}" onerror="this.src='/static/uploads/logowhite.png'">
            </div>
            <div class="logo-info">
                <h4>${escapeHtml(logo.name)}</h4>
                <span class="logo-type-badge type-${logo.logo_type}">${getLogoTypeLabel(logo.logo_type)}</span>
            </div>
            ${logo.logo_type === 'custom' ? `
                <button class="btn-modern btn-danger-custom btn-sm" onclick="deleteLogo(${logo.id})">
                    <i class="bi bi-trash"></i>
                </button>
            ` : ''}
        </div>
    `).join('');
}

function getLogoTypeLabel(type) {
    switch(type) {
        case 'white': return 'أبيض';
        case 'black': return 'أسود';
        default: return 'مخصص';
    }
}

function openLogoUploadModal() {
    document.getElementById('logoForm').reset();
    document.getElementById('logoPreview').innerHTML = '';
    const modal = new bootstrap.Modal(document.getElementById('logoModal'));
    modal.show();
}

function initLogoPreview() {
    document.getElementById('logoFile').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                document.getElementById('logoPreview').innerHTML = `
                    <img src="${e.target.result}" alt="Preview">
                `;
            };
            reader.readAsDataURL(file);
        }
    });
}

async function deleteLogo(id) {
    if (!confirm('هل أنت متأكد من حذف هذا الشعار؟')) return;
    
    try {
        showLoading(true);
        const response = await fetch(`${API_BASE_URL}/logos/${id}`, { method: 'DELETE' });
        const data = await response.json();
        
        if (response.ok) {
            showAlert('تم حذف الشعار بنجاح', 'success');
            await loadLogos();
        } else {
            showAlert(data.error, 'danger');
        }
    } catch (error) {
        showAlert('حدث خطأ', 'danger');
    } finally {
        showLoading(false);
    }
}

// ============== Form Handlers ==============

function initForms() {
    // Product Form
    document.getElementById('productForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const data = {
            code: document.getElementById('productCode').value.trim(),
            name: document.getElementById('productName').value.trim(),
            price: parseFloat(document.getElementById('productPrice').value),
            specs: document.getElementById('productSpecs').value.trim(),
            description: document.getElementById('productDescription').value.trim(),
            category_id: $('#productCategory').val() || null
        };
        
        try {
            showLoading(true);
            const url = editingProduct ? `${API_BASE_URL}/products/${editingProduct.code}` : `${API_BASE_URL}/products`;
            const method = editingProduct ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            
            if (response.ok) {
                showAlert(editingProduct ? 'تم تحديث المنتج' : 'تم إضافة المنتج', 'success');
                bootstrap.Modal.getInstance(document.getElementById('productModal')).hide();
                await loadProducts();
            } else {
                showAlert(result.error, 'danger');
            }
        } catch (error) {
            showAlert('حدث خطأ', 'danger');
        } finally {
            showLoading(false);
        }
    });
    
    // Category Form
    document.getElementById('categoryForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = document.getElementById('categoryName').value.trim();
        
        try {
            showLoading(true);
            const url = editingCategory ? `${API_BASE_URL}/categories/${editingCategory.id}` : `${API_BASE_URL}/categories`;
            const method = editingCategory ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name })
            });
            
            const result = await response.json();
            
            if (response.ok) {
                showAlert(editingCategory ? 'تم تحديث الفئة' : 'تم إضافة الفئة', 'success');
                bootstrap.Modal.getInstance(document.getElementById('categoryModal')).hide();
                await loadCategories();
            } else {
                showAlert(result.error, 'danger');
            }
        } catch (error) {
            showAlert('حدث خطأ', 'danger');
        } finally {
            showLoading(false);
        }
    });
    
    // User Form
    document.getElementById('userForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const userId = document.getElementById('userId').value;
        const isEditing = !!userId;
        
        const data = {
            username: document.getElementById('userName').value.trim(),
            password: document.getElementById('userPassword').value,
            role: document.getElementById('userRole').value,
            full_name: document.getElementById('userFullName').value.trim(),
            email: document.getElementById('userEmail').value.trim(),
            phone: document.getElementById('userPhone').value.trim()
        };
        
        // For editing, remove password if empty
        if (isEditing && !data.password) {
            delete data.password;
        }
        
        try {
            showLoading(true);
            const url = isEditing ? `${API_BASE_URL}/users/${userId}` : `${API_BASE_URL}/users`;
            const method = isEditing ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            
            if (response.ok) {
                showAlert(isEditing ? 'تم تحديث المستخدم' : 'تم إضافة المستخدم', 'success');
                bootstrap.Modal.getInstance(document.getElementById('userModal')).hide();
                await loadUsers();
            } else {
                showAlert(result.error, 'danger');
            }
        } catch (error) {
            showAlert('حدث خطأ', 'danger');
        } finally {
            showLoading(false);
        }
    });
    
    // Logo Form
    document.getElementById('logoForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData();
        formData.append('name', document.getElementById('logoName').value.trim());
        formData.append('file', document.getElementById('logoFile').files[0]);
        
        try {
            showLoading(true);
            const response = await fetch(`${API_BASE_URL}/logos`, {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (response.ok) {
                showAlert('تم رفع الشعار', 'success');
                bootstrap.Modal.getInstance(document.getElementById('logoModal')).hide();
                await loadLogos();
            } else {
                showAlert(result.error, 'danger');
            }
        } catch (error) {
            showAlert('حدث خطأ', 'danger');
        } finally {
            showLoading(false);
        }
    });
}

// ============== Auth ==============

async function logout() {
    try {
        await fetch(`${API_BASE_URL}/auth/logout`, { method: 'POST' });
        window.location.href = '/login';
    } catch (error) {
        window.location.href = '/login';
    }
}

// ============== Utilities ==============

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('ar-EG');
}

function showAlert(message, type = 'info') {
    const existingAlerts = document.querySelectorAll('.alert-modern');
    existingAlerts.forEach(a => a.remove());
    
    const icons = {
        success: 'bi-check-circle-fill',
        danger: 'bi-x-circle-fill',
        warning: 'bi-exclamation-triangle-fill',
        info: 'bi-info-circle-fill'
    };
    
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert-modern alert-${type}`;
    alertDiv.innerHTML = `
        <i class="bi ${icons[type] || icons.info}"></i>
        <span>${message}</span>
        <button onclick="this.parentElement.remove()" style="margin-right: auto; background: none; border: none; color: inherit; cursor: pointer;">
            <i class="bi bi-x"></i>
        </button>
    `;
    
    const container = document.querySelector('.admin-section .container');
    container.insertBefore(alertDiv, container.firstChild);
    
    setTimeout(() => alertDiv.remove(), 5000);
}

function showLoading(show) {
    document.getElementById('loading').style.display = show ? 'flex' : 'none';
}
