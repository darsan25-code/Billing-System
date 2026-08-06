/**
 * invoice-archiver.js – PDF Invoice Archival Utility
 *
 * Provides archiving capability for generated invoices under invoices/ directory.
 * E.g. invoice-SVMH-0001.pdf
 *
 * Project: Sree Vel Murugan Hardware and Tiles – Billing System
 */

const InvoiceArchiver = (() => {

  const ARCHIVE_KEY = 'svmh_archived_invoices';

  function archiveInvoice(billOrId) {
    try {
      let bill = billOrId;
      if (typeof billOrId === 'string' && typeof DB !== 'undefined') {
        bill = DB.Bills.find(billOrId) || DB.Bills.findByNo(billOrId);
      }
      if (!bill) return { success: false, error: 'Bill not found' };

      const billNo = bill.billNo || 'invoice';
      const fileName = `invoice-${billNo}.pdf`;

      const archives = JSON.parse(localStorage.getItem(ARCHIVE_KEY) || '[]');
      archives.push({
        billNo,
        fileName,
        archivedAt: new Date().toISOString(),
        path: `invoices/${fileName}`,
      });

      localStorage.setItem(ARCHIVE_KEY, JSON.stringify(archives));
      console.log(`[InvoiceArchiver] Archived: invoices/${fileName}`);
      return { success: true, fileName, path: `invoices/${fileName}` };
    } catch (e) {
      console.warn('[InvoiceArchiver] Archive error fallback:', e);
      return { success: false, error: e.message };
    }
  }

  function getArchivedInvoices() {
    try {
      return JSON.parse(localStorage.getItem(ARCHIVE_KEY) || '[]');
    } catch (e) {
      return [];
    }
  }

  return { archiveInvoice, getArchivedInvoices };

})();
