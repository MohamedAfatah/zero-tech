// Admin page JavaScript for CRUD operations

const API_BASE_URL = '/api/products';

let products = [];
let editingProduct = null;

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
  loadProducts();
  
  // Form submission
  const productForm = document.getElementById('productForm');
  if (productForm) {
    productForm.addEventListener('submit', handleFormSubmit);
  }
  
  // Modal reset on close
  const productModal = document.getElementById('productModal');
  if (productModal) {
    productModal.addEventListener('hidden.bs.modal', () => {
      resetForm();
    });
  }
});

// Load all products
async function loadProducts() {
  try {
    showLoading(true);
    const response = await fetch(API_BASE_URL);
    if (!response.ok) {
      throw new Error('Failed to fetch products');
    }
    products = await response.json();
    renderProductsTable();
  } catch (error) {
    console.error('Error loading products:', error);
    showAlert('خطأ في تحميل المنتجات', 'danger');
  } finally {
    showLoading(false);
  }
}

// Render products table
function renderProductsTable() {
  const tbody = document.querySelector('#productsTable tbody');
  if (!tbody) return;
  
  if (products.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center">لا توجد منتجات</td>
      </tr>
    `;
    return;
  }
  
  tbody.innerHTML = products.map(product => `
    <tr>
      <td>${escapeHtml(product.code)}</td>
      <td>${escapeHtml(product.name)}</td>
      <td>${escapeHtml(product.specs || '-')}</td>
      <td>${product.price} جنيه</td>
      <td>${escapeHtml(product.category || '-')}</td>
      <td class="table-actions">
        <button class="btn btn-sm btn-primary" onclick="editProduct('${product.code}')">
          <i class="bi bi-pencil"></i> تعديل
        </button>
        <button class="btn btn-sm btn-danger" onclick="deleteProduct('${product.code}')">
          <i class="bi bi-trash"></i> حذف
        </button>
      </td>
    </tr>
  `).join('');
}

// Open modal for new product
function openNewProductModal() {
  editingProduct = null;
  resetForm();
  const modal = new bootstrap.Modal(document.getElementById('productModal'));
  modal.show();
}

// Edit product
function editProduct(code) {
  const product = products.find(p => p.code === code);
  if (!product) {
    showAlert('المنتج غير موجود', 'danger');
    return;
  }
  
  editingProduct = product;
  fillForm(product);
  const modal = new bootstrap.Modal(document.getElementById('productModal'));
  modal.show();
}

// Fill form with product data
function fillForm(product) {
  document.getElementById('productCode').value = product.code;
  document.getElementById('productName').value = product.name || '';
  document.getElementById('productSpecs').value = product.specs || '';
  document.getElementById('productPrice').value = product.price || '';
  document.getElementById('productLogoUrl').value = product.logo_url || 'logo.png';
  document.getElementById('productCategory').value = product.category || '';
  document.getElementById('productDescription').value = product.description || '';
  
  // Disable code field when editing
  document.getElementById('productCode').disabled = true;
  
  // Update modal title
  document.querySelector('#productModal .modal-title').textContent = 'تعديل منتج';
  document.getElementById('submitBtn').textContent = 'تحديث';
}

// Reset form
function resetForm() {
  document.getElementById('productForm').reset();
  document.getElementById('productCode').disabled = false;
  editingProduct = null;
  document.querySelector('#productModal .modal-title').textContent = 'إضافة منتج جديد';
  document.getElementById('submitBtn').textContent = 'إضافة';
  
  // Clear validation
  const form = document.getElementById('productForm');
  const inputs = form.querySelectorAll('.is-invalid');
  inputs.forEach(input => input.classList.remove('is-invalid'));
}

// Handle form submission
async function handleFormSubmit(e) {
  e.preventDefault();
  
  const formData = {
    code: document.getElementById('productCode').value.trim(),
    name: document.getElementById('productName').value.trim(),
    specs: document.getElementById('productSpecs').value.trim(),
    price: parseFloat(document.getElementById('productPrice').value),
    logo_url: document.getElementById('productLogoUrl').value.trim() || 'logo.png',
    category: document.getElementById('productCategory').value.trim(),
    description: document.getElementById('productDescription').value.trim()
  };
  
  // Validation
  if (!formData.code || !formData.name || !formData.price || formData.price <= 0) {
    showAlert('يرجى ملء جميع الحقول المطلوبة', 'warning');
    return;
  }
  
  try {
    showLoading(true);
    let response;
    
    if (editingProduct) {
      // Update existing product
      response = await fetch(`${API_BASE_URL}/${editingProduct.code}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
    } else {
      // Create new product
      response = await fetch(API_BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
    }
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'حدث خطأ');
    }
    
    showAlert(editingProduct ? 'تم تحديث المنتج بنجاح' : 'تم إضافة المنتج بنجاح', 'success');
    
    // Close modal and reload products
    const modal = bootstrap.Modal.getInstance(document.getElementById('productModal'));
    modal.hide();
    
    await loadProducts();
  } catch (error) {
    console.error('Error saving product:', error);
    showAlert(error.message || 'حدث خطأ أثناء الحفظ', 'danger');
  } finally {
    showLoading(false);
  }
}

// Delete product
async function deleteProduct(code) {
  const product = products.find(p => p.code === code);
  if (!product) {
    showAlert('المنتج غير موجود', 'danger');
    return;
  }
  
  if (!confirm(`هل أنت متأكد من حذف المنتج "${product.name}" (${code})؟`)) {
    return;
  }
  
  try {
    showLoading(true);
    const response = await fetch(`${API_BASE_URL}/${code}`, {
      method: 'DELETE'
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'حدث خطأ');
    }
    
    showAlert('تم حذف المنتج بنجاح', 'success');
    await loadProducts();
  } catch (error) {
    console.error('Error deleting product:', error);
    showAlert(error.message || 'حدث خطأ أثناء الحذف', 'danger');
  } finally {
    showLoading(false);
  }
}

// Utility functions
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showAlert(message, type = 'info') {
  const alertDiv = document.createElement('div');
  alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
  alertDiv.setAttribute('role', 'alert');
  alertDiv.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
  `;
  
  const container = document.querySelector('.admin-container');
  const existingAlert = container.querySelector('.alert');
  if (existingAlert) {
    existingAlert.remove();
  }
  
  container.insertBefore(alertDiv, container.firstChild);
  
  setTimeout(() => {
    if (alertDiv.parentNode) {
      alertDiv.remove();
    }
  }, 5000);
}

function showLoading(show) {
  const loadingDiv = document.getElementById('loading');
  if (loadingDiv) {
    loadingDiv.style.display = show ? 'block' : 'none';
  }
}

