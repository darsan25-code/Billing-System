/**
 * storage-helper.js – Safe Data Storage & Backup Utility
 *
 * Provides non-destructive backup, restore, export, and import functions.
 * Before restoring, creates an automatic safety snapshot: backup-before-restore.json
 *
 * Project: Sree Vel Murugan Hardware and Tiles – Billing System
 */

const StorageHelper = (() => {

  const PFX = 'svmh_';

  function backupData() {
    try {
      const data = {
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        products:  JSON.parse(localStorage.getItem(PFX + 'products')  || '[]'),
        customers: JSON.parse(localStorage.getItem(PFX + 'customers') || '[]'),
        bills:     JSON.parse(localStorage.getItem(PFX + 'bills')     || '[]'),
        billItems: JSON.parse(localStorage.getItem(PFX + 'bill_items')|| '[]'),
        settings:  JSON.parse(localStorage.getItem(PFX + 'settings')  || '{}'),
      };
      return JSON.stringify(data, null, 2);
    } catch (e) {
      console.error('[StorageHelper] Backup error:', e);
      return '{}';
    }
  }

  function exportData(filename) {
    try {
      const jsonStr = backupData();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename || `backup-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      return true;
    } catch (e) {
      console.error('[StorageHelper] Export error:', e);
      return false;
    }
  }

  /** Read file content and generate preview metadata. */
  function previewBackup(jsonStr) {
    try {
      const data = JSON.parse(jsonStr);
      return {
        success: true,
        billsCount: (data.bills || []).length,
        productsCount: (data.products || []).length,
        customersCount: (data.customers || []).length,
        data,
      };
    } catch (e) {
      return { success: false, error: 'Invalid JSON backup file' };
    }
  }

  /** Restore backup after creating safety snapshot backup-before-restore.json. */
  function restoreData(jsonStr) {
    try {
      // 1. Create safety snapshot before restore
      const currentBackup = backupData();
      localStorage.setItem(PFX + 'backup_before_restore', currentBackup);

      const data = JSON.parse(jsonStr);
      if (data.products)  localStorage.setItem(PFX + 'products',   JSON.stringify(data.products));
      if (data.customers) localStorage.setItem(PFX + 'customers',  JSON.stringify(data.customers));
      if (data.bills)     localStorage.setItem(PFX + 'bills',      JSON.stringify(data.bills));
      if (data.billItems) localStorage.setItem(PFX + 'bill_items', JSON.stringify(data.billItems));
      if (data.settings)  localStorage.setItem(PFX + 'settings',   JSON.stringify(data.settings));

      // Re-sync memory cache in DB if available
      if (typeof DB !== 'undefined' && DB.init) DB.init();

      return { success: true };
    } catch (e) {
      console.error('[StorageHelper] Restore error:', e);
      return { success: false, error: e.message };
    }
  }

  return {
    backupData,
    exportData,
    previewBackup,
    restoreData,
  };

})();
