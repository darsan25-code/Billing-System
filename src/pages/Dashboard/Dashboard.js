/**
 * Dashboard.js – Instant Production-Ready Dashboard & Invoices Management
 *
 * Requirements:
 *   • Event Re-registration: initializeDashboardEvents() called automatically after every UI refresh.
 *   • Full event binding with stopPropagation to prevent event conflicts.
 *   • Debug logs: "Delete clicked", "Restore clicked", "Payment updated", "Database updated".
 *   • Pure DOM refresh without page reload.
 *
 * Project: Sree Vel Murugan Hardware and Tiles – Billing System
 */

const DashboardPage = (() => {

  /* ── State ───────────────────────────────────────────────────── */
  let _searchQuery = '';
  let _dateFilter  = 'all'; // 'all' | 'today' | 'yesterday' | 'week' | 'month' | 'custom'
  let _customStart = '';
  let _customEnd   = '';
  let _viewTab     = 'active'; // 'active' | 'trash'

  /* ── Helpers ─────────────────────────────────────────────────── */
  const fmtINR = (n) =>
    '₹\u00a0' + Math.round(n || 0).toLocaleString('en-IN');

  const fmtDate = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const todayFull = () => new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const _esc = (s) => String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const _todayISO = () => new Date().toISOString().split('T')[0];
  const _yesterdayISO = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  };

  /* ── SVG icons ──────────────────────────────────────────────── */
  const IC = {
    refresh: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>`,
    plus:    `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
    users:   `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    box:     `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>`,
    chart:   `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
    eye:     `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
    print:   `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>`,
    trash:   `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>`,
    restore: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>`,
    search:  `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
    edit:    `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
  };

  /* ── Toast Feedback ─────────────────────────────────────────── */
  let _toastTimer = null;
  function _showUndoToast(billNo, onUndo) {
    let t = document.getElementById('dash-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'dash-toast';
      t.className = 'billing-toast';
      document.body.appendChild(t);
    }
    t.className = 'billing-toast billing-toast-info';
    t.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;width:100%">
        <span>🗑️ Bill <strong>${_esc(billNo)}</strong> moved to Trash.</span>
        <button id="toast-undo-btn" style="background:#f59e0b;color:#0f172a;border:none;padding:3px 10px;border-radius:4px;font-size:0.75rem;font-weight:800;cursor:pointer">
          Undo (10 seconds)
        </button>
      </div>`;
    clearTimeout(_toastTimer);
    requestAnimationFrame(() => t.classList.add('billing-toast-visible'));

    document.getElementById('toast-undo-btn')?.addEventListener('click', () => {
      t.classList.remove('billing-toast-visible');
      onUndo();
    });

    _toastTimer = setTimeout(() => t.classList.remove('billing-toast-visible'), 10000);
  }

  function _showToast(msg, type = 'info', ms = 3000) {
    let t = document.getElementById('dash-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'dash-toast';
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

  /* ── Delete Confirmation Modal ──────────────────────────────── */
  function _showDeleteConfirmation(billNo, customerName, amountStr, onConfirm) {
    const overlay = document.createElement('div');
    overlay.className = 'prod-modal-overlay';

    overlay.innerHTML = /* html */`
      <div class="prod-modal" role="dialog" aria-modal="true" style="max-width:440px">
        <div class="prod-modal-header" style="background:#7f1d1d">
          <h2>Delete Bill?</h2>
          <button class="modal-close-btn" id="del-modal-close">✕</button>
        </div>
        <div class="prod-modal-body" style="padding:24px;text-align:center">
          <div style="font-size:1.05rem;font-weight:700;color:#0f172a;margin-bottom:10px">
            Are you sure you want to delete bill <span style="font-family:monospace;color:#dc2626">${_esc(billNo)}</span>?
          </div>
          <div style="font-size:0.85rem;color:#64748b;line-height:1.5;margin-bottom:16px">
            Customer: <strong>${_esc(customerName || 'Walk-in Customer')}</strong><br>
            Amount: <strong>${amountStr}</strong>
          </div>
          <div style="font-size:0.78rem;background:#fef2f2;border:1px solid #fecaca;color:#991b1b;padding:8px 12px;border-radius:6px;font-weight:600">
            ⚠️ Bill will be moved to Trash Bin. Product stock will be automatically restored.
          </div>
        </div>
        <div class="prod-modal-footer" style="justify-content:center;gap:12px">
          <button class="modal-btn modal-btn-cancel" id="del-modal-cancel">Cancel</button>
          <button class="modal-btn" id="del-modal-confirm" style="background:#dc2626;color:#fff;display:inline-flex;align-items:center;gap:6px">
            <span id="del-btn-spinner" class="dash-spinner" style="display:none"></span>
            <span id="del-btn-text">Move to Trash</span>
          </button>
        </div>
      </div>`;

    document.body.appendChild(overlay);

    const closeFn = () => overlay.remove();
    document.getElementById('del-modal-close')?.addEventListener('click', closeFn);
    document.getElementById('del-modal-cancel')?.addEventListener('click', closeFn);

    const confirmBtn = document.getElementById('del-modal-confirm');
    confirmBtn?.addEventListener('click', () => {
      confirmBtn.disabled = true;
      document.getElementById('del-btn-spinner').style.display = 'inline-block';
      document.getElementById('del-btn-text').textContent = 'Deleting...';
      
      closeFn();
      onConfirm();
    });

    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeFn(); });
  }

  /* ── Permanent Delete Modal ─────────────────────────────────── */
  function _showPermanentDeleteModal(billNo, onConfirm) {
    const overlay = document.createElement('div');
    overlay.className = 'prod-modal-overlay';

    overlay.innerHTML = /* html */`
      <div class="prod-modal" role="dialog" aria-modal="true" style="max-width:440px">
        <div class="prod-modal-header" style="background:#7f1d1d">
          <h2>Delete permanently?</h2>
          <button class="modal-close-btn" id="perm-modal-close">✕</button>
        </div>
        <div class="prod-modal-body" style="padding:24px;text-align:center">
          <div style="font-size:1.05rem;font-weight:700;color:#0f172a;margin-bottom:10px">
            This bill <span style="font-family:monospace;color:#dc2626">${_esc(billNo)}</span> will be removed from Trash and cannot be restored.
          </div>
        </div>
        <div class="prod-modal-footer" style="justify-content:center;gap:12px">
          <button class="modal-btn modal-btn-cancel" id="perm-modal-cancel">Cancel</button>
          <button class="modal-btn" id="perm-modal-confirm" style="background:#dc2626;color:#fff;display:inline-flex;align-items:center;gap:6px">
            <span id="perm-btn-spinner" class="dash-spinner" style="display:none"></span>
            <span id="perm-btn-text">Delete permanently</span>
          </button>
        </div>
      </div>`;

    document.body.appendChild(overlay);

    const closeFn = () => overlay.remove();
    document.getElementById('perm-modal-close')?.addEventListener('click', closeFn);
    document.getElementById('perm-modal-cancel')?.addEventListener('click', closeFn);

    const confirmBtn = document.getElementById('perm-modal-confirm');
    confirmBtn?.addEventListener('click', () => {
      confirmBtn.disabled = true;
      const sp = document.getElementById('perm-btn-spinner');
      const tx = document.getElementById('perm-btn-text');
      if (sp) sp.style.display = 'inline-block';
      if (tx) tx.textContent = 'Deleting...';

      closeFn();
      onConfirm();
    });

    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeFn(); });
  }

  /* ── Edit Payment Method Modal ───────────────────────────────── */
  function _showEditPaymentModal(billNo, customerName, currentMode, onSave) {
    const overlay = document.createElement('div');
    overlay.className = 'prod-modal-overlay';

    overlay.innerHTML = /* html */`
      <div class="prod-modal" role="dialog" aria-modal="true" style="max-width:380px">
        <div class="prod-modal-header" style="background:#0f172a">
          <h2>💳 Edit Payment Method</h2>
          <button class="modal-close-btn" id="pay-modal-close">✕</button>
        </div>
        <div class="prod-modal-body" style="padding:20px">
          <div style="font-size:0.85rem;color:#475569;margin-bottom:12px">
            Bill No: <strong style="font-family:monospace;color:#0f172a">${_esc(billNo)}</strong><br>
            Customer: <strong>${_esc(customerName || 'Walk-in Customer')}</strong>
          </div>
          <div style="display:flex;flex-direction:column;gap:6px">
            <label style="font-size:0.75rem;font-weight:700;color:#64748b;text-transform:uppercase">Select New Payment Method</label>
            <select id="edit-pay-select" style="padding:8px 12px;border:1.5px solid #cbd5e1;border-radius:6px;font-size:0.9rem;font-weight:700;color:#0f172a">
              <option value="Cash" ${currentMode==='Cash'?'selected':''}>Cash</option>
              <option value="GPay" ${currentMode==='GPay'?'selected':''}>GPay</option>
              <option value="PhonePe" ${currentMode==='PhonePe'?'selected':''}>PhonePe</option>
              <option value="Card" ${currentMode==='Card'?'selected':''}>Card</option>
              <option value="Bank Transfer" ${currentMode==='Bank Transfer'?'selected':''}>Bank Transfer</option>
              <option value="Credit" ${currentMode==='Credit'?'selected':''}>Credit</option>
            </select>
          </div>
        </div>
        <div class="prod-modal-footer">
          <button class="modal-btn modal-btn-cancel" id="pay-modal-cancel">Cancel</button>
          <button class="modal-btn" id="pay-modal-save" style="background:#0f172a;color:#f59e0b">Update Payment</button>
        </div>
      </div>`;

    document.body.appendChild(overlay);

    const closeFn = () => overlay.remove();
    document.getElementById('pay-modal-close')?.addEventListener('click', closeFn);
    document.getElementById('pay-modal-cancel')?.addEventListener('click', closeFn);

    document.getElementById('pay-modal-save')?.addEventListener('click', () => {
      const newMode = document.getElementById('edit-pay-select')?.value || currentMode;
      closeFn();
      onSave(newMode);
    });

    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeFn(); });
  }

  /* ── Filter Bills by Search & Date Range ─────────────────────── */
  function _filterBills(bills) {
    let result = bills;

    const todayStr = _todayISO();
    if (_dateFilter === 'today') {
      result = result.filter(b => b.date === todayStr);
    } else if (_dateFilter === 'yesterday') {
      const yest = _yesterdayISO();
      result = result.filter(b => b.date === yest);
    } else if (_dateFilter === 'week') {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      result = result.filter(b => b.date >= weekAgo);
    } else if (_dateFilter === 'month') {
      const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      result = result.filter(b => b.date >= monthAgo);
    } else if (_dateFilter === 'custom') {
      result = result.filter(b => {
        const d = b.date || b.createdAt?.split('T')[0];
        if (_customStart && d < _customStart) return false;
        if (_customEnd   && d > _customEnd)   return false;
        return true;
      });
    }

    if (_searchQuery && _searchQuery.trim()) {
      const q = _searchQuery.toLowerCase().trim();
      result = result.filter(b => {
        const no   = (b.billNo || '').toLowerCase();
        const cust = (b.customerName || '').toLowerCase();
        const phone= (b.customerPhone || '').toLowerCase();
        const mode = (b.paymentMode || 'cash').toLowerCase();
        const date = (b.date || b.createdAt || '').toLowerCase();
        return no.includes(q) || cust.includes(q) || phone.includes(q) || mode.includes(q) || date.includes(q);
      });
    }

    return result;
  }

  /* ── Build HTML ─────────────────────────────────────────────── */
  function _buildHTML(s, bills, deletedBills) {
    const isTrash = (_viewTab === 'trash');
    const targetBills = isTrash ? deletedBills : bills;
    const filteredBills = _filterBills(targetBills);

    return /* html */`

      <!-- HEADER -->
      <div class="dash-header">
        <div class="dash-header-title">
          <h1>📊 Dashboard</h1>
          <span>Sree Vel Murugan Hardware &amp; Tiles</span>
        </div>
        <div class="dash-header-date">
          <div class="date-day">${todayFull()}</div>
          <div class="date-sub">Last refreshed at ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
        </div>
      </div>

      <div class="dash-body">

        <!-- STATS GRID -->
        <div class="stats-grid">

          <div class="stat-card stat-today-bills">
            <div class="stat-icon">🧾</div>
            <div class="stat-value" id="stat-today-bills">${s.todayBills}</div>
            <div class="stat-label">Today's Bills</div>
            <div class="stat-sub">Invoices created today</div>
          </div>

          <div class="stat-card stat-today-rev">
            <div class="stat-icon">💰</div>
            <div class="stat-value" id="stat-today-rev">${fmtINR(s.todayRevenue)}</div>
            <div class="stat-label">Today's Revenue</div>
            <div class="stat-sub">Grand totals · today</div>
          </div>

          <div class="stat-card stat-customers">
            <div class="stat-icon">👥</div>
            <div class="stat-value" id="stat-customers">${s.totalCustomers}</div>
            <div class="stat-label">Total Customers</div>
            <div class="stat-sub">Unique customers served</div>
          </div>

          <div class="stat-card stat-total-bills">
            <div class="stat-icon">📋</div>
            <div class="stat-value" id="stat-total-bills">${s.totalBills}</div>
            <div class="stat-label">All-time Bills</div>
            <div class="stat-sub">Total revenue: ${fmtINR(s.totalRevenue)}</div>
          </div>

        </div>

        <!-- QUICK ACTIONS -->
        <div>
          <div class="dash-section-hd">
            <h2>Quick Actions</h2>
          </div>
          <div class="quick-actions">
            <button class="qa-btn qa-btn-primary" id="qa-new-bill">
              ${IC.plus} New Bill
            </button>
            <button class="qa-btn qa-btn-secondary" id="qa-products">
              ${IC.box} Products
            </button>
            <button class="qa-btn qa-btn-secondary" id="qa-customers">
              ${IC.users} Customers
            </button>
            <button class="qa-btn qa-btn-secondary" id="qa-reports">
              ${IC.chart} Reports
            </button>
          </div>
        </div>

        <!-- RECENT BILLS WITH SEARCH & FILTERS -->
        <div>
          <div class="dash-section-hd">
            <div style="display:flex;align-items:center;gap:12px">
              <h2>Invoices History</h2>
              <div class="rpt-filter-buttons">
                <button class="rpt-filter-btn ${!isTrash?'active':''}" id="tab-active-bills">Active Bills (${bills.length})</button>
                <button class="rpt-filter-btn ${isTrash?'active':''}" id="tab-deleted-bills" style="color:${isTrash?'#f59e0b':'#ef4444'}">🗑️ Trash Bin (${deletedBills.length})</button>
              </div>
            </div>
            <div style="display:flex;gap:10px;align-items:center">
              <button class="dash-refresh-btn" id="btn-refresh-dash">
                ${IC.refresh} Refresh
              </button>
            </div>
          </div>

          <!-- SEARCH & DATE FILTER BAR -->
          <div class="recent-bills-card" style="margin-bottom:0;border-bottom-left-radius:0;border-bottom-right-radius:0;border-bottom:none">
            <div style="padding:12px 16px;background:#f8fafc;display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap">
              
              <!-- Multi-Search Input -->
              <div style="position:relative;flex:1;min-width:260px">
                <input type="text" id="dash-bill-search" placeholder="Search bill no, customer, phone, payment mode, date..."
                  value="${_esc(_searchQuery)}"
                  style="width:100%;padding:7px 12px 7px 32px;border-radius:6px;border:1.5px solid #cbd5e1;font-size:0.82rem" />
                <span style="position:absolute;left:10px;top:8px;color:#94a3b8">${IC.search}</span>
              </div>

              <!-- Date Filters Buttons -->
              <div style="display:flex;align-items:center;gap:6px">
                <span style="font-size:0.75rem;font-weight:700;color:#475569">Filter:</span>
                <button class="rpt-filter-btn ${_dateFilter==='all'?'active':''}" data-df="all">All</button>
                <button class="rpt-filter-btn ${_dateFilter==='today'?'active':''}" data-df="today">Today</button>
                <button class="rpt-filter-btn ${_dateFilter==='yesterday'?'active':''}" data-df="yesterday">Yesterday</button>
                <button class="rpt-filter-btn ${_dateFilter==='week'?'active':''}" data-df="week">7 Days</button>
                <button class="rpt-filter-btn ${_dateFilter==='month'?'active':''}" data-df="month">30 Days</button>
                <button class="rpt-filter-btn ${_dateFilter==='custom'?'active':''}" data-df="custom">Custom</button>
              </div>

            </div>

            <!-- Custom date range inputs -->
            <div id="dash-custom-range" style="display:${_dateFilter==='custom'?'flex':'none'};padding:8px 16px;background:#f1f5f9;border-top:1px solid #e2e8f0;align-items:center;gap:10px;font-size:0.78rem">
              <label>From: <input type="date" id="dash-start-date" value="${_customStart}" style="padding:3px 6px;border:1px solid #cbd5e1;border-radius:4px" /></label>
              <label>To: <input type="date" id="dash-end-date" value="${_customEnd}" style="padding:3px 6px;border:1px solid #cbd5e1;border-radius:4px" /></label>
              <button class="inv-btn inv-btn-print" id="btn-apply-dash-custom" style="padding:3px 8px;font-size:0.72rem">Apply</button>
            </div>
          </div>

          <div class="recent-bills-card" style="border-top-left-radius:0;border-top-right-radius:0">
            <div class="recent-bills-card-hd">
              <span>${isTrash ? 'Deleted Invoices (Trash Bin)' : 'Bill History'}</span>
              <span>Showing ${filteredBills.length} of ${targetBills.length} bill${targetBills.length !== 1 ? 's' : ''}</span>
            </div>

            ${filteredBills.length === 0 ? _emptyBillsHTML(isTrash) : _billsTableHTML(filteredBills, isTrash)}
          </div>
        </div>

      </div><!-- /dash-body -->
    `;
  }

  function _emptyBillsHTML(isTrash) {
    return `
      <div class="dash-empty">
        <div class="dash-empty-icon">${isTrash ? '🗑️' : '🧾'}</div>
        <p>${isTrash ? 'Trash bin is empty' : 'No bills found'}</p>
        <span>${_searchQuery ? 'Try clearing your search query.' : (isTrash ? 'Deleted bills will appear here.' : 'Create your first bill from the Billing page.')}</span>
        ${!isTrash ? `
        <button class="qa-btn qa-btn-primary" id="qa-empty-new-bill" style="margin-top:6px">
          ${IC.plus} Create First Bill
        </button>` : ''}
      </div>`;
  }

  function _billsTableHTML(bills, isTrash) {
    const rows = bills.map(b => {
      const dateFormatted = fmtDate(b.date || b.createdAt);
      const amount        = fmtINR(b.grandTotal);
      const custName      = (b.customerName || '').trim();
      const isWalkin      = !custName || custName.toLowerCase().includes('walk-in');
      const payMode       = b.paymentMode || b.paymentMethod || 'Cash';

      return `
        <tr class="dash-bill-row" data-bill-id="${_esc(b.id)}" data-bill-no="${_esc(b.billNo)}" data-cust-name="${_esc(custName)}" data-amount="${_esc(amount)}">
          <td><span class="bill-no-badge">${b.billNo || '—'}</span></td>
          <td>
            <div class="cust-name-cell">${_esc(isWalkin ? 'Walk-in Customer' : custName)}</div>
            ${b.customerPhone ? `<div class="cust-phone-cell">${_esc(b.customerPhone)}</div>` : ''}
          </td>
          <td class="date-cell td-center">${dateFormatted}</td>
          <td class="td-center">
            <span class="type-badge btn-edit-payment" data-id="${_esc(b.id)}" data-no="${_esc(b.billNo)}" data-cust="${_esc(custName)}" data-mode="${_esc(payMode)}" title="Click to edit payment method" style="background:#f1f5f9;color:#0f172a;border:1px solid #cbd5e1;font-weight:700;cursor:pointer">
              ${_esc(payMode)} <span style="font-size:0.65rem;opacity:0.6">✏️</span>
            </span>
          </td>
          <td class="td-right amount-cell">${amount}</td>
          <td class="td-center">
            <div class="dash-actions-group">
              <button class="dash-btn-action btn-dash-view" data-no="${_esc(b.billNo)}" title="View Invoice">
                ${IC.eye} View
              </button>
              ${!isTrash ? `
              <button class="dash-btn-action btn-dash-edit" data-no="${_esc(b.billNo)}" title="Edit Bill">
                ${IC.edit} Edit
              </button>` : ''}
              <button class="dash-btn-action btn-dash-print" data-no="${_esc(b.billNo)}" title="Print Invoice">
                ${IC.print} Print
              </button>
              ${!isTrash ? `
              <button class="dash-btn-action btn-dash-delete delete-btn" data-id="${_esc(b.id)}" data-no="${_esc(b.billNo)}" data-cust="${_esc(custName)}" data-amount="${_esc(amount)}" title="Delete Invoice">
                ${IC.trash} Delete
              </button>` : `
              <button class="dash-btn-action btn-dash-restore" data-id="${_esc(b.id)}" data-no="${_esc(b.billNo)}" title="Restore Invoice" style="background:#f0fdf4;color:#166534;border-color:#bbf7d0">
                ${IC.restore} Restore
              </button>
              <button class="dash-btn-action btn-dash-perm-delete delete-btn" data-id="${_esc(b.id)}" data-no="${_esc(b.billNo)}" title="Delete Permanently" style="background:#fee2e2;color:#dc2626">
                ✕ Permanently
              </button>`}
            </div>
          </td>
        </tr>`;
    }).join('');

    return `
      <table class="bills-table">
        <thead>
          <tr>
            <th>Bill number</th>
            <th>Customer</th>
            <th class="th-center">Date</th>
            <th class="th-center">Payment mode</th>
            <th class="th-right">Amount</th>
            <th class="th-center">Actions</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`;
  }

  /* ── Event Re-Registration Engine ────────────────────────────── */
  function initializeDashboardEvents(page, container) {
    const navigate = (hash) => (window.location.hash = hash);

    document.getElementById('qa-new-bill')?.addEventListener('click',       () => navigate('billing'));
    document.getElementById('qa-products')?.addEventListener('click',       () => navigate('products'));
    document.getElementById('qa-customers')?.addEventListener('click',      () => navigate('customers'));
    document.getElementById('qa-reports')?.addEventListener('click',        () => navigate('reports'));
    document.getElementById('qa-empty-new-bill')?.addEventListener('click', () => navigate('billing'));

    document.getElementById('btn-refresh-dash')?.addEventListener('click', () => render(container));

    /* View Tab Toggle (Active vs Trash) */
    document.getElementById('tab-active-bills')?.addEventListener('click', () => {
      _viewTab = 'active';
      render(container);
    });

    document.getElementById('tab-deleted-bills')?.addEventListener('click', () => {
      _viewTab = 'trash';
      render(container);
    });

    /* Date Filter Buttons */
    page.querySelectorAll('.rpt-filter-btn[data-df]').forEach(btn => {
      btn.addEventListener('click', () => {
        _dateFilter = btn.dataset.df;
        render(container);
      });
    });

    document.getElementById('btn-apply-dash-custom')?.addEventListener('click', () => {
      _customStart = document.getElementById('dash-start-date')?.value || '';
      _customEnd   = document.getElementById('dash-end-date')?.value   || '';
      render(container);
    });

    /* Search Input Event */
    const searchInp = document.getElementById('dash-bill-search');
    if (searchInp) {
      searchInp.addEventListener('input', (e) => {
        _searchQuery = e.target.value;
        render(container);
      });
    }

    /* Edit Payment Method Handlers */
    page.querySelectorAll('.btn-edit-payment').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id       = btn.dataset.id;
        const no       = btn.dataset.no;
        const cust     = btn.dataset.cust;
        const curMode  = btn.dataset.mode;

        _showEditPaymentModal(no, cust, curMode, (newMode) => {
          console.log("Payment updated");
          if (typeof DB !== 'undefined') {
            const res = DB.updateBillPaymentMode(id, newMode);
            if (res.success) {
              console.log("Database updated");
              _showToast('✅ Payment method updated', 'success', 2800);
              render(container);
            }
          }
        });
      });
    });

    /* View & Print & Edit handlers */
    page.querySelectorAll('.btn-dash-edit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const no = btn.dataset.no;
        if (no) {
          localStorage.setItem('editingInvoiceId', no);
        }
        window.location.hash = 'billing';
      });
    });

    page.querySelectorAll('.btn-dash-view').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const no = btn.dataset.no;
        if (typeof InvoicePreview !== 'undefined') InvoicePreview.show(no);
      });
    });

    page.querySelectorAll('.btn-dash-print').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const no = btn.dataset.no;
        if (typeof InvoicePreview !== 'undefined') {
          InvoicePreview.show(no);
          setTimeout(() => window.print(), 300);
        }
      });
    });

    /* Event Delegation for Delete Buttons */
    page.addEventListener('click', (e) => {
      const btn = e.target.closest('.delete-btn, .btn-dash-delete');
      if (!btn) return;
      e.stopPropagation();

      const id     = btn.dataset.id;
      const no     = btn.dataset.no || id;
      const cust   = btn.dataset.cust || '';
      const amount = btn.dataset.amount || '';
      const row    = btn.closest('.dash-bill-row');

      if (btn.classList.contains('btn-dash-perm-delete')) return; // handled separately below

      _showDeleteConfirmation(no, cust, amount, () => {
        if (typeof DB !== 'undefined') {
          const res = DB.deleteBill(id);
          if (res && res.success) {
            if (row && row.parentNode) row.remove();

            const newStats = DB.stats();
            const elBills = document.getElementById('stat-today-bills');
            const elRev   = document.getElementById('stat-today-rev');
            const elCust  = document.getElementById('stat-customers');
            const elTot   = document.getElementById('stat-total-bills');

            if (elBills) elBills.textContent = newStats.todayBills;
            if (elRev)   elRev.textContent   = fmtINR(newStats.todayRevenue);
            if (elCust)  elCust.textContent  = newStats.totalCustomers;
            if (elTot)   elTot.textContent   = newStats.totalBills;

            _showToast('🗑️ Bill deleted successfully', 'success', 3200);
          }
        }
      });
    });

    /* Restore Action */
    page.querySelectorAll('.btn-dash-restore').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        console.log("Restore clicked");
        const id = btn.dataset.id;
        if (typeof DB !== 'undefined') {
          const res = DB.restoreBill(id);
          if (res.success) {
            console.log("Database updated");
            _showToast(`Bill ${res.bill.billNo} restored successfully.`, 'success', 3200);
            render(container);
          }
        }
      });
    });

    /* Permanent Delete Action */
    page.querySelectorAll('.btn-dash-perm-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        console.log("Delete clicked");
        const id = btn.dataset.id;
        const no = btn.dataset.no;

        _showPermanentDeleteModal(no, () => {
          if (typeof DB !== 'undefined') {
            const res = DB.permanentlyDeleteBill(id);
            if (res.success) {
              console.log("Database updated");
              _showToast('✅ Bill permanently deleted', 'success', 3200);
              render(container);
            }
          }
        });
      });
    });
  }

  /* ── Render ─────────────────────────────────────────────────── */
  function render(container) {

    if (!document.getElementById('dashboard-css')) {
      const lnk = document.createElement('link');
      lnk.id  = 'dashboard-css';
      lnk.rel = 'stylesheet';
      lnk.href = 'src/pages/Dashboard/Dashboard.css';
      document.head.appendChild(lnk);
    }

    if (typeof DB !== 'undefined') DB.init();

    const s            = (typeof DB !== 'undefined') ? DB.stats()         : { todayBills:0, todayRevenue:0, totalCustomers:0, totalBills:0, totalRevenue:0 };
    const bills        = (typeof DB !== 'undefined') ? DB.Bills.all()     : [];
    const deletedBills = (typeof DB !== 'undefined') ? DB.Bills.deleted() : [];

    container.innerHTML   = '';
    container.style.padding  = '0';
    container.style.overflow = 'hidden';

    const page = document.createElement('div');
    page.className = 'dashboard-page';
    page.innerHTML = _buildHTML(s, bills, deletedBills);
    container.appendChild(page);

    /* Automatically initialize dashboard events on every UI render */
    initializeDashboardEvents(page, container);
  }

  return { render, initializeDashboardEvents };

})();
