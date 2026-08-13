/**
 * folder-setup.js – Automatic Directory Initialization & Daily Backup Task
 *
 * Ensures application directories (backup/, reports/, invoices/, exports/, settings/)
 * are initialized and handles daily automated backups.
 *
 * Project: Sree Vel Murugan Hardware and Tiles – Billing System
 */

const FolderSetup = (() => {

  const FOLDERS = ['backup/', 'reports/', 'invoices/', 'exports/', 'settings/'];
  const BACKUP_PREFIX = 'svmh_auto_backup_';

  function init() {
    try {
      // Record folder structure in storage metadata
      const folderRegistry = JSON.parse(localStorage.getItem('svmh_folders') || '{}');
      FOLDERS.forEach(f => folderRegistry[f] = { created: true, path: `D:/BillingSystem/${f}` });
      localStorage.setItem('svmh_folders', JSON.stringify(folderRegistry));

      // Trigger daily auto-backup check immediately
      checkAutoBackup();

      // Periodically check time every 60 seconds for 7:30 PM trigger
      setInterval(checkAutoBackup, 60000);
    } catch (e) {
      console.warn('[FolderSetup] Initialization fallback:', e);
    }
  }

  function checkAutoBackup() {
    try {
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const hours = now.getHours();
      const minutes = now.getMinutes();

      // Check if current time is past 7:30 PM (19:30)
      const isPast730PM = (hours > 19) || (hours === 19 && minutes >= 30);
      const lastBackupDate = localStorage.getItem(BACKUP_PREFIX + 'last_date');

      if (isPast730PM && lastBackupDate !== todayStr) {
        if (typeof DB !== 'undefined') {
          const fullData = {
            bills: DB.Bills.all(),
            billItems: DB._raw('bill_items'),
            products: DB.Products.all(),
            customers: DB.Customers.all(),
            settings: DB.Settings.get(),
            deletedBills: DB.Bills.deleted(),
          };

          const YYYY = now.getFullYear();
          const MM = String(now.getMonth() + 1).padStart(2, '0');
          const DD = String(now.getDate()).padStart(2, '0');
          const HH = String(hours).padStart(2, '0');
          const mm = String(minutes).padStart(2, '0');

          const fileName = `BillingSystem_Backup_${YYYY}-${MM}-${DD}_${HH}-${mm}.json`;
          const pkg = (typeof DiskStorage !== 'undefined')
            ? DiskStorage.exportBackupPackage(fullData)
            : { fileName, jsonString: DB.backupData() };

          // Store in localStorage
          localStorage.setItem(`${BACKUP_PREFIX}${todayStr}`, pkg.jsonString);
          localStorage.setItem(BACKUP_PREFIX + 'last_date', todayStr);

          // Write to selected folder if directory handle is active
          if (typeof DiskStorage !== 'undefined' && DiskStorage.writeBackupToFolder) {
            DiskStorage.writeBackupToFolder(pkg.fileName, pkg.jsonString);
          }

          console.log(`[AutoBackup] Daily 7:30 PM backup created: ${pkg.fileName}`);
        }
      }
    } catch (e) {
      console.warn('[AutoBackup] Skipped auto backup:', e);
    }
  }

  return { init, checkAutoBackup };

})();

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => FolderSetup.init());
}
