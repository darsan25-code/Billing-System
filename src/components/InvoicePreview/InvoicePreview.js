/**
 * InvoicePreview.js – Printable Invoice Modal Component
 *
 * Renders an A4 / Thermal printable invoice modal for any bill object.
 * Features:
 *   • Shop details & GSTIN header
 *   • Customer details (or Walk-in Customer fallback)
 *   • Full line item table (HSN, Qty, Unit, Rate, Disc %, Taxable, GST %, Total)
 *   • GST Breakdown (CGST / SGST) & Grand Total in words
 *   • Print (window.print()) & PDF export options
 *
 * Project: Sree Vel Murugan Hardware and Tiles – Billing System
 */

const InvoicePreview = (() => {

  /* ── Number to Words converter (Indian Rupees) ───────────────── */
  function _numToWords(num) {
    if (!num || isNaN(num)) return 'Rupees Zero Only';
    const a = ['','One ','Two ','Three ','Four ','Five ','Six ','Seven ','Eight ','Nine ','Ten ','Eleven ','Twelve ','Thirteen ','Fourteen ','Fifteen ','Sixteen ','Seventeen ','Eighteen ','Nineteen '];
    const b = ['', '', 'Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];

    function inWords(n) {
      if ((n = n.toString()).length > 9) return 'overflow';
      const n_arr = ('000000000' + n).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
      if (!n_arr) return '';
      let str = '';
      str += (n_arr[1] != 0) ? (a[Number(n_arr[1])] || (b[n_arr[1][0]] + ' ' + a[n_arr[1][1]])) + 'Crore ' : '';
      str += (n_arr[2] != 0) ? (a[Number(n_arr[2])] || (b[n_arr[2][0]] + ' ' + a[n_arr[2][1]])) + 'Lakh ' : '';
      str += (n_arr[3] != 0) ? (a[Number(n_arr[3])] || (b[n_arr[3][0]] + ' ' + a[n_arr[3][1]])) + 'Thousand ' : '';
      str += (n_arr[4] != 0) ? (a[Number(n_arr[4])] || (b[n_arr[4][0]] + ' ' + a[n_arr[4][1]])) + 'Hundred ' : '';
      str += (n_arr[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n_arr[5])] || (b[n_arr[5][0]] + ' ' + a[n_arr[5][1]])) : '';
      return str;
    }

    const rupees = Math.floor(num);
    const words  = inWords(rupees).trim();
    return `Rupees ${words || 'Zero'} Only`;
  }

  const _esc = (s) => String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const fmtINR = (n) => '₹\u00a0' + (n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  /**
   * Open the Invoice Preview Modal for a bill object or billId.
   * @param {object|string} billOrId - Bill record object or bill ID string
   */
  function show(billOrId) {
    let bill = null;
    if (typeof billOrId === 'object' && billOrId !== null) {
      bill = billOrId;
    } else if (typeof DB !== 'undefined') {
      bill = DB.Bills.find(billOrId) || DB.Bills.findByNo(billOrId);
    }

    if (!bill) {
      console.warn('[InvoicePreview] Invoice details not found for:', billOrId);
      return;
    }

    const items = (bill.items && bill.items.length > 0) ? bill.items : (bill.cartItems || bill.products || (typeof DB !== 'undefined' ? DB.BillItems.forBill(bill.id) : []));
    _renderModal(bill, items);
  }

  function _renderModal(bill, items) {
    // Remove stale modal if exists
    const stale = document.getElementById('invoice-modal-overlay');
    if (stale) stale.remove();

    const isGst = bill.billType !== 'normal';
    const words = _numToWords(bill.grandTotal);
    const setObj = (typeof DB !== 'undefined') ? DB.Settings.get() : {};
    const logoUrl = setObj.logoUrl || '';

    const overlay = document.createElement('div');
    overlay.id = 'invoice-modal-overlay';
    overlay.className = 'invoice-modal-overlay';

    overlay.innerHTML = /* html */`
      <div class="invoice-modal-container">

        <!-- Toolbar (screen only) -->
        <div class="invoice-toolbar print-hide">
          <div class="invoice-toolbar-title">
            <span>📄 Invoice Preview</span>
            <span class="inv-no-pill">${_esc(bill.billNo)}</span>
          </div>
          <div class="invoice-toolbar-actions">
            <button class="inv-btn" id="inv-btn-edit-bill" style="background:#f59e0b;color:#0f172a;border:none;font-weight:700">
              ✏️ Edit Bill
            </button>
            <button class="inv-btn inv-btn-print" id="inv-btn-print" onclick="printInvoice()">
              🖨️ Print Invoice
            </button>
            <button class="inv-btn inv-btn-pdf" id="inv-btn-pdf">
              📄 Download PDF
            </button>
            <button class="inv-btn inv-btn-close" id="inv-btn-close">
              ✕ Close
            </button>
          </div>
        </div>

        <!-- Printable Document Area -->
        <div class="invoice-document" id="invoice-preview">

          <!-- Shop Header -->
          <div class="inv-header">
            <div class="inv-shop-brand">
              ${logoUrl ? `<div class="inv-logo-box has-img"><img src="${_esc(logoUrl)}" alt="Logo" /></div>` : `<div class="inv-logo-box">SVMH</div>`}
              <div class="inv-shop-title">
                <h1>SREE VEL MURUGAN HARDWARE &amp; TILES</h1>
                <p>Wholesale &amp; Retail Dealers in Cement, Tiles, Bricks, Plumbing &amp; Hardware</p>
                <div class="inv-shop-meta">
                  No.143, Kundrathur Main Road, Porur, Chennai - 600116 &nbsp;·&nbsp;
                  Ph: 7305274926 / 9840461152 &nbsp;·&nbsp; GSTIN: <strong>33ARRPJ3902G3ZU</strong>
                </div>
              </div>
            </div>
            <div class="inv-type-badge">${isGst ? 'TAX INVOICE' : 'RETAIL BILL'}</div>
          </div>

          <div class="inv-divider"></div>

          <!-- Meta Grid -->
          <div class="inv-meta-grid">
            <div class="inv-meta-block">
              <span class="inv-meta-label">Billed To (Customer Details):</span>
              <div class="inv-cust-name">${_esc((bill.customerName || 'Walk-in Customer').toUpperCase())}</div>
              ${bill.customerPhone ? `<div class="inv-cust-phone">Phone: ${_esc(bill.customerPhone)}</div>` : ''}
              ${(bill.customerAddress || bill.address) ? `<div class="inv-cust-address" style="font-size:0.82rem;color:#475569;margin-top:2px;word-break:break-word;overflow-wrap:break-word">Address: ${_esc(bill.customerAddress || bill.address)}</div>` : ''}
            </div>
            <div class="inv-meta-block inv-meta-right">
              <table class="inv-meta-tbl">
                <tr><td>Invoice No:</td><td><strong>${_esc(bill.billNo)}</strong></td></tr>
                <tr><td>Date:</td><td>${_esc(bill.date || bill.createdAt?.split('T')[0] || '')}</td></tr>
                <tr><td>Payment Mode:</td><td><strong style="color:#0f172a">${_esc(bill.paymentMode || 'Cash')}</strong></td></tr>
              </table>
            </div>
          </div>

          <!-- Line Items Table -->
          <table class="inv-items-table">
            <thead>
              <tr>
                <th class="inv-col-seq txt-center">#</th>
                <th class="inv-col-desc">ITEM DESCRIPTION</th>
                <th class="inv-col-qty txt-center">QTY</th>
                <th class="inv-col-unit txt-center">UNIT</th>
                <th class="inv-col-rate txt-right inv-num-cell">RATE (₹)</th>
                <th class="inv-col-total txt-right inv-num-cell">TOTAL (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${items.map((it, idx) => {
                const name = it.name || it.productName || '—';
                const qty = it.quantity ?? it.qty ?? 0;
                const unit = it.unit || '—';
                const rate = it.rate || 0;
                const total = it.total ?? it.rowTotal ?? (qty * rate);
                const rateFmt = (typeof rate === 'number') ? rate.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2}) : rate;
                const totalFmt = (typeof total === 'number') ? total.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2}) : total;
                return `
                <tr>
                  <td class="txt-center inv-num-cell inv-col-seq">${idx + 1}</td>
                  <td class="inv-col-desc">
                    <div class="inv-item-name">${_esc(name)}</div>
                  </td>
                  <td class="txt-center font-bold inv-num-cell inv-col-qty">${qty}</td>
                  <td class="txt-center inv-num-cell inv-col-unit">${_esc(unit)}</td>
                  <td class="txt-right inv-num-cell inv-col-rate">${rateFmt}</td>
                  <td class="txt-right font-bold inv-num-cell inv-col-total">${totalFmt}</td>
                </tr>
              `;}).join('')}
            </tbody>
          </table>

          <!-- Bottom Section: Summary & Signatures (Grouped to avoid orphaned signatures on page 2) -->
          <div class="inv-bottom-section">
            <!-- Summary & Totals -->
            <div class="inv-summary-wrap">
              <div class="inv-words-box">
                <span class="words-label">Amount in Words:</span>
                <div class="words-val">${words}</div>
                <div class="inv-terms-note">
                  <strong>Terms &amp; Conditions:</strong><br>
                  ${(typeof DB !== 'undefined' && DB.Settings.get().footerText) ? _esc(DB.Settings.get().footerText) : '1. Goods once sold will not be taken back or exchanged.<br>2. Subject to local jurisdiction only.'}
                </div>
              </div>
              <div class="inv-totals-box">
                <table class="inv-totals-tbl">
                  <tr>
                    <td class="inv-label-cell">Subtotal:</td>
                    <td class="txt-right inv-num-cell">${fmtINR(bill.subtotal)}</td>
                  </tr>
                  ${isGst ? `
                  <tr>
                    <td class="inv-label-cell">CGST (Output):</td>
                    <td class="txt-right inv-num-cell">${fmtINR((bill.totalGst || 0) / 2)}</td>
                  </tr>
                  <tr>
                    <td class="inv-label-cell">SGST (Output):</td>
                    <td class="txt-right inv-num-cell">${fmtINR((bill.totalGst || 0) / 2)}</td>
                  </tr>
                  <tr class="highlight-row">
                    <td class="inv-label-cell">Total GST Amount:</td>
                    <td class="txt-right inv-num-cell">${fmtINR(bill.totalGst)}</td>
                  </tr>` : ''}
                  ${bill.billDiscount > 0 ? `
                  <tr>
                    <td class="inv-label-cell">Discount:</td>
                    <td class="txt-right inv-num-cell">- ${fmtINR(bill.billDiscount)}</td>
                  </tr>` : ''}
                  ${bill.roundOff !== 0 ? `
                  <tr>
                    <td class="inv-label-cell">Round Off:</td>
                    <td class="txt-right inv-num-cell">${bill.roundOff > 0 ? '+' : ''}${fmtINR(bill.roundOff)}</td>
                  </tr>` : ''}
                  <tr class="grand-total-row">
                    <td class="inv-label-cell">Grand Total:</td>
                    <td class="txt-right inv-num-cell">${fmtINR(bill.grandTotal)}</td>
                  </tr>
                </table>
              </div>
            </div>

            <!-- Signatures Footer -->
            <div class="inv-footer-sig">
              <div class="sig-block">
                <span>Customer Signature</span>
              </div>
              <div class="sig-block sig-right">
                <span>For <strong>Sree Vel Murugan Hardware &amp; Tiles</strong></span>
                <div class="sig-space"></div>
                <span>Authorized Signatory</span>
              </div>
            </div>
          </div>

        </div><!-- /printable-invoice -->

      </div>
    `;

    document.body.appendChild(overlay);

    /* Event Handlers */
    const closeFn = () => overlay.remove();

    document.getElementById('inv-btn-close')?.addEventListener('click', closeFn);
    document.getElementById('inv-btn-edit-bill')?.addEventListener('click', () => {
      closeFn();
      const no = bill ? (bill.billNo || bill.invoiceNo || bill.id) : null;
      if (no) {
        localStorage.setItem('editingInvoiceId', no);
      }
      window.location.hash = 'billing';
    });
    document.getElementById('inv-btn-print')?.addEventListener('click', () => printInvoice());
    document.getElementById('inv-btn-pdf')?.addEventListener('click', () => printInvoice());

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeFn();
    });

    const kh = (e) => { if (e.key === 'Escape') closeFn(); };
    document.addEventListener('keydown', kh);
    overlay._kh = kh;
  }

  /* Legacy mount compatibility */
  function mount(container) {
    // No-op
  }

  return { show, mount };
})();
