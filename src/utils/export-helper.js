/**
 * export-helper.js – Multi-format Export Utility (PDF, Excel, JSON)
 *
 * Generates formatted sales report exports with columns:
 * Bill number, Customer, Products, Quantity, GST, Payment mode, Date, Grand total.
 *
 * Project: Sree Vel Murugan Hardware and Tiles – Billing System
 */

const ExportHelper = (() => {

  function exportSalesJSON() {
    try {
      if (typeof StorageHelper !== 'undefined') {
        return StorageHelper.exportData('backup.json');
      }
    } catch (e) {
      console.error('[ExportHelper] JSON export error:', e);
    }
  }

  function exportSalesExcel() {
    try {
      const bills = (typeof DB !== 'undefined') ? DB.Bills.all() : [];
      const items = (typeof DB !== 'undefined') ? DB._raw('bill_items') : [];

      const rows = [[
        'Bill number',
        'Customer',
        'Products',
        'Quantity',
        'GST (INR)',
        'Payment mode',
        'Date',
        'Grand total (INR)'
      ]];

      bills.forEach(b => {
        const bItems = items.filter(i => i.billId === b.id);
        const prodNames = bItems.map(i => i.productName).join('; ') || '—';
        const totalQty  = bItems.reduce((sum, i) => sum + (parseFloat(i.qty) || 0), 0);

        rows.push([
          b.billNo,
          b.customerName || 'Walk-in Customer',
          prodNames,
          totalQty,
          b.totalGst || 0,
          b.paymentMode || b.paymentMethod || 'Cash',
          b.date || (b.createdAt ? b.createdAt.split('T')[0] : ''),
          b.grandTotal || 0
        ]);
      });

      const csvContent = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'sales-report.xlsx';
      link.click();
      return true;
    } catch (e) {
      console.error('[ExportHelper] Excel export error:', e);
      return false;
    }
  }

  function exportSalesPDF() {
    try {
      const printWin = window.open('', '_blank');
      if (!printWin) return window.print();

      const bills = (typeof DB !== 'undefined') ? DB.Bills.all() : [];
      const rows = bills.map(b => `
        <tr>
          <td>${b.billNo}</td>
          <td>${b.customerName || 'Walk-in Customer'}</td>
          <td>${b.paymentMode || 'Cash'}</td>
          <td>₹${(b.totalGst || 0).toLocaleString('en-IN')}</td>
          <td>${b.date || ''}</td>
          <td><strong>₹${(b.grandTotal || 0).toLocaleString('en-IN')}</strong></td>
        </tr>
      `).join('');

      printWin.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>sales-report.pdf</title>
          <style>
            body { font-family: sans-serif; padding: 20px; }
            h2 { color: #0f172a; margin-bottom: 4px; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; font-size: 0.85rem; }
            th { background: #f8fafc; }
          </style>
        </head>
        <body>
          <h2>Sree Vel Murugan Hardware & Tiles</h2>
          <p>Sales Report Summary · Exported on ${new Date().toLocaleDateString('en-IN')}</p>
          <table>
            <thead>
              <tr>
                <th>Bill Number</th>
                <th>Customer</th>
                <th>Payment Mode</th>
                <th>GST</th>
                <th>Date</th>
                <th>Grand Total</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <script>window.onload = function() { window.print(); };</script>
        </body>
        </html>
      `);
      printWin.document.close();
      return true;
    } catch (e) {
      console.error('[ExportHelper] PDF export error:', e);
      window.print();
    }
  }

  return { exportSalesJSON, exportSalesExcel, exportSalesPDF };

})();
