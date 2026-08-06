/**
 * database.js – Future Database Abstraction Layer
 *
 * Prepared for future database migrations (SQLite, PostgreSQL, IndexedDB).
 * Currently delegates to primary localStorage & DiskStorage systems safely.
 *
 * Project: Sree Vel Murugan Hardware and Tiles – Billing System
 */

const Database = (() => {

  async function query(sql, params = []) {
    console.log('[Database] Future DB abstraction query:', sql, params);
    return [];
  }

  async function save() {
    if (typeof DiskStorage !== 'undefined' && typeof DB !== 'undefined') {
      DiskStorage.syncAllFiles({
        bills: DB.Bills.all(),
        products: DB.Products.all(),
        customers: DB.Customers.all(),
        settings: DB.Settings.get(),
      });
    }
    return { success: true };
  }

  return { query, save };

})();
