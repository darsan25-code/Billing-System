/**
 * Products.js – Product Management Page
 *
 * Sree Vel Murugan Hardware and Tiles – Billing System
 */

const ProductsPage = (() => {

  /* ── State ───────────────────────────────────────────────────── */
  let _searchQuery = '';
  let _selectedId  = null;

  /* ── Constants ──────────────────────────────────────────────── */
  const CATEGORIES = [
    'Cement', 'Tiles', 'Bricks', 'Sand & Aggregates',
    'Steel & Iron', 'Hardware', 'Plumbing', 'Electrical',
    'Paint', 'Tools', 'Sanitaryware', 'Adhesives & Chemicals', 'Other'
  ];

  const UNITS = [
    'Bag', 'Kg', 'Piece', 'Box', 'Bundle',
    'Meter', 'Sq. Meter', 'Sq. Feet', 'Liter', 'Set', 'Ton', 'Quintal', 'Nos'
  ];

  const GST_RATES = [0, 5, 12, 18, 28];

  /* ── Helpers ─────────────────────────────────────────────────── */
  const _$ = (id) => document.getElementById(id);
  const _esc = (s) => String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  /* ── Toast Notification ──────────────────────────────────────── */
  let _toastTimer = null;
  function _showToast(msg, type = 'success', ms = 2000) {
    let t = document.getElementById('prod-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'prod-toast';
      t.className = 'billing-toast';
      t.innerHTML = '<span class="toast-msg"></span>';
      document.body.appendChild(t);
    }
    t.className = `billing-toast billing-toast-${type}`;
    t.querySelector('.toast-msg').textContent = msg;
    clearTimeout(_toastTimer);
    requestAnimationFrame(() => t.classList.add('billing-toast-visible'));
    _toastTimer = setTimeout(() => t.classList.remove('billing-toast-visible'), ms);
  }

  if (typeof window !== 'undefined') {
    window.showToast = _showToast;
  }

  /* ── Stock Level Indicator Badge ────────────────────────────── */
  function _stockBadge(p) {
    const stock    = parseFloat(p.stock) || 0;
    const minStock = parseFloat(p.minStock) || 10;

    if (stock <= 0) {
      return `<span class="stock-badge stock-crit" style="background:#fee2e2;color:#991b1b;border:1px solid #fca5a5;padding:3px 8px;border-radius:12px;font-size:0.75rem;font-weight:600;">🔴 Out of Stock</span>`;
    }
    if (stock <= minStock) {
      return `<span class="stock-badge stock-low" style="background:#fef3c7;color:#92400e;border:1px solid #fcd34d;padding:3px 8px;border-radius:12px;font-size:0.75rem;font-weight:600;">🟡 Low Stock</span>`;
    }
    return `<span class="stock-badge stock-ok" style="background:#dcfce7;color:#166534;border:1px solid #86efac;padding:3px 8px;border-radius:12px;font-size:0.75rem;font-weight:600;">🟢 In Stock</span>`;
  }

  /* ── Multi-field Search Filter ──────────────────────────────── */
  function _getProducts() {
    const all = (typeof DB !== 'undefined' && DB.Products) ? DB.Products.all() : [];
    if (!_searchQuery) return all;
    const q = _searchQuery.toLowerCase().trim();
    return all.filter(p =>
      (p.name     || '').toLowerCase().includes(q) ||
      (p.id       || '').toLowerCase().includes(q) ||
      (p.model    || '').toLowerCase().includes(q) ||
      (p.brand    || '').toLowerCase().includes(q) ||
      (p.category || '').toLowerCase().includes(q) ||
      String(p.hsn || '').toLowerCase().includes(q)
    );
  }

  /* ── Row Selection ──────────────────────────────────────────── */
  function _selectRow(id) {
    document.querySelectorAll('.prod-row-selected').forEach(r => r.classList.remove('prod-row-selected'));
    if (!id) { _selectedId = null; return; }
    const tr = document.querySelector(`tr[data-prod-id="${id}"]`);
    if (tr) tr.classList.add('prod-row-selected');
    _selectedId = id;
  }

  /* ══════════════════════════════════════════════════════════════
     RENDER TABLE
     ══════════════════════════════════════════════════════════════ */
  function _renderTable() {
    const tbody = _$('prod-table-body');
    if (!tbody) return;

    const allProducts = (typeof DB !== 'undefined' && DB.Products) ? DB.Products.all() : [];
    const products    = _getProducts();

    /* Calculate stats for header bar */
    const totalProducts = allProducts.length;
    const totalStock    = allProducts.reduce((sum, p) => sum + (parseFloat(p.stock) || 0), 0);
    const lowStockCount = allProducts.filter(p => {
      const s   = parseFloat(p.stock) || 0;
      const min = parseFloat(p.minStock) || 10;
      return s <= min;
    }).length;

    const setElText = (id, val) => { const el = _$(id); if (el) el.textContent = val; };
    setElText('stat-total-products', totalProducts);
    setElText('stat-total-stock', totalStock.toLocaleString('en-IN'));
    setElText('stat-low-stock', lowStockCount);

    const pill = _$('prod-count-pill');
    if (pill) pill.textContent = `${totalProducts} product${totalProducts !== 1 ? 's' : ''}`;

    if (products.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="14" style="text-align:center;padding:40px 16px;color:#64748b;">
            <div style="font-size:1.1rem;font-weight:600;margin-bottom:6px;">
              ${_searchQuery ? `No products match "${_esc(_searchQuery)}"` : 'No products in catalogue'}
            </div>
            <div style="font-size:0.85rem;color:#94a3b8;">
              ${_searchQuery ? 'Try searching by Product Name, Code, Model, Brand, Category, or HSN.' : 'Press F3 or click "+ Add Product" to add your first product.'}
            </div>
          </td>
        </tr>`;
      return;
    }

    tbody.innerHTML = products.map(p => {
      const sellPrice = (parseFloat(p.rate) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const buyPrice  = (parseFloat(p.purchasePrice) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      return `
        <tr class="prod-row ${p.id === _selectedId ? 'prod-row-selected' : ''}" data-prod-id="${_esc(p.id)}">
          <td><span style="background:#e2e8f0;padding:2px 8px;border-radius:4px;font-family:monospace;font-weight:600;font-size:0.82rem;">${_esc(p.id)}</span></td>
          <td style="font-weight:600;color:#0f172a;">${_esc(p.name)}</td>
          <td>${_esc(p.model || '—')}</td>
          <td>${_esc(p.brand || '—')}</td>
          <td><span style="background:#f1f5f9;border:1px solid #cbd5e1;padding:2px 8px;border-radius:6px;font-size:0.8rem;">${_esc(p.category || '—')}</span></td>
          <td>${_esc(p.hsn || '—')}</td>
          <td>${_esc(p.unit || '—')}</td>
          <td style="text-align:right;">₹ ${buyPrice}</td>
          <td style="text-align:right;font-weight:600;color:#0f172a;">₹ ${sellPrice}</td>
          <td style="text-align:center;">${p.gst || 0}%</td>
          <td style="text-align:right;font-weight:600;">${p.stock ?? 0}</td>
          <td style="text-align:right;color:#64748b;">${p.minStock ?? 10}</td>
          <td style="text-align:center;">${_stockBadge(p)}</td>
          <td style="text-align:center;">
            <div style="display:inline-flex;gap:6px;">
              <button class="action-btn action-edit" data-id="${_esc(p.id)}" title="Edit product (F4)"
                style="background:#e0f2fe;color:#0369a1;border:1px solid #bae6fd;padding:4px 10px;border-radius:6px;cursor:pointer;font-size:0.8rem;font-weight:600;">
                ✏️ Edit
              </button>
              <button class="action-btn action-delete" data-id="${_esc(p.id)}" title="Delete product (Del)"
                style="background:#fee2e2;color:#991b1b;border:1px solid #fca5a5;padding:4px 10px;border-radius:6px;cursor:pointer;font-size:0.8rem;font-weight:600;">
                🗑️ Delete
              </button>
            </div>
          </td>
        </tr>`;
    }).join('');

    /* Table rows and action buttons are handled via event delegation in render() */
  }

  /* ══════════════════════════════════════════════════════════════
     DELETE PRODUCT CONFIRMATION MODAL
     ══════════════════════════════════════════════════════════════ */
  function _confirmDelete(id) {
    const p = (typeof DB !== 'undefined' && DB.Products) ? DB.Products.find(id) : null;
    const name = p?.name || 'this product';

    const overlay = document.createElement('div');
    overlay.id = 'prod-confirm-modal';
    overlay.className = 'prod-modal-overlay';
    overlay.innerHTML = `
      <div class="prod-modal" style="max-width:400px;padding:24px;border-radius:12px;background:#fff;box-shadow:0 10px 25px rgba(0,0,0,0.2);">
        <h3 style="margin-top:0;margin-bottom:12px;font-size:1.15rem;color:#0f172a;">⚠️ Delete Product?</h3>
        <p style="margin-bottom:20px;color:#475569;font-size:0.9rem;line-height:1.4;">
          Are you sure you want to delete <strong>"${_esc(name)}"</strong> (${_esc(id)})?
        </p>
        <div style="display:flex;justify-content:flex-end;gap:10px;">
          <button id="btn-cancel-delete" style="padding:8px 16px;border-radius:6px;border:1px solid #cbd5e1;background:#fff;cursor:pointer;font-weight:600;">Cancel</button>
          <button id="btn-confirm-delete" style="padding:8px 16px;border-radius:6px;border:none;background:#ef4444;color:#fff;cursor:pointer;font-weight:600;">Delete</button>
        </div>
      </div>`;

    document.body.appendChild(overlay);

    const closeConfirm = () => overlay.remove();

    _$('btn-cancel-delete')?.addEventListener('click', closeConfirm);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeConfirm(); });

    _$('btn-confirm-delete')?.addEventListener('click', () => {
      if (typeof DB !== 'undefined' && DB.Products) {
        DB.Products.remove(id);
      }
      if (_selectedId === id) _selectedId = null;
      closeConfirm();
      _showToast("Product deleted successfully", "success", 2000);
      _renderTable();
      _$('prod-search-input')?.focus();
    });
  }

  /* ══════════════════════════════════════════════════════════════
     ADD / EDIT PRODUCT MODAL
     ══════════════════════════════════════════════════════════════ */
  function _openModal(editId = null) {
    const p = (editId && typeof DB !== 'undefined' && DB.Products) ? DB.Products.find(editId) : null;

    const catOpts = CATEGORIES.map(c =>
      `<option value="${_esc(c)}" ${p?.category === c ? 'selected' : ''}>${_esc(c)}</option>`).join('');
    const unitOpts = UNITS.map(u =>
      `<option value="${_esc(u)}" ${p?.unit === u ? 'selected' : ''}>${_esc(u)}</option>`).join('');
    const gstOpts = GST_RATES.map(r =>
      `<option value="${r}" ${Number(p?.gst) === r ? 'selected' : ''}>${r}%</option>`).join('');

    const overlay = document.createElement('div');
    overlay.id = 'prod-modal-overlay';
    overlay.className = 'prod-modal-overlay';

    overlay.innerHTML = `
      <div class="prod-modal" role="dialog" aria-modal="true">
        <div class="prod-modal-header">
          <h2>${editId ? '✏️ Edit Product' : '📦 Add New Product'}</h2>
          <button class="modal-close-btn" id="modal-close-btn" aria-label="Close">✕</button>
        </div>

        <div class="prod-modal-body">
          <form id="prod-form" novalidate autocomplete="off">
            <div class="modal-section-title">📋 Product Details</div>

            <div class="form-row form-row-full">
              <div class="form-field">
                <label for="pf-name">Product Name <span class="req" style="color:#ef4444;">*</span></label>
                <input id="pf-name" type="text" placeholder="e.g. Portland Cement 50 kg / Vitrified Floor Tile 2x2" value="${_esc(p?.name || '')}" />
              </div>
            </div>

            <div class="form-row">
              <div class="form-field">
                <label for="pf-model">Model Name</label>
                <input id="pf-model" type="text" placeholder="e.g. OPC 53 Grade" value="${_esc(p?.model || '')}" />
              </div>
              <div class="form-field">
                <label for="pf-brand">Brand</label>
                <input id="pf-brand" type="text" placeholder="e.g. Ultratech, Kajaria" value="${_esc(p?.brand || '')}" />
              </div>
            </div>

            <div class="form-row">
              <div class="form-field">
                <label for="pf-category">Category</label>
                <select id="pf-category">
                  <option value="">Select category…</option>
                  ${catOpts}
                </select>
              </div>
              <div class="form-field">
                <label for="pf-hsn">HSN Code <span class="req" style="color:#ef4444;">*</span></label>
                <input id="pf-hsn" type="text" placeholder="e.g. 2523 / 6907" value="${_esc(p?.hsn || '')}" />
              </div>
            </div>

            <div class="modal-section-title">💰 Pricing &amp; GST</div>

            <div class="form-row form-row-3">
              <div class="form-field">
                <label for="pf-unit">Unit <span class="req" style="color:#ef4444;">*</span></label>
                <select id="pf-unit">
                  <option value="">Select unit…</option>
                  ${unitOpts}
                </select>
              </div>
              <div class="form-field">
                <label for="pf-gst">GST Percentage</label>
                <select id="pf-gst">${gstOpts}</select>
              </div>
              <div class="form-field">
                <label for="pf-purchase">Purchase Price (₹)</label>
                <input id="pf-purchase" type="number" min="0" step="0.01" placeholder="0.00" value="${p?.purchasePrice || ''}" />
              </div>
            </div>

            <div class="form-row">
              <div class="form-field">
                <label for="pf-price">Selling Price (₹) <span class="req" style="color:#ef4444;">*</span></label>
                <input id="pf-price" type="number" min="0.01" step="0.01" placeholder="0.00" value="${p?.rate || ''}" />
              </div>
            </div>

            <div class="modal-section-title">📦 Inventory &amp; Stock Levels</div>

            <div class="form-row">
              <div class="form-field">
                <label for="pf-stock">${editId ? 'Current Stock' : 'Opening Stock'}</label>
                <input id="pf-stock" type="number" min="0" step="1" placeholder="0" value="${p?.stock ?? 0}" />
              </div>
              <div class="form-field">
                <label for="pf-minstock">Minimum Stock (Low Stock Alert)</label>
                <input id="pf-minstock" type="number" min="0" step="1" placeholder="10" value="${p?.minStock ?? 10}" />
              </div>
            </div>
          </form>
        </div>

        <div class="prod-modal-footer">
          <button class="modal-btn modal-btn-cancel" id="modal-cancel-btn">Cancel</button>
          <button class="modal-btn modal-btn-save" id="saveProductBtn">
            ${editId ? '✔ Update Product' : '＋ Save Product'}
          </button>
        </div>
      </div>`;

    document.body.appendChild(overlay);

    /* Real-time input validation to clear red borders on typing */
    const nameInp = _$('pf-name');
    nameInp?.addEventListener('input', () => {
      if ((nameInp.value || '').trim().length >= 2) {
        nameInp.classList.remove('pf-invalid');
        const err = nameInp.closest('.form-field')?.querySelector('.pf-error');
        if (err) err.remove();
      }
    });

    ['pf-hsn', 'pf-unit', 'pf-price', 'pf-stock'].forEach(id => {
      const inp = _$(id);
      inp?.addEventListener('input', () => {
        inp.classList.remove('pf-invalid');
        const err = inp.closest('.form-field')?.querySelector('.pf-error');
        if (err) err.remove();
      });
    });

    function saveProduct(e) {
      if (e && e.preventDefault) e.preventDefault();
      _saveProduct(editId);
    }

    function initializeProductModalEvents() {
      _$('saveProductBtn')?.addEventListener('click', saveProduct);
      _$('modal-close-btn')?.addEventListener('click', _closeModal);
      _$('modal-cancel-btn')?.addEventListener('click', _closeModal);
    }

    initializeProductModalEvents();

    overlay.addEventListener('click', (e) => { if (e.target === overlay) _closeModal(); });
    overlay._kh = (e) => { if (e.key === 'Escape') _closeModal(); };
    document.addEventListener('keydown', overlay._kh);

    _$('prod-form')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        saveProduct(e);
      }
    });

    setTimeout(() => _$('pf-name')?.focus(), 80);
  }

  function _closeModal() {
    const ov = _$('prod-modal-overlay');
    if (!ov) return;
    if (ov._kh) document.removeEventListener('keydown', ov._kh);
    ov.style.opacity    = '0';
    ov.style.transition = 'opacity 0.15s';
    setTimeout(() => ov.remove(), 160);
  }

  /* ── Save / Update Product ───────────────────────────────────── */
  function _saveProduct(editId = null) {
    if (typeof DB === 'undefined' || !DB.Products) {
      _showToast('⚠️ Database not ready', 'error');
      return;
    }

    const nameVal      = (_$('pf-name')?.value     || '').trim();
    const model        = (_$('pf-model')?.value    || '').trim();
    const brand        = (_$('pf-brand')?.value    || '').trim();
    const category     = _$('pf-category')?.value  || '';
    const hsnVal       = (_$('pf-hsn')?.value      || '').trim();
    const unitVal      = _$('pf-unit')?.value      || '';
    const gst          = parseFloat(_$('pf-gst')?.value)      || 0;
    const purchasePrice= parseFloat(_$('pf-purchase')?.value) || 0;
    const priceRaw     = _$('pf-price')?.value;
    const stockRaw     = _$('pf-stock')?.value;
    const rate         = parseFloat(priceRaw);
    const stock        = parseFloat(stockRaw);
    const minStock     = parseFloat(_$('pf-minstock')?.value) || 10;

    /* Validation */
    const errs = [];
    if (!nameVal || nameVal.length < 2) {
      errs.push({ id: 'pf-name', msg: 'Product name minimum 2 characters required' });
    }
    if (!hsnVal) {
      errs.push({ id: 'pf-hsn', msg: 'HSN code is required' });
    }
    if (!priceRaw || isNaN(rate) || rate <= 0) {
      errs.push({ id: 'pf-price', msg: 'Selling price is required' });
    }
    if (!unitVal) {
      errs.push({ id: 'pf-unit', msg: 'Unit is required' });
    }
    if (stockRaw === '' || stockRaw === null || stockRaw === undefined || isNaN(stock)) {
      errs.push({ id: 'pf-stock', msg: 'Opening stock is required' });
    }

    document.querySelectorAll('.pf-error').forEach(el => el.remove());
    document.querySelectorAll('.pf-invalid').forEach(el => el.classList.remove('pf-invalid'));

    if (errs.length > 0) {
      errs.forEach(e => {
        const inp = _$(e.id);
        if (!inp) return;
        inp.classList.add('pf-invalid');
        const el = document.createElement('div');
        el.className   = 'pf-error';
        el.textContent = e.msg;
        inp.closest('.form-field')?.appendChild(el);
      });
      _showToast("❌ Please fill all required fields", 'error', 2000);
      _$(errs[0].id)?.focus();
      return;
    }

    const data = {
      name:          nameVal,
      model:         model,
      brand:         brand,
      category:      category,
      hsn:           hsnVal,
      unit:          unitVal,
      gst:           gst,
      purchasePrice: purchasePrice,
      rate:          rate,
      stock:         stock,
      minStock:      minStock
    };

    if (editId) {
      DB.Products.update(editId, data);
      _showToast("Product updated successfully", "success", 2000);
    } else {
      DB.Products.insert(data);
      _showToast("Product saved successfully", "success", 2000);
    }

    _closeModal();
    _renderTable();
    setTimeout(() => _$('prod-search-input')?.focus(), 180);
  }

  /* ══════════════════════════════════════════════════════════════
     HTML BUILDER
     ══════════════════════════════════════════════════════════════ */
  function _buildHTML() {
    return `
      <!-- HEADER BAR -->
      <div class="prod-header-bar">
        <div class="prod-header-left">
          <div class="prod-header-title">
            <h1>📦 Products Catalogue</h1>
            <p>Sree Vel Murugan Hardware &amp; Tiles</p>
          </div>
        </div>
        <div class="prod-header-right">
          <span class="prod-count-pill" id="prod-count-pill">— products</span>
          <button class="btn-add-product" id="btn-add-product">
            ＋ Add Product
            <span class="btn-shortcut-tag">[F3]</span>
          </button>
        </div>
      </div>

      <!-- DASHBOARD STATS BAR -->
      <div class="prod-stats-bar">
        <div class="prod-stat-item">
          <span class="stat-num" id="stat-total-products">0</span> Total Products
        </div>
        <div class="prod-stat-item stat-ok">
          <span class="stat-num" id="stat-total-stock">0</span> Total Stock Quantity
        </div>
        <div class="prod-stat-item stat-low">
          <span class="stat-num" id="stat-low-stock">0</span> Low-Stock Count
        </div>
      </div>

      <!-- SEARCH TOOLBAR -->
      <div class="prod-toolbar">
        <div class="prod-search-wrap">
          <svg class="prod-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            id="prod-search-input"
            class="prod-search-input"
            type="text"
            placeholder="Search by Product Name, Code, Model, Brand, Category, or HSN..."
            autocomplete="off"
            aria-label="Search products"
          />
          <button class="clear-search-btn" id="btn-clear-search" style="display:none" aria-label="Clear search">✕</button>
        </div>
        <div class="prod-toolbar-right">
          <div class="prod-shortcut-hints">
            <span class="prod-shortcut-hint"><kbd>F3</kbd> Add</span>
            <span class="prod-shortcut-hint"><kbd>F4</kbd> Edit Selected</span>
            <span class="prod-shortcut-hint"><kbd>Del</kbd> Delete Selected</span>
          </div>
        </div>
      </div>

      <!-- PRODUCT TABLE CARD -->
      <div class="prod-table-card">
        <div class="prod-table-wrap">
          <table class="prod-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Product Name</th>
                <th>Model</th>
                <th>Brand</th>
                <th>Category</th>
                <th>HSN</th>
                <th>Unit</th>
                <th style="text-align:right;">Purchase Price</th>
                <th style="text-align:right;">Selling Price</th>
                <th style="text-align:center;">GST %</th>
                <th style="text-align:right;">Opening Stock</th>
                <th style="text-align:right;">Min Stock</th>
                <th style="text-align:center;">Stock Status</th>
                <th style="text-align:center;">Actions</th>
              </tr>
            </thead>
            <tbody id="prod-table-body">
              <!-- Populated by _renderTable() -->
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  /* ══════════════════════════════════════════════════════════════
     RENDER MAIN PAGE
     ══════════════════════════════════════════════════════════════ */
  function render(container) {
    if (!document.getElementById('products-css')) {
      const lnk = document.createElement('link');
      lnk.id = 'products-css';
      lnk.rel = 'stylesheet';
      lnk.href = 'src/pages/Products/Products.css';
      document.head.appendChild(lnk);
    }

    if (typeof DB !== 'undefined' && DB.init) DB.init();

    _searchQuery = '';
    _selectedId  = null;

    container.innerHTML = '';
    container.style.padding  = '0';
    container.style.overflow = 'hidden';

    const page = document.createElement('div');
    page.className = 'products-page';
    page.innerHTML = _buildHTML();
    container.appendChild(page);

    _$('btn-add-product')?.addEventListener('click', () => _openModal(null));

    const tbody = _$('prod-table-body');
    if (tbody) {
      tbody.addEventListener('click', (e) => {
        const editBtn = e.target.closest('.action-edit');
        if (editBtn) {
          e.stopPropagation();
          _openModal(editBtn.dataset.id);
          return;
        }
        const delBtn = e.target.closest('.action-delete');
        if (delBtn) {
          e.stopPropagation();
          _confirmDelete(delBtn.dataset.id);
          return;
        }
        const tr = e.target.closest('.prod-row');
        if (tr) {
          const id = tr.dataset.prodId;
          _selectRow(_selectedId === id ? null : id);
        }
      });
    }

    const sinp = _$('prod-search-input');
    const sclr = _$('btn-clear-search');

    sinp?.addEventListener('input', (e) => {
      _searchQuery       = e.target.value;
      sclr.style.display = _searchQuery ? '' : 'none';
      _renderTable();
    });

    sclr?.addEventListener('click', () => {
      if (sinp) { sinp.value = ''; sinp.focus(); }
      _searchQuery = '';
      sclr.style.display = 'none';
      _renderTable();
    });

    /* Register Keyboard Shortcuts */
    if (typeof KeyboardShortcuts !== 'undefined') {
      KeyboardShortcuts.clear();

      KeyboardShortcuts.register('f3', (e) => {
        e.preventDefault();
        _openModal(null);
      });

      KeyboardShortcuts.register('f4', (e) => {
        e.preventDefault();
        if (_selectedId) {
          _openModal(_selectedId);
        } else {
          _showToast('Click a product row to select it first', 'info', 2000);
        }
      });

      KeyboardShortcuts.register('delete', (e) => {
        if (_$('prod-modal-overlay') || _$('prod-confirm-modal')) return;
        const a = document.activeElement;
        if (a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.isContentEditable)) return;
        if (_selectedId) {
          _confirmDelete(_selectedId);
        } else {
          _showToast('Click a product row to select it first', 'info', 2000);
        }
      });

      KeyboardShortcuts.register('escape', () => {
        _selectRow(null);
      });
    }

    _renderTable();
    setTimeout(() => sinp?.focus(), 80);
  }

  return { render };

})();
