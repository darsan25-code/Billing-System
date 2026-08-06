/**
 * Reports.js – Complete Reports & Business Analytics Page
 *
 * Features:
 *   • 6 Top Business Cards: Today's Sales, Weekly Sales, Monthly Sales, Total Customers, Total Products, Total Bills
 *   • Interactive Date Filters: Today, Week, Month, Custom Date Range (Start/End Date)
 *   • 4 Visual Analytics Charts:
 *       1. Daily Revenue Chart (7-day bar breakdown)
 *       2. Weekly Sales Chart (4-week breakdown)
 *       3. Monthly Revenue Chart (6-month trend breakdown)
 *       4. Top-selling Products (ranked by units sold & revenue)
 *   • 4 Comprehensive Tabbed Reports:
 *       1. GST Tax Report (0%, 5%, 12%, 18%, 28% slabs with CGST/SGST)
 *       2. Customer Sales Report
 *       3. Product Sales Report
 *       4. Payment Mode Report (Cash, GPay, PhonePe, Card, Bank Transfer)
 *   • Export Options (Export Excel/CSV file, Export PDF / Print Report)
 *
 * Project: Sree Vel Murugan Hardware and Tiles – Billing System
 */

const ReportsPage = (() => {

  /* ── State ───────────────────────────────────────────────────── */
  let _activeReportTab = 'gst';      // 'gst' | 'customer' | 'product' | 'payment'
  let _dateFilterRange = 'month';    // 'today' | 'week' | 'month' | 'custom'
  let _startDateCustom = '';
  let _endDateCustom   = '';

  /* ── SVG Icons ──────────────────────────────────────────────── */
  const IC = {
    chart:   `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
    download:`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
    print:   `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>`,
    filter:  `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>`,
  };

  /* ── Helpers ─────────────────────────────────────────────────── */
  const _$ = (id) => document.getElementById(id);
  const _esc = (s) => String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const fmtINR = (n) => '₹\u00a0' + Math.round(n || 0).toLocaleString('en-IN');
  const _todayISO = () => new Date().toISOString().split('T')[0];

  /* ── Toast ──────────────────────────────────────────────────── */
  let _toastTimer = null;
  function _showToast(msg, type = 'info', ms = 2400) {
    let t = document.getElementById('rpt-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'rpt-toast';
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

  /* ══════════════════════════════════════════════════════════════
     CSV EXPORTER
     ══════════════════════════════════════════════════════════════ */
  function _exportCSV(filename, rows) {
    if (!rows || rows.length === 0) return;
    const processRow = (row) => row.map(val => {
      let result = val === null || val === undefined ? '' : val.toString();
      result = result.replace(/"/g, '""');
      if (result.search(/("|,|\n)/g) >= 0) result = `"${result}"`;
      return result;
    }).join(',');

    const csvContent = rows.map(processRow).join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    _showToast(`📥 Exported "${filename}"`, 'success');
  }

  /* ══════════════════════════════════════════════════════════════
     FILTER BILLS BY DATE RANGE
     ══════════════════════════════════════════════════════════════ */
  function _getFilteredBills() {
    const all = (typeof DB !== 'undefined') ? DB.Bills.all() : [];
    const todayStr = _todayISO();

    if (_dateFilterRange === 'today') {
      return all.filter(b => b.date === todayStr);
    } else if (_dateFilterRange === 'week') {
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      return all.filter(b => b.date >= weekAgo);
    } else if (_dateFilterRange === 'month') {
      const currentYM = todayStr.slice(0, 7);
      return all.filter(b => (b.date || '').startsWith(currentYM));
    } else if (_dateFilterRange === 'custom') {
      return all.filter(b => {
        const d = b.date || b.createdAt?.split('T')[0];
        if (_startDateCustom && d < _startDateCustom) return false;
        if (_endDateCustom   && d > _endDateCustom)   return false;
        return true;
      });
    }
    return all;
  }

  /* ══════════════════════════════════════════════════════════════
     CHARTS DATA BUILDERS
     ══════════════════════════════════════════════════════════════ */
  function _getDailySalesData() {
    const bills = _getFilteredBills();
    const days = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = d.toISOString().split('T')[0];
      const label   = d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' });
      const rev     = bills.filter(b => b.date === dateStr).reduce((s, b) => s + (b.grandTotal || 0), 0);
      days.push({ label, rev });
    }
    return days;
  }

  function _getWeeklySalesData() {
    const bills = (typeof DB !== 'undefined') ? DB.Bills.all() : [];
    const weeks = [];
    const now = new Date();
    for (let i = 3; i >= 0; i--) {
      const start = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const end   = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const label = `W${4 - i}`;
      const rev   = bills.filter(b => b.date >= start && b.date < end).reduce((s, b) => s + (b.grandTotal || 0), 0);
      weeks.push({ label, rev });
    }
    return weeks;
  }

  function _getMonthlyRevenueData() {
    const bills = (typeof DB !== 'undefined') ? DB.Bills.all() : [];
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ym = d.toISOString().slice(0, 7);
      const label = d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
      const rev = bills.filter(b => (b.date || '').startsWith(ym)).reduce((s, b) => s + (b.grandTotal || 0), 0);
      months.push({ label, rev });
    }
    return months;
  }

  function _getTopProducts() {
    const filteredBills = _getFilteredBills();
    const filteredBillIds = new Set(filteredBills.map(b => b.id));
    const allItems = (typeof DB !== 'undefined') ? DB._raw('bill_items') : [];
    const items = allItems.filter(i => filteredBillIds.has(i.billId));

    const map = {};
    items.forEach(i => {
      const name = i.productName || 'Unknown Product';
      if (!map[name]) map[name] = { name, qty: 0, rev: 0 };
      map[name].qty += parseFloat(i.qty) || 0;
      map[name].rev += parseFloat(i.rowTotal) || 0;
    });
    return Object.values(map).sort((a, b) => b.rev - a.rev).slice(0, 5);
  }

  /* ══════════════════════════════════════════════════════════════
     REPORTS TABLES RENDERERS
     ══════════════════════════════════════════════════════════════ */
  function _renderGstReport() {
    const filteredBills = _getFilteredBills();
    const filteredIds = new Set(filteredBills.map(b => b.id));
    const allItems = (typeof DB !== 'undefined') ? DB._raw('bill_items') : [];
    const items = allItems.filter(i => filteredIds.has(i.billId));

    const slabs = { 0: 0, 5: 0, 12: 0, 18: 0, 28: 0 };
    const taxableSlabs = { 0: 0, 5: 0, 12: 0, 18: 0, 28: 0 };

    items.forEach(i => {
      const rate = i.gstPct || 0;
      if (slabs[rate] !== undefined) {
        slabs[rate] += i.gstAmount || 0;
        taxableSlabs[rate] += i.taxableAmount || 0;
      }
    });

    const rows = [0, 5, 12, 18, 28].map(rate => {
      const tax     = slabs[rate] || 0;
      const taxable = taxableSlabs[rate] || 0;
      return `
        <tr>
          <td><strong>GST @ ${rate}%</strong></td>
          <td class="td-right">${fmtINR(taxable)}</td>
          <td class="td-right">${fmtINR(tax / 2)}</td>
          <td class="td-right">${fmtINR(tax / 2)}</td>
          <td class="td-right font-bold" style="color:#f59e0b">${fmtINR(tax)}</td>
        </tr>`;
    }).join('');

    const totalTaxable = Object.values(taxableSlabs).reduce((a,b)=>a+b,0);
    const totalGst     = Object.values(slabs).reduce((a,b)=>a+b,0);

    return /* html */`
      <table class="rpt-table">
        <thead>
          <tr>
            <th>Tax Slab</th>
            <th class="th-right">Taxable Value</th>
            <th class="th-right">CGST</th>
            <th class="th-right">SGST</th>
            <th class="th-right">Total GST Amount</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
          <tr class="rpt-total-row">
            <td><strong>TOTAL SUMMARY</strong></td>
            <td class="td-right">${fmtINR(totalTaxable)}</td>
            <td class="td-right">${fmtINR(totalGst / 2)}</td>
            <td class="td-right">${fmtINR(totalGst / 2)}</td>
            <td class="td-right font-bold">${fmtINR(totalGst)}</td>
          </tr>
        </tbody>
      </table>`;
  }

  function _renderCustomerReport() {
    const customers = (typeof DB !== 'undefined') ? DB.Customers.all() : [];
    if (customers.length === 0) return `<div class="rpt-empty">No customer records found.</div>`;

    const rows = customers.sort((a,b)=>(b.totalAmount||0)-(a.totalAmount||0)).map((c, i) => `
      <tr>
        <td class="td-center">${i + 1}</td>
        <td><strong>${_esc(c.name)}</strong></td>
        <td>${_esc(c.phone || '—')}</td>
        <td class="td-center"><span class="bills-count-badge">${c.totalBills || 0}</span></td>
        <td class="td-right font-bold">${fmtINR(c.totalAmount)}</td>
        <td class="td-center">${c.lastPurchaseDate || '—'}</td>
      </tr>
    `).join('');

    return /* html */`
      <table class="rpt-table">
        <thead>
          <tr>
            <th class="th-center">#</th>
            <th>Customer Name</th>
            <th>Phone</th>
            <th class="th-center">Bills Count</th>
            <th class="th-right">Total Spend</th>
            <th class="th-center">Last Purchase</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`;
  }

  function _renderProductReport() {
    const products = (typeof DB !== 'undefined') ? DB.Products.all() : [];
    const filteredBills = _getFilteredBills();
    const filteredIds = new Set(filteredBills.map(b => b.id));
    const allItems = (typeof DB !== 'undefined') ? DB._raw('bill_items') : [];
    const items = allItems.filter(i => filteredIds.has(i.billId));

    const statsMap = {};
    items.forEach(i => {
      const name = i.productName || 'Unknown';
      if (!statsMap[name]) statsMap[name] = { qty: 0, rev: 0 };
      statsMap[name].qty += parseFloat(i.qty) || 0;
      statsMap[name].rev += parseFloat(i.rowTotal) || 0;
    });

    const rows = products.map(p => {
      const s = statsMap[p.name] || { qty: 0, rev: 0 };
      return `
        <tr>
          <td><span class="prod-code-chip">${_esc(p.id)}</span></td>
          <td><strong>${_esc(p.name)}</strong></td>
          <td>${_esc(p.category || '—')}</td>
          <td class="td-right">₹&nbsp;${(p.rate || 0).toLocaleString('en-IN')}</td>
          <td class="td-center font-bold">${p.stock || 0} ${p.unit}</td>
          <td class="td-center">${s.qty} ${p.unit}</td>
          <td class="td-right font-bold" style="color:#0f172a">${fmtINR(s.rev)}</td>
        </tr>`;
    }).join('');

    return /* html */`
      <table class="rpt-table">
        <thead>
          <tr>
            <th>Code</th>
            <th>Product Name</th>
            <th>Category</th>
            <th class="th-right">Selling Rate</th>
            <th class="th-center">Stock Left</th>
            <th class="th-center">Qty Sold</th>
            <th class="th-right">Revenue Generated</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`;
  }

  function _renderPaymentModeReport() {
    const bills = _getFilteredBills();
    const modes = ['Cash', 'GPay', 'PhonePe', 'Card', 'Bank Transfer', 'Credit'];
    const modeStats = {};
    modes.forEach(m => modeStats[m] = { count: 0, total: 0 });

    bills.forEach(b => {
      const m = b.paymentMode || 'Cash';
      if (!modeStats[m]) modeStats[m] = { count: 0, total: 0 };
      modeStats[m].count += 1;
      modeStats[m].total += (b.grandTotal || 0);
    });

    const grandRev = bills.reduce((s, b) => s + (b.grandTotal || 0), 0);

    const rows = modes.map(m => {
      const st = modeStats[m];
      const pct = grandRev > 0 ? Math.round((st.total / grandRev) * 100) : 0;
      return `
        <tr>
          <td><strong>Payment Mode: ${m}</strong></td>
          <td class="td-center"><span class="bills-count-badge">${st.count}</span></td>
          <td class="td-right font-bold">${fmtINR(st.total)}</td>
          <td class="td-center">
            <div style="display:flex;align-items:center;justify-content:center;gap:6px">
              <div style="width:80px;height:8px;background:#e2e8f0;border-radius:4px;overflow:hidden">
                <div style="width:${pct}%;height:100%;background:#0f172a"></div>
              </div>
              <span style="font-size:0.75rem;font-weight:700">${pct}%</span>
            </div>
          </td>
        </tr>`;
    }).join('');

    return /* html */`
      <table class="rpt-table">
        <thead>
          <tr>
            <th>Payment Mode</th>
            <th class="th-center">Total Invoices</th>
            <th class="th-right">Total Revenue</th>
            <th class="th-center">Share (%)</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
          <tr class="rpt-total-row">
            <td><strong>TOTAL SUMMARY</strong></td>
            <td class="td-center">${bills.length}</td>
            <td class="td-right font-bold">${fmtINR(grandRev)}</td>
            <td class="td-center"><strong>100%</strong></td>
          </tr>
        </tbody>
      </table>`;
  }

  /* ══════════════════════════════════════════════════════════════
     HTML BUILDER
     ══════════════════════════════════════════════════════════════ */
  function _buildHTML() {
    const s        = (typeof DB !== 'undefined') ? DB.stats() : { todayBills:0, todayRevenue:0, totalCustomers:0, totalBills:0, totalRevenue:0, totalProducts:0 };
    const weekly   = (typeof DB !== 'undefined') ? DB.Bills.weeklyRevenue()  : 0;
    const monthly  = (typeof DB !== 'undefined') ? DB.Bills.monthlyRevenue() : 0;
    const prodCnt  = (typeof DB !== 'undefined') ? DB.Products.count() : 0;

    const daily        = _getDailySalesData();
    const maxDaily     = Math.max(...daily.map(d => d.rev), 1000);

    const weeklySales  = _getWeeklySalesData();
    const maxWeekly    = Math.max(...weeklySales.map(w => w.rev), 1000);

    const monthlyTrend = _getMonthlyRevenueData();
    const maxMonthly   = Math.max(...monthlyTrend.map(m => m.rev), 1000);

    const topProds = _getTopProducts();

    return /* html */`
      <!-- HEADER BAR -->
      <div class="prod-header-bar print-hide">
        <div class="prod-header-left">
          <div class="prod-header-title">
            <h1>📊 Sales Reports &amp; Analytics</h1>
            <p>Sree Vel Murugan Hardware &amp; Tiles</p>
          </div>
        </div>
        <div class="prod-header-right">
          <button class="inv-btn inv-btn-pdf" id="btn-export-excel">
            ${IC.download} Export Excel (CSV)
          </button>
          <button class="inv-btn inv-btn-print" id="btn-print-report">
            ${IC.print} Print Report
          </button>
        </div>
      </div>

      <div class="rpt-body">

        <!-- 6 TOP STAT CARDS -->
        <div class="rpt-stats-grid print-hide" style="grid-template-columns: repeat(6, 1fr)">
          <div class="rpt-card">
            <div class="rpt-card-icon">💰</div>
            <div class="rpt-card-val">${fmtINR(s.todayRevenue)}</div>
            <div class="rpt-card-lbl">Today's Sales</div>
          </div>
          <div class="rpt-card">
            <div class="rpt-card-icon">📅</div>
            <div class="rpt-card-val">${fmtINR(weekly)}</div>
            <div class="rpt-card-lbl">Weekly Sales</div>
          </div>
          <div class="rpt-card">
            <div class="rpt-card-icon">📈</div>
            <div class="rpt-card-val">${fmtINR(monthly)}</div>
            <div class="rpt-card-lbl">Monthly Sales</div>
          </div>
          <div class="rpt-card">
            <div class="rpt-card-icon">👥</div>
            <div class="rpt-card-val">${s.totalCustomers}</div>
            <div class="rpt-card-lbl">Total Customers</div>
          </div>
          <div class="rpt-card">
            <div class="rpt-card-icon">📦</div>
            <div class="rpt-card-val">${prodCnt}</div>
            <div class="rpt-card-lbl">Total Products</div>
          </div>
          <div class="rpt-card">
            <div class="rpt-card-icon">🧾</div>
            <div class="rpt-card-val">${s.totalBills}</div>
            <div class="rpt-card-lbl">Total Bills</div>
          </div>
        </div>

        <!-- DATE RANGE FILTERS BAR -->
        <div class="rpt-filter-bar print-hide">
          <div class="rpt-filter-label">${IC.filter} Filter Range:</div>
          <div class="rpt-filter-buttons">
            <button class="rpt-filter-btn ${_dateFilterRange==='today'?'active':''}" data-range="today">Today</button>
            <button class="rpt-filter-btn ${_dateFilterRange==='week'?'active':''}" data-range="week">Week</button>
            <button class="rpt-filter-btn ${_dateFilterRange==='month'?'active':''}" data-range="month">Month</button>
            <button class="rpt-filter-btn ${_dateFilterRange==='custom'?'active':''}" data-range="custom">Custom Date Range</button>
          </div>
          <div class="rpt-custom-range-inputs" id="custom-range-inputs" style="display:${_dateFilterRange==='custom'?'flex':'none'}">
            <label>From: <input type="date" id="rpt-start-date" value="${_startDateCustom}" /></label>
            <label>To: <input type="date" id="rpt-end-date" value="${_endDateCustom}" /></label>
            <button class="inv-btn inv-btn-print" id="btn-apply-custom-dates" style="padding:4px 10px;font-size:0.75rem">Apply Filter</button>
          </div>
        </div>

        <!-- 4 CHARTS SECTION -->
        <div class="rpt-charts-row print-hide" style="grid-template-columns: 1fr 1fr">

          <!-- 1. Daily Revenue Chart -->
          <div class="rpt-chart-box">
            <div class="rpt-chart-hd">
              <span>📊 Daily Revenue Chart (7 Days)</span>
            </div>
            <div class="bar-chart-container">
              ${daily.map(d => {
                const pct = Math.max(8, Math.round((d.rev / maxDaily) * 100));
                return `
                  <div class="bar-col">
                    <div class="bar-val">${d.rev > 0 ? '₹' + Math.round(d.rev/1000) + 'k' : ''}</div>
                    <div class="bar-fill-wrap">
                      <div class="bar-fill" style="height:${pct}%" title="${d.label}: ${fmtINR(d.rev)}"></div>
                    </div>
                    <div class="bar-lbl">${d.label}</div>
                  </div>`;
              }).join('')}
            </div>
          </div>

          <!-- 2. Weekly Sales Chart -->
          <div class="rpt-chart-box">
            <div class="rpt-chart-hd">
              <span>📅 Weekly Sales Chart (4 Weeks)</span>
            </div>
            <div class="bar-chart-container">
              ${weeklySales.map(w => {
                const pct = Math.max(8, Math.round((w.rev / maxWeekly) * 100));
                return `
                  <div class="bar-col">
                    <div class="bar-val">${w.rev > 0 ? '₹' + Math.round(w.rev/1000) + 'k' : ''}</div>
                    <div class="bar-fill-wrap">
                      <div class="bar-fill" style="height:${pct}%;background:linear-gradient(180deg, #10b981 0%, #059669 100%)" title="${w.label}: ${fmtINR(w.rev)}"></div>
                    </div>
                    <div class="bar-lbl">${w.label}</div>
                  </div>`;
              }).join('')}
            </div>
          </div>

          <!-- 3. Monthly Revenue Chart -->
          <div class="rpt-chart-box">
            <div class="rpt-chart-hd">
              <span>📈 Monthly Revenue Chart (6 Months)</span>
            </div>
            <div class="bar-chart-container">
              ${monthlyTrend.map(m => {
                const pct = Math.max(8, Math.round((m.rev / maxMonthly) * 100));
                return `
                  <div class="bar-col">
                    <div class="bar-val">${m.rev > 0 ? '₹' + Math.round(m.rev/1000) + 'k' : ''}</div>
                    <div class="bar-fill-wrap">
                      <div class="bar-fill" style="height:${pct}%;background:linear-gradient(180deg, #3b82f6 0%, #1d4ed8 100%)" title="${m.label}: ${fmtINR(m.rev)}"></div>
                    </div>
                    <div class="bar-lbl">${m.label}</div>
                  </div>`;
              }).join('')}
            </div>
          </div>

          <!-- 4. Top Selling Products -->
          <div class="rpt-chart-box">
            <div class="rpt-chart-hd">
              <span>🏆 Top-Selling Products</span>
            </div>
            <div class="top-prods-list">
              ${topProds.length === 0 ? '<div class="rpt-empty">No products sold in selected range</div>' :
                topProds.map((p, idx) => `
                  <div class="top-prod-item">
                    <div class="tp-rank">#${idx+1}</div>
                    <div class="tp-info">
                      <div class="tp-name">${_esc(p.name)}</div>
                      <div class="tp-sub">${p.qty} units sold</div>
                    </div>
                    <div class="tp-rev">${fmtINR(p.rev)}</div>
                  </div>
                `).join('')}
            </div>
          </div>

        </div><!-- /charts-row -->

        <!-- 4 TABBED REPORTS SECTION -->
        <div class="rpt-table-card">
          <div class="rpt-tabs-header print-hide">
            <button class="rpt-tab-btn ${_activeReportTab==='gst'?'active':''}" data-tab="gst">GST Report</button>
            <button class="rpt-tab-btn ${_activeReportTab==='customer'?'active':''}" data-tab="customer">Customer Report</button>
            <button class="rpt-tab-btn ${_activeReportTab==='product'?'active':''}" data-tab="product">Product Sales Report</button>
            <button class="rpt-tab-btn ${_activeReportTab==='payment'?'active':''}" data-tab="payment">Payment Mode Report</button>
          </div>

          <div class="rpt-tab-content" id="rpt-tab-content">
            ${_renderTabContent()}
          </div>
        </div>

      </div><!-- /rpt-body -->
    `;
  }

  function _renderTabContent() {
    if (_activeReportTab === 'gst')      return _renderGstReport();
    if (_activeReportTab === 'customer') return _renderCustomerReport();
    if (_activeReportTab === 'product')  return _renderProductReport();
    if (_activeReportTab === 'payment')  return _renderPaymentModeReport();
    return '';
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
    _activeReportTab = 'gst';
    _dateFilterRange = 'month';

    container.innerHTML = '';
    container.style.padding  = '0';
    container.style.overflow = 'hidden';

    const page = document.createElement('div');
    page.className = 'products-page';
    page.innerHTML = _buildHTML();
    container.appendChild(page);

    /* Filter range buttons */
    page.querySelectorAll('.rpt-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        _dateFilterRange = btn.dataset.range;
        const customInputs = _$('custom-range-inputs');
        if (customInputs) customInputs.style.display = (_dateFilterRange === 'custom') ? 'flex' : 'none';

        page.querySelectorAll('.rpt-filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        if (_dateFilterRange !== 'custom') {
          const cnt = _$('rpt-tab-content');
          if (cnt) cnt.innerHTML = _renderTabContent();
          render(container); // Re-render charts & tables
        }
      });
    });

    _$('btn-apply-custom-dates')?.addEventListener('click', () => {
      _startDateCustom = _$('rpt-start-date')?.value || '';
      _endDateCustom   = _$('rpt-end-date')?.value   || '';
      render(container);
      _showToast('Filtered by custom date range', 'info');
    });

    /* Tab Switcher */
    page.querySelectorAll('.rpt-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        page.querySelectorAll('.rpt-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        _activeReportTab = btn.dataset.tab;
        const cnt = _$('rpt-tab-content');
        if (cnt) cnt.innerHTML = _renderTabContent();
      });
    });

    /* Export Excel (CSV) */
    _$('btn-export-excel')?.addEventListener('click', () => {
      if (_activeReportTab === 'gst') {
        const filteredBills = _getFilteredBills();
        const filteredIds = new Set(filteredBills.map(b => b.id));
        const items = (typeof DB !== 'undefined') ? DB._raw('bill_items').filter(i => filteredIds.has(i.billId)) : [];
        const slabs = { 0: 0, 5: 0, 12: 0, 18: 0, 28: 0 };
        const taxableSlabs = { 0: 0, 5: 0, 12: 0, 18: 0, 28: 0 };
        items.forEach(i => {
          const rate = i.gstPct || 0;
          if (slabs[rate] !== undefined) {
            slabs[rate] += i.gstAmount || 0;
            taxableSlabs[rate] += i.taxableAmount || 0;
          }
        });
        const rows = [['Tax Slab', 'Taxable Value', 'CGST', 'SGST', 'Total GST Amount']];
        [0, 5, 12, 18, 28].forEach(r => {
          const tax = slabs[r] || 0;
          rows.push([`GST @ ${r}%`, taxableSlabs[r] || 0, tax/2, tax/2, tax]);
        });
        const dateSuffix = new Date().toISOString().split('T')[0].replace(/-/g, '_');
        _exportCSV(`report_gst_${dateSuffix}.csv`, rows);
      } else if (_activeReportTab === 'customer') {
        const custs = (typeof DB !== 'undefined') ? DB.Customers.all() : [];
        const rows  = [['Customer Name', 'Phone', 'Total Bills', 'Total Spend (INR)', 'Last Purchase Date']];
        custs.forEach(c => rows.push([c.name, c.phone || '', c.totalBills || 0, c.totalAmount || 0, c.lastPurchaseDate || '']));
        const dateSuffix = new Date().toISOString().split('T')[0].replace(/-/g, '_');
        _exportCSV(`report_customer_${dateSuffix}.csv`, rows);
      } else if (_activeReportTab === 'payment') {
        const bills = _getFilteredBills();
        const modes = ['Cash', 'GPay', 'PhonePe', 'Card', 'Bank Transfer', 'Credit'];
        const rows  = [['Payment Mode', 'Total Invoices', 'Total Revenue (INR)']];
        modes.forEach(m => {
          const mBills = bills.filter(b => (b.paymentMode || 'Cash') === m);
          const rev = mBills.reduce((s, b) => s + (b.grandTotal || 0), 0);
          rows.push([m, mBills.length, rev]);
        });
        const dateSuffix = new Date().toISOString().split('T')[0].replace(/-/g, '_');
        _exportCSV(`report_payment_${dateSuffix}.csv`, rows);
      } else {
        const dateSuffix = new Date().toISOString().split('T')[0];
        _exportCSV(`report_products_${dateSuffix}.csv`, rows);
      }

      // Also generate detailed sales transactions report
      const filteredBills = _getFilteredBills();
      const salesRows = [['Bill number', 'Customer', 'Payment method', 'Amount', 'GST', 'Date']];
      filteredBills.forEach(b => {
        salesRows.push([
          b.billNo,
          b.customerName || 'Walk-in Customer',
          b.paymentMode || 'Cash',
          b.grandTotal || 0,
          b.totalGst || 0,
          b.date || (b.createdAt ? b.createdAt.split('T')[0] : '')
        ]);
      });
      const dateStr = new Date().toISOString().split('T')[0];
      _exportCSV(`sales-report-${dateStr}.csv`, salesRows);
    });

    /* Print Report */
    _$('btn-print-report')?.addEventListener('click', () => window.print());
  }

  return { render };

})();
