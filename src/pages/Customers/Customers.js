/**
 * Customers.js – Complete Customer Management Page
 *
 * Features:
 *   • Real-time stats (Total Customers, Total Revenue, Registered Customers, Walk-in Bills)
 *   • Search customers by Name or Phone
 *   • Table Columns: Customer name, Phone number, Total bills, Total amount, Last purchase date, Actions
 *   • Add / Edit Customer Modal
 *   • Delete Customer with confirmation
 *   • Customer Invoice History Modal (Lists all bills for selected customer + View/Print Invoice)
 *
 * Project: Sree Vel Murugan Hardware and Tiles – Billing System
 */

const CustomersPage = (() => {

  /* ── State ───────────────────────────────────────────────────── */
  let _searchQuery = '';
  let _selectedId  = null;

  /* ── SVG Icons ──────────────────────────────────────────────── */
  const IC = {
    user:   `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
    search: `<svg class="cust-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
    plus:   `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
    edit:   `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
    trash:  `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`,
    hist:   `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    eye:    `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
  };

  /* ── Helpers ─────────────────────────────────────────────────── */
  const _$ = (id) => document.getElementById(id);
  const _esc = (s) => String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const fmtINR = (n) => '₹\u00a0' + Math.round(n || 0).toLocaleString('en-IN');

  /* ── Toast ──────────────────────────────────────────────────── */
  let _toastTimer = null;
  function _showToast(msg, type = 'info', ms = 2400) {
    let t = document.getElementById('cust-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'cust-toast';
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

  /* ── Fetch customers ────────────────────────────────────────── */
  function _getCustomers() {
    const all = (typeof DB !== 'undefined') ? DB.Customers.all() : [];
    if (!_searchQuery) return all;
    const q = _searchQuery.toLowerCase();
    return all.filter(c =>
      (c.name  || '').toLowerCase().includes(q) ||
      (c.phone || '').toLowerCase().includes(q) ||
      (c.address || '').toLowerCase().includes(q)
    );
  }

  /* ══════════════════════════════════════════════════════════════
     RENDER TABLE
     ══════════════════════════════════════════════════════════════ */
  function _renderTable() {
    const tbody = _$('cust-table-body');
    if (!tbody) return;

    const customers = _getCustomers();
    const total     = (typeof DB !== 'undefined') ? DB.Customers.count() : 0;
    const allCust   = (typeof DB !== 'undefined') ? DB.Customers.all() : [];

    const totalRev  = allCust.reduce((s, c) => s + (c.totalAmount || 0), 0);
    const walkins   = (typeof DB !== 'undefined') ? DB.Bills.all().filter(b => (b.customerName || '').toLowerCase().includes('walk-in')).length : 0;

    const set = (id, v) => { const el = _$(id); if (el) el.textContent = v; };
    set('stat-total-cust', total);
    set('stat-total-rev',  fmtINR(totalRev));
    set('stat-registered', allCust.filter(c => !c.name.toLowerCase().includes('walk-in')).length);
    set('stat-walkins',    walkins);

    const pill = _$('cust-count-pill');
    if (pill) pill.textContent = `${total} customer${total !== 1 ? 's' : ''}`;

    const rsl = _$('cust-result-label');
    if (rsl) rsl.textContent = _searchQuery ? `${customers.length} of ${total} shown` : '';

    if (customers.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="cust-empty-cell">
            <div class="cust-empty-state">
              <div class="cust-empty-icon">👥</div>
              <p>${_searchQuery ? `No customer matching &ldquo;${_esc(_searchQuery)}&rdquo;` : 'No customer records yet'}</p>
              <span>${_searchQuery ? 'Try searching with a different name or phone number.' : 'Customer records are saved automatically when bills are issued, or click "+ Add Customer".'}</span>
            </div>
          </td>
        </tr>`;
      return;
    }

    tbody.innerHTML = customers.map(c => {
      const isWalkin = (c.name || '').toLowerCase().includes('walk-in');
      return `
        <tr class="cust-row" data-cust-id="${_esc(c.id)}">
          <td class="col-cust-name">
            <div class="cust-name-wrap">
              <div class="cust-name-main">${_esc(c.name)}</div>
              ${isWalkin ? `<span class="walkin-chip">Walk-in</span>` : ''}
              ${c.address ? `<div class="cust-address-sub">${_esc(c.address)}</div>` : ''}
            </div>
          </td>
          <td class="col-cust-phone">${c.phone ? `<span class="phone-chip">${_esc(c.phone)}</span>` : '<span class="td-muted">—</span>'}</td>
          <td class="col-cust-bills td-center"><span class="bills-count-badge">${c.totalBills || 0}</span></td>
          <td class="col-cust-amount td-right"><span class="amount-badge">${fmtINR(c.totalAmount)}</span></td>
          <td class="col-cust-date td-center"><span class="date-chip">${c.lastPurchaseDate || '—'}</span></td>
          <td class="col-cust-actions td-center">
            <div class="td-actions-wrap">
              <button class="action-btn action-history" data-id="${_esc(c.id)}" title="View Customer Invoices">${IC.eye} Invoices</button>
              <button class="action-btn action-edit" data-id="${_esc(c.id)}" title="Edit Customer">${IC.edit}</button>
              <button class="action-btn action-delete" data-id="${_esc(c.id)}" title="Delete Customer">${IC.trash}</button>
            </div>
          </td>
        </tr>`;
    }).join('');

    /* Wire buttons */
    tbody.querySelectorAll('.action-history').forEach(btn => {
      btn.addEventListener('click', () => _openHistoryModal(btn.dataset.id));
    });
    tbody.querySelectorAll('.action-edit').forEach(btn => {
      btn.addEventListener('click', () => _openCustomerModal(btn.dataset.id));
    });
    tbody.querySelectorAll('.action-delete').forEach(btn => {
      btn.addEventListener('click', () => _handleDelete(btn.dataset.id, btn));
    });
  }

  /* ══════════════════════════════════════════════════════════════
     ADD / EDIT CUSTOMER MODAL
     ══════════════════════════════════════════════════════════════ */
  function _openCustomerModal(editId = null) {
    const c = (editId && typeof DB !== 'undefined') ? DB.Customers.find(editId) : null;

    const overlay = document.createElement('div');
    overlay.id = 'cust-modal-overlay';
    overlay.className = 'prod-modal-overlay';

    overlay.innerHTML = /* html */`
      <div class="prod-modal" role="dialog" aria-modal="true" style="max-width:500px">
        <div class="prod-modal-header">
          <h2>${editId ? '✏️ Edit Customer' : '👤 Add New Customer'}</h2>
          <button class="modal-close-btn" id="cust-modal-close">✕</button>
        </div>
        <div class="prod-modal-body">
          <form id="cust-form" autocomplete="off">
            <div class="form-field" style="margin-bottom:12px">
              <label for="cf-name">Customer Name <span class="req">*</span></label>
              <input id="cf-name" type="text" placeholder="e.g. Ramesh Kumar" value="${_esc(c?.name || '')}" />
            </div>
            <div class="form-field" style="margin-bottom:12px">
              <label for="cf-phone">Phone Number</label>
              <input id="cf-phone" type="tel" placeholder="e.g. 9876543210" value="${_esc(c?.phone || '')}" />
            </div>
            <div class="form-field" style="margin-bottom:12px">
              <label for="cf-address">Address</label>
              <input id="cf-address" type="text" placeholder="e.g. 45 Temple Street, Madurai" value="${_esc(c?.address || '')}" />
            </div>
            <div class="form-field">
              <label for="cf-notes">Notes / GSTIN</label>
              <input id="cf-notes" type="text" placeholder="e.g. Regular client / 33ABCDE..." value="${_esc(c?.notes || '')}" />
            </div>
          </form>
        </div>
        <div class="prod-modal-footer">
          <button class="modal-btn modal-btn-cancel" id="cust-modal-cancel">Cancel</button>
          <button class="modal-btn modal-btn-save" id="cust-modal-save">${editId ? '✔ Update Customer' : '＋ Save Customer'}</button>
        </div>
      </div>`;

    document.body.appendChild(overlay);

    const closeFn = () => overlay.remove();
    _$('cust-modal-close')?.addEventListener('click', closeFn);
    _$('cust-modal-cancel')?.addEventListener('click', closeFn);

    _$('cust-modal-save')?.addEventListener('click', () => {
      const name    = (_$('cf-name')?.value || '').trim();
      const phone   = (_$('cf-phone')?.value || '').trim();
      const address = (_$('cf-address')?.value || '').trim();
      const notes   = (_$('cf-notes')?.value || '').trim();

      if (!name) {
        _showToast('⚠️ Customer name is required', 'warning');
        _$('cf-name')?.focus();
        return;
      }

      if (editId) {
        DB.Customers.update(editId, { name, phone, address, notes });
        _showToast(`✅ "${name}" updated`, 'success');
      } else {
        DB.Customers.insert({ name, phone, address, notes });
        _showToast(`✅ Customer "${name}" added`, 'success');
      }

      closeFn();
      _renderTable();
    });

    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeFn(); });
    setTimeout(() => _$('cf-name')?.focus(), 80);
  }

  /* ══════════════════════════════════════════════════════════════
     CUSTOMER INVOICES HISTORY MODAL
     ══════════════════════════════════════════════════════════════ */
  function _openHistoryModal(customerId) {
    const c = DB.Customers.find(customerId);
    if (!c) return;

    const bills = DB.Customers.billsForCustomer(customerId);

    const overlay = document.createElement('div');
    overlay.className = 'prod-modal-overlay';

    overlay.innerHTML = /* html */`
      <div class="prod-modal" role="dialog" aria-modal="true" style="max-width:720px">
        <div class="prod-modal-header">
          <h2>📄 Invoice History — ${_esc(c.name)}</h2>
          <button class="modal-close-btn" id="hist-close-btn">✕</button>
        </div>
        <div class="prod-modal-body" style="padding:16px 20px">
          <div class="cust-hist-meta">
            <div>Phone: <strong>${_esc(c.phone || '—')}</strong></div>
            <div>Total Bills: <strong>${c.totalBills || bills.length}</strong></div>
            <div>Total Revenue: <strong>${fmtINR(c.totalAmount)}</strong></div>
          </div>

          ${bills.length === 0 ? `
            <div class="cust-empty-state" style="padding:24px 0">
              <p>No billing history recorded for this customer yet.</p>
            </div>
          ` : `
            <table class="cust-bills-tbl">
              <thead>
                <tr>
                  <th>Bill No.</th>
                  <th>Date</th>
                  <th class="txt-center">Items</th>
                  <th class="txt-right">Amount</th>
                  <th class="txt-center">Action</th>
                </tr>
              </thead>
              <tbody>
                ${bills.map(b => `
                  <tr>
                    <td><strong style="font-family:monospace">${_esc(b.billNo)}</strong></td>
                    <td>${_esc(b.date || b.createdAt?.split('T')[0])}</td>
                    <td class="txt-center">${b.itemCount || '—'}</td>
                    <td class="txt-right font-bold">${fmtINR(b.grandTotal)}</td>
                    <td class="txt-center">
                      <button class="inv-view-btn" data-bill-no="${_esc(b.billNo)}">
                        ${IC.eye} View / Print
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          `}
        </div>
        <div class="prod-modal-footer">
          <button class="modal-btn modal-btn-cancel" id="hist-close-bottom">Close</button>
        </div>
      </div>`;

    document.body.appendChild(overlay);

    const closeFn = () => overlay.remove();
    _$('hist-close-btn')?.addEventListener('click', closeFn);
    _$('hist-close-bottom')?.addEventListener('click', closeFn);

    overlay.querySelectorAll('.inv-view-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const billNo = btn.dataset.billNo;
        if (typeof InvoicePreview !== 'undefined') {
          InvoicePreview.show(billNo);
        }
      });
    });
  }

  function _handleDelete(id, btn) {
    if (btn.dataset.confirming === '1') {
      const c = DB.Customers.find(id);
      DB.Customers.remove(id);
      _showToast(`🗑 Customer "${c?.name || ''}" deleted`, 'info');
      _renderTable();
    } else {
      btn.dataset.confirming = '1';
      btn.classList.add('action-delete-confirming');
      btn.innerHTML = `${IC.trash} Confirm?`;
      setTimeout(() => {
        delete btn.dataset.confirming;
        btn.classList.remove('action-delete-confirming');
        btn.innerHTML = IC.trash;
      }, 3000);
    }
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
            <h1>👥 Customer Management</h1>
            <p>Sree Vel Murugan Hardware &amp; Tiles</p>
          </div>
        </div>
        <div class="prod-header-right">
          <span class="prod-count-pill" id="cust-count-pill">— customers</span>
          <button class="btn-add-product" id="btn-add-customer">
            ${IC.plus} Add Customer
          </button>
        </div>
      </div>

      <!-- STATS BAR -->
      <div class="prod-stats-bar" style="grid-template-columns: repeat(4, 1fr)">
        <div class="prod-stat-item">
          <span class="stat-num" id="stat-total-cust">—</span> Total Customers
        </div>
        <div class="prod-stat-item stat-ok">
          <span class="stat-num" id="stat-total-rev">—</span> Total Revenue
        </div>
        <div class="prod-stat-item">
          <span class="stat-num" id="stat-registered">—</span> Registered Clients
        </div>
        <div class="prod-stat-item stat-low">
          <span class="stat-num" id="stat-walkins">—</span> Walk-in Bills
        </div>
      </div>

      <!-- TOOLBAR -->
      <div class="prod-toolbar">
        <div class="prod-search-wrap" style="width:400px">
          ${IC.search}
          <input id="cust-search-input" class="prod-search-input" type="text"
            placeholder="Search by customer name, phone number, address..." autocomplete="off" />
          <button class="clear-search-btn" id="btn-clear-cust-search" style="display:none">✕</button>
        </div>
        <div class="prod-toolbar-right">
          <span class="prod-filter-label" id="cust-result-label"></span>
        </div>
      </div>

      <!-- TABLE CARD -->
      <div class="prod-table-card">
        <div class="prod-table-wrap">
          <table class="prod-table">
            <thead>
              <tr>
                <th>Customer Name</th>
                <th>Phone Number</th>
                <th class="th-center">Total Bills</th>
                <th class="th-right">Total Amount</th>
                <th class="th-center">Last Purchase</th>
                <th class="th-center">Actions</th>
              </tr>
            </thead>
            <tbody id="cust-table-body">
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

    container.innerHTML = '';
    container.style.padding  = '0';
    container.style.overflow = 'hidden';

    const page = document.createElement('div');
    page.className = 'products-page';
    page.innerHTML = _buildHTML();
    container.appendChild(page);

    _$('btn-add-customer')?.addEventListener('click', () => _openCustomerModal(null));

    const sinp = _$('cust-search-input');
    const sclr = _$('btn-clear-cust-search');

    sinp?.addEventListener('input', (e) => {
      _searchQuery = e.target.value;
      if (sclr) sclr.style.display = _searchQuery ? '' : 'none';
      _renderTable();
    });

    sclr?.addEventListener('click', () => {
      if (sinp) { sinp.value = ''; sinp.focus(); }
      _searchQuery = ''; if (sclr) sclr.style.display = 'none';
      _renderTable();
    });

    _renderTable();
    setTimeout(() => sinp?.focus(), 80);
  }

  return { render };
})();
