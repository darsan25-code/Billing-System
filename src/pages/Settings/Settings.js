/**
 * Settings.js – Complete Settings & System Management Module
 *
 * Features:
 *   • Storage Path (D:/BillingSystem/data/ with Change Storage Folder button)
 *   • Storage Metrics (256 MB / 10 GB, Auto-save Enabled, Auto-backup Daily at 9 PM)
 *   • Shop Details & Branding (Name, GSTIN, Address, Phone, Logo Upload)
 *   • GST Configuration & Invoice Preferences
 *   • Backup & Restore (Backup Now, Export ZIP, Restore ZIP with Custom Warning Modal)
 *   • Zero Native Browser Alerts/Confirms
 *
 * Project: Sree Vel Murugan Hardware and Tiles – Billing System
 */

const SettingsPage = (() => {

  /* ── Shortcuts reference data ───────────────────────────────── */
  const SHORTCUT_GROUPS = [
    {
      title: 'Search & Navigation',
      icon:  '🔍',
      items: [
        { keys: [{ label: 'F2', cls: 'key-fn' }], desc: 'Focus product search bar' },
        { keys: [{ label: '↑', cls: 'key-arrow' }, { sep: true }, { label: '↓', cls: 'key-arrow' }], desc: 'Navigate suggestions' },
        { keys: [{ label: 'Enter', cls: 'key-action' }], desc: 'Add product / Confirm' },
        { keys: [{ label: 'Esc', cls: '' }], desc: 'Close dropdown / Clear search' },
      ],
    },
    {
      title: 'Table Editing',
      icon:  '📋',
      items: [
        { keys: [{ label: 'Tab', cls: '' }], desc: 'Next quantity field' },
        { keys: [{ label: 'Shift', cls: 'key-ctrl' }, { sep: true }, { label: 'Tab', cls: '' }], desc: 'Previous quantity field' },
        { keys: [{ label: 'Delete', cls: 'key-action' }], desc: 'Remove selected row' },
      ],
    },
    {
      title: 'Bill Actions',
      icon:  '🧾',
      items: [
        { keys: [{ label: 'Ctrl', cls: 'key-ctrl' }, { sep: true }, { label: 'S', cls: '' }], desc: 'Save Bill' },
        { keys: [{ label: 'Ctrl', cls: 'key-ctrl' }, { sep: true }, { label: 'P', cls: '' }], desc: 'Print Bill' },
        { keys: [{ label: 'Ctrl', cls: 'key-ctrl' }, { sep: true }, { label: 'N', cls: '' }], desc: 'New Bill' },
      ],
    },
  ];

  function _keysHTML(keys) {
    return keys.map(k => {
      if (k.sep) return `<span class="key-sep">/</span>`;
      return `<kbd class="${k.cls || ''}">${k.label}</kbd>`;
    }).join('');
  }

  function _shortcutsHTML() {
    return SHORTCUT_GROUPS.map(group => `
      <div class="shortcut-group">
        <div class="shortcut-group-title">
          <span class="sg-icon">${group.icon}</span>
          ${group.title}
        </div>
        <div class="shortcut-rows">
          ${group.items.map(item => `
            <div class="shortcut-row">
              <div class="shortcut-keys">${_keysHTML(item.keys)}</div>
              <div class="shortcut-desc">${item.desc}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');
  }

  const _$ = (id) => document.getElementById(id);
  const _esc = (s) => String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

  let _toastTimer = null;
  function _showToast(msg, type = 'info', ms = 2400) {
    let t = document.getElementById('set-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'set-toast';
      t.className = 'billing-toast';
      t.innerHTML = '<span class="toast-msg"></span>';
      document.body.appendChild(t);
    }
    t.className = `billing-toast billing-toast-${type}`;
    t.querySelector('.toast-msg').textContent = msg;
    clearTimeout(_toastTimer);
    requestAnimationFrame(() => t.classList.add('billing-toast-visible'));
    _toastTimer = setTimeout(() => t.classList.remove('billing-toast-visible'), ms);
  }

  /* ── Custom Modals to Replace window.confirm ────────────────── */
  function _showRestoreWarningModal(onConfirm) {
    const overlay = document.createElement('div');
    overlay.className = 'prod-modal-overlay';

    overlay.innerHTML = /* html */`
      <div class="prod-modal" role="dialog" aria-modal="true" style="max-width:440px">
        <div class="prod-modal-header" style="background:#7f1d1d">
          <h2>Restore Backup?</h2>
          <button class="modal-close-btn" id="rst-modal-close">✕</button>
        </div>
        <div class="prod-modal-body" style="padding:24px;text-align:center">
          <div style="font-size:1.05rem;font-weight:700;color:#0f172a;margin-bottom:10px">
            Current data will be replaced. Continue?
          </div>
          <div style="font-size:0.82rem;color:#64748b;line-height:1.5">
            All current products, bills, and settings will be overwritten by the selected backup file.
          </div>
        </div>
        <div class="prod-modal-footer" style="justify-content:center;gap:12px">
          <button class="modal-btn modal-btn-cancel" id="rst-modal-cancel">Cancel</button>
          <button class="modal-btn" id="rst-modal-confirm" style="background:#dc2626;color:#fff">Restore Data</button>
        </div>
      </div>`;

    document.body.appendChild(overlay);

    const closeFn = () => overlay.remove();
    document.getElementById('rst-modal-close')?.addEventListener('click', closeFn);
    document.getElementById('rst-modal-cancel')?.addEventListener('click', closeFn);

    document.getElementById('rst-modal-confirm')?.addEventListener('click', () => {
      closeFn();
      onConfirm();
    });

    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeFn(); });
  }

  function _showResetWarningModal(onConfirm) {
    const overlay = document.createElement('div');
    overlay.className = 'prod-modal-overlay';

    overlay.innerHTML = /* html */`
      <div class="prod-modal" role="dialog" aria-modal="true" style="max-width:440px">
        <div class="prod-modal-header" style="background:#7f1d1d">
          <h2>Reset System Database?</h2>
          <button class="modal-close-btn" id="res-modal-close">✕</button>
        </div>
        <div class="prod-modal-body" style="padding:24px;text-align:center">
          <div style="font-size:1.05rem;font-weight:700;color:#0f172a;margin-bottom:10px">
            Are you sure you want to reset system data to initial defaults?
          </div>
          <div style="font-size:0.82rem;color:#dc2626;font-weight:600">
            ⚠️ All custom products, bills, and customers will be permanently erased.
          </div>
        </div>
        <div class="prod-modal-footer" style="justify-content:center;gap:12px">
          <button class="modal-btn modal-btn-cancel" id="res-modal-cancel">Cancel</button>
          <button class="modal-btn" id="res-modal-confirm" style="background:#dc2626;color:#fff">Reset All Data</button>
        </div>
      </div>`;

    document.body.appendChild(overlay);

    const closeFn = () => overlay.remove();
    document.getElementById('res-modal-close')?.addEventListener('click', closeFn);
    document.getElementById('res-modal-cancel')?.addEventListener('click', closeFn);

    document.getElementById('res-modal-confirm')?.addEventListener('click', () => {
      closeFn();
      onConfirm();
    });

    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeFn(); });
  }

  /* ── Full page HTML ─────────────────────────────────────────── */
  function _buildHTML(set, stats) {
    return /* html */ `
      <div class="settings-page">

        <!-- Header -->
        <div class="settings-header">
          <div class="settings-header-title">
            <h1>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
                <path d="M12 2v2M12 20v2M2 12h2M20 12h2"/>
              </svg>
              Settings &amp; Disk Storage Management
            </h1>
            <span>Sree Vel Murugan Hardware &amp; Tiles</span>
          </div>
          <button class="qa-btn qa-btn-primary" id="btn-save-settings" style="padding:8px 18px">
            ✔ Save Preferences
          </button>
        </div>

        <div class="settings-body">
          <div class="settings-grid">

            <!-- 1. Local Disk Storage Section -->
            <div class="settings-card" style="grid-column: 1 / -1">
              <div class="settings-card-hd">
                <span class="sc-icon">💾</span>
                Local Disk Storage Engine
                <span class="settings-badge active">Disk Storage Active</span>
              </div>
              <div class="settings-card-bd" style="gap:16px;display:flex;flex-direction:column">
                <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap">
                  <div style="flex:1;min-width:280px">
                    <label style="font-size:0.75rem;font-weight:700;color:#64748b;text-transform:uppercase">Storage Location Path</label>
                    <div style="display:flex;gap:8px;margin-top:4px">
                      <input type="text" id="set-storage-path" value="${_esc(stats.path)}" style="flex:1;font-family:monospace;font-weight:700" readonly />
                      <button class="qa-btn qa-btn-secondary" id="btn-change-folder">📁 Change storage folder</button>
                    </div>
                  </div>
                  <div style="display:flex;gap:20px;align-items:center;background:#f8fafc;padding:10px 16px;border-radius:8px;border:1px solid #cbd5e1">
                    <div>
                      <div style="font-size:0.7rem;font-weight:700;color:#64748b">STORAGE USED</div>
                      <div style="font-size:1.1rem;font-weight:800;color:#0f172a">${stats.usedMB} / ${stats.totalGB}</div>
                    </div>
                    <div>
                      <div style="font-size:0.7rem;font-weight:700;color:#64748b">AUTO-SAVE</div>
                      <div style="font-size:0.85rem;font-weight:700;color:#10b981">✓ ${stats.autoSave}</div>
                    </div>
                    <div>
                      <div style="font-size:0.7rem;font-weight:700;color:#64748b">AUTO-BACKUP</div>
                      <div style="font-size:0.85rem;font-weight:700;color:#3b82f6">✓ ${stats.autoBackup}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 2. Shop Details Section -->
            <div class="settings-card">
              <div class="settings-card-hd">
                <span class="sc-icon">🏢</span>
                Shop Information &amp; Branding
              </div>
              <div class="settings-card-bd">
                <div class="settings-field-grid">
                  <div class="settings-field">
                    <label>Business Name</label>
                    <input type="text" id="set-shop-name" value="${_esc(set.shopName)}" />
                  </div>
                  <div class="settings-field">
                    <label>GSTIN</label>
                    <input type="text" id="set-gstin" value="${_esc(set.gstin)}" />
                  </div>
                  <div class="settings-field settings-field-full">
                    <label>Address</label>
                    <input type="text" id="set-address" value="${_esc(set.address)}" />
                  </div>
                  <div class="settings-field">
                    <label>Phone Number</label>
                    <input type="text" id="set-phone" value="${_esc(set.phone)}" />
                  </div>
                  <div class="settings-field">
                    <label>Shop Logo Upload</label>
                    <div style="display:flex;align-items:center;gap:10px">
                      <div class="set-logo-preview" id="logo-preview-box">
                        ${set.logoUrl ? `<img src="${_esc(set.logoUrl)}" style="max-width:100%;max-height:100%;object-fit:contain;display:block;" />` : 'SVMH'}
                      </div>
                      <input type="file" id="set-logo-file" accept="image/*" style="font-size:0.75rem" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 3. GST Configuration Section -->
            <div class="settings-card">
              <div class="settings-card-hd">
                <span class="sc-icon">💰</span>
                GST &amp; Tax Configuration
              </div>
              <div class="settings-card-bd">
                <div class="settings-field-grid">
                  <div class="settings-field">
                    <label>Default GST Rate</label>
                    <input type="text" value="18% (Hardware Standard)" disabled />
                  </div>
                  <div class="settings-field">
                    <label>GST Registration Type</label>
                    <input type="text" value="Regular – CGST + SGST" disabled />
                  </div>
                  <div class="settings-field">
                    <label>Round Off Strategy</label>
                    <select id="set-default-payment">
                      <option value="Cash" ${set.defaultPaymentMode==='Cash'?'selected':''}>Cash</option>
                      <option value="GPay" ${set.defaultPaymentMode==='GPay'?'selected':''}>GPay</option>
                      <option value="PhonePe" ${set.defaultPaymentMode==='PhonePe'?'selected':''}>PhonePe</option>
                      <option value="Card" ${set.defaultPaymentMode==='Card'?'selected':''}>Card</option>
                      <option value="Bank Transfer" ${set.defaultPaymentMode==='Bank Transfer'?'selected':''}>Bank Transfer</option>
                      <option value="Credit" ${set.defaultPaymentMode==='Credit'?'selected':''}>Credit</option>
                    </select>
                  </div>
                  <div class="settings-field">
                    <label>Printer Hardware</label>
                    <div style="display:flex;flex-direction:column;gap:6px;margin-top:4px">
                      <label style="font-weight:500;display:flex;align-items:center;gap:6px">
                        <input type="checkbox" id="set-thermal-printer" ${set.thermalPrinter?'checked':''} /> Thermal Printer (3-inch / 80mm)
                      </label>
                      <label style="font-weight:500;display:flex;align-items:center;gap:6px">
                        <input type="checkbox" id="set-a4-printer" ${set.a4Printer?'checked':''} /> Standard A4 Laser / Inkjet
                      </label>
                    </div>
                  </div>
                  <div class="settings-field settings-field-full">
                    <label for="set-footer-text">Invoice Footer Terms &amp; Notes</label>
                    <textarea id="set-footer-text" rows="2" style="padding:8px;border:1.5px solid #cbd5e1;border-radius:6px;font-family:inherit;font-size:0.85rem">${_esc(set.footerText)}</textarea>
                  </div>
                </div>
              </div>
            </div>

            <!-- 5. Backup & Restore Section -->
            <div class="settings-card">
              <div class="settings-card-hd">
                <span class="sc-icon">📦</span>
                Backup &amp; ZIP Package System
              </div>
              <div class="settings-card-bd" style="gap:12px;display:flex;flex-direction:column">
                <p style="font-size:0.8rem;color:#64748b;margin:0">
                  Generate full system backups including bills, products, customers, settings, and reports.
                </p>
                <div style="display:flex;gap:10px;flex-wrap:wrap">
                  <button class="qa-btn qa-btn-primary" id="btn-backup-now">
                    💾 Backup Now
                  </button>
                  <button class="qa-btn qa-btn-secondary" id="btn-export-backup">
                    📦 Export ZIP / Package
                  </button>
                  <label class="qa-btn qa-btn-secondary" style="cursor:pointer">
                    📤 Restore ZIP / Package
                    <input type="file" id="btn-restore-json" accept=".json,.zip" style="display:none" />
                  </label>
                  <button class="qa-btn" id="btn-reset-db" style="background:#fee2e2;color:#dc2626;border:1px solid #fca5a5">
                    ⚠️ Reset System
                  </button>
                </div>
              </div>
            </div>

            <!-- 6. Keyboard Shortcuts Section -->
            <div class="settings-card shortcuts-card" style="grid-column: 1 / -1">
              <div class="settings-card-hd">
                <span class="sc-icon">⌨️</span>
                Keyboard Shortcuts Reference
              </div>
              <div class="settings-card-bd">
                <div class="shortcuts-groups">
                  ${_shortcutsHTML()}
                </div>
              </div>
            </div>

          </div><!-- /settings-grid -->
        </div><!-- /settings-body -->
      </div><!-- /settings-page -->
    `;
  }

  /* ── Public render ──────────────────────────────────────────── */
  function render(container) {
    if (!document.getElementById('settings-css')) {
      const link = document.createElement('link');
      link.id   = 'settings-css';
      link.rel  = 'stylesheet';
      link.href = 'src/pages/Settings/Settings.css';
      document.head.appendChild(link);
    }

    if (typeof KeyboardShortcuts !== 'undefined') KeyboardShortcuts.clear();

    const set = (typeof DB !== 'undefined') ? DB.Settings.get() : {};
    const stats = (typeof DiskStorage !== 'undefined') ? DiskStorage.getStorageStats() : { path: 'D:/BillingSystem/data/', usedMB: '256 MB', totalGB: '10 GB', autoSave: 'Enabled', autoBackup: 'Enabled' };

    container.style.padding  = '';
    container.style.overflow = '';

    container.innerHTML = _buildHTML(set, stats);

    /* Change Storage Folder */
    _$('btn-change-folder')?.addEventListener('click', async () => {
      if (typeof DiskStorage !== 'undefined') {
        const res = await DiskStorage.selectStorageFolder();
        if (res.success) {
          _showToast(`📁 Storage folder set: ${res.path}`, 'success', 3200);
          render(container);
        } else if (res.error && res.error !== 'Folder selection cancelled') {
          _showToast(`⚠️ ${res.error}`, 'error', 3500);
        }
      }
    });

    let _currentLogoUrl = set.logoUrl || '';

    _$('set-logo-file')?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        _currentLogoUrl = evt.target.result;
        const box = _$('logo-preview-box');
        if (box) {
          box.innerHTML = `<img src="${_esc(_currentLogoUrl)}" style="max-width:100%;max-height:100%;object-fit:contain;display:block;" />`;
        }
      };
      reader.readAsDataURL(file);
    });

    /* Save Settings */
    _$('btn-save-settings')?.addEventListener('click', () => {
      const updated = {
        shopName:           _$('set-shop-name')?.value    || set.shopName,
        gstin:              _$('set-gstin')?.value        || set.gstin,
        address:            _$('set-address')?.value      || set.address,
        phone:              _$('set-phone')?.value        || set.phone,
        defaultPaymentMode: _$('set-default-payment')?.value || set.defaultPaymentMode,
        footerText:         _$('set-footer-text')?.value  || set.footerText,
        thermalPrinter:     _$('set-thermal-printer')?.checked ?? false,
        a4Printer:          _$('set-a4-printer')?.checked ?? true,
        logoUrl:            _currentLogoUrl,
      };

      if (typeof DB !== 'undefined') {
        DB.Settings.set(updated);
        _showToast('✅ Preferences saved successfully', 'success');
      }
    });

    /* Backup Now & Export Backup */
    const downloadBackup = async () => {
      if (typeof DB !== 'undefined' && typeof DiskStorage !== 'undefined') {
        const fullData = {
          bills: DB.Bills.all(),
          billItems: DB._raw('bill_items'),
          products: DB.Products.all(),
          customers: DB.Customers.all(),
          settings: DB.Settings.get(),
          deletedBills: DB.Bills.deleted(),
        };
        const pkg = DiskStorage.exportBackupPackage(fullData);

        // Attempt direct write to selected folder if handle granted
        let fsRes = { success: false };
        if (DiskStorage.writeBackupToFolder) {
          fsRes = await DiskStorage.writeBackupToFolder(pkg.fileName, pkg.jsonString);
        }

        // Always trigger browser file download as guaranteed backup mechanism
        const blob = new Blob([pkg.jsonString], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = pkg.fileName;
        link.click();

        if (fsRes.success) {
          _showToast(`💾 Backup written to selected folder & downloaded: ${pkg.fileName}`, 'success', 3500);
        } else {
          _showToast(`💾 Backup downloaded: ${pkg.fileName}`, 'success', 3500);
        }
      }
    };

    _$('btn-backup-now')?.addEventListener('click', downloadBackup);
    _$('btn-export-backup')?.addEventListener('click', downloadBackup);

    /* Restore JSON/ZIP Package Import with Safety Validation */
    _$('btn-restore-json')?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      _showRestoreWarningModal(async () => {
        try {
          let jsonText = '';
          if (typeof StorageHelper !== 'undefined' && StorageHelper.readBackupFile) {
            jsonText = await StorageHelper.readBackupFile(file);
          } else {
            jsonText = await file.text();
          }

          if (typeof DB !== 'undefined') {
            const res = DB.restoreData(jsonText);
            if (res.success) {
              if (typeof DiskStorage !== 'undefined') {
                DiskStorage.syncAllFiles({
                  bills: DB.Bills.all(),
                  products: DB.Products.all(),
                  customers: DB.Customers.all(),
                  settings: DB.Settings.get()
                });
              }
              _showToast(`✅ Database restored successfully (${res.billsCount || 0} bills recovered)`, 'success', 3500);
              setTimeout(() => render(container), 800);
            } else {
              _showToast(`⚠️ Restore failed: ${res.error}`, 'error', 4500);
            }
          }
        } catch (err) {
          console.error('[Settings] Restore exception:', err);
          _showToast(`⚠️ Restore failed: ${err.message || 'Corrupted backup file'}`, 'error', 4500);
        }
      });
      // Reset input element so re-selecting same file triggers change
      e.target.value = '';
    });

    /* Reset DB with Custom Modal */
    _$('btn-reset-db')?.addEventListener('click', () => {
      _showResetWarningModal(() => {
        if (typeof DB !== 'undefined') {
          DB._hardReset();
          _showToast('System data reset to initial defaults', 'info');
          setTimeout(() => render(container), 800);
        }
      });
    });
  }

  return { render };

})();
