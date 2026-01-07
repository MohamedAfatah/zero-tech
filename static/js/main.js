// Main page JavaScript for Zerotech Price Cards

const API_BASE_URL = '/api/products';

// Fetch all products from API
async function fetchProducts() {
  try {
    const response = await fetch(API_BASE_URL);
    if (!response.ok) {
      throw new Error('Failed to fetch products');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching products:', error);
    showAlert('خطأ في تحميل المنتجات', 'danger');
    return [];
  }
}

// Generate price cards
async function generateLabels() {
  const inputs = document.querySelectorAll('.code-input');
  const container = document.getElementById('labels');
  container.innerHTML = '';

  // Fetch products from API
  const products = await fetchProducts();
  
  if (products.length === 0) {
    showAlert('لا توجد منتجات في قاعدة البيانات', 'warning');
    return;
  }

  let count = 0;
  const errors = [];

  inputs.forEach((input, index) => {
    const code = input.value.trim();
    if (!code) return;

    const product = products.find(p => p.code === code);
    if (!product) {
      errors.push(`الكود ${code} غير موجود`);
      return;
    }

    if (count < 4) {
      const card = document.createElement('div');
      card.className = 'label';
      
      const logoUrl = product.logo_url || 'logo.png';
      
      card.innerHTML = `
        <img src="${logoUrl}" class="logo" alt="Logo" onerror="this.style.display='none'">
        <div class="product-name">${escapeHtml(product.name)}</div>
        <div class="specs">${escapeHtml(product.specs || '')}</div>
        <div class="price">${product.price} جنيه</div>
      `;
      
      container.appendChild(card);
      count++;
    }
  });

  if (errors.length > 0) {
    showAlert(errors.join('<br>'), 'warning');
  }

  if (count === 0) {
    showAlert('يرجى إدخال أكواد المنتجات', 'info');
  } else {
    showAlert(`تم توليد ${count} كارت بنجاح`, 'success');
  }
}

// Clear all inputs and cards
function clearAll() {
  const inputs = document.querySelectorAll('.code-input');
  inputs.forEach(input => input.value = '');
  document.getElementById('labels').innerHTML = '';
}

// Print function
function printCards() {
  const labels = document.getElementById('labels');
  if (labels.children.length === 0) {
    showAlert('لا توجد كروت للطباعة', 'warning');
    return;
  }
  window.print();
}

// Utility function to escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Show alert message
function showAlert(message, type = 'info') {
  const alertDiv = document.createElement('div');
  alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
  alertDiv.setAttribute('role', 'alert');
  alertDiv.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
  `;
  
  const container = document.querySelector('.card-generation');
  const existingAlert = container.querySelector('.alert');
  if (existingAlert) {
    existingAlert.remove();
  }
  
  container.insertBefore(alertDiv, container.firstChild);
  
  // Auto dismiss after 5 seconds
  setTimeout(() => {
    if (alertDiv.parentNode) {
      alertDiv.remove();
    }
  }, 5000);
}

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
  // Add event listeners
  const generateBtn = document.getElementById('generateBtn');
  const printBtn = document.getElementById('printBtn');
  const clearBtn = document.getElementById('clearBtn');
  
  if (generateBtn) {
    generateBtn.addEventListener('click', generateLabels);
  }
  
  if (printBtn) {
    printBtn.addEventListener('click', printCards);
  }
  
  if (clearBtn) {
    clearBtn.addEventListener('click', clearAll);
  }
  
  // Allow Enter key to generate
  const inputs = document.querySelectorAll('.code-input');
  inputs.forEach(input => {
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        generateLabels();
      }
    });
  });
});

