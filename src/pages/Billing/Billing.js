/**
 * Billing.js – Billing Page (Hardware & Tiles Shop Workflow)
 *
 * Features:
 *   • Fast product search with arrow key & enter navigation
 *   • Auto-adds first suggestion on Enter if none highlighted
 *   • Focuses qty field immediately after adding product
 *   • Optional Customer Name & Phone Number with Walk-in badge
 *   • Save Bill stays on Billing page with 3-second lockout
 *   • Integrated View Invoice & Print Modal (InvoicePreview)
 *
 * Project: Sree Vel Murugan Hardware and Tiles – Billing System
 */

const BillingPage = (() => {

  let _rowCounter   = 0;
  let _itemCount    = 0;
  let _selectedRow  = null;
  let _toastTimer   = null;
  let _isGstBill    = false;  // Normal Bill (false) default vs GST Bill (true)
  let _lastSavedBill= null;   // Keeps track of last saved bill object
  let _editingBillId= null;   // ID of bill currently being edited
  let _editingBillNo= null;   // Bill number of bill currently being edited
  let _isRestoringDraft = false; // Prevents draft save loops during restoration

  /* ── F6 Global Keyboard Trap ── */
  document.addEventListener('keydown', (e) => {
    if (e.key === 'F6' || e.key === 'f6' || e.keyCode === 117) {
      e.preventDefault();
      e.stopPropagation();
      if (typeof _openQuickAddModal === 'function') _openQuickAddModal();
    }
  }, true);

  /* ── SVG icons ──────────────────────────────────────────────── */
  const IC = {
    billing:   `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,
    search:    `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
    save:      `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>`,
    print:     `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>`,
    clear:     `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`,
    box:       `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9aa5b4" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>`,
    trash:     `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>`,
    kbd:       `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><line x1="6" y1="10" x2="6" y2="10"/><line x1="10" y1="10" x2="10" y2="10"/><line x1="14" y1="10" x2="14" y2="10"/><line x1="18" y1="10" x2="18" y2="10"/><line x1="8" y1="14" x2="16" y2="14"/></svg>`,
    tag:       `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>`,
    qty:       `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 12h8"/><path d="M12 8v8"/></svg>`,
    gstIcon:   `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>`,
    totalIcon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="16" y1="14" x2="16" y2="18"/><path d="M16 10h.01"/><path d="M12 10h.01"/><path d="M8 10h.01"/><path d="M12 14h.01"/><path d="M8 14h.01"/><path d="M12 18h.01"/><path d="M8 18h.01"/></svg>`,
    user:      `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
    eye:       `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
  };

  /* ── Helpers ────────────────────────────────────────────────── */
  const _today = () => new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const _billNo = () => `SVMH-${Math.floor(1000 + Math.random() * 9000)}`;
  const _esc = (s) => String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const _$ = (id) => document.getElementById(id);
  const _setText = (id, text) => { const el = _$(id); if (el) el.textContent = text; };

  /* ── Empty-state row ────────────────────────────────────────── */
  function _emptyRowHTML() {
    return `
      <tr id="empty-row">
        <td colspan="11" class="bill-table-empty">
          <div class="empty-state-inner">
            <div class="empty-icon">${IC.box}</div>
            <p>No items added yet</p>
            <span>
              Press <kbd class="kbd-chip">F2</kbd> to focus search, type product name/model/brand, then press
              <kbd class="kbd-chip">Enter</kbd> to add
            </span>
          </div>
        </td>
      </tr>`;
  }

  /* ═══════════════════════════════════════════════════════════════
     TOAST
     ═══════════════════════════════════════════════════════════════ */
  function _getToast() {
    let t = _$('billing-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'billing-toast';
      t.className = 'billing-toast';
      t.innerHTML = '<span class="toast-msg"></span>';
      document.body.appendChild(t);
    }
    return t;
  }

  function _showToast(msg, type = 'info', ms = 3000) {
    const t = _getToast();
    t.className = `billing-toast billing-toast-${type}`;
    t.querySelector('.toast-msg').textContent = msg;
    clearTimeout(_toastTimer);
    requestAnimationFrame(() => t.classList.add('billing-toast-visible'));
    _toastTimer = setTimeout(() => t.classList.remove('billing-toast-visible'), ms);
  }

  /* ═══════════════════════════════════════════════════════════════
     ROW SELECTION
     ═══════════════════════════════════════════════════════════════ */
  function _selectRow(rowEl) {
    document.querySelectorAll('#bill-table-body .bill-row.row-selected')
      .forEach(r => r.classList.remove('row-selected'));
    _selectedRow = rowEl || null;
    if (_selectedRow) _selectedRow.classList.add('row-selected');
  }

  function _deleteSelectedRow() {
    if (!_selectedRow || !document.body.contains(_selectedRow)) { _selectedRow = null; return; }
    _selectedRow.remove();
    _selectedRow = null;
    _itemCount--;
    _refreshRowNums();
    _updateBadge();
    if (_itemCount === 0) _showEmptyState();
    else _recalcBillTotals();
    _saveDraft();
    _showToast('🗑 Row removed from bill', 'info', 1600);
  }

  /* ═══════════════════════════════════════════════════════════════
     CALCULATION ENGINE BRIDGE
     ═══════════════════════════════════════════════════════════════ */
  const BC = (typeof BillingCalculator !== 'undefined') ? BillingCalculator : null;

  function _calcAndUpdateRow(tr) {
    if (!tr || !document.body.contains(tr) || !BC) return;

    const qty     = parseFloat(tr.querySelector('.qty-input')?.value)  || 0;
    const discPct = parseFloat(tr.querySelector('.disc-input')?.value) || 0;
    const rateVal = tr.querySelector('.rate-input')?.value;
    const rate    = (rateVal !== undefined && rateVal !== '' && !isNaN(parseFloat(rateVal))) ? parseFloat(rateVal) : (parseFloat(tr.dataset.rate) || 0);

    const gstVal  = tr.querySelector('.gst-input')?.value;
    const gstPct  = (gstVal !== undefined && gstVal !== '' && !isNaN(parseFloat(gstVal))) ? parseFloat(gstVal) : (parseFloat(tr.dataset.gstPct) || 0);

    tr.dataset.rate   = rate;
    tr.dataset.gstPct = gstPct;

    const res = BC.calcRow(qty, rate, discPct, gstPct, _isGstBill);

    const gstCell = tr.querySelector('.gst-amt-cell');
    if (gstCell) {
      gstCell.textContent = _isGstBill
        ? (res.gstAmount > 0 ? BC.fmt(res.gstAmount) : '₹\u00a00.00')
        : '—';
    }

    const totalCell = tr.querySelector('.total-cell');
    if (totalCell) {
      totalCell.textContent = BC.fmt(res.rowTotal);
      totalCell.classList.remove('cell-pending');
      totalCell.style.color      = 'var(--bill-primary)';
      totalCell.style.fontWeight = '700';
      totalCell.style.fontStyle  = 'normal';
    }

    _recalcBillTotals();
    _saveDraft();
  }

  function _recalcBillTotals() {
    if (!BC) return;

    const rows = Array.from(document.querySelectorAll('#bill-table-body .bill-row'));
    const rowResults = rows.map(tr => {
      const rateVal = tr.querySelector('.rate-input')?.value;
      const rate    = (rateVal !== undefined && rateVal !== '' && !isNaN(parseFloat(rateVal))) ? parseFloat(rateVal) : (parseFloat(tr.dataset.rate) || 0);
      return BC.calcRow(
        parseFloat(tr.querySelector('.qty-input')?.value)  || 0,
        rate,
        parseFloat(tr.querySelector('.disc-input')?.value) || 0,
        parseFloat(tr.dataset.gstPct) || 0,
        _isGstBill
      );
    });

    const billDiscAmt = parseFloat(_$('bill-discount-input')?.value) || 0;
    const T = BC.calcBillTotals(rowResults, billDiscAmt, _isGstBill);

    const gstRows = rows.map((tr, i) => ({
      gstPct:    parseFloat(tr.dataset.gstPct) || 0,
      gstAmount: rowResults[i].gstAmount,
    }));
    const breakdown = BC.gstByRate(gstRows, _isGstBill);
    BC.VALID_GST_RATES.forEach(rate => {
      const rowEl  = _$(`gst-row-${rate}`);
      const amtEl  = _$(`gst-amt-${rate}`);
      const pctEl  = _$(`gst-pct-label-${rate}`);
      const amount = breakdown[rate] || 0;
      const visible = amount > 0 && _isGstBill;
      if (rowEl) rowEl.style.display = visible ? '' : 'none';
      if (amtEl) amtEl.textContent   = BC.fmt(amount);
      if (pctEl) pctEl.textContent   = `GST @ ${rate}%`;
    });

    _setText('summary-subtotal',  BC.fmt(T.subtotal));
    _setText('summary-gst',       BC.fmt(T.totalGst));

    const itemDiscRow = _$('row-item-disc-summary');
    if (itemDiscRow) itemDiscRow.style.display = T.totalItemDiscount > 0 ? '' : 'none';
    _setText('summary-item-disc', BC.fmt(T.totalItemDiscount));

    const roEl = _$('summary-roundoff');
    if (roEl) {
      if (T.roundOff === 0) {
        roEl.textContent = '₹\u00a00.00';
        roEl.classList.remove('roundoff-positive', 'roundoff-negative');
      } else {
        roEl.textContent = BC.fmt(T.roundOff, true);
        roEl.classList.toggle('roundoff-positive', T.roundOff > 0);
        roEl.classList.toggle('roundoff-negative', T.roundOff < 0);
      }
    }

    const grandEl = _$('summary-grand-total');
    if (grandEl) grandEl.textContent = BC.fmtGrand(T.grandTotal);

    const countText = `${rows.length} item${rows.length !== 1 ? 's' : ''}`;
    _setText('grand-items-count', countText);
    _setText('items-count', countText);
  }

  function _recalcAllRows() {
    document.querySelectorAll('#bill-table-body .bill-row').forEach(tr => _calcAndUpdateRow(tr));
    if (_itemCount === 0) _recalcBillTotals();
  }

  function _toggleBillType(isGst, isSilent = false) {
    _isGstBill = isGst;

    _$('btt-gst')?.classList.toggle('btt-active', isGst);
    _$('btt-normal')?.classList.toggle('btt-active', !isGst);

    const tbl = _$('bill-table');
    if (tbl) tbl.classList.toggle('normal-bill-mode', !isGst);

    const gstSec = _$('gst-summary-section');
    if (gstSec) gstSec.style.display = isGst ? '' : 'none';

    _setText('summary-bill-type', isGst ? 'GST Bill' : 'Normal Bill');
    _recalcAllRows();
    if (!isSilent) {
      _showToast(isGst ? '🧾 Switched to GST Bill' : '📄 Switched to Normal Bill', 'info', 1800);
    }
    _saveDraft();
  }

  function _refreshRowNums() {
    document.querySelectorAll('#bill-table-body .bill-row').forEach((tr, i) => {
      const c = tr.querySelector('.row-num');
      if (c) c.textContent = i + 1;
    });
    _itemCount = document.querySelectorAll('#bill-table-body .bill-row').length;
  }

  function _updateBadge() {
    const text = `${_itemCount} item${_itemCount !== 1 ? 's' : ''}`;
    _setText('items-count', text);
    _setText('grand-items-count', text);
  }

  function _showEmptyState() {
    const tb = _$('bill-table-body');
    if (tb) tb.innerHTML = _emptyRowHTML();
    _updateBadge();
    _recalcBillTotals();
  }

  function _wireTabNav(inputEl) {
    if (!inputEl) return;
    inputEl.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;
      const all = Array.from(document.querySelectorAll('#bill-table-body .name-input, #bill-table-body .qty-input, #bill-table-body .rate-input, #bill-table-body .disc-input, #bill-table-body .gst-input'));
      if (all.length === 0) return;
      const idx = all.indexOf(e.target);
      if (idx === -1) return;
      
      e.preventDefault();
      const nextIdx = e.shiftKey ? (idx - 1 + all.length) % all.length : (idx + 1) % all.length;
      const nextInput = all[nextIdx];
      if (nextInput) {
        nextInput.focus();
        if (typeof nextInput.select === 'function') nextInput.select();
        _selectRow(nextInput.closest('.bill-row'));
      }
    });
  }

  /* ═══════════════════════════════════════════════════════════════
     ADD PRODUCT TO BILL
     ═══════════════════════════════════════════════════════════════ */
  function _onProductSelected(product, initialQty = 1, options = {}) {
    const tbody = _$('bill-table-body');
    if (!tbody) return;

    const emptyRow = _$('empty-row');
    if (emptyRow) emptyRow.remove();

    _rowCounter++;
    _itemCount++;

    const initialRate = (product.rate !== undefined && product.rate !== '' && !isNaN(parseFloat(product.rate))) ? parseFloat(product.rate) : 0;
    const productGst  = (product.gst !== undefined && product.gst !== null && !isNaN(parseFloat(product.gst))) ? parseFloat(product.gst) : 0;
    const effectiveGst = (productGst > 0) ? productGst : (_isGstBill ? 18 : 0);

    const tr = document.createElement('tr');
    tr.className          = 'bill-row bill-row-animate';
    tr.dataset.rowId      = _rowCounter;
    tr.dataset.rate       = initialRate;
    tr.dataset.productGst = productGst;
    tr.dataset.gstPct     = effectiveGst;
    tr.dataset.productId  = product.id   || '';
    tr.dataset.productName= product.name || '';
    tr.dataset.hsn        = product.hsn  || '';
    tr.dataset.unit       = product.unit || '';

    const subtitle = [product.brand, product.model].filter(Boolean).join(' • ');

    tr.innerHTML = `
      <td class="col-num row-num">${_itemCount}</td>
      <td class="col-name">
        <div class="row-product-wrap">
          <input type="text" class="name-input" id="name-${_rowCounter}"
            value="${_esc(product.name)}" aria-label="Item Name for ${_esc(product.name)}"
            style="width:100%;padding:4px 6px;border:1.5px solid #cbd5e1;border-radius:4px;font-weight:700;color:#0f172a;box-sizing:border-box" />
          ${subtitle ? `<div class="row-product-sub">${_esc(subtitle)}</div>` : ''}
        </div>
      </td>
      <td class="col-hsn">${_esc(product.hsn || '—')}</td>
      <td class="col-qty">
        <input type="number" class="qty-input" id="qty-${_rowCounter}"
          value="${initialQty}" min="0.001" max="99999" step="1"
          aria-label="Qty for ${_esc(product.name)}" />
      </td>
      <td class="col-unit">${_esc(product.unit || '—')}</td>
      <td class="col-rate rate-cell">
        <input type="number" class="rate-input" id="rate-${_rowCounter}"
          value="${initialRate}" min="0" step="any"
          aria-label="Rate for ${_esc(product.name)}"
          style="width:76px;padding:4px 6px;border:1.5px solid #cbd5e1;border-radius:4px;font-weight:700;color:#0f172a;text-align:right" />
      </td>
      <td class="col-disc">
        <input type="number" class="disc-input" id="disc-${_rowCounter}"
          value="0" min="0" max="100" step="0.5" placeholder="0"
          aria-label="Disc% for ${_esc(product.name)}" />
      </td>
      <td class="col-gst gst-only-col gst-pct-cell">
        <input type="number" class="gst-input" id="gst-${_rowCounter}"
          value="${effectiveGst}" min="0" max="100" step="0.5" placeholder="0"
          aria-label="GST% for ${_esc(product.name)}"
          style="width:58px;padding:4px 6px;border:1.5px solid #cbd5e1;border-radius:4px;font-weight:700;color:#0f172a;text-align:right" />
      </td>
      <td class="col-gst gst-only-col gst-amt-cell cell-pending">—</td>
      <td class="col-total total-cell cell-pending">—</td>
      <td class="col-action">
        <button class="row-delete-btn" title="Remove row"
          aria-label="Remove ${_esc(product.name)}">${IC.trash}</button>
      </td>
    `;

    const nameInput = tr.querySelector('.name-input');
    const qtyInput  = tr.querySelector('.qty-input');
    const rateInput = tr.querySelector('.rate-input');
    const discInput = tr.querySelector('.disc-input');
    const gstInput  = tr.querySelector('.gst-input');

    nameInput.addEventListener('input', () => {
      tr.dataset.productName = nameInput.value;
      _saveDraft();
    });

    const _onChange = () => _calcAndUpdateRow(tr);
    qtyInput.addEventListener('input',  _onChange);
    discInput.addEventListener('input', _onChange);

    if (gstInput) {
      gstInput.addEventListener('input', () => {
        let val = parseFloat(gstInput.value);
        if (isNaN(val) || val < 0) val = 0;
        tr.dataset.gstPct = val;
        _calcAndUpdateRow(tr);
      });
      _wireTabNav(gstInput);
      gstInput.addEventListener('focus', () => _selectRow(tr));
      gstInput.addEventListener('blur', () => setTimeout(() => {
        const f = document.activeElement;
        if (!f || (!f.classList.contains('name-input') && !f.classList.contains('qty-input') && !f.classList.contains('rate-input') && !f.classList.contains('disc-input') && !f.classList.contains('gst-input'))) {
          _selectRow(null);
        }
      }, 80));
    }

    rateInput.addEventListener('input', () => {
      let val = parseFloat(rateInput.value);
      if (isNaN(val) || val < 0) {
        val = 0;
      }
      tr.dataset.rate = val;
      _calcAndUpdateRow(tr);
    });

    _wireTabNav(nameInput);
    _wireTabNav(qtyInput);
    _wireTabNav(rateInput);
    _wireTabNav(discInput);

    tr.querySelectorAll('td:not(.col-action):not(.col-qty):not(.col-disc):not(.col-rate):not(.col-gst)').forEach(td => {
      td.addEventListener('click', () => _selectRow(tr));
    });

    nameInput.addEventListener('focus', () => _selectRow(tr));
    qtyInput.addEventListener('focus', () => _selectRow(tr));
    rateInput.addEventListener('focus', () => _selectRow(tr));
    discInput.addEventListener('focus', () => _selectRow(tr));

    const _onBlur = () => setTimeout(() => {
      const f = document.activeElement;
      if (!f || (!f.classList.contains('name-input') && !f.classList.contains('qty-input') && !f.classList.contains('rate-input') && !f.classList.contains('disc-input') && !f.classList.contains('gst-input'))) {
        _selectRow(null);
      }
    }, 80);
    nameInput.addEventListener('blur', _onBlur);
    qtyInput.addEventListener('blur',  _onBlur);
    rateInput.addEventListener('blur', _onBlur);
    discInput.addEventListener('blur', _onBlur);

    tr.querySelector('.row-delete-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      _selectRow(tr);
      _deleteSelectedRow();
    });

    tbody.appendChild(tr);
    _updateBadge();
    _calcAndUpdateRow(tr);

    if (!options.isSilent) {
      // Show toast for added product
      _showToast(`Added: ${product.name}`, 'success', 2200);

      // Auto-clear and auto-focus search bar so user can directly type next product without mouse!
      setTimeout(() => {
        const qaOverlay = document.getElementById('quick-add-modal-overlay');
        if (qaOverlay && qaOverlay.classList.contains('qa-overlay-visible')) {
          // Quick add modal is open; keep focus inside Quick Add Product Name field!
          return;
        }
        const searchInp = document.getElementById('product-search-input');
        if (searchInp) {
          searchInp.value = '';
          searchInp.focus();
        }
      }, 50);
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     BILL DATA COLLECTION & SAVE
     ═══════════════════════════════════════════════════════════════ */

  function _collectBillData() {
    const customerName    = (_$('customer-name')?.value  || '').trim().toUpperCase();
    const customerPhone   = (_$('customer-phone')?.value || '').trim();
    const customerAddress = (_$('customer-address')?.value || '').trim();
    const paymentMode     = _$('payment-mode-select')?.value || 'Cash';
    const billDiscAmt     = parseFloat(_$('bill-discount-input')?.value) || 0;
    const billNoText      = (_$('bill-number')?.textContent || '').replace('✓ Saved', '').replace('SAVED ✓', '').replace('EDITING', '').trim();

    const rows = Array.from(document.querySelectorAll('#bill-table-body .bill-row'));
    const items = rows.map(tr => {
      const qty     = parseFloat(tr.querySelector('.qty-input')?.value)  || 0;
      const discPct = parseFloat(tr.querySelector('.disc-input')?.value) || 0;
      const rate    = parseFloat(tr.dataset.rate)   || 0;
      const prodGst = parseFloat(tr.dataset.productGst) || 0;
      const gstPct  = (prodGst > 0) ? prodGst : (_isGstBill ? 18 : 0);
      const calc    = BC ? BC.calcRow(qty, rate, discPct, gstPct, _isGstBill) : {};
      return {
        productId:   tr.dataset.productId   || null,
        productName: (tr.querySelector('.name-input')?.value || '').trim() || tr.dataset.productName || '',
        hsn:         tr.dataset.hsn         || '',
        unit:        tr.dataset.unit        || '',
        qty, rate, discPct, gstPct,
        baseAmount:     calc.baseAmount     || 0,
        discountAmount: calc.discountAmount || 0,
        taxableAmount:  calc.taxableAmount  || 0,
        gstAmount:      calc.gstAmount      || 0,
        rowTotal:       calc.rowTotal       || 0,
      };
    });

    const rowResults = items.map(i => ({
      baseAmount: i.baseAmount, discountAmount: i.discountAmount,
      taxableAmount: i.taxableAmount, gstAmount: i.gstAmount, rowTotal: i.rowTotal,
    }));
    const totals = BC ? BC.calcBillTotals(rowResults, billDiscAmt, _isGstBill) : {};

    return { customerName, customerPhone, customerAddress, paymentMode, billNo: billNoText, items, totals };
  }

  function _saveBill() {
    console.log("Save clicked");

    const data = _collectBillData();

    /* ── Validation ── */
    if (!data.items || data.items.length === 0) {
      _showToast('⚠️ Add at least one product to the bill.', 'warning');
      return;
    }

    const invalidQtyRow = data.items.findIndex(i => !i.qty || i.qty <= 0);
    if (invalidQtyRow !== -1) {
      _showToast(`⚠️ Row ${invalidQtyRow + 1}: Quantity cannot be zero or negative.`, 'warning');
      const qtyInp = document.querySelectorAll('#bill-table-body .qty-input')[invalidQtyRow];
      if (qtyInp) { qtyInp.focus(); qtyInp.select(); }
      return;
    }

    /* ── 1. Detect edit mode ── */
    const editingInvoiceId = localStorage.getItem('editingInvoiceId');

    if (editingInvoiceId) {
      /* ── 2. DO NOT create a new invoice — Update existing ── */
      let result = null;
      const targetId = _editingBillId || editingInvoiceId;
      const targetNo = _editingBillNo || editingInvoiceId;

      if (typeof DB !== 'undefined' && typeof DB.updateBill === 'function') {
        result = DB.updateBill({
          billId:          targetId,
          customerName:    data.customerName,
          customerPhone:   data.customerPhone,
          customerAddress: data.customerAddress,
          billType:        _isGstBill ? 'gst' : 'normal',
          paymentMode:     data.paymentMode,
          billNo:          targetNo,
          items:           data.items,
          totals:          data.totals,
        });
      }

      /* Fallback direct localStorage update if DB function not found */
      if (!result || !result.success) {
        try {
          const rawKey = localStorage.getItem('svmh_bills') ? 'svmh_bills' : 'bills';
          const bills = JSON.parse(localStorage.getItem(rawKey) || localStorage.getItem('bills') || '[]');
          const index = bills.findIndex(b => b.invoiceNo === editingInvoiceId || b.billNo === editingInvoiceId || b.id === editingInvoiceId);

          if (index !== -1) {
            const invNo = bills[index].invoiceNo || bills[index].billNo || editingInvoiceId;
            const updatedBill = {
              ...bills[index],
              invoiceNo:       invNo,
              billNo:          invNo,
              customerName:    data.customerName || 'Walk-in Customer',
              customerPhone:   data.customerPhone || '',
              customerAddress: data.customerAddress || '',
              address:         data.customerAddress || '',
              paymentMode:     data.paymentMode,
              paymentMethod:   data.paymentMode,
              billType:        _isGstBill ? 'gst' : 'normal',
              items:           data.items,
              itemCount:       data.items.length,
              subtotal:        data.totals.subtotal || 0,
              totalGst:        data.totals.totalGst || 0,
              billDiscount:    data.totals.billDiscount || 0,
              roundOff:        data.totals.roundOff || 0,
              grandTotal:      data.totals.grandTotal || 0,
              updatedAt:       new Date().toISOString(),
            };
            bills[index] = updatedBill;
            localStorage.setItem('bills', JSON.stringify(bills));
            localStorage.setItem('svmh_bills', JSON.stringify(bills));
            result = { success: true, bill: updatedBill };
          }
        } catch (e) {
          console.error("Direct update error:", e);
        }
      }

      if (result && result.success) {
        _playSuccessSound();

        /* 8. Show toast: "Bill updated successfully" for 2 seconds */
        _showToast('Bill updated successfully', 'success', 2000);

        /* 9. After successful update: remove editingInvoiceId */
        localStorage.removeItem('editingInvoiceId');
        _editingBillId = null;
        _editingBillNo = null;

        /* 10. Automatically redirect to Dashboard */
        setTimeout(() => {
          window.location.hash = 'dashboard';
        }, 300);
        return;
      } else {
        _showToast('❌ Failed to update bill.', 'error');
        return;
      }
    }

    /* ── 13. Normal Save Bill Flow (if editingInvoiceId is empty) ── */
    const result = DB.saveBill({
      customerName:    data.customerName,
      customerPhone:   data.customerPhone,
      customerAddress: data.customerAddress,
      billType:        _isGstBill ? 'gst' : 'normal',
      paymentMode:     data.paymentMode,
      billNo:          data.billNo,
      items:           data.items,
      totals:          data.totals,
    });

    if (!result || !result.success) {
      _showToast('❌ Failed to save bill.', 'error');
      return;
    }

    console.log("Database save success");
    localStorage.removeItem('svmh_bill_draft');
    localStorage.removeItem('svmh_billing_draft');
    localStorage.removeItem('billing_draft');

    _lastSavedBill = result.bill;
    const savedBillNo = result.bill.billNo;
    const saveTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    _playSuccessSound();
    _showSaveToast(savedBillNo, saveTime);

    const billNoEl = _$('bill-number');
    if (billNoEl) {
      billNoEl.innerHTML = `${savedBillNo} <span class="saved-badge" style="background:#10b981;color:#fff;padding:2px 8px;border-radius:4px;font-size:0.75rem;font-weight:800;margin-left:8px;display:inline-flex;align-items:center;gap:4px">SAVED ✓</span>`;
    }
    _setText('summary-bill-no', savedBillNo);

    const viewBtnTop  = _$('btn-view-invoice-top');
    const viewBtnMain = _$('btn-view-invoice-main');
    if (viewBtnTop)  viewBtnTop.style.display  = 'inline-flex';
    if (viewBtnMain) viewBtnMain.style.display = 'inline-flex';

    ['btn-save-top','btn-save-main'].forEach(id => {
      const btn = _$(id);
      if (!btn) return;
      btn.disabled = true;
      btn.innerHTML = `Saved ✓`;
      btn.style.backgroundColor = '#16a34a';
      btn.style.color = '#ffffff';
      btn.style.borderColor = '#15803d';
      btn.classList.add('disabled-saving', 'btn-saved-success');

      setTimeout(() => {
        btn.disabled = false;
        btn.classList.remove('disabled-saving');
      }, 3000);
    });
  }

  function _playSuccessSound() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch (e) {}
  }

  function _showSaveToast(billNo, timeStr) {
    let t = document.getElementById('billing-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'billing-toast';
      t.className = 'billing-toast';
      document.body.appendChild(t);
    }
    t.className = 'billing-toast billing-toast-success';
    t.style.position = 'fixed';
    t.style.top = '24px';
    t.style.right = '24px';
    t.style.bottom = 'auto';
    t.style.zIndex = '999999';
    t.style.background = '#065f46';
    t.style.border = '1.5px solid #10b981';
    t.style.color = '#ffffff';
    t.style.boxShadow = '0 10px 25px rgba(0,0,0,0.3)';

    t.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:3px">
        <div style="font-weight:800;font-size:0.92rem;color:#ffffff">✅ Bill ${billNo} saved successfully</div>
        <div style="font-size:0.78rem;color:#d1fae5;font-weight:600">Saved at: ${timeStr}</div>
      </div>`;
    clearTimeout(_toastTimer);
    requestAnimationFrame(() => t.classList.add('billing-toast-visible'));
    _toastTimer = setTimeout(() => t.classList.remove('billing-toast-visible'), 2000);
  }

  /* ── Open Invoice Preview Modal ── */
  function _openInvoicePreview() {
    if (_lastSavedBill && typeof InvoicePreview !== 'undefined') {
      InvoicePreview.show(_lastSavedBill);
      return;
    }

    // If not saved yet, collect current data and preview
    const data = _collectBillData();
    if (!data.items || data.items.length === 0) {
      _showToast('⚠️ Add at least one item to preview invoice', 'warning');
      return;
    }

    const tempBill = {
      id:            'PREVIEW',
      billNo:        data.billNo,
      date:          _today(),
      customerName:  data.customerName || 'Walk-in Customer',
      customerPhone: data.customerPhone || '',
      customerAddress: data.customerAddress || '',
      address:       data.customerAddress || '',
      billType:      _isGstBill ? 'gst' : 'normal',
      items:         data.items,
      subtotal:      data.totals.subtotal      || 0,
      totalGst:      data.totals.totalGst      || 0,
      billDiscount:  data.totals.billDiscount  || 0,
      roundOff:      data.totals.roundOff      || 0,
      grandTotal:    data.totals.grandTotal    || 0,
    };

    if (typeof InvoicePreview !== 'undefined') {
      InvoicePreview.show(tempBill);
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     CLEAR ALL
     ═══════════════════════════════════════════════════════════════ */
  function _clearAll() {
    _rowCounter    = 0;
    _itemCount     = 0;
    _selectedRow   = null;
    _lastSavedBill = null;
    _editingBillId = null;
    _editingBillNo = null;
    localStorage.removeItem('editingInvoiceId');
    localStorage.removeItem('billing_draft');
    localStorage.removeItem('svmh_billing_draft');
    localStorage.removeItem('svmh_bill_draft');

    const pageTitleH1 = document.querySelector('.billing-header-bar .page-title h1');
    if (pageTitleH1) {
      pageTitleH1.innerHTML = `${IC.billing} New Bill`;
    }

    _showEmptyState();

    ['customer-name','customer-phone','customer-address'].forEach(id => {
      const el = _$(id); if (el) el.value = '';
    });
    _updateWalkinBadge();

    const si = _$('product-search-input');
    if (si) si.value = '';

    const bd = _$('bill-discount-input');
    if (bd) bd.value = '0';

    const newNo = (typeof DB !== 'undefined') ? DB.nextBillNo() : _billNo();
    _setText('bill-number', newNo);
    _setText('summary-bill-no', newNo);

    // Hide View Invoice buttons for new draft
    const viewBtnTop  = _$('btn-view-invoice-top');
    const viewBtnMain = _$('btn-view-invoice-main');
    if (viewBtnTop)  viewBtnTop.style.display  = 'none';
    if (viewBtnMain) viewBtnMain.style.display = 'none';

    ['btn-save-top','btn-save-main'].forEach(id => {
      const btn = _$(id);
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `${IC.save} Save Bill`;
        btn.classList.remove('disabled-saving', 'btn-saved-success');
      }
    });
  }

  /* ═══════════════════════════════════════════════════════════════
     WALK-IN BADGE
     ═══════════════════════════════════════════════════════════════ */
  function _updateWalkinBadge() {
    const name  = (_$('customer-name')?.value  || '').trim();
    const phone = (_$('customer-phone')?.value || '').trim();
    const addr  = (_$('customer-address')?.value || '').trim();
    const badge = _$('walkin-badge');
    const isWalkin = (!name && !phone && !addr);
    if (badge) badge.style.display = isWalkin ? 'inline-flex' : 'none';
    _setText('summary-customer', name || (phone ? phone : 'Walk-in Customer'));
    _saveDraft();
  }

  /* ═══════════════════════════════════════════════════════════════
     KEYBOARD SHORTCUTS
     ═══════════════════════════════════════════════════════════════ */
  function _registerShortcuts() {
    if (typeof KeyboardShortcuts === 'undefined') return;

    KeyboardShortcuts.register('f2', (e) => {
      e.preventDefault();
      const inp = _$('product-search-input');
      if (inp) { inp.focus(); inp.select(); }
    });

    KeyboardShortcuts.register('f6', (e) => {
      e.preventDefault();
      _openQuickAddModal();
    });

    KeyboardShortcuts.register('ctrl+s', (e) => {
      e.preventDefault();
      _saveBill();
    });

    KeyboardShortcuts.register('ctrl+p', (e) => {
      e.preventDefault();
      _openInvoicePreview();
    });

    KeyboardShortcuts.register('ctrl+n', (e) => {
      e.preventDefault();
      _clearAll();
      _showToast('📄 New bill started', 'info');
      setTimeout(() => { const inp = _$('product-search-input'); if (inp) inp.focus(); }, 60);
    });

    KeyboardShortcuts.register('delete', (e) => {
      const a = document.activeElement;
      if (a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.isContentEditable)) return;
      if (_selectedRow && document.body.contains(_selectedRow)) _deleteSelectedRow();
    });

    KeyboardShortcuts.register('escape', () => {
      const qaOverlay = document.getElementById('quick-add-modal-overlay');
      if (qaOverlay && qaOverlay.classList.contains('qa-overlay-visible')) {
        _closeQuickAddModal();
        return;
      }
      _selectRow(null);
      const si = _$('product-search-input');
      if (si) si.value = '';
    });
  }

  /* ═══════════════════════════════════════════════════════════════
     QUICK ADD MODAL
     ═══════════════════════════════════════════════════════════════ */
  function _openQuickAddModal() {
    let overlay = document.getElementById('quick-add-modal-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'quick-add-modal-overlay';
      overlay.className = 'quick-add-modal-overlay';
      overlay.innerHTML = `
        <div class="quick-add-modal-card" role="dialog" aria-modal="true" aria-labelledby="qa-modal-title">
          <div class="qa-modal-header">
            <div class="qa-modal-title-wrap">
              <span class="qa-modal-icon">⚡</span>
              <div>
                <h3 id="qa-modal-title" class="qa-modal-title">Quick Add Product</h3>
                <span class="qa-modal-sub">Add item directly to current bill or save to products database</span>
              </div>
            </div>
            <button type="button" class="qa-modal-close" id="qa-btn-close" aria-label="Close modal">&times;</button>
          </div>
          <form id="qa-form" onsubmit="return false;">
            <div class="qa-modal-body">
              <div class="qa-form-grid">
                <!-- 1. Product Name (required) -->
                <div class="qa-field qa-field-full">
                  <label for="qa-name">Product Name <span class="qa-req">*</span></label>
                  <input type="text" id="qa-name" class="qa-input" placeholder="e.g. Cement, Asian Paint 1L" required autocomplete="off" />
                </div>

                <!-- 2. Quantity (default 0) -->
                <div class="qa-field">
                  <label for="qa-qty">Quantity</label>
                  <input type="number" id="qa-qty" class="qa-input" value="0" min="0" step="any" required />
                </div>

                <!-- 3. Selling Price / Rate (Optional) -->
                <div class="qa-field">
                  <label for="qa-price">Selling Price (₹) <span class="qa-opt">(Optional)</span></label>
                  <input type="number" id="qa-price" class="qa-input" placeholder="0.00" min="0" step="any" />
                </div>

                <!-- 4. GST % (mouse-selectable) -->
                <div class="qa-field">
                  <label for="qa-gst">GST %</label>
                  <select id="qa-gst" class="qa-select">
                    <option value="0" selected>0%</option>
                    <option value="5">5%</option>
                    <option value="12">12%</option>
                    <option value="18">18%</option>
                    <option value="28">28%</option>
                  </select>
                </div>

                <!-- 5. HSN Code (mouse-selectable) -->
                <div class="qa-field">
                  <label for="qa-hsn">HSN Code <span class="qa-opt">(Optional)</span></label>
                  <input type="text" id="qa-hsn" class="qa-input" placeholder="e.g. 2523" autocomplete="off" />
                </div>

                <!-- 6. Brand (mouse-selectable) -->
                <div class="qa-field">
                  <label for="qa-brand">Brand <span class="qa-opt">(Optional)</span></label>
                  <input type="text" id="qa-brand" class="qa-input" placeholder="e.g. UltraTech, Berger" autocomplete="off" />
                </div>

                <!-- Unit (dropdown) -->
                <div class="qa-field" style="display:none">
                  <label for="qa-unit">Unit</label>
                  <select id="qa-unit" class="qa-select">
                    <option value="Nos" selected>Nos</option>
                    <option value="Box">Box</option>
                    <option value="Piece">Piece</option>
                    <option value="Kg">Kg</option>
                    <option value="Bag">Bag</option>
                    <option value="Sqft">Sqft</option>
                  </select>
                </div>
              </div>
            </div>

            <div class="qa-modal-footer">
              <button type="button" id="qa-btn-cancel" class="qa-btn qa-btn-cancel">Cancel</button>
              <div class="qa-footer-actions">
                <button type="button" id="qa-btn-add-only" class="qa-btn qa-btn-secondary">Add to Bill</button>
                <button type="button" id="qa-btn-save-and-add" class="qa-btn qa-btn-primary">Save to Products &amp; Add to Bill</button>
              </div>
            </div>
          </form>
        </div>
      `;
      document.body.appendChild(overlay);

      _$('qa-btn-close')?.addEventListener('click', _closeQuickAddModal);
      _$('qa-btn-cancel')?.addEventListener('click', _closeQuickAddModal);
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) _closeQuickAddModal();
      });

      _$('qa-btn-add-only')?.addEventListener('click', () => _handleQuickAddSubmit(false));
      _$('qa-btn-save-and-add')?.addEventListener('click', () => _handleQuickAddSubmit(true));

      /* Keydown Enter Navigation: Name -> Qty -> Price -> Submit */
      const qaName = _$('qa-name');
      const qaQty  = _$('qa-qty');
      const qaPrice= _$('qa-price');

      qaName?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          e.stopPropagation();
          qaQty?.focus();
          qaQty?.select();
        }
      });

      qaQty?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          e.stopPropagation();
          qaPrice?.focus();
          qaPrice?.select();
        }
      });

      qaPrice?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          e.stopPropagation();
          _handleQuickAddSubmit(false);
        }
      });

      qaQty?.addEventListener('focus', () => qaQty.select());
      qaPrice?.addEventListener('focus', () => qaPrice.select());

      overlay.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          _closeQuickAddModal();
        }
      });
    }

    _$('qa-name').value = '';
    _$('qa-unit').value = 'Nos';
    _$('qa-price').value = '';
    _$('qa-gst').value = '0';
    _$('qa-qty').value = '0';
    _$('qa-hsn').value = '';
    _$('qa-brand').value = '';

    const qaQtyEl = _$('qa-qty');
    if (qaQtyEl) {
      qaQtyEl.onfocus = () => qaQtyEl.select();
    }

    overlay.classList.add('qa-overlay-visible');

    setTimeout(() => {
      const nameInput = _$('qa-name');
      if (nameInput) {
        nameInput.focus();
        nameInput.select();
      }
    }, 50);
  }

  function _closeQuickAddModal() {
    const overlay = document.getElementById('quick-add-modal-overlay');
    if (overlay) {
      overlay.classList.remove('qa-overlay-visible');
    }
    setTimeout(() => {
      const searchInp = document.getElementById('product-search-input');
      if (searchInp) {
        searchInp.focus();
      }
    }, 50);
  }

  function _handleQuickAddSubmit(saveToDb) {
    const nameInput  = _$('qa-name');
    const priceInput = _$('qa-price');

    const name  = (nameInput?.value  || '').trim();
    const priceVal = priceInput?.value;
    let rate = parseFloat(priceVal);
    if (isNaN(rate) || rate < 0 || priceVal === '' || priceVal === null) {
      rate = 0;
    }
    const unit  = _$('qa-unit')?.value || 'Nos';
    const gst   = parseFloat(_$('qa-gst')?.value) || 0;
    let qty     = parseFloat(_$('qa-qty')?.value);
    if (isNaN(qty) || qty <= 0) qty = 1;
    const hsn   = (_$('qa-hsn')?.value || '').trim();
    const brand = (_$('qa-brand')?.value || '').trim();

    if (!name) {
      _showToast('⚠️ Please enter product name', 'warning');
      if (nameInput) nameInput.focus();
      return;
    }

    let productObj = {
      id: '',
      name,
      unit,
      rate,
      gst,
      hsn,
      brand,
      stock: 0,
    };

    if (saveToDb) {
      if (typeof DB !== 'undefined' && DB.Products) {
        const savedProd = DB.Products.insert({
          name,
          unit,
          rate,
          purchasePrice: 0,
          gst,
          hsn,
          brand,
          stock: 0,
        });
        if (savedProd) {
          productObj = savedProd;
        }
      }
      const si = _$('product-search-input');
      if (si && typeof ProductSearch !== 'undefined' && typeof DB !== 'undefined') {
        ProductSearch.init(si, _onProductSelected, DB.Products.all());
      }
    }

    _onProductSelected(productObj, qty);

    _showToast(`Item "${name}" added to bill successfully`, 'success', 2200);

    // Clear Quick Add form, reset quantity to 0, keep modal open, focus product name input automatically
    if (nameInput) nameInput.value = '';
    if (priceInput) priceInput.value = '';
    const hsnInput = _$('qa-hsn'); if (hsnInput) hsnInput.value = '';
    const brandInput = _$('qa-brand'); if (brandInput) brandInput.value = '';
    const unitSelect = _$('qa-unit'); if (unitSelect) unitSelect.value = 'Nos';
    const gstSelect = _$('qa-gst'); if (gstSelect) gstSelect.value = '0';
    const qtyInput = _$('qa-qty'); if (qtyInput) qtyInput.value = '0';

    setTimeout(() => {
      const qaNameInput = _$('qa-name');
      if (qaNameInput) {
        qaNameInput.focus();
        try { qaNameInput.select(); } catch (err) {}
      }
    }, 80);
  }

  /* ═══════════════════════════════════════════════════════════════
     HTML BUILDER
     ═══════════════════════════════════════════════════════════════ */
  function _buildHTML(billNo, today) {
    return /* html */`

      <!-- ===== HEADER BAR ===== -->
      <div class="billing-header-bar">
        <div class="page-title">
          <h1>${IC.billing} New Bill</h1>
          <span>Sree Vel Murugan Hardware &amp; Tiles</span>
        </div>

        <!-- GST / Normal toggle -->
        <div class="bill-type-toggle" id="bill-type-toggle">
          <button class="btt-btn"            id="btt-gst">${IC.tag}&nbsp;GST Bill</button>
          <button class="btt-btn btt-active" id="btt-normal">📄&nbsp;Normal Bill</button>
        </div>

        <div class="header-actions">
          <div class="shortcut-pills-header">
            <span class="sc-pill"><kbd>F2</kbd> Search</span>
            <span class="sc-pill"><kbd>Ctrl+S</kbd> Save</span>
            <span class="sc-pill"><kbd>Ctrl+P</kbd> Print</span>
          </div>
          <button class="btn btn-print" id="btn-view-invoice-top" style="display:none" title="View / Print Invoice">
            ${IC.eye} View Invoice
          </button>
          <button class="btn btn-print" id="btn-print-top" title="Ctrl+P">${IC.print} Print</button>
          <button class="btn btn-save"  id="btn-save-top"  title="Ctrl+S">${IC.save} Save Bill</button>
        </div>
      </div>

      <!-- ===== MAIN BODY ===== -->
      <div class="billing-body">

        <!-- ─── LEFT PANEL ─── -->
        <div class="billing-left">

          <!-- 1. Customer & Bill Info Card -->
          <div class="bill-info-card">
            <div class="bill-info-card-header">
              <span class="card-label">${IC.user} Customer &amp; Invoice Details</span>
            </div>
            <div class="bill-info-grid">
              <div class="bill-info-field">
                <label for="customer-name">Customer Name
                  <span class="field-optional">Optional</span>
                </label>
                <div class="field-value">
                  <input id="customer-name" type="text"
                    placeholder="Enter customer name"
                    autocomplete="off" />
                </div>
              </div>
              <div class="bill-info-field">
                <label for="customer-phone">Phone Number
                  <span class="field-optional">Optional</span>
                </label>
                <div class="field-value">
                  <input id="customer-phone" type="tel"
                    placeholder="Enter phone number"
                    autocomplete="off" />
                </div>
              </div>
              <div class="bill-info-field">
                <label for="customer-address">Customer Address
                  <span class="field-optional">Optional</span>
                </label>
                <div class="field-value">
                  <input id="customer-address" type="text"
                    placeholder="Enter address"
                    autocomplete="off" />
                </div>
              </div>
              <div class="bill-info-field" style="grid-column:1/-1">
                <div class="walkin-helper-row">
                  <span class="walkin-helper-text">Walk-in customer (optional details)</span>
                  <span class="walkin-badge" id="walkin-badge" style="display:inline-flex">${IC.user} Walk-in Customer</span>
                </div>
              </div>
              <div class="bill-info-field">
                <label for="payment-mode-select">Payment Mode</label>
                <div class="field-value">
                  <select id="payment-mode-select" style="padding:6px 10px;border:1.5px solid #cbd5e1;border-radius:6px;font-size:0.85rem;font-weight:600;color:#0f172a;background:#fff;width:100%">
                    <option value="Cash" selected>Cash</option>
                    <option value="GPay">GPay</option>
                    <option value="PhonePe">PhonePe</option>
                    <option value="Card">Card</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Credit">Credit</option>
                  </select>
                </div>
              </div>
              <div class="bill-info-field">
                <label>Bill Number</label>
                <div class="field-value">
                  <span class="bill-number-badge" id="bill-number">${billNo}</span>
                </div>
              </div>
              <div class="bill-info-field">
                <label>Date</label>
                <div class="field-value">
                  <span class="static-value" id="bill-date">${today}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 2. Prominent Product Search Card -->
          <div class="search-card search-card-prominent" id="search-card">
            <div class="search-card-label">
              <span class="search-card-title">🔍 Search &amp; Add Product</span>
              <span class="shortcut-chip-highlight"><kbd>F2</kbd> Focus Search</span>
            </div>
            <div class="search-input-row">
              <div class="search-icon-wrap">${IC.search}</div>
              <input id="product-search-input" type="text"
                placeholder="Search product name, model, brand, code (PRD001) or HSN..."
                autocomplete="off" aria-autocomplete="list"
                aria-controls="ps-dropdown" aria-haspopup="listbox" />
            </div>
            <div class="search-hint">
              <kbd>↑↓</kbd> Navigate &nbsp;·&nbsp;
              <kbd>Enter</kbd> Add Item &nbsp;·&nbsp;
              <kbd>Tab</kbd> Next Qty &nbsp;·&nbsp;
              <kbd>Esc</kbd> Close
            </div>
          </div>

          <!-- 3. Bill Items Table Card -->
          <div class="bill-table-card">
            <div class="bill-table-card-header">
              <span class="card-label">Bill Items</span>
              <div style="display:flex;align-items:center;gap:12px;">
                <span class="shortcut-tip">${IC.kbd} <kbd>Tab</kbd> Next Qty &nbsp;·&nbsp; <kbd>Del</kbd> Remove Row</span>
                <span class="items-count-badge" id="items-count">0 items</span>
              </div>
            </div>

            <div class="bill-table-wrapper">
              <table class="bill-table" id="bill-table">
                <thead>
                  <tr>
                    <th class="col-num">#</th>
                    <th class="col-name">Item Name</th>
                    <th class="col-hsn">HSN</th>
                    <th class="col-qty"><span class="th-icon-label">${IC.qty} Qty</span></th>
                    <th class="col-unit">Unit</th>
                    <th class="col-rate">Rate&nbsp;(₹)</th>
                    <th class="col-disc">Disc&nbsp;%</th>
                    <th class="col-gst gst-only-col"><span class="th-icon-label">${IC.gstIcon} GST&nbsp;%</span></th>
                    <th class="col-gst gst-only-col"><span class="th-icon-label">${IC.gstIcon} GST&nbsp;(₹)</span></th>
                    <th class="col-total"><span class="th-icon-label">${IC.totalIcon} Total&nbsp;(₹)</span></th>
                    <th class="col-action"></th>
                  </tr>
                </thead>
                <tbody id="bill-table-body">
                  ${_emptyRowHTML()}
                </tbody>
              </table>
            </div>
          </div>

        </div><!-- /billing-left -->

        <!-- ─── RIGHT PANEL ─── -->
        <div class="billing-right">

          <div class="summary-section-label">Bill Summary</div>

          <!-- Bill meta mini -->
          <div class="bill-meta-mini">
            <div class="bill-meta-mini-row">
              <span class="meta-key">Bill No.</span>
              <span class="meta-val accent" id="summary-bill-no">${billNo}</span>
            </div>
            <div class="bill-meta-mini-row">
              <span class="meta-key">Date</span>
              <span class="meta-val" id="summary-date">${today}</span>
            </div>
            <div class="bill-meta-mini-row">
              <span class="meta-key">Type</span>
              <span class="meta-val" id="summary-bill-type">GST Bill</span>
            </div>
            <div class="bill-meta-mini-row">
              <span class="meta-key">Customer</span>
              <span class="meta-val" id="summary-customer">Walk-in Customer</span>
            </div>
          </div>

          <!-- Summary rows -->
          <div class="summary-rows">

            <!-- Subtotal -->
            <div class="summary-row">
              <span class="row-label">
                ${IC.qty} Subtotal
                <span class="row-sublabel">Qty × Rate</span>
              </span>
              <span class="row-value" id="summary-subtotal">₹&nbsp;0.00</span>
            </div>

            <!-- GST section (GST Bill only) -->
            <div id="gst-summary-section">
              ${[0,5,12,18,28].map(r => `
              <div class="summary-row summary-row-gst-breakdown" id="gst-row-${r}" style="display:none">
                <span class="row-label">
                  <span id="gst-pct-label-${r}">GST @ ${r}%</span>
                  <span class="row-sublabel">CGST ${r/2}% + SGST ${r/2}%</span>
                </span>
                <span class="row-value gst-breakdown-val" id="gst-amt-${r}">₹&nbsp;0.00</span>
              </div>`).join('')}

              <div class="summary-row row-gst">
                <span class="row-label">
                  ${IC.gstIcon} Total GST
                  <span class="row-sublabel">All slabs combined</span>
                </span>
                <span class="row-value" id="summary-gst">₹&nbsp;0.00</span>
              </div>
            </div>

            <!-- Item discounts -->
            <div class="summary-row neg-row" id="row-item-disc-summary" style="display:none">
              <span class="row-label">
                Item Discounts
                <span class="row-sublabel">Applied per row</span>
              </span>
              <span class="row-value neg-val" id="summary-item-disc">₹&nbsp;0.00</span>
            </div>

            <!-- Bill-level discount -->
            <div class="summary-row summary-row-input">
              <span class="row-label">
                Bill Discount
                <span class="row-sublabel">Additional (₹)</span>
              </span>
              <div class="bill-disc-wrap">
                <span class="bill-disc-symbol">₹</span>
                <input type="number" id="bill-discount-input" class="bill-disc-input"
                  value="0" min="0" step="1" placeholder="0"
                  title="Enter bill-level discount amount in ₹" />
              </div>
            </div>

            <!-- Round off -->
            <div class="summary-row">
              <span class="row-label">Round Off</span>
              <span class="row-value" id="summary-roundoff">₹&nbsp;0.00</span>
            </div>

          </div><!-- /summary-rows -->

          <!-- Grand total Box with Item Count -->
          <div class="grand-total-box">
            <div class="gt-header-row">
              <span class="gt-title">${IC.totalIcon} Grand Total</span>
              <span class="gt-items-badge" id="grand-items-count">0 items</span>
            </div>
            <div class="gt-amount" id="summary-grand-total">₹&nbsp;0.00</div>
          </div>

          <div class="summary-divider"></div>

          <!-- Quick-keys reference -->
          <div class="sidebar-shortcuts">
            <div class="summary-section-label" style="margin-bottom:10px">Keyboard Shortcuts</div>
            <div class="sb-shortcut-row"><kbd>F2</kbd><span>Focus search</span></div>
            <div class="sb-shortcut-row"><kbd>F6</kbd><span>Quick Add</span></div>
            <div class="sb-shortcut-row"><kbd>Ctrl+S</kbd><span>Save bill</span></div>
            <div class="sb-shortcut-row"><kbd>Ctrl+P</kbd><span>Print bill</span></div>
            <div class="sb-shortcut-row"><kbd>Ctrl+N</kbd><span>New bill</span></div>
            <div class="sb-shortcut-row"><kbd>Delete</kbd><span>Remove row</span></div>
          </div>

          <div class="summary-divider"></div>

          <!-- Action buttons -->
          <div class="summary-section-label">Actions</div>
          <div class="summary-actions">
            <button class="btn-action btn-action-save"  id="btn-save-main"  title="Ctrl+S">${IC.save} Save Bill</button>
            <button class="btn-action btn-action-print" id="btn-view-invoice-main" style="display:none" title="View / Print Invoice">${IC.eye} View Invoice</button>
            <button class="btn-action btn-action-print" id="btn-print-main" title="Ctrl+P">${IC.print} Print Bill</button>
            <button class="btn-action btn-action-clear" id="btn-clear-main" title="Ctrl+N">${IC.clear} Clear All</button>
          </div>

        </div><!-- /billing-right -->
      </div><!-- /billing-body -->
    `;
  }

  /* ═══════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════ */
  function render(container) {
    _isRestoringDraft = true;

    if (!_$('billing-css')) {
      const lnk = document.createElement('link');
      lnk.id = 'billing-css'; lnk.rel = 'stylesheet';
      lnk.href = 'src/pages/Billing/Billing.css';
      document.head.appendChild(lnk);
    }

    if (typeof ProductSearch   !== 'undefined') ProductSearch.destroy();
    if (typeof KeyboardShortcuts !== 'undefined') KeyboardShortcuts.clear();

    _rowCounter    = 0;
    _itemCount     = 0;
    _selectedRow   = null;
    _isGstBill     = false;
    _lastSavedBill = null;
    clearTimeout(_toastTimer);

    const billNo = (typeof DB !== 'undefined') ? DB.nextBillNo() : _billNo();

    container.innerHTML      = '';
    container.style.padding  = '0';
    container.style.overflow = 'hidden';

    const wrap = document.createElement('div');
    wrap.className = 'billing-page';
    wrap.innerHTML = _buildHTML(billNo, _today());
    container.appendChild(wrap);

    const si = _$('product-search-input');
    if (si && typeof ProductSearch !== 'undefined') {
      const dbProducts = (typeof DB !== 'undefined') ? DB.Products.all() : null;
      const prodList   = (dbProducts && dbProducts.length > 0)
        ? dbProducts
        : (typeof SampleProducts !== 'undefined' ? SampleProducts : []);
      ProductSearch.init(si, _onProductSelected, prodList);
    }

    _$('btt-gst')?.addEventListener('click',    () => { _toggleBillType(true); _saveDraft(); });
    _$('btt-normal')?.addEventListener('click', () => { _toggleBillType(false); _saveDraft(); });

    _$('btn-quick-add')?.addEventListener('click', (e) => {
      e.preventDefault();
      _openQuickAddModal();
    });

    _$('bill-discount-input')?.addEventListener('input', () => {
      _recalcBillTotals();
      _saveDraft();
    });
    _$('payment-mode-select')?.addEventListener('change', _saveDraft);

    _$('btn-clear-main')?.addEventListener('click', () => {
      _clearAll();
      _showToast('📄 New bill started', 'info');
      setTimeout(() => { const inp = _$('product-search-input'); if (inp) inp.focus(); }, 50);
    });

    ['btn-save-top','btn-save-main'].forEach(id => {
      _$(id)?.addEventListener('click', (e) => { e.preventDefault(); _saveBill(); });
    });
    ['btn-print-top','btn-print-main'].forEach(id => {
      _$(id)?.addEventListener('click', (e) => {
        e.preventDefault();
        _openInvoicePreview();
        setTimeout(() => {
          if (typeof printInvoice === 'function') printInvoice();
        }, 150);
      });
    });
    ['btn-view-invoice-top','btn-view-invoice-main'].forEach(id => {
      _$(id)?.addEventListener('click', (e) => { e.preventDefault(); _openInvoicePreview(); });
    });

    wrap.addEventListener('click', (e) => {
      if (!e.target.closest('.bill-row') && !e.target.closest('.row-delete-btn')) _selectRow(null);
    });

    ['customer-name', 'customer-phone', 'customer-address'].forEach(id => {
      const el = _$(id);
      if (!el) return;
      if (id === 'customer-name') {
        el.addEventListener('input', () => {
          const start = el.selectionStart;
          const end = el.selectionEnd;
          el.value = el.value.toUpperCase();
          try { el.setSelectionRange(start, end); } catch (e) {}
          _updateWalkinBadge();
        });
      } else {
        el.addEventListener('input', _updateWalkinBadge);
      }
    });

    _toggleBillType(false, true);
    _updateWalkinBadge();
    _registerShortcuts();
    _recalcBillTotals();

    const editingId = localStorage.getItem('editingInvoiceId');
    if (editingId && typeof DB !== 'undefined') {
      const bill = DB.Bills.all().find(b => b.billNo === editingId || b.invoiceNo === editingId || b.id === editingId) || DB.Bills.findByNo(editingId) || DB.Bills.find(editingId);
      if (bill) {
        loadBillForEdit(bill);
      } else {
        localStorage.removeItem('editingInvoiceId');
      }
    } else {
      _restoreDraft();
    }

    _isRestoringDraft = false;
    setTimeout(() => { if (si) si.focus(); }, 80);
  }

  /* ═══════════════════════════════════════════════════════════════
     UNFINISHED BILL DRAFT PERSISTENCE
     ═══════════════════════════════════════════════════════════════ */
  function _saveDraft() {
    if (_isRestoringDraft || _editingBillId || localStorage.getItem('editingInvoiceId')) return;
    try {
      const data = _collectBillData();
      const hasCustomer = !!(data.customerName || data.customerPhone || data.customerAddress);
      const hasItems = !!(data.items && data.items.length > 0);
      const hasDiscount = !!(parseFloat(_$('bill-discount-input')?.value) || 0);

      if (!hasCustomer && !hasItems && !hasDiscount) {
        localStorage.removeItem('billing_draft');
        localStorage.removeItem('svmh_billing_draft');
        return;
      }

      const draft = {
        billNo: data.billNo,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        customerAddress: data.customerAddress,
        paymentMode: data.paymentMode,
        billDiscount: parseFloat(_$('bill-discount-input')?.value) || 0,
        isGstBill: _isGstBill,
        items: data.items.map(it => ({
          productId: it.productId,
          productName: it.productName,
          hsn: it.hsn,
          qty: it.qty,
          unit: it.unit,
          rate: it.rate,
          discPct: it.discPct,
          gstPct: it.gstPct,
          baseAmount: it.baseAmount,
          discountAmount: it.discountAmount,
          taxableAmount: it.taxableAmount,
          gstAmount: it.gstAmount,
          rowTotal: it.rowTotal,
        })),
        savedAt: new Date().toISOString()
      };

      const jsonStr = JSON.stringify(draft);
      localStorage.setItem('billing_draft', jsonStr);
      localStorage.setItem('svmh_billing_draft', jsonStr);
    } catch (e) {
      console.error('[Billing] Error saving draft:', e);
    }
  }

  function _restoreDraft() {
    if (_editingBillId || localStorage.getItem('editingInvoiceId')) return false;
    const raw = localStorage.getItem('billing_draft') || localStorage.getItem('svmh_billing_draft');
    if (!raw) return false;
    try {
      const draft = JSON.parse(raw);
      if (!draft) return false;

      const hasCustomer = !!(draft.customerName || draft.customerPhone || draft.customerAddress);
      const hasItems = !!(draft.items && draft.items.length > 0);
      const hasDiscount = !!(draft.billDiscount);
      if (!hasCustomer && !hasItems && !hasDiscount) return false;

      _isRestoringDraft = true;

      if (draft.billNo) {
        _setText('bill-number', draft.billNo);
        _setText('summary-bill-no', draft.billNo);
      }

      const custNameEl = _$('customer-name'); if (custNameEl) custNameEl.value = (draft.customerName || '').toUpperCase();
      const custPhoneEl = _$('customer-phone'); if (custPhoneEl) custPhoneEl.value = draft.customerPhone || '';
      const custAddrEl = _$('customer-address'); if (custAddrEl) custAddrEl.value = draft.customerAddress || '';
      const paySelect = _$('payment-mode-select'); if (paySelect) paySelect.value = draft.paymentMode || 'Cash';
      const discInput = _$('bill-discount-input'); if (discInput) discInput.value = draft.billDiscount || 0;

      _toggleBillType(!!draft.isGstBill, true);

      const name = (draft.customerName || '').trim();
      const phone = (draft.customerPhone || '').trim();
      const addr = (draft.customerAddress || '').trim();
      const badge = _$('walkin-badge');
      if (badge) badge.style.display = (!name && !phone && !addr) ? 'inline-flex' : 'none';
      _setText('summary-customer', name || (phone ? phone : 'Walk-in Customer'));

      if (draft.items && draft.items.length > 0) {
        const tbody = _$('bill-table-body');
        if (tbody) tbody.innerHTML = '';
        _rowCounter = 0;
        _itemCount = 0;

        draft.items.forEach(it => {
          _onProductSelected({
            id: it.productId || '',
            name: it.productName || it.name || 'Item',
            rate: it.rate !== undefined ? it.rate : 0,
            gst: it.gstPct !== undefined ? it.gstPct : 0,
            hsn: it.hsn || '',
            unit: it.unit || 'Nos',
          }, it.qty || 1, { isSilent: true });

          const lastRow = _$('bill-table-body')?.lastElementChild;
          if (lastRow) {
            if (it.rate !== undefined) {
              const rateInp = lastRow.querySelector('.rate-input');
              if (rateInp) rateInp.value = it.rate;
              lastRow.dataset.rate = it.rate;
            }
            if (it.discPct !== undefined) {
              const discEl = lastRow.querySelector('.disc-input');
              if (discEl) discEl.value = it.discPct;
            }
            if (it.gstPct !== undefined) {
              const gstInp = lastRow.querySelector('.gst-input');
              if (gstInp) gstInp.value = it.gstPct;
              lastRow.dataset.gstPct = it.gstPct;
            }
            _calcAndUpdateRow(lastRow);
          }
        });
      }

      _isRestoringDraft = false;
      _recalcBillTotals();
      return true;
    } catch (e) {
      console.error('[Billing] Error restoring draft:', e);
      _isRestoringDraft = false;
      return false;
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     LOAD BILL FOR EDITING
     ═══════════════════════════════════════════════════════════════ */
  function loadBillForEdit(billOrNo) {
    let bill = null;
    if (typeof billOrNo === 'object' && billOrNo !== null) {
      bill = billOrNo;
    } else if (typeof DB !== 'undefined') {
      bill = DB.Bills.all().find(b => b.billNo === billOrNo || b.invoiceNo === billOrNo || b.id === billOrNo) || DB.Bills.findByNo(billOrNo) || DB.Bills.find(billOrNo);
    }
    if (!bill) {
      _showToast('⚠️ Invoice details not found', 'warning');
      localStorage.removeItem('editingInvoiceId');
      return;
    }

    _editingBillId = bill.id;
    _editingBillNo = bill.billNo || bill.invoiceNo;

    // Clear existing table and rows
    const tbody = _$('bill-table-body');
    if (tbody) tbody.innerHTML = '';
    _rowCounter  = 0;
    _itemCount   = 0;
    _selectedRow = null;

    // Set Customer & Bill metadata
    const custNameEl = _$('customer-name');
    if (custNameEl) custNameEl.value = (bill.customerName || '').toUpperCase();
    const custPhoneEl = _$('customer-phone');
    if (custPhoneEl) custPhoneEl.value = bill.customerPhone || '';
    const custAddrEl = _$('customer-address');
    if (custAddrEl) custAddrEl.value = bill.customerAddress || bill.address || '';

    const paySelect = _$('payment-mode-select');
    if (paySelect) paySelect.value = bill.paymentMode || bill.paymentMethod || 'Cash';

    const discInput = _$('bill-discount-input');
    if (discInput) discInput.value = bill.billDiscount || 0;

    _toggleBillType(bill.billType === 'gst');
    _updateWalkinBadge();

    const billNoEl = _$('bill-number');
    if (billNoEl) {
      billNoEl.innerHTML = `${_editingBillNo} <span class="editing-badge" style="background:#f59e0b;color:#0f172a;padding:2px 8px;border-radius:4px;font-size:0.72rem;font-weight:800;margin-left:8px">EDITING</span>`;
    }
    _setText('summary-bill-no', _editingBillNo);

    // Update Header <h1> Title to: "Edit Bill - SVMH-XXXX"
    const pageTitleH1 = document.querySelector('.billing-header-bar .page-title h1');
    if (pageTitleH1) {
      pageTitleH1.innerHTML = `${IC.billing} Edit Bill - ${_editingBillNo}`;
    }

    // Fetch bill items
    const items = (bill.items && bill.items.length > 0)
      ? bill.items
      : (typeof DB !== 'undefined' ? DB.BillItems.forBill(bill.id) : []);

    items.forEach(it => {
      _onProductSelected({
        id:    it.productId || '',
        name:  it.productName || it.name || 'Item',
        rate:  it.rate !== undefined ? it.rate : 0,
        gst:   it.gstPct !== undefined ? it.gstPct : (it.gst || 0),
        hsn:   it.hsn || '',
        unit:  it.unit || 'Nos',
        brand: it.brand || '',
      }, it.qty || it.quantity || 1);

      const lastRow = _$('bill-table-body')?.lastElementChild;
      if (lastRow) {
        const discEl = lastRow.querySelector('.disc-input');
        if (discEl && (it.discPct || it.discount)) {
          discEl.value = it.discPct || it.discount || 0;
          _calcAndUpdateRow(lastRow);
        }
      }
    });

    _recalcBillTotals();

    // Update Save button text to "Update Bill"
    ['btn-save-top','btn-save-main'].forEach(id => {
      const btn = _$(id);
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `${IC.save} Update Bill`;
        btn.style.backgroundColor = 'var(--bill-accent)';
        btn.style.color = '#0f172a';
        btn.style.borderColor = 'var(--bill-accent)';
        btn.classList.remove('disabled-saving', 'btn-saved-success');
      }
    });

    _showToast(`Loaded Bill ${_editingBillNo} for editing`, 'info', 2500);
  }

  return { render, loadBillForEdit };
})();
