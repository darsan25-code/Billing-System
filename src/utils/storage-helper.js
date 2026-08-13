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

  async function readBackupFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const buffer = e.target.result;
          const view = new Uint8Array(buffer);
          // Check for PK Zip signature (0x50, 0x4B, 0x03, 0x04)
          if (view.length > 4 && view[0] === 0x50 && view[1] === 0x4B && view[2] === 0x03 && view[3] === 0x04) {
            const extractedText = await _extractJsonFromZip(buffer);
            resolve(extractedText);
          } else {
            const text = new TextDecoder().decode(buffer);
            resolve(text);
          }
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file content'));
      reader.readAsArrayBuffer(file);
    });
  }

  async function _extractJsonFromZip(arrayBuffer) {
    const bytes = new Uint8Array(arrayBuffer);
    if (bytes.length < 30) throw new Error('Invalid ZIP archive size.');
    const compMethod = bytes[8] | (bytes[9] << 8);
    const compressedSize = bytes[18] | (bytes[19] << 8) | (bytes[20] << 16) | (bytes[21] << 24);
    const filenameLen = bytes[26] | (bytes[27] << 8);
    const extraLen = bytes[28] | (bytes[29] << 8);
    const dataOffset = 30 + filenameLen + extraLen;

    if (compMethod === 0) {
      const jsonBytes = bytes.subarray(dataOffset, dataOffset + compressedSize);
      return new TextDecoder().decode(jsonBytes);
    } else if (compMethod === 8 && typeof DecompressionStream !== 'undefined') {
      const compressedBytes = bytes.subarray(dataOffset, dataOffset + compressedSize);
      const ds = new DecompressionStream('deflate-raw');
      const writer = ds.writable.getWriter();
      writer.write(compressedBytes);
      writer.close();
      const decompressedBuffer = await new Response(ds.readable).arrayBuffer();
      return new TextDecoder().decode(decompressedBuffer);
    } else {
      let firstBrace = -1, lastBrace = -1;
      for (let i = 0; i < bytes.length; i++) {
        if (bytes[i] === 0x7B && firstBrace === -1) firstBrace = i;
        if (bytes[i] === 0x7D) lastBrace = i;
      }
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        const jsonBytes = bytes.subarray(firstBrace, lastBrace + 1);
        return new TextDecoder().decode(jsonBytes);
      }
      throw new Error('Could not parse ZIP file contents');
    }
  }

  /** Read file content and generate preview metadata. */
  function previewBackup(jsonStr) {
    try {
      const data = JSON.parse(jsonStr);
      const payload = data.data || data.folders || data;
      return {
        success: true,
        billsCount: (payload.bills || []).length,
        productsCount: (payload.products || []).length,
        customersCount: (payload.customers || []).length,
        data: payload,
      };
    } catch (e) {
      return { success: false, error: 'Invalid JSON backup file' };
    }
  }

  /** Restore backup after creating safety snapshot. */
  function restoreData(jsonStr) {
    if (typeof DB !== 'undefined' && DB.restoreData) {
      return DB.restoreData(jsonStr);
    }
    try {
      const currentBackup = backupData();
      localStorage.setItem(PFX + 'backup_before_restore', currentBackup);

      const data = JSON.parse(jsonStr);
      const payload = data.data || data.folders || data;

      if (payload.products)  localStorage.setItem(PFX + 'products',   JSON.stringify(payload.products));
      if (payload.customers) localStorage.setItem(PFX + 'customers',  JSON.stringify(payload.customers));
      if (payload.bills)     localStorage.setItem(PFX + 'bills',      JSON.stringify(payload.bills));
      if (payload.billItems) localStorage.setItem(PFX + 'bill_items', JSON.stringify(payload.billItems));
      if (payload.settings)  localStorage.setItem(PFX + 'settings',   JSON.stringify(payload.settings));

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
    readBackupFile,
    restoreData,
  };

})();
