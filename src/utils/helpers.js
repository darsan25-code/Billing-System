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
    const invoiceContainer = document.getElementById("invoice-modal-overlay") || document.getElementById("invoice-preview") || document.getElementById("printable-invoice");

    if (!invoiceContainer) {
        showToast("Invoice not found", "error");
        return;
    }

    const styles = Array.from(
      document.querySelectorAll(
        'link[rel="stylesheet"], style'
      )
    )
    .map(el => el.outerHTML)
    .join('');

    const printWindow = window.open('', '_blank');

    printWindow.document.write(`
<html>
<head>
${styles}

<style>
body{
    margin:0;
    padding:20px;
    background:white;
}

.no-print, .invoice-toolbar, .print-hide {
    display:none !important;
}
</style>

</head>

<body>
${invoiceContainer.outerHTML}
</body>

</html>
`);

    printWindow.document.close();

    setTimeout(() => {
        printWindow.focus();
        printWindow.print();
        printWindow.close();
    }, 700);
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


