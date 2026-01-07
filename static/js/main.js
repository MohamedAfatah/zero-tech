// Main page JavaScript for Zerotech Price Cards

const API_BASE_URL = '/api';

let products = [];
let logos = [];
let printSettings = {
    page_size: 'A4',
    custom_width: 21,
    custom_height: 29.7,
    card_color_start: '#1e3c72',
    card_color_end: '#2a5298',
    logo_id: null,
    logo_filename: 'logowhite.png',
    logo_position: 'top-center',
    logo_size: 100,
    font_size: 28,
    font_color: '#ffffff',
    border_enabled: false,
    border_color: '#ffffff',
    border_width: 2,
    card_mode: 'grid',
    card_width: 50,
    card_height: 50
};

// Page size definitions (in cm)
const PAGE_SIZES = {
    'A4': { width: 21, height: 29.7 },
    'A5': { width: 14.8, height: 21 },
    'Letter': { width: 21.59, height: 27.94 }
};

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
    await loadAllData();
    initProductSelects();
    initPrintConfig();
    initEventListeners();
});

// ============== Data Loading ==============

async function loadAllData() {
    try {
        await Promise.all([
            loadProducts(),
            loadLogos(),
            loadPrintSettings()
        ]);
    } catch (error) {
        console.error('Error loading data:', error);
        if (error.status === 401) {
            window.location.href = '/login';
        }
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
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

async function loadLogos() {
    try {
        const response = await fetch(`${API_BASE_URL}/logos`);
        logos = await response.json();
        populateLogoSelect();
    } catch (error) {
        console.error('Error loading logos:', error);
    }
}

async function loadPrintSettings() {
    try {
        const response = await fetch(`${API_BASE_URL}/print-settings`);
        const settings = await response.json();
        if (settings && Object.keys(settings).length > 0) {
            printSettings = { ...printSettings, ...settings };
            applySettingsToUI();
        }
    } catch (error) {
        console.error('Error loading print settings:', error);
    }
}

// ============== Product Selects ==============

function initProductSelects() {
    const productOptions = [
        { id: '', text: '' },  // Empty option for placeholder
        ...products.map(p => ({
            id: p.code,
            text: `${p.code} - ${p.name} (${p.price} جنيه)`
        }))
    ];

    $('.product-select').each(function() {
        $(this).select2({
            data: productOptions,
            placeholder: 'اختر منتج...',
            allowClear: true,
            dir: 'rtl',
            language: {
                noResults: function() {
                    return 'لا توجد نتائج';
                }
            }
        });
        // Set to null/empty by default
        $(this).val(null).trigger('change');
    });
}

// Clear product selection
function clearProduct(num) {
    const select = $(`#product${num}`);
    select.val(null).trigger('change');
}

// ============== Print Configuration ==============

function initPrintConfig() {
    // Page size radio buttons
    document.querySelectorAll('input[name="pageSize"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            const isCustom = e.target.value === 'Custom';
            document.getElementById('customSizeInputs').style.display = isCustom ? 'flex' : 'none';
            printSettings.page_size = e.target.value;
            if (!isCustom && PAGE_SIZES[e.target.value]) {
                printSettings.custom_width = PAGE_SIZES[e.target.value].width;
                printSettings.custom_height = PAGE_SIZES[e.target.value].height;
            } else if (isCustom) {
                // Read values from custom inputs when Custom is selected
                const customWidth = document.getElementById('customWidth');
                const customHeight = document.getElementById('customHeight');
                printSettings.custom_width = parseFloat(customWidth?.value) || 21;
                printSettings.custom_height = parseFloat(customHeight?.value) || 29.7;
            }
            updateLabelsSize();
        });
    });

    // Custom size inputs
    document.getElementById('customWidth')?.addEventListener('input', (e) => {
        printSettings.custom_width = parseFloat(e.target.value) || 21;
        updateLabelsSize();
    });

    document.getElementById('customHeight')?.addEventListener('input', (e) => {
        printSettings.custom_height = parseFloat(e.target.value) || 29.7;
        updateLabelsSize();
    });

    // Color pickers
    document.getElementById('colorStart')?.addEventListener('input', (e) => {
        printSettings.card_color_start = e.target.value;
        updateColorPreview();
        updateCardsStyle();
    });

    document.getElementById('colorEnd')?.addEventListener('input', (e) => {
        printSettings.card_color_end = e.target.value;
        updateColorPreview();
        updateCardsStyle();
    });

    // Font size slider
    const fontSizeSlider = document.getElementById('fontSizeSlider');
    const fontSizeValue = document.getElementById('fontSizeValue');
    
    if (fontSizeSlider) {
        fontSizeSlider.addEventListener('input', (e) => {
            printSettings.font_size = parseInt(e.target.value);
            if (fontSizeValue) {
                fontSizeValue.textContent = `${e.target.value}px`;
            }
            updateCardsStyle();
        });
    }

    // Font color picker
    document.getElementById('fontColor')?.addEventListener('input', (e) => {
        printSettings.font_color = e.target.value;
        updateCardsStyle();
    });

    // Logo select
    document.getElementById('logoSelect')?.addEventListener('change', (e) => {
        const selectedLogo = logos.find(l => l.id == e.target.value);
        if (selectedLogo) {
            printSettings.logo_id = selectedLogo.id;
            printSettings.logo_filename = selectedLogo.filename;
            updateLogoPreview();
            updateCardsLogo(); // Update logo in preview immediately
        }
    });

    // Logo position
    document.querySelectorAll('input[name="logoPosition"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            printSettings.logo_position = e.target.value;
            updateCardsStyle();
        });
    });

    // Border enabled checkbox
    const borderEnabled = document.getElementById('borderEnabled');
    const borderOptions = document.getElementById('borderOptions');
    
    if (borderEnabled) {
        borderEnabled.addEventListener('change', (e) => {
            printSettings.border_enabled = e.target.checked;
            if (borderOptions) {
                borderOptions.style.display = e.target.checked ? 'block' : 'none';
            }
            updateCardsStyle();
        });
    }

    // Border color
    document.getElementById('borderColor')?.addEventListener('input', (e) => {
        printSettings.border_color = e.target.value;
        updateCardsStyle();
    });

    // Border width slider
    const borderWidthSlider = document.getElementById('borderWidthSlider');
    const borderWidthValue = document.getElementById('borderWidthValue');
    
    if (borderWidthSlider) {
        borderWidthSlider.addEventListener('input', (e) => {
            printSettings.border_width = parseInt(e.target.value);
            if (borderWidthValue) {
                borderWidthValue.textContent = `${e.target.value}px`;
            }
            updateCardsStyle();
        });
    }

    // Card mode radio buttons
    document.querySelectorAll('input[name="cardMode"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            printSettings.card_mode = e.target.value;
            const cardSizeInputs = document.getElementById('cardSizeInputs');
            if (cardSizeInputs) {
                cardSizeInputs.style.display = e.target.value === 'grid' ? 'block' : 'none';
            }
            updateLabelsLayout();
        });
    });

    // Card width slider
    const cardWidthSlider = document.getElementById('cardWidthSlider');
    const cardWidthValue = document.getElementById('cardWidthValue');
    
    if (cardWidthSlider) {
        cardWidthSlider.addEventListener('input', (e) => {
            printSettings.card_width = parseInt(e.target.value);
            if (cardWidthValue) {
                cardWidthValue.textContent = `${e.target.value}%`;
            }
            updateLabelsLayout();
        });
    }

    // Card height slider
    const cardHeightSlider = document.getElementById('cardHeightSlider');
    const cardHeightValue = document.getElementById('cardHeightValue');
    
    if (cardHeightSlider) {
        cardHeightSlider.addEventListener('input', (e) => {
            printSettings.card_height = parseInt(e.target.value);
            if (cardHeightValue) {
                cardHeightValue.textContent = `${e.target.value}%`;
            }
            updateLabelsLayout();
        });
    }

    // Logo size slider
    const logoSizeSlider = document.getElementById('logoSizeSlider');
    const logoSizeValue = document.getElementById('logoSizeValue');
    
    if (logoSizeSlider) {
        logoSizeSlider.addEventListener('input', (e) => {
            printSettings.logo_size = parseInt(e.target.value);
            if (logoSizeValue) {
                logoSizeValue.textContent = `${e.target.value}px`;
            }
            updateCardsStyle();
        });
    }

    updateColorPreview();
}

function populateLogoSelect() {
    const select = document.getElementById('logoSelect');
    if (!select) return;

    select.innerHTML = logos.map(logo => 
        `<option value="${logo.id}" ${logo.id === printSettings.logo_id ? 'selected' : ''}>${logo.name}</option>`
    ).join('');

    // Set default if none selected
    if (!printSettings.logo_id && logos.length > 0) {
        printSettings.logo_id = logos[0].id;
        printSettings.logo_filename = logos[0].filename;
    }

    updateLogoPreview();
}

function applySettingsToUI() {
    // Page size
    const pageSizeRadio = document.querySelector(`input[name="pageSize"][value="${printSettings.page_size}"]`);
    if (pageSizeRadio) {
        pageSizeRadio.checked = true;
        if (printSettings.page_size === 'Custom') {
            document.getElementById('customSizeInputs').style.display = 'flex';
        }
    }

    // Custom size
    if (document.getElementById('customWidth')) {
        document.getElementById('customWidth').value = printSettings.custom_width || 21;
    }
    if (document.getElementById('customHeight')) {
        document.getElementById('customHeight').value = printSettings.custom_height || 29.7;
    }

    // Colors
    if (document.getElementById('colorStart')) {
        document.getElementById('colorStart').value = printSettings.card_color_start || '#1e3c72';
    }
    if (document.getElementById('colorEnd')) {
        document.getElementById('colorEnd').value = printSettings.card_color_end || '#2a5298';
    }

    // Font settings
    const fontSizeSlider = document.getElementById('fontSizeSlider');
    const fontSizeValue = document.getElementById('fontSizeValue');
    if (fontSizeSlider) {
        fontSizeSlider.value = printSettings.font_size || 28;
    }
    if (fontSizeValue) {
        fontSizeValue.textContent = `${printSettings.font_size || 28}px`;
    }
    
    if (document.getElementById('fontColor')) {
        document.getElementById('fontColor').value = printSettings.font_color || '#ffffff';
    }

    // Logo
    if (document.getElementById('logoSelect') && printSettings.logo_id) {
        document.getElementById('logoSelect').value = printSettings.logo_id;
    }

    // Logo position
    const positionRadio = document.querySelector(`input[name="logoPosition"][value="${printSettings.logo_position}"]`);
    if (positionRadio) {
        positionRadio.checked = true;
    }

    // Border settings
    const borderEnabled = document.getElementById('borderEnabled');
    const borderOptions = document.getElementById('borderOptions');
    if (borderEnabled) {
        borderEnabled.checked = printSettings.border_enabled || false;
        if (borderOptions) {
            borderOptions.style.display = printSettings.border_enabled ? 'block' : 'none';
        }
    }
    
    if (document.getElementById('borderColor')) {
        document.getElementById('borderColor').value = printSettings.border_color || '#ffffff';
    }
    
    const borderWidthSlider = document.getElementById('borderWidthSlider');
    const borderWidthValue = document.getElementById('borderWidthValue');
    if (borderWidthSlider) {
        borderWidthSlider.value = printSettings.border_width || 2;
    }
    if (borderWidthValue) {
        borderWidthValue.textContent = `${printSettings.border_width || 2}px`;
    }

    // Card mode
    const cardModeRadio = document.querySelector(`input[name="cardMode"][value="${printSettings.card_mode || 'grid'}"]`);
    if (cardModeRadio) {
        cardModeRadio.checked = true;
    }
    
    const cardSizeInputs = document.getElementById('cardSizeInputs');
    if (cardSizeInputs) {
        cardSizeInputs.style.display = (printSettings.card_mode === 'full') ? 'none' : 'block';
    }

    // Card size
    const cardWidthSlider = document.getElementById('cardWidthSlider');
    const cardWidthValue = document.getElementById('cardWidthValue');
    if (cardWidthSlider) {
        cardWidthSlider.value = printSettings.card_width || 50;
    }
    if (cardWidthValue) {
        cardWidthValue.textContent = `${printSettings.card_width || 50}%`;
    }

    const cardHeightSlider = document.getElementById('cardHeightSlider');
    const cardHeightValue = document.getElementById('cardHeightValue');
    if (cardHeightSlider) {
        cardHeightSlider.value = printSettings.card_height || 50;
    }
    if (cardHeightValue) {
        cardHeightValue.textContent = `${printSettings.card_height || 50}%`;
    }

    // Logo size
    const logoSizeSlider = document.getElementById('logoSizeSlider');
    const logoSizeValue = document.getElementById('logoSizeValue');
    if (logoSizeSlider) {
        logoSizeSlider.value = printSettings.logo_size || 100;
    }
    if (logoSizeValue) {
        logoSizeValue.textContent = `${printSettings.logo_size || 100}px`;
    }

    updateColorPreview();
    updateLogoPreview();
    updateLabelsSize();
    updateLabelsLayout();
}

function updateColorPreview() {
    const preview = document.getElementById('colorPreview');
    if (preview) {
        preview.style.background = `linear-gradient(135deg, ${printSettings.card_color_start}, ${printSettings.card_color_end})`;
    }
}

function updateLogoPreview() {
    const preview = document.getElementById('selectedLogoPreview');
    if (preview && printSettings.logo_filename) {
        preview.innerHTML = `<img src="/static/uploads/${printSettings.logo_filename}" alt="Logo Preview">`;
    }
}

function updateLabelsSize() {
    const labels = document.getElementById('labels');
    if (labels) {
        // Get proper page dimensions based on selected size
        let width, height;
        if (printSettings.page_size === 'Custom') {
            width = printSettings.custom_width || 21;
            height = printSettings.custom_height || 29.7;
        } else if (PAGE_SIZES[printSettings.page_size]) {
            width = PAGE_SIZES[printSettings.page_size].width;
            height = PAGE_SIZES[printSettings.page_size].height;
        } else {
            width = 21;
            height = 29.7;
        }
        labels.style.width = `${width}cm`;
        labels.style.height = `${height}cm`;
    }
}

function updateLabelsLayout() {
    const labels = document.getElementById('labels');
    const cards = document.querySelectorAll('.label');
    
    if (!labels) return;
    
    if (printSettings.card_mode === 'full') {
        // Full page mode - single card
        labels.style.gridTemplateColumns = '1fr';
        labels.style.gridTemplateRows = '1fr';
        cards.forEach(card => {
            card.style.width = '100%';
            card.style.height = '100%';
        });
    } else {
        // Grid mode - custom size
        const cardWidth = printSettings.card_width || 50;
        const cardHeight = printSettings.card_height || 50;
        
        labels.style.gridTemplateColumns = `repeat(2, ${cardWidth}%)`;
        labels.style.gridTemplateRows = `repeat(2, ${cardHeight}%)`;
        cards.forEach(card => {
            card.style.width = '100%';
            card.style.height = '100%';
        });
    }
}

function updateCardsStyle() {
    const cards = document.querySelectorAll('.label');
    cards.forEach(card => {
        // Update background
        card.style.background = `linear-gradient(135deg, ${printSettings.card_color_start}, ${printSettings.card_color_end})`;
        
        // Update font color
        card.style.color = printSettings.font_color || '#ffffff';
        
        // Update border
        if (printSettings.border_enabled) {
            card.style.border = `${printSettings.border_width || 2}px solid ${printSettings.border_color || '#ffffff'}`;
        } else {
            card.style.border = 'none';
        }
        
        // Update font size for content
        const productName = card.querySelector('.product-name');
        const specs = card.querySelector('.specs');
        const price = card.querySelector('.price');
        const logo = card.querySelector('.logo');
        
        if (productName) {
            productName.style.fontSize = `${printSettings.font_size || 28}px`;
            productName.style.color = printSettings.font_color || '#ffffff';
        }
        if (specs) {
            specs.style.fontSize = `${Math.round((printSettings.font_size || 28) * 0.6)}px`;
            specs.style.color = printSettings.font_color || '#ffffff';
        }
        if (price) {
            price.style.fontSize = `${Math.round((printSettings.font_size || 28) * 1.4)}px`;
            price.style.color = printSettings.font_color || '#ffffff';
        }
        
        // Update logo size
        if (logo) {
            logo.style.width = `${printSettings.logo_size || 100}px`;
            logo.style.height = 'auto';
        }
        
        applyLogoPosition(card);
    });
}

function updateCardsLogo() {
    const cards = document.querySelectorAll('.label');
    const logoSrc = `/static/uploads/${printSettings.logo_filename || 'logowhite.png'}`;
    
    cards.forEach(card => {
        const logo = card.querySelector('.logo');
        if (logo) {
            logo.src = logoSrc;
        }
    });
}

function applyLogoPosition(card) {
    const logo = card.querySelector('.logo');
    if (!logo) return;

    // Reset all position styles
    logo.style.position = 'absolute';
    logo.style.top = 'auto';
    logo.style.bottom = 'auto';
    logo.style.left = 'auto';
    logo.style.right = 'auto';
    logo.style.transform = 'none';

    const position = printSettings.logo_position;
    const margin = '1cm';

    switch (position) {
        case 'top-left':
            logo.style.top = margin;
            logo.style.right = margin;
            break;
        case 'top-center':
            logo.style.top = margin;
            logo.style.left = '50%';
            logo.style.transform = 'translateX(-50%)';
            break;
        case 'top-right':
            logo.style.top = margin;
            logo.style.left = margin;
            break;
        case 'center-left':
            logo.style.top = '50%';
            logo.style.right = margin;
            logo.style.transform = 'translateY(-50%)';
            break;
        case 'center':
            logo.style.top = '50%';
            logo.style.left = '50%';
            logo.style.transform = 'translate(-50%, -50%)';
            break;
        case 'center-right':
            logo.style.top = '50%';
            logo.style.left = margin;
            logo.style.transform = 'translateY(-50%)';
            break;
        case 'bottom-left':
            logo.style.bottom = margin;
            logo.style.right = margin;
            break;
        case 'bottom-center':
            logo.style.bottom = margin;
            logo.style.left = '50%';
            logo.style.transform = 'translateX(-50%)';
            break;
        case 'bottom-right':
            logo.style.bottom = margin;
            logo.style.left = margin;
            break;
    }
}

async function saveSettings() {
    try {
        const response = await fetch(`${API_BASE_URL}/print-settings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(printSettings)
        });

        if (response.ok) {
            showAlert('تم حفظ الإعدادات بنجاح', 'success');
            
            // Close the print config panel
            const configCollapse = document.getElementById('printConfig');
            if (configCollapse) {
                const bsCollapse = bootstrap.Collapse.getInstance(configCollapse);
                if (bsCollapse) {
                    bsCollapse.hide();
                } else {
                    new bootstrap.Collapse(configCollapse, { toggle: true }).hide();
                }
            }
            
            // Apply settings to existing cards in preview
            updateCardsStyle();
            
            // If there are cards, regenerate them with new settings
            const labels = document.getElementById('labels');
            if (labels && labels.children.length > 0) {
                // Get currently selected products and regenerate
                const selectedCodes = [];
                for (let i = 1; i <= 4; i++) {
                    const select = document.getElementById(`product${i}`);
                    const code = $(select).val();
                    if (code) selectedCodes.push(code);
                }
                
                if (selectedCodes.length > 0) {
                    labels.innerHTML = '';
                    selectedCodes.forEach(code => {
                        const product = products.find(p => p.code === code);
                        if (product) {
                            const card = createCard(product);
                            labels.appendChild(card);
                        }
                    });
                }
            }
        } else {
            showAlert('خطأ في حفظ الإعدادات', 'danger');
        }
    } catch (error) {
        showAlert('خطأ في الاتصال', 'danger');
    }
}

// ============== Card Generation ==============

function generateLabels() {
    const container = document.getElementById('labels');
    container.innerHTML = '';

    const selectedCodes = [];
    for (let i = 1; i <= 4; i++) {
        const select = document.getElementById(`product${i}`);
        const code = $(select).val();
        if (code) selectedCodes.push(code);
    }

    if (selectedCodes.length === 0) {
        showAlert('يرجى اختيار منتج واحد على الأقل', 'warning');
        return;
    }

    selectedCodes.forEach(code => {
        const product = products.find(p => p.code === code);
        if (product) {
            const card = createCard(product);
            container.appendChild(card);
        }
    });

    // Apply layout settings
    updateLabelsLayout();

    showAlert(`تم توليد ${selectedCodes.length} كارت بنجاح`, 'success');
    document.querySelector('.preview-section').scrollIntoView({ behavior: 'smooth' });
}

function createCard(product) {
    const card = document.createElement('div');
    card.className = 'label';
    card.style.background = `linear-gradient(135deg, ${printSettings.card_color_start}, ${printSettings.card_color_end})`;
    card.style.position = 'relative';
    card.style.color = printSettings.font_color || '#ffffff';
    
    // Apply border if enabled
    if (printSettings.border_enabled) {
        card.style.border = `${printSettings.border_width || 2}px solid ${printSettings.border_color || '#ffffff'}`;
    }

    const logoSrc = `/static/uploads/${printSettings.logo_filename || 'logowhite.png'}`;
    const fontSize = printSettings.font_size || 28;
    const fontColor = printSettings.font_color || '#ffffff';
    const logoSize = printSettings.logo_size || 100;

    card.innerHTML = `
        <img src="${logoSrc}" class="logo" alt="Logo" style="width: ${logoSize}px; height: auto;" onerror="this.style.display='none'">
        <div class="card-content">
            <div class="product-name" style="font-size: ${fontSize}px; color: ${fontColor};">${escapeHtml(product.name)}</div>
            <div class="specs" style="font-size: ${Math.round(fontSize * 0.6)}px; color: ${fontColor};">${escapeHtml(product.specs || '')}</div>
            <div class="price" style="font-size: ${Math.round(fontSize * 1.4)}px; color: ${fontColor};">${product.price} جنيه</div>
        </div>
    `;

    // Apply logo position
    setTimeout(() => applyLogoPosition(card), 0);

    return card;
}

// ============== Event Listeners ==============

function initEventListeners() {
    document.getElementById('generateBtn')?.addEventListener('click', generateLabels);
    document.getElementById('printBtn')?.addEventListener('click', printCards);
    document.getElementById('clearBtn')?.addEventListener('click', clearAll);
}

function clearAll() {
    $('.product-select').val(null).trigger('change');
    document.getElementById('labels').innerHTML = '';
    showAlert('تم مسح جميع البيانات', 'info');
}

function printCards() {
    const labels = document.getElementById('labels');
    if (labels.children.length === 0) {
        showAlert('لا توجد كروت للطباعة', 'warning');
        return;
    }

    // Apply print styles dynamically
    applyPrintStyles();
    window.print();
}

function applyPrintStyles() {
    // Remove existing print style
    const existingStyle = document.getElementById('dynamic-print-style');
    if (existingStyle) existingStyle.remove();

    // Get proper page dimensions based on selected size
    let width, height;
    if (printSettings.page_size === 'Custom') {
        width = printSettings.custom_width || 21;
        height = printSettings.custom_height || 29.7;
    } else if (PAGE_SIZES[printSettings.page_size]) {
        width = PAGE_SIZES[printSettings.page_size].width;
        height = PAGE_SIZES[printSettings.page_size].height;
    } else {
        width = 21;
        height = 29.7;
    }
    const fontSize = printSettings.font_size || 28;
    const fontColor = printSettings.font_color || '#ffffff';
    const logoSize = printSettings.logo_size || 100;
    const borderStyle = printSettings.border_enabled 
        ? `${printSettings.border_width || 2}px solid ${printSettings.border_color || '#ffffff'}` 
        : 'none';
    
    // Card layout settings
    const cardMode = printSettings.card_mode || 'grid';
    const cardWidth = printSettings.card_width || 50;
    const cardHeight = printSettings.card_height || 50;
    
    let gridStyle = '';
    if (cardMode === 'full') {
        gridStyle = `
            .labels {
                grid-template-columns: 1fr !important;
                grid-template-rows: 1fr !important;
            }
            .label {
                width: 100% !important;
                height: 100% !important;
            }
        `;
    } else {
        gridStyle = `
            .labels {
                grid-template-columns: repeat(2, ${cardWidth}%) !important;
                grid-template-rows: repeat(2, ${cardHeight}%) !important;
            }
        `;
    }

    const style = document.createElement('style');
    style.id = 'dynamic-print-style';
    style.textContent = `
        @media print {
            @page {
                size: ${width}cm ${height}cm;
                margin: 0;
            }
            html, body {
                width: ${width}cm !important;
                height: ${height}cm !important;
            }
            .labels {
                width: ${width}cm !important;
                height: ${height}cm !important;
            }
            ${gridStyle}
            .label {
                background: linear-gradient(135deg, ${printSettings.card_color_start}, ${printSettings.card_color_end}) !important;
                color: ${fontColor} !important;
                border: ${borderStyle} !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
            }
            .label .logo {
                width: ${logoSize}px !important;
                height: auto !important;
            }
            .label .product-name {
                font-size: ${fontSize}px !important;
                color: ${fontColor} !important;
            }
            .label .specs {
                font-size: ${Math.round(fontSize * 0.6)}px !important;
                color: ${fontColor} !important;
            }
            .label .price {
                font-size: ${Math.round(fontSize * 1.4)}px !important;
                color: ${fontColor} !important;
            }
        }
    `;
    document.head.appendChild(style);
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

    const container = document.querySelector('.generation-section .container');
    if (container) {
        container.insertBefore(alertDiv, container.firstChild);
        setTimeout(() => alertDiv.remove(), 5000);
    }
}
