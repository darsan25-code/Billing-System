/**
 * Products.js – Product Management Page (Hardware & Tiles Shop Workflow)
 *
 * Features:
 *   • Professional Add / Edit Product Modal (11 fields)
 *   • Stock indicators (Green = In Stock, Yellow = Low Stock, Red = Critical Stock)
 *   • Product History tracking (Price changes, stock updates, edit logs with date & time)
 *   • Keyboard shortcuts: F3 (Add), F4 (Edit selected), Delete (Delete selected)
 *   • Multi-field search (Name, Model, Brand, Product Code, HSN, Category)
 *   • Sticky search bar, category badges, brand badges, stock progress bars & statistics
 *
 * Project: Sree Vel Murugan Hardware and Tiles – Billing System
 */

const ProductsPage = (() => {

  /* ── State ───────────────────────────────────────────────────── */
  let _searchQuery       = '';
  let _selectedId        = null;   // currently selected row's product ID

  /* ── Constants ──────────────────────────────────────────────── */
  const CATEGORIES = [
    'Cement', 'Tiles', 'Bricks', 'Sand & Aggregates',
    'Steel & Iron', 'Hardware', 'Plumbing', 'Electrical',
    'Paint', 'Tools', 'Sanitaryware', 'Adhesives & Chemicals', 'Other',
  ];

  const UNITS = [
    'Bag', 'Kg', 'Piece', 'Box', 'Bundle',
    'Meter', 'Sq. Meter', 'Sq. Feet', 'Liter', 'Set', 'Ton', 'Quintal', 'Nos',
  ];

  const GST_RATES = [0, 5, 12, 18, 28];

  /* ── Category colour palette ────────────────────────────────── */
  const CAT_COLORS = {
    'Cement':           { bg:'#dbeafe', color:'#1e40af', border:'#93c5fd' },
    'Tiles':            { bg:'#ede9fe', color:'#5b21b6', border:'#c4b5fd' },
    'Bricks':           { bg:'#fef3c7', color:'#92400e', border:'#fcd34d' },
    'Sand & Aggregates':{ bg:'#fde68a', color:'#78350f', border:'#fbbf24' },
    'Steel & Iron':     { bg:'#e2e8f0', color:'#334155', border:'#94a3b8' },
    'Hardware':         { bg:'#cffafe', color:'#164e63', border:'#67e8f9' },
    'Plumbing':         { bg:'#d1fae5', color:'#065f46', border:'#6ee7b7' },
    'Electrical':       { bg:'#fee2e2', color:'#991b1b', border:'#fca5a5' },
    'Paint':            { bg:'#fce7f3', color:'#9d174d', border:'#f9a8d4' },
    'Tools':            { bg:'#dcfce7', color:'#14532d', border:'#86efac' },
    'Sanitaryware':     { bg:'#e0f2fe', color:'#0369a1', border:'#7dd3fc' },
    'Adhesives & Chemicals': { bg:'#fae8ff', color:'#86198f', border:'#f0abfc' },
    'Other':            { bg:'#f1f5f9', color:'#475569', border:'#cbd5e1' },
  };

  /* ── SVG Icons ──────────────────────────────────────────────── */
  const IC = {
    search: `<svg class="prod-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
    plus:   `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
    edit:   `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
    trash:  `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`,
    hist:   `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    pkg:    `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>`,
  };

  /* ── Helpers ─────────────────────────────────────────────────── */
  const _$ = (id) => document.getElementById(id);
  const _esc = (s) => String(s || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

  /* ── Toast ──────────────────────────────────────────────────── */
  let _toastTimer = null;
  function _showToast(msg, type = 'info', ms = 2400) {
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

  /* ── Category badge ─────────────────────────────────────────── */
  function _catBadge(cat) {
    if (!cat) return '<span class="td-muted">—</span>';
    const c = CAT_COLORS[cat] || CAT_COLORS['Other'];
    return `<span class="cat-badge" style="background:${c.bg};color:${c.color};border-color:${c.border}">${_esc(cat)}</span>`;
  }

  /* ── Brand badge ────────────────────────────────────────────── */
  function _brandBadge(brand) {
    if (!brand) return '<span class="td-muted">—</span>';
    return `<span class="brand-badge" title="${_esc(brand)}">${_esc(brand)}</span>`;
  }

  /* ── Stock level indicators (Green = In Stock, Yellow = Low Stock, Red = Critical Stock) ── */
  function _stockLevel(p) {
    const n   = parseFloat(p.stock) || 0;
    const min = parseFloat(p.minStock) || 10;
    if (n <= 0)   return 'crit';  // Red: Critical / Out of stock
    if (n <= min) return 'low';   // Yellow: Low stock
    return 'ok';                  // Green: In stock
  }

  function _stockCell(p) {
    const n     = parseFloat(p.stock) || 0;
    const min   = parseFloat(p.minStock) || 10;
    const lvl   = _stockLevel(p);
    const max   = Math.max(min * 4, n * 1.2, 50);
    const pct   = Math.min(100, Math.round((n / max) * 100));

    const labels = { ok: 'In Stock', low: 'Low Stock', crit: 'Critical Stock' };
    const badges = { ok: 'stock-ok', low: 'stock-low', crit: 'stock-crit' };
    const bars   = { ok: 'bar-ok',   low: 'bar-low',   crit: 'bar-crit' };

    return `
      <div class="stock-cell">
        <div class="stock-cell-top">
          <span class="stock-num">${n} <span class="stock-unit">${_esc(p.unit || '')}</span></span>
          <span class="stock-badge ${badges[lvl]}">${labels[lvl]}</span>
        </div>
        <div class="stock-bar-track">
          <div class="stock-bar-fill ${bars[lvl]}" style="width:${pct}%"></div>
        </div>
      </div>`;
  }

  /* ── Dashboard Statistics ──────────────────────────────────── */
  function _computeStats(products) {
    let ok = 0, low = 0, crit = 0;
    const cats = new Set();
    products.forEach(p => {
      if (p.category) cats.add(p.category);
      const lvl = _stockLevel(p);
      if (lvl === 'ok')        ok++;
      else if (lvl === 'low')  low++;
      else crit++;
    });
    return { ok, low, crit, cats: cats.size };
  }

  /* ── Multi-field Search Filter ──────────────────────────────── */
  function _getProducts() {
    const all = (typeof DB !== 'undefined') ? DB.Products.all() : [];
    if (!_searchQuery) return all;
    const q = _searchQuery.toLowerCase();
    return all.filter(p =>
      (p.name     || '').toLowerCase().includes(q) ||
      (p.model    || '').toLowerCase().includes(q) ||
      (p.brand    || '').toLowerCase().includes(q) ||
      (p.id       || '').toLowerCase().includes(q) ||
      String(p.hsn || '').includes(q)              ||
      (p.category || '').toLowerCase().includes(q)
    );
  }

  /* ── Format date & time for history tracking ───────────────── */
  function _fmtTime(iso) {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleString('en-IN', {
        day:'2-digit', month:'short', year:'numeric',
        hour:'2-digit', minute:'2-digit', hour12: true
      });
    } catch { return iso; }
  }

  /* ── Row selection ──────────────────────────────────────────── */
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

    const products = _getProducts();
    const total    = (typeof DB !== 'undefined') ? DB.Products.count() : 0;

    /* Update stats bar */
    const s = _computeStats((typeof DB !== 'undefined') ? DB.Products.all() : []);
    const set = (id, v) => { const el = _$(id); if (el) el.textContent = v; };
    set('stat-total', total);
    set('stat-ok',    s.ok);
    set('stat-low',   s.low);
    set('stat-crit',  s.crit);
    set('stat-cats',  s.cats);

    const pill = _$('prod-count-pill');
    if (pill) pill.textContent = `${total} product${total !== 1 ? 's' : ''}`;

    const rsl = _$('prod-result-label');
    if (rsl) rsl.textContent = _searchQuery
      ? `${products.length} of ${total} shown`
      : '';

    if (products.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="10" class="prod-empty-cell">
            <div class="prod-empty-state">
              <div class="prod-empty-icon">${IC.pkg}</div>
              <p>${_searchQuery ? `No match for &ldquo;${_esc(_searchQuery)}&rdquo;` : 'No products in catalogue'}</p>
              <span>${_searchQuery ? 'Try searching by Product Name, Model, Brand, Code or HSN.' : 'Press F3 or click "+ Add Product" to create your first product.'}</span>
            </div>
          </td>
        </tr>`;
      return;
    }

    tbody.innerHTML = products.map(p => {
      const sell = (p.rate || 0).toLocaleString('en-IN',
        { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const purchase = (p.purchasePrice || 0).toLocaleString('en-IN',
        { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      return `
        <tr class="prod-row ${p.id === _selectedId ? 'prod-row-selected' : ''}" data-prod-id="${_esc(p.id)}">
          <td class="col-code"><span class="prod-code-chip">${_esc(p.id)}</span></td>
          <td class="col-name">
            <div class="prod-name-wrap">
              <div class="prod-name-main" title="${_esc(p.name)}">${_esc(p.name)}</div>
              ${p.model ? `<div class="prod-name-model">Model: ${_esc(p.model)}</div>` : ''}
            </div>
          </td>
          <td class="col-brand">${_brandBadge(p.brand)}</td>
          <td class="col-category">${_catBadge(p.category)}</td>
          <td class="col-hsn">${_esc(p.hsn || '—')}</td>
          <td class="col-unit">${_esc(p.unit || '—')}</td>
          <td class="col-sell td-right">
            <div class="price-stack">
              <span class="price-cell">₹&nbsp;${sell}</span>
              ${p.purchasePrice ? `<span class="purchase-sub">Buy: ₹${purchase}</span>` : ''}
            </div>
          </td>
          <td class="col-gst td-center"><span class="gst-chip">${p.gst}%</span></td>
          <td class="col-stock">${_stockCell(p)}</td>
          <td class="col-actions td-center">
            <div class="td-actions-wrap">
              <button class="action-btn action-edit"
                data-id="${_esc(p.id)}" title="Edit product (F4)">${IC.edit}</button>
              <button class="action-btn action-delete"
                data-id="${_esc(p.id)}" title="Delete product (Del)">${IC.trash}</button>
            </div>
          </td>
        </tr>`;
    }).join('');

    tbody.querySelectorAll('.prod-row').forEach(tr => {
      tr.addEventListener('click', (e) => {
        if (e.target.closest('.action-btn')) return;
        const id = tr.dataset.prodId;
        _selectRow(_selectedId === id ? null : id);
      });
    });

    tbody.querySelectorAll('.action-edit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        _openModal(btn.dataset.id);
      });
    });

    tbody.querySelectorAll('.action-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        _handleDelete(btn.dataset.id, btn);
      });
    });
  }

  /* ══════════════════════════════════════════════════════════════
     DELETE (two-click confirmation)
     ══════════════════════════════════════════════════════════════ */
  function _handleDelete(id, btn) {
    if (btn.dataset.confirming === '1') {
      clearTimeout(btn._ctimer);
      const p = (typeof DB !== 'undefined') ? DB.Products.find(id) : null;
      if (typeof DB !== 'undefined') DB.Products.remove(id);
      if (_selectedId === id) { _selectedId = null; }
      _showToast(`🗑  "${p?.name || 'Product'}" deleted successfully`, 'info', 2500);
      _renderTable();
    } else {
      btn.dataset.confirming = '1';
      btn.classList.add('action-delete-confirming');
      btn.innerHTML = `${IC.trash} Confirm?`;
      btn.title = 'Click again to confirm delete';
      btn._ctimer = setTimeout(() => {
        delete btn.dataset.confirming;
        btn.classList.remove('action-delete-confirming');
        btn.innerHTML = IC.trash;
        btn.title = 'Delete product (Del)';
      }, 3000);
    }
  }

  /* ══════════════════════════════════════════════════════════════
     ADD / EDIT PRODUCT MODAL (11 Fields + History Timeline)
     ══════════════════════════════════════════════════════════════ */
  function _openModal(editId = null) {
    const p = (editId && typeof DB !== 'undefined') ? DB.Products.find(editId) : null;

    /* History tracking timeline for edited product */
    const history = (editId && typeof DB !== 'undefined')
      ? DB.ProductHistory.forProduct(editId, 8)
      : [];

    const historyHTML = editId ? `
      <div class="prod-history-wrap">
        <div class="prod-history-title">${IC.hist} Product Audit &amp; History</div>
        <div class="prod-history-list">
          ${history.length === 0
            ? '<span class="prod-history-empty">No history recorded yet for this product.</span>'
            : history.map(h => `
              <div class="prod-history-item">
                <div class="prod-history-dot dot-${h.type}"></div>
                <div class="prod-history-content">
                  <div class="prod-history-desc">${_esc(h.description)}</div>
                  <div class="prod-history-time">${_fmtTime(h.createdAt)}</div>
                </div>
              </div>`).join('')}
        </div>
      </div>` : '';

    const catOpts  = CATEGORIES.map(c =>
      `<option value="${_esc(c)}" ${p?.category === c ? 'selected' : ''}>${_esc(c)}</option>`).join('');
    const unitOpts = UNITS.map(u =>
      `<option value="${_esc(u)}" ${p?.unit === u ? 'selected' : ''}>${_esc(u)}</option>`).join('');
    const gstOpts  = GST_RATES.map(r =>
      `<option value="${r}" ${Number(p?.gst) === r ? 'selected' : ''}>${r}%</option>`).join('');

    const overlay = document.createElement('div');
    overlay.id = 'prod-modal-overlay';
    overlay.className = 'prod-modal-overlay';

    overlay.innerHTML = /* html */`
      <div class="prod-modal" role="dialog" aria-modal="true" aria-labelledby="modal-h">

        <div class="prod-modal-header">
          <h2 id="modal-h">${editId ? '✏️  Edit Product' : '📦  Add New Product'}</h2>
          <button class="modal-close-btn" id="modal-close-btn" aria-label="Close">✕</button>
        </div>

        <div class="prod-modal-body">
          <form id="prod-form" novalidate autocomplete="off">

            <!-- 1. Product Identification -->
            <div class="modal-section-title">📋 Product Details</div>

            <div class="form-row form-row-full">
              <div class="form-field">
                <label for="pf-name">Product Name <span class="req">*</span></label>
                <input id="pf-name" type="text"
                  placeholder="e.g. Portland Cement 50 kg / Vitrified Floor Tile 2x2"
                  value="${_esc(p?.name || '')}" />
              </div>
            </div>

            <div class="form-row">
              <div class="form-field">
                <label for="pf-model">Model Name</label>
                <input id="pf-model" type="text"
                  placeholder="e.g. OPC 53 Grade / Glossy Marble Finish"
                  value="${_esc(p?.model || '')}" />
              </div>
              <div class="form-field">
                <label for="pf-brand">Brand</label>
                <input id="pf-brand" type="text"
                  placeholder="e.g. Ultratech, Kajaria, Asian Paints"
                  value="${_esc(p?.brand || '')}" />
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
                <label for="pf-hsn">HSN Code <span class="req">*</span></label>
                <input id="pf-hsn" type="text"
                  placeholder="e.g. 2523 / 6907"
                  value="${_esc(p?.hsn || '')}" />
              </div>
            </div>

            <!-- 2. Pricing & Taxes -->
            <div class="modal-section-title">💰 Pricing &amp; GST</div>

            <div class="form-row form-row-3">
              <div class="form-field">
                <label for="pf-unit">Unit <span class="req">*</span></label>
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
                <div class="price-input-wrap">
                  <span class="price-prefix">₹</span>
                  <input id="pf-purchase" type="number" min="0" step="0.01"
                    placeholder="0.00" value="${p?.purchasePrice || ''}" />
                </div>
              </div>
            </div>

            <div class="form-row">
              <div class="form-field">
                <label for="pf-price">Selling Price (₹) <span class="req">*</span></label>
                <div class="price-input-wrap">
                  <span class="price-prefix">₹</span>
                  <input id="pf-price" type="number" min="0.01" step="0.01"
                    placeholder="0.00" value="${p?.rate || ''}" />
                </div>
              </div>
              <div class="form-field" style="opacity:0.85">
                <label>Calculated Profit Margin</label>
                <input id="pf-margin-display" type="text" readonly
                  placeholder="—" style="cursor:default;background:#f8fafc;font-weight:600" />
              </div>
            </div>

            <!-- 3. Stock Levels -->
            <div class="modal-section-title">📦 Inventory &amp; Stock Levels</div>

            <div class="form-row">
              <div class="form-field">
                <label for="pf-stock">${editId ? 'Current Stock' : 'Opening Stock'}</label>
                <input id="pf-stock" type="number" min="0" step="1"
                  placeholder="0" value="${p?.stock ?? 0}" />
              </div>
              <div class="form-field">
                <label for="pf-minstock">Minimum Stock (Low Stock Alert Threshold)</label>
                <input id="pf-minstock" type="number" min="0" step="1"
                  placeholder="10" value="${p?.minStock ?? 10}" />
              </div>
            </div>

          </form>

          <!-- History Timeline -->
          ${historyHTML}

        </div><!-- /modal-body -->

        <div class="prod-modal-footer">
          <button class="modal-btn modal-btn-cancel" id="modal-cancel-btn">Cancel</button>
          <button class="modal-btn modal-btn-save"   id="saveProductBtn">
            ${editId ? '✔ Update Product' : '＋ Save Product'}
          </button>
        </div>

      </div>`;

    document.body.appendChild(overlay);

    /* Live margin calculator */
    const purchEl = _$('pf-purchase');
    const priceEl = _$('pf-price');
    const mgnEl   = _$('pf-margin-display');
    function _updateMargin() {
      const buy  = parseFloat(purchEl?.value) || 0;
      const sell = parseFloat(priceEl?.value) || 0;
      if (buy > 0 && sell > 0) {
        const mgn = ((sell - buy) / buy * 100).toFixed(1);
        mgnEl.value = `${mgn}%  (₹${(sell - buy).toFixed(2)})`;
        mgnEl.style.color = sell >= buy ? '#15803d' : '#991b1b';
      } else { mgnEl.value = '—'; mgnEl.style.color = ''; }
    }
    purchEl?.addEventListener('input', _updateMargin);
    priceEl?.addEventListener('input', _updateMargin);
    _updateMargin();

    function initializeProductModalEvents() {
      const btn = document.getElementById("saveProductBtn");
      console.log("Checked saveProductBtn element:", btn);

      const nameInp = _$('pf-name');
      nameInp?.addEventListener('input', () => {
        const val = (nameInp.value || '').trim();
        if (val.length >= 2) {
          nameInp.classList.remove('pf-invalid');
          const errEl = nameInp.closest('.form-field')?.querySelector('.pf-error');
          if (errEl) errEl.remove();
        }
      });

      ['pf-hsn', 'pf-unit', 'pf-price', 'pf-stock'].forEach(id => {
        const inputEl = _$(id);
        const clearErr = () => {
          inputEl.classList.remove('pf-invalid');
          const errEl = inputEl.closest('.form-field')?.querySelector('.pf-error');
          if (errEl) errEl.remove();
        };
        inputEl?.addEventListener('input', clearErr);
        inputEl?.addEventListener('change', clearErr);
      });

      document
        .getElementById("saveProductBtn")
        ?.addEventListener("click", (e) => {
            if (e && e.preventDefault) e.preventDefault();
            console.log("Save Product button clicked");
            console.log("Button click event triggered");
            _saveProduct(editId);
        });

      _$('modal-close-btn')?.addEventListener('click',  _closeModal);
      _$('modal-cancel-btn')?.addEventListener('click', _closeModal);
    }

    initializeProductModalEvents();

    overlay.addEventListener('click', (e) => { if (e.target === overlay) _closeModal(); });

    overlay._kh = (e) => { if (e.key === 'Escape') _closeModal(); };
    document.addEventListener('keydown', overlay._kh);

    _$('prod-form')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        console.log("Save Product button clicked via Enter key");
        console.log("Button click event triggered");
        _saveProduct(editId);
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

  /* ── Save product ───────────────────────────────────────────── */
  function _saveProduct(editId = null) {
    console.log("saveProduct() started");

    if (typeof DB === 'undefined') { _showToast('⚠️ Database not ready', 'error'); return; }

    console.log("Validation step...");

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
    if (!nameVal || nameVal.length < 2) errs.push({ id:'pf-name',  msg:'Product name minimum 2 characters required' });
    if (!hsnVal)                         errs.push({ id:'pf-hsn',   msg:'HSN code is required' });
    if (!priceRaw || isNaN(rate) || rate <= 0) errs.push({ id:'pf-price', msg:'Selling price is required' });
    if (!unitVal)                        errs.push({ id:'pf-unit',  msg:'Unit is required' });
    if (stockRaw === '' || stockRaw === null || stockRaw === undefined || isNaN(stock)) {
      errs.push({ id:'pf-stock', msg:'Opening stock is required' });
    }

    document.querySelectorAll('.pf-error').forEach(el => el.remove());
    document.querySelectorAll('.pf-invalid').forEach(el => el.classList.remove('pf-invalid'));

    if (errs.length > 0) {
      console.log("Validation failed!");
      alert("Validation failed");

      errs.forEach(e => {
        const inp = _$(e.id);
        if (!inp) return;
        inp.classList.add('pf-invalid');
        const el = document.createElement('div');
        el.className   = 'pf-error';
        el.textContent = e.msg;
        inp.closest('.form-field')?.appendChild(el);
      });
      const errorMsg = "❌ Please fill all required fields";
      _showToast(errorMsg, 'error', 2000);
      if (typeof window.showToast === 'function' && window.showToast !== _showToast) {
        window.showToast(errorMsg, 'error', 2000);
      }
      _$(errs[0].id)?.focus();
      return;
    }

    /* Duplicate check */
    if (!editId && typeof DB !== 'undefined' && DB.Products) {
      const existing = DB.Products.all().find(
        p => (p.name || '').trim().toLowerCase() === nameVal.toLowerCase()
      );
      if (existing) {
        console.log("Duplicate product detected!");
        const dupMsg = "⚠️ Product already exists";
        _showToast(dupMsg, 'error', 2000);
        if (typeof window.showToast === 'function' && window.showToast !== _showToast) {
          window.showToast(dupMsg, 'error', 2000);
        }
        _$('pf-name')?.classList.add('pf-invalid');
        _$('pf-name')?.focus();
        return;
      }
    }

    console.log("Validation passed.");
    console.log("Saving product data...");

    const data = { name: nameVal, model, brand, category, hsn: hsnVal, unit: unitVal, gst, purchasePrice, rate, stock, minStock };

    if (editId) {
      DB.Products.update(editId, data);
      _closeModal();
    } else {
      DB.Products.insert(data);
      _resetForm();
    }

    console.log("Updating table...");
    _renderTable();

    console.log("Showing success toast...");
    const successMsg = "✅ Product saved successfully";
    _showToast(successMsg, "success", 2000);
    if (typeof window.showToast === 'function' && window.showToast !== _showToast) {
      window.showToast(successMsg, "success", 2000);
    }
  }

  function _resetForm() {
    const setVal = (id, val) => { const el = _$(id); if (el) el.value = val; };
    setVal('pf-name', '');
    setVal('pf-model', '');
    setVal('pf-brand', '');
    setVal('pf-category', '');
    setVal('pf-hsn', '');
    setVal('pf-unit', '');
    setVal('pf-purchase', '');
    setVal('pf-price', '');
    setVal('pf-gst', '0');
    setVal('pf-stock', '0');
    setVal('pf-minstock', '10');
    setVal('pf-margin-display', '—');
    const mgnEl = _$('pf-margin-display');
    if (mgnEl) mgnEl.style.color = '';

    document.querySelectorAll('.pf-error').forEach(el => el.remove());
    document.querySelectorAll('.pf-invalid').forEach(el => el.classList.remove('pf-invalid'));

    _$('pf-name')?.focus();
  }

  /* ══════════════════════════════════════════════════════════════
     HTML BUILDER
     ══════════════════════════════════════════════════════════════ */
  function _buildHTML() {
    return /* html */`

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
            ${IC.plus} Add Product
            <span class="btn-shortcut-tag">[F3]</span>
          </button>
        </div>
      </div>

      <!-- DASHBOARD STATS BAR -->
      <div class="prod-stats-bar">
        <div class="prod-stat-item">
          <span class="stat-num" id="stat-total">—</span> Total Products
        </div>
        <div class="prod-stat-item stat-ok">
          <span class="stat-num" id="stat-ok">—</span> In Stock
        </div>
        <div class="prod-stat-item stat-low">
          <span class="stat-num" id="stat-low">—</span> Low Stock
        </div>
        <div class="prod-stat-item stat-crit">
          <span class="stat-num" id="stat-crit">—</span> Critical Stock
        </div>
        <div class="prod-stat-item">
          <span class="stat-num" id="stat-cats">—</span> Categories
        </div>
      </div>

      <!-- STICKY SEARCH TOOLBAR -->
      <div class="prod-toolbar">
        <div class="prod-search-wrap">
          ${IC.search}
          <input
            id="prod-search-input"
            class="prod-search-input"
            type="text"
            placeholder="Search by Product Name, Model, Brand, Product Code (PRD001) or HSN..."
            autocomplete="off"
            aria-label="Search products"
          />
          <button class="clear-search-btn" id="btn-clear-search"
            style="display:none" aria-label="Clear search">✕</button>
        </div>
        <div class="prod-toolbar-right">
          <span class="prod-filter-label" id="prod-result-label"></span>
          <div class="prod-shortcut-hints">
            <span class="prod-shortcut-hint"><kbd>F3</kbd> Add Product</span>
            <span class="prod-shortcut-hint"><kbd>F4</kbd> Edit Selected</span>
            <span class="prod-shortcut-hint"><kbd>Del</kbd> Delete Selected</span>
          </div>
        </div>
      </div>

      <!-- TABLE CARD -->
      <div class="prod-table-card">
        <div class="prod-table-wrap">
          <table class="prod-table">
            <thead>
              <tr>
                <th class="col-code">Code</th>
                <th class="col-name">Product Name &amp; Model</th>
                <th class="col-brand">Brand</th>
                <th class="col-category">Category</th>
                <th class="col-hsn">HSN</th>
                <th class="col-unit">Unit</th>
                <th class="col-sell th-right">Selling Price</th>
                <th class="col-gst th-center">GST%</th>
                <th class="col-stock">Stock Status</th>
                <th class="col-actions th-actions">Actions</th>
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
     RENDER
     ══════════════════════════════════════════════════════════════ */
  function render(container) {

    if (!document.getElementById('products-css')) {
      const lnk = document.createElement('link');
      lnk.id = 'products-css'; lnk.rel = 'stylesheet';
      lnk.href = 'src/pages/Products/Products.css';
      document.head.appendChild(lnk);
    }

    if (typeof DB !== 'undefined') DB.init();

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

    const sinp = _$('prod-search-input');
    const sclr = _$('btn-clear-search');

    sinp?.addEventListener('input', (e) => {
      _searchQuery       = e.target.value;
      sclr.style.display = _searchQuery ? '' : 'none';
      _renderTable();
    });

    sclr?.addEventListener('click', () => {
      if (sinp) { sinp.value = ''; sinp.focus(); }
      _searchQuery = ''; sclr.style.display = 'none';
      _renderTable();
    });

    /* Keyboard Shortcuts */
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
        if (_$('prod-modal-overlay')) return;
        const a = document.activeElement;
        if (a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.isContentEditable)) return;
        if (!_selectedId) {
          _showToast('Click a product row to select it first', 'info', 2000);
          return;
        }
        const btn = document.querySelector(`tr[data-prod-id="${_selectedId}"] .action-delete`);
        if (btn) _handleDelete(_selectedId, btn);
      });

      KeyboardShortcuts.register('f2', (e) => {
        e.preventDefault();
        if (sinp) { sinp.focus(); sinp.select(); }
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
