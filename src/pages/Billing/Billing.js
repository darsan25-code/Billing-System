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

  /* ── State ───────────────────────────────────────────────────── */
  let _rowCounter   = 0;
  let _itemCount    = 0;
  let _selectedRow  = null;
  let _toastTimer   = null;
  let _isGstBill    = false;  // Normal Bill (false) default vs GST Bill (true)
  let _lastSavedBill= null;   // Keeps track of last saved bill object

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
    const rate    = parseFloat(tr.dataset.rate)   || 0;
    const gstPct  = parseFloat(tr.dataset.gstPct) || 0;

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
  }

  function _recalcBillTotals() {
    if (!BC) return;

    const rows = Array.from(document.querySelectorAll('#bill-table-body .bill-row'));
    const rowResults = rows.map(tr => BC.calcRow(
      parseFloat(tr.querySelector('.qty-input')?.value)  || 0,
      parseFloat(tr.dataset.rate)   || 0,
      parseFloat(tr.querySelector('.disc-input')?.value) || 0,
      parseFloat(tr.dataset.gstPct) || 0,
      _isGstBill
    ));

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

  function _toggleBillType(isGst) {
    _isGstBill = isGst;

    _$('btt-gst')?.classList.toggle('btt-active', isGst);
    _$('btt-normal')?.classList.toggle('btt-active', !isGst);

    const tbl = _$('bill-table');
    if (tbl) tbl.classList.toggle('normal-bill-mode', !isGst);

    const gstSec = _$('gst-summary-section');
    if (gstSec) gstSec.style.display = isGst ? '' : 'none';

    _setText('summary-bill-type', isGst ? 'GST Bill' : 'Normal Bill');
    _recalcAllRows();
    _showToast(isGst ? '🧾 Switched to GST Bill' : '📄 Switched to Normal Bill', 'info', 1800);
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

  function _wireTabNav(qtyInput) {
    qtyInput.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;
      e.preventDefault();
      const all = Array.from(document.querySelectorAll('#bill-table-body .qty-input'));
      if (all.length < 2) return;
      const idx  = all.indexOf(e.target);
      const next = e.shiftKey ? (idx - 1 + all.length) % all.length : (idx + 1) % all.length;
      all[next].focus();
      all[next].select();
      _selectRow(all[next].closest('.bill-row'));
    });
  }

  /* ═══════════════════════════════════════════════════════════════
     ADD PRODUCT TO BILL
     ═══════════════════════════════════════════════════════════════ */
  function _onProductSelected(product) {
    const tbody = _$('bill-table-body');
    if (!tbody) return;

    const emptyRow = _$('empty-row');
    if (emptyRow) emptyRow.remove();

    _rowCounter++;
    _itemCount++;

    const tr = document.createElement('tr');
    tr.className          = 'bill-row bill-row-animate';
    tr.dataset.rowId      = _rowCounter;
    tr.dataset.rate       = product.rate;
    tr.dataset.gstPct     = product.gst;
    tr.dataset.productId  = product.id   || '';
    tr.dataset.productName= product.name || '';
    tr.dataset.hsn        = product.hsn  || '';
    tr.dataset.unit       = product.unit || '';

    const subtitle = [product.brand, product.model].filter(Boolean).join(' • ');

    tr.innerHTML = `
      <td class="col-num row-num">${_itemCount}</td>
      <td class="col-name">
        <div class="row-product-wrap">
          <div class="row-product-name" title="${_esc(product.name)}">${_esc(product.name)}</div>
          ${subtitle ? `<div class="row-product-sub">${_esc(subtitle)}</div>` : ''}
        </div>
      </td>
      <td class="col-hsn">${_esc(product.hsn || '—')}</td>
      <td class="col-qty">
        <input type="number" class="qty-input" id="qty-${_rowCounter}"
          value="1" min="0.001" max="99999" step="1"
          aria-label="Qty for ${_esc(product.name)}" />
      </td>
      <td class="col-unit">${_esc(product.unit || '—')}</td>
      <td class="col-rate rate-cell">
        <input type="number" class="rate-input" id="rate-${_rowCounter}"
          value="${product.rate}" min="0.01" step="any"
          aria-label="Rate for ${_esc(product.name)}"
          style="width:76px;padding:4px 6px;border:1.5px solid #cbd5e1;border-radius:4px;font-weight:700;color:#0f172a;text-align:right" />
      </td>
      <td class="col-disc">
        <input type="number" class="disc-input" id="disc-${_rowCounter}"
          value="0" min="0" max="100" step="0.5" placeholder="0"
          aria-label="Disc% for ${_esc(product.name)}" />
      </td>
      <td class="col-gst gst-only-col gst-pct-cell">${product.gst}%</td>
      <td class="col-gst gst-only-col gst-amt-cell cell-pending">—</td>
      <td class="col-total total-cell cell-pending">—</td>
      <td class="col-action">
        <button class="row-delete-btn" title="Remove row"
          aria-label="Remove ${_esc(product.name)}">${IC.trash}</button>
      </td>
    `;

    const qtyInput  = tr.querySelector('.qty-input');
    const rateInput = tr.querySelector('.rate-input');
    const discInput = tr.querySelector('.disc-input');

    const _onChange = () => _calcAndUpdateRow(tr);
    qtyInput.addEventListener('input',  _onChange);
    discInput.addEventListener('input', _onChange);

    rateInput.addEventListener('input', () => {
      let val = parseFloat(rateInput.value);
      if (isNaN(val) || val < 0) {
        val = 0;
      }
      tr.dataset.rate = val;
      _calcAndUpdateRow(tr);
    });

    _wireTabNav(qtyInput);

    tr.querySelectorAll('td:not(.col-action):not(.col-qty):not(.col-disc):not(.col-rate)').forEach(td => {
      td.addEventListener('click', () => _selectRow(tr));
    });

    qtyInput.addEventListener('focus', () => _selectRow(tr));
    rateInput.addEventListener('focus', () => _selectRow(tr));
    discInput.addEventListener('focus', () => _selectRow(tr));

    const _onBlur = () => setTimeout(() => {
      const f = document.activeElement;
      if (!f || (!f.classList.contains('qty-input') && !f.classList.contains('rate-input') && !f.classList.contains('disc-input'))) {
        _selectRow(null);
      }
    }, 80);
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

    // Show toast for added product
    _showToast(`Added: ${product.name}`, 'success', 2200);

    // Auto-clear and auto-focus search bar so user can directly type next product without mouse!
    setTimeout(() => {
      const searchInp = document.getElementById('product-search-input');
      if (searchInp) {
        searchInp.value = '';
        searchInp.focus();
      }
    }, 50);
  }

  /* ═══════════════════════════════════════════════════════════════
     BILL DATA COLLECTION & SAVE
     ═══════════════════════════════════════════════════════════════ */

  function _collectBillData() {
    const customerName  = (_$('customer-name')?.value  || '').trim();
    const customerPhone = (_$('customer-phone')?.value || '').trim();
    const paymentMode   = _$('payment-mode-select')?.value || 'Cash';
    const billDiscAmt   = parseFloat(_$('bill-discount-input')?.value) || 0;
    const billNoText    = (_$('bill-number')?.textContent || '').replace('✓ Saved', '').trim();

    const rows = Array.from(document.querySelectorAll('#bill-table-body .bill-row'));
    const items = rows.map(tr => {
      const qty     = parseFloat(tr.querySelector('.qty-input')?.value)  || 0;
      const discPct = parseFloat(tr.querySelector('.disc-input')?.value) || 0;
      const rate    = parseFloat(tr.dataset.rate)   || 0;
      const gstPct  = parseFloat(tr.dataset.gstPct) || 0;
      const calc    = BC ? BC.calcRow(qty, rate, discPct, gstPct, _isGstBill) : {};
      return {
        productId:   tr.dataset.productId   || null,
        productName: tr.dataset.productName || '',
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

    return { customerName, customerPhone, paymentMode, billNo: billNoText, items, totals };
  }

  /**
   * Save Bill flow:
   *  Validation: Bill number required, >= 1 item, quantity cannot be 0.
   *  On success:
   *   - STAY ON BILLING PAGE.
   *   - Save customer, bill, items, reduce stock.
   *   - Generate sequential bill number: SVMH-YYYYMM-NNNN.
   *   - Show green header badge: ✓ Saved.
   *   - Toast: "Bill SVMH-202608-0001 saved successfully"
   *   - Disable Save button for 3 seconds.
   *   - Show "View Invoice" button.
   */
  function _saveBill() {
    console.log("Save clicked");
    console.log("Save button clicked");

    const data = _collectBillData();
    console.log("Bill data collected");

    /* ── Validation ── */
    if (!data.billNo || !data.billNo.trim()) {
      _showToast('⚠️ Bill number is required.', 'warning');
      return;
    }

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

    const result = DB.saveBill({
      customerName:  data.customerName,
      customerPhone: data.customerPhone,
      billType:      _isGstBill ? 'gst' : 'normal',
      paymentMode:   data.paymentMode,
      billNo:        data.billNo,
      items:         data.items,
      totals:        data.totals,
    });

    if (!result.success) {
      _showToast('❌ Failed to save bill.', 'error');
      return;
    }

    console.log("Database save success");
    console.log("Database updated");
    localStorage.removeItem('svmh_bill_draft'); // Clear saved draft on success

    /* ── Success ── */
    _lastSavedBill = result.bill;
    const savedBillNo = result.bill.billNo;
    const saveTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    _playSuccessSound();

    console.log("Showing success toast");
    _showSaveToast(savedBillNo, saveTime);

    // Update header badge: SAVED ✓
    const billNoEl = _$('bill-number');
    if (billNoEl) {
      billNoEl.innerHTML = `${savedBillNo} <span class="saved-badge" style="background:#10b981;color:#fff;padding:2px 8px;border-radius:4px;font-size:0.75rem;font-weight:800;margin-left:8px;display:inline-flex;align-items:center;gap:4px;animation:saved-pulse 0.4s ease">SAVED ✓</span>`;
    }
    _setText('summary-bill-no', savedBillNo);

    // Show View Invoice button
    const viewBtnTop  = _$('btn-view-invoice-top');
    const viewBtnMain = _$('btn-view-invoice-main');
    if (viewBtnTop)  viewBtnTop.style.display  = 'inline-flex';
    if (viewBtnMain) viewBtnMain.style.display = 'inline-flex';

    // Change Save button text to "Saved ✓", background green (#16a34a), and disable for 3 seconds
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
    _showEmptyState();

    ['customer-name','customer-phone'].forEach(id => {
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
    const badge = _$('walkin-badge');
    const isWalkin = (!name && !phone);
    if (badge) badge.style.display = isWalkin ? 'inline-flex' : 'none';
    _setText('summary-customer', name || (phone ? phone : 'Walk-in Customer'));
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
      _selectRow(null);
      const si = _$('product-search-input');
      if (si) si.value = '';
    });
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

    _$('btt-gst')?.addEventListener('click',    () => _toggleBillType(true));
    _$('btt-normal')?.addEventListener('click', () => _toggleBillType(false));

    _$('bill-discount-input')?.addEventListener('input', _recalcBillTotals);

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

    ['customer-name', 'customer-phone'].forEach(id => {
      _$(id)?.addEventListener('input', _updateWalkinBadge);
    });

    _toggleBillType(false);
    _updateWalkinBadge();
    _registerShortcuts();
    _recalcBillTotals();

    setTimeout(() => { if (si) si.focus(); }, 80);
  }

  return { render };
})();
