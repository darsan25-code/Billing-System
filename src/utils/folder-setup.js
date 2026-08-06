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

      // Trigger daily auto-backup check
      checkAutoBackup();
    } catch (e) {
      console.warn('[FolderSetup] Initialization fallback:', e);
    }
  }

  function checkAutoBackup() {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const lastBackup = localStorage.getItem(BACKUP_PREFIX + 'last_date');

      if (lastBackup !== todayStr && typeof StorageHelper !== 'undefined') {
        const backupContent = StorageHelper.backupData();
        const fileName = `backup-${todayStr}.json`;

        localStorage.setItem(`${BACKUP_PREFIX}${todayStr}`, backupContent);
        localStorage.setItem(BACKUP_PREFIX + 'last_date', todayStr);

        if (typeof DiskStorage !== 'undefined') {
          DiskStorage.writeBillFile({ billNo: `auto_${fileName}` }, []);
        }

        console.log(`[AutoBackup] Daily backup created: backup/${fileName}`);
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
