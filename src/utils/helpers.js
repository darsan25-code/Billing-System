/**
 * helpers.js – General utility / helper functions (placeholder)
 *
 * Will contain shared utilities: date formatting, currency formatting,
 * number rounding, ID generation, etc.
 * Not implemented yet.
 */

const Helpers = (() => {
  // TODO: Add helper functions here

  return {};
})();

function showToast(msg, type = 'info', ms = 3000) {
  if (typeof window.showToast === 'function' && window.showToast !== showToast) {
    window.showToast(msg, type, ms);
    return;
  }
  let t = document.getElementById('billing-toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'billing-toast';
    t.className = 'billing-toast';
    t.innerHTML = '<span class="toast-msg"></span>';
    document.body.appendChild(t);
  }
  t.className = `billing-toast billing-toast-${type}`;
  const m = t.querySelector('.toast-msg');
  if (m) m.textContent = msg;
  requestAnimationFrame(() => t.classList.add('billing-toast-visible'));
  setTimeout(() => t.classList.remove('billing-toast-visible'), ms);
}

function printInvoice() {
    const targetEl = document.getElementById("invoice-preview") || document.getElementById("printable-invoice") || document.getElementById("invoice-modal-overlay");

    if (!targetEl) {
        showToast("Invoice not found", "error");
        return;
    }

    const clonedNode = targetEl.cloneNode(true);
    clonedNode.querySelectorAll('.print-hide, .invoice-toolbar, button').forEach(el => el.remove());

    const styles = Array.from(
      document.querySelectorAll(
        'link[rel="stylesheet"], style'
      )
    )
    .map(el => el.outerHTML)
    .join('\n');

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        window.print();
        return;
    }

    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Print Invoice - Sree Vel Murugan Hardware &amp; Tiles</title>
${styles}
<style>
@page {
    size: A4 portrait;
    margin: 10mm 12mm;
}
html, body {
    margin: 0 !important;
    padding: 0 !important;
    background: #ffffff !important;
    font-family: 'Inter', system-ui, sans-serif;
    color: #0f172a !important;
}
.no-print, .invoice-toolbar, .print-hide, button {
    display: none !important;
}
.invoice-modal-overlay, .invoice-modal-container {
    position: static !important;
    background: transparent !important;
    box-shadow: none !important;
    padding: 0 !important;
    margin: 0 !important;
    width: 100% !important;
}
.invoice-document {
    padding: 0 !important;
    margin: 0 !important;
    width: 100% !important;
}
.inv-items-table {
    width: 100% !important;
    border-collapse: collapse !important;
    page-break-inside: auto !important;
    break-inside: auto !important;
}
.inv-items-table th, .inv-items-table td {
    vertical-align: top !important;
    padding: 6px 8px !important;
}
.inv-items-table thead {
    display: table-header-group !important;
}
.inv-items-table tbody {
    display: table-row-group !important;
}
.inv-items-table tr {
    page-break-inside: avoid !important;
    break-inside: avoid !important;
    height: auto !important;
}
.inv-summary-wrap, .inv-footer-sig {
    page-break-inside: avoid !important;
    break-inside: avoid !important;
}
.inv-cust-address, .inv-item-name, .inv-col-desc {
    word-break: break-word !important;
    overflow-wrap: anywhere !important;
}
.inv-num-cell, .inv-totals-tbl td.txt-right {
    white-space: nowrap !important;
}
</style>
</head>
<body>
${clonedNode.outerHTML}
</body>
</html>`);

    printWindow.document.close();

    setTimeout(() => {
        printWindow.focus();
        printWindow.print();
        printWindow.close();
    }, 450);
}

function deleteBill(id) {
    if (!id) return;
    if (typeof DB !== 'undefined') {
        const res = DB.deleteBill(id);
        if (res && res.success) {
            const row = document.querySelector(`.dash-bill-row[data-bill-id="${id}"]`);
            if (row && row.parentNode) row.remove();
            showToast("Bill deleted successfully", "success");
        }
    }
}
window.deleteBill = deleteBill;


