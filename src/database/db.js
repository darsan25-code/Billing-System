/**
 * db.js – Local Database Engine (localStorage)
 *
 * Tables:   products | customers | bills | bill_items
 * Storage:  window.localStorage — no network, instant reads/writes
 *
 * Bill number format: SVMH-YYYYMM-NNNN  (e.g. SVMH-202608-0001)
 *
 * Public API:
 *   DB.init()             – Seed products once on first run
 *   DB.Products.*         – CRUD on products table
 *   DB.Customers.*        – CRUD on customers table
 *   DB.Bills.*            – CRUD on bills table
 *   DB.BillItems.*        – CRUD on bill_items table
 *   DB.nextBillNo()       – Reserve next sequential bill number
 *   DB.saveBill({...})    – Validate → save bill + items + reduce stock
 *   DB.stats()            – Dashboard aggregates
 *
 * Project: Sree Vel Murugan Hardware and Tiles – Billing System
 */

const DB = (() => {

  /* ── Storage prefix ─────────────────────────────────────────── */
  const PFX = 'svmh_';

  /* ── In-memory table cache for ultra-fast < 1ms reads ───────── */
  const _cache = {};

  /* ── Raw table access ───────────────────────────────────────── */
  const T = {
    get: (name) => {
      if (_cache[name]) return _cache[name];
      try {
        _cache[name] = JSON.parse(localStorage.getItem(PFX + name) || '[]');
      } catch {
        _cache[name] = [];
      }
      return _cache[name];
    },
    set: (name, data) => {
      const serialized = JSON.stringify(data);
      localStorage.setItem(PFX + name, serialized);
      _cache[name] = data;
    },
    clear: (name) => {
      delete _cache[name];
      localStorage.removeItem(PFX + name);
    },
    invalidate: (name) => {
      delete _cache[name];
    }
  };

  /* ── Meta (counters / flags) ────────────────────────────────── */
  const Meta = {
    get: ()     => { try { return JSON.parse(localStorage.getItem(PFX + 'meta') || '{}'); } catch { return {}; } },
    set: (data) => localStorage.setItem(PFX + 'meta', JSON.stringify(data)),
    patch: (partial) => Meta.set({ ...Meta.get(), ...partial }),
  };

  /* ── Helpers ────────────────────────────────────────────────── */
  const _now   = () => new Date().toISOString();
  const _today = () => new Date().toLocaleDateString('en-CA');   // YYYY-MM-DD

  /** Generate a unique ID with optional prefix string. */
  function _id(pfx = 'ID') {
    return `${pfx}${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  }

  /** Wrap an object with id / timestamps. */
  function _stamp(record, pfx = 'ID') {
    const now = _now();
    return {
      id: record.id || _id(pfx),
      ...record,
      createdAt: record.createdAt || now,
      updatedAt: now,
    };
  }

  /* ══════════════════════════════════════════════════════════════
     TRANSACTION SNAPSHOT & ROLLBACK HELPERS
     ══════════════════════════════════════════════════════════════ */
  function _createSnapshot() {
    return {
      bills: JSON.parse(JSON.stringify(T.get('bills'))),
      bill_items: JSON.parse(JSON.stringify(T.get('bill_items'))),
      products: JSON.parse(JSON.stringify(T.get('products'))),
      customers: JSON.parse(JSON.stringify(T.get('customers'))),
      product_history: JSON.parse(JSON.stringify(T.get('product_history'))),
      meta: Meta.get(),
    };
  }

  function _rollback(snapshot) {
    if (!snapshot) return;
    try {
      if (snapshot.bills) {
        _cache['bills'] = snapshot.bills;
        try { localStorage.setItem(PFX + 'bills', JSON.stringify(snapshot.bills)); } catch (e) {}
      }
      if (snapshot.bill_items) {
        _cache['bill_items'] = snapshot.bill_items;
        try { localStorage.setItem(PFX + 'bill_items', JSON.stringify(snapshot.bill_items)); } catch (e) {}
      }
      if (snapshot.products) {
        _cache['products'] = snapshot.products;
        try { localStorage.setItem(PFX + 'products', JSON.stringify(snapshot.products)); } catch (e) {}
      }
      if (snapshot.customers) {
        _cache['customers'] = snapshot.customers;
        try { localStorage.setItem(PFX + 'customers', JSON.stringify(snapshot.customers)); } catch (e) {}
      }
      if (snapshot.product_history) {
        _cache['product_history'] = snapshot.product_history;
        try { localStorage.setItem(PFX + 'product_history', JSON.stringify(snapshot.product_history)); } catch (e) {}
      }
      if (snapshot.meta) {
        try { Meta.set(snapshot.meta); } catch (e) {}
      }
    } catch (e) {
      console.error('[DB] Critical: Rollback error:', e);
    }
  }

  /* ══════════════════════════════════════════════════════════════
     PRODUCT HISTORY
     ══════════════════════════════════════════════════════════════ */
  const ProductHistory = {
    all: () => T.get('product_history'),
    forProduct: (productId) => T.get('product_history').filter(h => h.productId === productId),
    add(productId, type, description) {
      try {
        const all = T.get('product_history');
        const entry = _stamp({
          id: _id('PH'),
          productId,
          type,
          description,
        });
        all.push(entry);
        if (all.length > 500) {
          all.splice(0, all.length - 500); // Prevent unbounded storage growth
        }
        T.set('product_history', all);
        return entry;
      } catch (err) {
        console.warn('[DB] ProductHistory.add skipped or failed:', err);
        return null;
      }
    }
  };

  /* ══════════════════════════════════════════════════════════════
     INDEXEDDB PERSISTENCE LAYER (Background Durable Storage)
     ══════════════════════════════════════════════════════════════ */
  const IDB_NAME = 'SVMH_Billing_DurableStore';
  const IDB_VER  = 1;
  let _idb = null;

  function _openIDB() {
    return new Promise((resolve) => {
      if (typeof indexedDB === 'undefined') return resolve(null);
      if (_idb) return resolve(_idb);
      try {
        const req = indexedDB.open(IDB_NAME, IDB_VER);
        req.onupgradeneeded = (e) => {
          const db = e.target.result;
          ['bills', 'bill_items', 'products', 'customers', 'settings', 'meta', 'product_history'].forEach(table => {
            if (!db.objectStoreNames.contains(table)) {
              db.createObjectStore(table, { keyPath: 'id', autoIncrement: false });
            }
          });
        };
        req.onsuccess = (e) => {
          _idb = e.target.result;
          resolve(_idb);
        };
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }

  async function _syncToIndexedDB() {
    try {
      const db = await _openIDB();
      if (!db) return;
      const tables = ['bills', 'bill_items', 'products', 'customers', 'product_history'];
      const tx = db.transaction(tables, 'readwrite');
      tables.forEach(tableName => {
        const store = tx.objectStore(tableName);
        store.clear();
        const records = T.get(tableName) || [];
        records.forEach(r => {
          if (r && r.id) store.put(r);
        });
      });
    } catch (e) {
      // Background persistence sync
    }
  }

  async function _checkAndRecoverFromIndexedDB() {
    try {
      const bills = T.get('bills');
      const products = T.get('products');
      if (bills.length > 0 || products.length > 0) return false;

      const db = await _openIDB();
      if (!db) return false;

      return new Promise((resolve) => {
        const tx = db.transaction(['bills', 'bill_items', 'products', 'customers', 'product_history'], 'readonly');
        let recoveredBills = [];
        let recoveredProducts = [];
        let recoveredItems = [];
        let recoveredCustomers = [];
        let recoveredHistory = [];

        tx.objectStore('bills').getAll().onsuccess = (e) => { recoveredBills = e.target.result || []; };
        tx.objectStore('products').getAll().onsuccess = (e) => { recoveredProducts = e.target.result || []; };
        tx.objectStore('bill_items').getAll().onsuccess = (e) => { recoveredItems = e.target.result || []; };
        tx.objectStore('customers').getAll().onsuccess = (e) => { recoveredCustomers = e.target.result || []; };
        tx.objectStore('product_history').getAll().onsuccess = (e) => { recoveredHistory = e.target.result || []; };

        tx.oncomplete = () => {
          if (recoveredBills.length > 0 || recoveredProducts.length > 0) {
            console.warn(`[DB] Auto-recovered ${recoveredBills.length} bills and ${recoveredProducts.length} products from IndexedDB!`);
            if (recoveredBills.length > 0) T.set('bills', recoveredBills);
            if (recoveredProducts.length > 0) T.set('products', recoveredProducts);
            if (recoveredItems.length > 0) T.set('bill_items', recoveredItems);
            if (recoveredCustomers.length > 0) T.set('customers', recoveredCustomers);
            if (recoveredHistory.length > 0) T.set('product_history', recoveredHistory);
            resolve(true);
          } else {
            resolve(false);
          }
        };
        tx.onerror = () => resolve(false);
      });
    } catch {
      return false;
    }
  }

  /* ══════════════════════════════════════════════════════════════
     PRODUCTS
     ══════════════════════════════════════════════════════════════ */
  const Products = {

    all: ()         => T.get('products'),
    find: (id)      => T.get('products').find(p => p.id === id || String(p.id) === String(id)) || null,
    get: (id)       => T.get('products').find(p => p.id === id || String(p.id) === String(id)) || null,
    findByName: (n) => T.get('products').find(p => p.name.toLowerCase() === n.toLowerCase()) || null,

    /** Full-text search across name, model, brand, product code (id), HSN, unit. */
    search(query, max = 8) {
      if (!query || query.length < 2) return [];
      const q = query.toLowerCase();
      return T.get('products')
        .filter(p =>
          (p.name  || '').toLowerCase().includes(q)  ||
          (p.model || '').toLowerCase().includes(q)  ||
          (p.brand || '').toLowerCase().includes(q)  ||
          (p.id    || '').toLowerCase().includes(q)  ||
          String(p.hsn || '').includes(q)            ||
          (p.unit  || '').toLowerCase().includes(q)
        )
        .slice(0, max);
    },

    /** Reduce or restore stock. Never goes below zero. Tracks history. */
    adjustStock(id, qty, billNo = '') {
      if (!id || qty === undefined || qty === null) return;
      const numericQty = parseFloat(qty);
      if (isNaN(numericQty) || numericQty === 0) return;

      const rows = T.get('products');
      const i    = rows.findIndex(p => p.id === id);
      if (i === -1) return;
      const oldStock = parseFloat(rows[i].stock) || 0;
      const newStock = Math.max(0, oldStock - numericQty);
      rows[i].stock     = Math.round(newStock * 100) / 100;
      rows[i].updatedAt = _now();
      T.set('products', rows);

      const billInfo = billNo ? ` (Bill: ${billNo})` : '';
      const actionDesc = numericQty > 0
        ? `Stock reduced: ${oldStock} → ${rows[i].stock}${billInfo}`
        : `Stock restored: ${oldStock} → ${rows[i].stock}${billInfo}`;
      ProductHistory.add(id, 'stock_update', actionDesc);
    },

    /** Update rate (future: product management page). */
    updateRate(id, rate) {
      const rows = T.get('products');
      const i    = rows.findIndex(p => p.id === id);
      if (i === -1) return null;
      rows[i].rate      = rate;
      rows[i].updatedAt = _now();
      T.set('products', rows);
      return rows[i];
    },

    /**
     * Add a new product.
     * Auto-generates the next sequential product code (PRD001, PRD002 …).
     */
    insert(data) {
      const rows   = T.get('products');
      const maxNum = rows.reduce((m, p) => {
        const n = parseInt((p.id || '').replace(/\D/g, ''), 10) || 0;
        return Math.max(m, n);
      }, 0);
      const newId = `PRD${String(maxNum + 1).padStart(3, '0')}`;

      const product = _stamp({
        id:            newId,
        name:          (data.name          || '').trim(),
        model:         (data.model         || '').trim(),
        category:      (data.category      || '').trim(),
        brand:         (data.brand         || '').trim(),
        hsn:           String(data.hsn     || ''),
        unit:          data.unit           || '',
        purchasePrice: parseFloat(data.purchasePrice) || 0,
        rate:          parseFloat(data.rate)          || 0,
        gst:           parseFloat(data.gst)           || 0,
        stock:         parseFloat(data.stock)         || 0,
        minStock:      parseFloat(data.minStock)      || 10,
      });

      rows.push(product);
      T.set('products', rows);

      // Log history
      ProductHistory.add(newId, 'created',
        `Product "${product.name}" added at ₹${product.rate}. Opening stock: ${product.stock}`);

      return product;
    },

    /**
     * Update an existing product by ID.
     * Tracks changes in ProductHistory.
     */
    update(id, data) {
      const rows = T.get('products');
      const i    = rows.findIndex(p => p.id === id);
      if (i === -1) return null;

      const old      = { ...rows[i] };
      const changes  = [];

      if (data.name          !== undefined) { rows[i].name          = (data.name || '').trim(); }
      if (data.model         !== undefined) { rows[i].model         = (data.model || '').trim(); }
      if (data.category      !== undefined) { rows[i].category      = (data.category || '').trim(); }
      if (data.brand         !== undefined) { rows[i].brand         = (data.brand || '').trim(); }
      if (data.hsn           !== undefined) { rows[i].hsn           = String(data.hsn); }
      if (data.unit          !== undefined) { rows[i].unit          = data.unit || rows[i].unit; }
      if (data.purchasePrice !== undefined) { rows[i].purchasePrice = parseFloat(data.purchasePrice) || 0; }
      if (data.rate          !== undefined) {
        if (data.rate !== old.rate) changes.push(`Selling price: ₹${old.rate} → ₹${data.rate}`);
        rows[i].rate = parseFloat(data.rate) || 0;
      }
      if (data.gst           !== undefined) { rows[i].gst      = parseFloat(data.gst)   || 0; }
      if (data.stock         !== undefined) {
        if (data.stock !== old.stock) changes.push(`Stock: ${old.stock} → ${data.stock}`);
        rows[i].stock = parseFloat(data.stock) || 0;
      }
      if (data.minStock      !== undefined) { rows[i].minStock = parseFloat(data.minStock) || 10; }
      rows[i].updatedAt = _now();

      T.set('products', rows);

      // Log history if meaningful changes occurred
      if (changes.length > 0 || data.name !== old.name) {
        const desc = changes.length > 0 ? changes.join(' · ') : `Product details updated`;
        ProductHistory.add(id, changes.length > 0 ? 'edited' : 'edited', desc);
      }

      return rows[i];
    },

    /** Hard-delete a product by ID. */
    remove(id) {
      const p = T.get('products').find(x => x.id === id);
      T.set('products', T.get('products').filter(x => x.id !== id));
      if (p) ProductHistory.add(id, 'deleted', `Product "${p.name}" was deleted`);
    },

    count: () => T.get('products').length,
  };

  /* ══════════════════════════════════════════════════════════════
     CUSTOMERS
     ══════════════════════════════════════════════════════════════ */
  const Customers = {

    all:  ()   => T.get('customers'),
    find: (id) => T.get('customers').find(c => c.id === id || String(c.id) === String(id)) || null,

    findByPhone: (phone) =>
      T.get('customers').find(c => c.phone && c.phone === (phone || '').trim()) || null,

    /**
     * Look up an existing customer (by phone, then by name) or create one.
     * Returns the customer record.
     */
    upsert(name, phone, address = '') {
      const all  = T.get('customers');
      const norm = (s) => (s || '').trim().toLowerCase();

      let customer = null;
      if (phone && phone.trim()) {
        customer = all.find(c => c.phone === phone.trim()) || null;
      }
      if (!customer && name) {
        customer = all.find(c => norm(c.name) === norm(name)) || null;
      }

      if (!customer) {
        customer = _stamp({
          id:               _id('CUS'),
          name:             (name || 'Walk-in Customer').trim(),
          phone:            (phone || '').trim(),
          address:          (address || '').trim(),
          totalBills:       0,
          totalAmount:      0,
          lastPurchaseDate: _today(),
        });
        all.push(customer);
        T.set('customers', all);
      } else if (address && address.trim() && !customer.address) {
        customer.address = address.trim();
        customer.updatedAt = _now();
        T.set('customers', all);
      }

      return customer;
    },

    insert(data) {
      const all = T.get('customers');
      const customer = _stamp({
        id:               _id('CUS'),
        name:             (data.name || '').trim(),
        phone:            (data.phone || '').trim(),
        address:          (data.address || '').trim(),
        notes:            (data.notes || '').trim(),
        totalBills:       0,
        totalAmount:      0,
        lastPurchaseDate: null,
      });
      all.push(customer);
      T.set('customers', all);
      return customer;
    },

    update(id, data) {
      const all = T.get('customers');
      const i   = all.findIndex(c => c.id === id);
      if (i === -1) return null;
      if (data.name    !== undefined) all[i].name    = data.name.trim();
      if (data.phone   !== undefined) all[i].phone   = data.phone.trim();
      if (data.address !== undefined) all[i].address = data.address.trim();
      if (data.notes   !== undefined) all[i].notes   = data.notes.trim();
      all[i].updatedAt = _now();
      T.set('customers', all);
      return all[i];
    },

    remove(id) {
      T.set('customers', T.get('customers').filter(c => c.id !== id));
    },

    /** Increment bill count, revenue, and update last purchase date. */
    addBillTotals(id, amount, date) {
      const all = T.get('customers');
      const i   = all.findIndex(c => c.id === id);
      if (i === -1) return;
      all[i].totalBills       = (all[i].totalBills  || 0) + 1;
      all[i].totalAmount      = (all[i].totalAmount || 0) + amount;
      all[i].lastPurchaseDate = date || _today();
      all[i].updatedAt        = _now();
      T.set('customers', all);
    },

    billsForCustomer(idOrCustomer) {
      const allBills = Bills.all();
      if (!idOrCustomer) return [];

      let cust = null;
      if (typeof idOrCustomer === 'object' && idOrCustomer !== null) {
        cust = idOrCustomer;
      } else {
        cust = Customers.find(idOrCustomer);
      }

      if (cust) {
        const normName = (cust.name || '').trim().toLowerCase();
        const normPhone = (cust.phone || '').trim();
        const isWalkin = normName.includes('walk-in');

        return allBills.filter(b => {
          if (b.customerId === cust.id) return true;
          if (cust.billNo && (b.billNo === cust.billNo || b.id === cust.billNo)) return true;
          if (!isWalkin && normPhone && (b.customerPhone || '').trim() === normPhone) return true;
          if (!isWalkin && normName && (b.customerName || '').trim().toLowerCase() === normName) return true;
          return false;
        }).sort((a, b) => (b.createdAt || b.date || '').localeCompare(a.createdAt || a.date || ''));
      }

      return allBills.filter(b => b.customerId === idOrCustomer || b.billNo === idOrCustomer || b.id === idOrCustomer)
        .sort((a, b) => (b.createdAt || b.date || '').localeCompare(a.createdAt || a.date || ''));
    },

    count: () => T.get('customers').length,
  };

  /* ══════════════════════════════════════════════════════════════
     BILLS
     ══════════════════════════════════════════════════════════════ */
  const Bills = {

    all:       ()     => T.get('bills').filter(b => !b.isDeleted),
    deleted:   ()     => T.get('bills').filter(b => b.isDeleted === true),
    find:      (id)   => T.get('bills').find(b => b.id === id || String(b.id) === String(id)) || null,
    findByNo:  (no)   => T.get('bills').find(b => b.billNo === no) || null,

    forCustomer: (customerId) =>
      T.get('bills').filter(b => !b.isDeleted && b.customerId === customerId),

    /** Most-recent first, capped at `n`. */
    recent: (n = 20) =>
      T.get('bills')
        .filter(b => !b.isDeleted)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, n),

    insert(data) {
      const all  = T.get('bills');
      const bill = _stamp({ id: _id('BILL'), ...data, status: 'saved', date: _today(), isDeleted: false });
      all.push(bill);
      T.set('bills', all);
      return bill;
    },

    updateStatus(id, status) {
      const all = T.get('bills');
      const i   = all.findIndex(b => b.id === id);
      if (i === -1) return null;
      all[i].status    = status;
      all[i].updatedAt = _now();
      T.set('bills', all);
      return all[i];
    },

    count:        ()  => T.get('bills').filter(b => !b.isDeleted).length,
    todayCount:   ()  => T.get('bills').filter(b => !b.isDeleted && b.date === _today()).length,
    todayRevenue: ()  => T.get('bills').filter(b => !b.isDeleted && b.date === _today()).reduce((s, b) => s + (b.grandTotal || 0), 0),
    weeklyRevenue: () => {
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      return T.get('bills').filter(b => !b.isDeleted && b.date >= weekAgo).reduce((s, b) => s + (b.grandTotal || 0), 0);
    },
    monthlyRevenue: () => {
      const currentYM = _today().slice(0, 7);
      return T.get('bills').filter(b => !b.isDeleted && (b.date || '').startsWith(currentYM)).reduce((s, b) => s + (b.grandTotal || 0), 0);
    },
    totalRevenue: () => T.get('bills').filter(b => !b.isDeleted).reduce((s, b) => s + (b.grandTotal || 0), 0),
  };

  /* ══════════════════════════════════════════════════════════════
     BILL ITEMS
     ══════════════════════════════════════════════════════════════ */
  const BillItems = {

    forBill: (billId) => T.get('bill_items').filter(i => i.billId === billId),

    insertMany(billId, items) {
      const all     = T.get('bill_items');
      const created = items.map(item =>
        _stamp({ id: _id('BI'), billId, ...item })
      );
      T.set('bill_items', [...all, ...created]);
      return created;
    },

    count: () => T.get('bill_items').length,
  };

  /* ══════════════════════════════════════════════════════════════
     BILL NUMBER  (sequential, never repeats)
     ══════════════════════════════════════════════════════════════ */

  /**
   * Historical duplicate repair helper.
   * Scans all stored bills (active and deleted). If any duplicate invoice number exists,
   * reassigns a new unique sequence to duplicate historical records preserving all data.
   */
  function _repairHistoricalDuplicateInvoiceNumbers() {
    const bills = T.get('bills');
    if (!bills || !Array.isArray(bills) || bills.length === 0) return;

    const seen = new Set();
    let modified = false;

    bills.forEach((bill) => {
      const currentNo = String(bill.invoiceNo || bill.billNo || '').trim();

      if (!currentNo || seen.has(currentNo)) {
        const d = new Date();
        const ym = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
        let prefix = `SVMH-${ym}-`;
        if (currentNo && currentNo.startsWith('SVMH-')) {
          const parts = currentNo.split('-');
          if (parts.length >= 3) {
            prefix = `${parts[0]}-${parts[1]}-`;
          }
        }

        let seq = 1;
        let newNo = `${prefix}${String(seq).padStart(4, '0')}`;
        const allNos = new Set([...seen, ...bills.map(b => String(b.invoiceNo || b.billNo || ''))]);

        while (allNos.has(newNo)) {
          seq++;
          newNo = `${prefix}${String(seq).padStart(4, '0')}`;
        }

        console.warn(`[DB] Repaired duplicate invoice number: "${currentNo}" -> "${newNo}" (Bill ID: ${bill.id})`);
        bill.billNo = newNo;
        bill.invoiceNo = newNo;
        seen.add(newNo);
        modified = true;
      } else {
        bill.billNo = currentNo;
        bill.invoiceNo = currentNo;
        seen.add(currentNo);
      }
    });

    if (modified) {
      T.set('bills', bills);
    }
  }

  /**
   * Reserve the next available unique bill number.
   * Format: SVMH-YYYYMM-NNNN   e.g. SVMH-202608-0108
   * Checks ALL active and deleted/trash bills to guarantee no duplication.
   */
  function nextBillNo() {
    const bills = T.get('bills') || [];
    const d     = new Date();
    const ym    = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
    const prefix = `SVMH-${ym}-`;

    let maxSeq = 0;
    bills.forEach(b => {
      const no = String(b.billNo || b.invoiceNo || '');
      if (no.startsWith(prefix)) {
        const seq = parseInt(no.replace(prefix, ''), 10);
        if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
      } else if (no.startsWith('SVMH-')) {
        const parts = no.split('-');
        const seq = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
      }
    });

    let nextSeq = maxSeq + 1;
    let candidate = `${prefix}${String(nextSeq).padStart(4, '0')}`;

    const existingNos = new Set(bills.map(b => String(b.billNo || b.invoiceNo || '')));
    while (existingNos.has(candidate)) {
      nextSeq++;
      candidate = `${prefix}${String(nextSeq).padStart(4, '0')}`;
    }

    Meta.patch({ billCounter: Math.max((Meta.get().billCounter || 0), nextSeq) });
    return candidate;
  }

  /* ══════════════════════════════════════════════════════════════
     SAVE BILL  (main transactional operation)
     ══════════════════════════════════════════════════════════════ */

  /**
   * Validate, persist a complete bill, reduce product stock atomically with rollback.
   */
  function saveBill({ customerName, customerPhone, customerAddress, billType, paymentMode, billNo, items, totals }) {

    /* ── 1. Validation ── */
    const errors      = [];
    const fieldErrors = {};

    const nameTrimmed  = (customerName  || '').trim();
    const phoneTrimmed = (customerPhone || '').replace(/\D/g, '');
    const addressTrimmed = (customerAddress || '').trim();

    // At least one item is required
    if (!items || items.length === 0) {
      errors.push('Add at least one product to the bill.');
    } else {
      items.forEach((item, i) => {
        const q = parseFloat(item.qty);
        if (isNaN(q) || q <= 0)
          errors.push(`Row ${i + 1}: Quantity must be greater than zero.`);
        if (!item.productName || !item.productName.trim())
          errors.push(`Row ${i + 1}: Product name is missing.`);
        const r = parseFloat(item.rate);
        if (isNaN(r) || r < 0)
          errors.push(`Row ${i + 1}: Product price must be zero or greater.`);
      });
    }

    if (errors.length > 0) return { success: false, errors, fieldErrors };

    const snapshot = _createSnapshot();

    try {
      /* ── 2. Ensure Bill Number is non-empty and unique ── */
      const allBills = T.get('bills') || [];
      let finalBillNo = billNo ? billNo.trim() : '';

      if (!finalBillNo || allBills.some(b => b.billNo === finalBillNo || b.invoiceNo === finalBillNo)) {
        finalBillNo = nextBillNo();
      }

      /* ── 3. Find or create customer (walk-in when name is blank) ── */
      const effectiveName = nameTrimmed || 'Walk-in Customer';
      const customer = Customers.upsert(effectiveName, (customerPhone || '').trim(), addressTrimmed);

      /* ── 4. Insert bill ── */
      const bill = Bills.insert({
        billNo:          finalBillNo,
        invoiceNo:       finalBillNo,
        customerId:      customer.id,
        customerName:    customer.name,
        customerPhone:   customer.phone,
        customerAddress: addressTrimmed,
        address:         addressTrimmed,
        billType:        billType || 'normal',
        paymentMode:     paymentMode || 'Cash',
        paymentMethod:   paymentMode || 'Cash',
        itemCount:       items.length,
        subtotal:          totals.subtotal          || 0,
        totalItemDiscount: totals.totalItemDiscount || 0,
        totalTaxable:      totals.totalTaxable      || 0,
        totalGst:          totals.totalGst          || 0,
        billDiscount:      totals.billDiscount      || 0,
        roundOff:          totals.roundOff          || 0,
        grandTotal:        totals.grandTotal        || 0,
      });

      /* ── 5. Insert bill items + reduce stock ── */
      const savedItems = BillItems.insertMany(bill.id, items.map(item => ({
        productId:      item.productId   || null,
        productName:    item.productName || '',
        hsn:            item.hsn         || '',
        unit:           item.unit        || '',
        qty:            parseFloat(item.qty) || 0,
        rate:           parseFloat(item.rate) || 0,
        discPct:        parseFloat(item.discPct) || 0,
        gstPct:         parseFloat(item.gstPct)  || 0,
        baseAmount:     parseFloat(item.baseAmount)     || 0,
        discountAmount: parseFloat(item.discountAmount) || 0,
        taxableAmount:  parseFloat(item.taxableAmount)  || 0,
        gstAmount:      parseFloat(item.gstAmount)      || 0,
        rowTotal:       parseFloat(item.rowTotal)       || 0,
      })));

      items.forEach(item => {
        if (item.productId) Products.adjustStock(item.productId, item.qty, finalBillNo);
      });

      /* ── 6. Update customer aggregates ── */
      Customers.addBillTotals(customer.id, totals.grandTotal || 0, bill.date);

      /* ── 7. Sync to DiskStorage (non-blocking) ── */
      if (typeof DiskStorage !== 'undefined') {
        try {
          DiskStorage.writeBillFile(bill, savedItems);
          DiskStorage.writeProductsFile(Products.all());
          DiskStorage.writeCustomersFile(Customers.all());
        } catch (e) {}
      }

      /* ── 8. Sync to IndexedDB for true persistent storage ── */
      _syncToIndexedDB();

      return { success: true, bill, items: savedItems, customer };
    } catch (err) {
      console.error('[DB] Transaction error in saveBill, rolling back:', err);
      _rollback(snapshot);
      return { success: false, error: err.message || 'Database write failure during bill save.' };
    }
  }

  /* ══════════════════════════════════════════════════════════════
     UPDATE EXISTING BILL
     ══════════════════════════════════════════════════════════════ */
  function updateBill({ billId, customerName, customerPhone, customerAddress, billType, paymentMode, billNo, items, totals }) {
    /* Validation */
    if (!items || items.length === 0) {
      return { success: false, error: 'Cannot update bill with zero items.' };
    }
    for (let i = 0; i < items.length; i++) {
      const q = parseFloat(items[i].qty);
      if (isNaN(q) || q <= 0) {
        return { success: false, error: `Row ${i + 1}: Quantity must be greater than zero.` };
      }
    }

    const bills = T.get('bills') || [];
    const index = bills.findIndex(b => b.id === billId || b.billNo === billNo || b.invoiceNo === billNo || b.invoiceNo === billId || b.id === billNo || b.billNo === billId);
    if (index === -1) return { success: false, error: 'Bill not found' };

    const snapshot = _createSnapshot();

    try {
      const targetBill = bills[index];
      const targetInvoiceNo = targetBill.invoiceNo || targetBill.billNo || billNo || billId;
      const oldGrandTotal = parseFloat(targetBill.grandTotal) || 0;
      const oldCustomerId = targetBill.customerId;

      const nameTrimmed    = (customerName  || '').trim();
      const addressTrimmed = (customerAddress || '').trim();
      const effectiveName  = nameTrimmed || 'Walk-in Customer';
      const customer       = Customers.upsert(effectiveName, (customerPhone || '').trim(), addressTrimmed);

      // Restore old stock for previous items of this bill before applying new items
      const oldItems = BillItems.forBill(targetBill.id);
      oldItems.forEach(oldIt => {
        if (oldIt.productId) {
          Products.adjustStock(oldIt.productId, -oldIt.qty, targetInvoiceNo);
        }
      });

      // Remove old bill_items
      const allBillItems = T.get('bill_items').filter(it => it.billId !== targetBill.id);

      // Insert new bill_items
      const newItems = items.map(item => _stamp({
        id: _id('BI'),
        billId: targetBill.id,
        productId:      item.productId   || null,
        productName:    item.productName || '',
        hsn:            item.hsn         || '',
        unit:           item.unit        || '',
        qty:            parseFloat(item.qty) || 0,
        rate:           parseFloat(item.rate) || 0,
        discPct:        parseFloat(item.discPct) || 0,
        gstPct:         parseFloat(item.gstPct)  || 0,
        baseAmount:     parseFloat(item.baseAmount)     || 0,
        discountAmount: parseFloat(item.discountAmount) || 0,
        taxableAmount:  parseFloat(item.taxableAmount)  || 0,
        gstAmount:      parseFloat(item.gstAmount)      || 0,
        rowTotal:       parseFloat(item.rowTotal)       || 0,
      }));

      T.set('bill_items', [...allBillItems, ...newItems]);

      // Reduce stock for new items
      items.forEach(item => {
        if (item.productId) {
          Products.adjustStock(item.productId, item.qty, targetInvoiceNo);
        }
      });

      // Reconcile customer totals accurately
      const newGrandTotal = parseFloat(totals.grandTotal) || 0;
      const allCustomers = T.get('customers');

      if (oldCustomerId && oldCustomerId !== customer.id) {
        // Customer was changed: adjust old customer totals
        const oldCustIdx = allCustomers.findIndex(c => c.id === oldCustomerId);
        if (oldCustIdx !== -1) {
          allCustomers[oldCustIdx].totalBills = Math.max(0, (allCustomers[oldCustIdx].totalBills || 1) - 1);
          allCustomers[oldCustIdx].totalAmount = Math.max(0, (allCustomers[oldCustIdx].totalAmount || 0) - oldGrandTotal);
          allCustomers[oldCustIdx].updatedAt = _now();
        }
        // Add new customer totals
        const newCustIdx = allCustomers.findIndex(c => c.id === customer.id);
        if (newCustIdx !== -1) {
          allCustomers[newCustIdx].totalBills = (allCustomers[newCustIdx].totalBills || 0) + 1;
          allCustomers[newCustIdx].totalAmount = (allCustomers[newCustIdx].totalAmount || 0) + newGrandTotal;
          allCustomers[newCustIdx].lastPurchaseDate = targetBill.date || _today();
          allCustomers[newCustIdx].updatedAt = _now();
        }
      } else {
        // Same customer: adjust amount difference
        const custIdx = allCustomers.findIndex(c => c.id === customer.id);
        if (custIdx !== -1) {
          const diff = newGrandTotal - oldGrandTotal;
          allCustomers[custIdx].totalAmount = Math.max(0, (allCustomers[custIdx].totalAmount || 0) + diff);
          allCustomers[custIdx].updatedAt = _now();
        }
      }
      T.set('customers', allCustomers);

      // Update bill record keeping the same invoiceNo & billNo & ID
      const updatedBill = {
        ...targetBill,
        invoiceNo:         targetInvoiceNo,
        billNo:            targetInvoiceNo,
        customerId:        customer.id,
        customerName:      customer.name,
        customerPhone:     customer.phone,
        customerAddress:   addressTrimmed,
        address:           addressTrimmed,
        billType:          billType || targetBill.billType || 'normal',
        paymentMode:       paymentMode || targetBill.paymentMode || 'Cash',
        paymentMethod:     paymentMode || targetBill.paymentMethod || 'Cash',
        items:             newItems,
        itemCount:         items.length,
        subtotal:          totals.subtotal          || 0,
        totalItemDiscount: totals.totalItemDiscount || 0,
        totalTaxable:      totals.totalTaxable      || 0,
        totalGst:          totals.totalGst          || 0,
        billDiscount:      totals.billDiscount      || 0,
        roundOff:          totals.roundOff          || 0,
        grandTotal:        newGrandTotal,
        updatedAt:         _now(),
      };

      bills[index] = updatedBill;
      T.set('bills', bills);

      // Sync to DiskStorage (non-blocking)
      if (typeof DiskStorage !== 'undefined') {
        try {
          DiskStorage.writeBillFile(updatedBill, newItems);
          DiskStorage.writeProductsFile(Products.all());
          DiskStorage.writeCustomersFile(Customers.all());
        } catch (e) {}
      }

      // Sync to IndexedDB
      _syncToIndexedDB();

      return { success: true, bill: updatedBill, items: newItems, customer };
    } catch (err) {
      console.error('[DB] Transaction error in updateBill, rolling back:', err);
      _rollback(snapshot);
      return { success: false, error: err.message || 'Database write failure during bill update.' };
    }
  }

  /* ══════════════════════════════════════════════════════════════
     UPDATE BILL PAYMENT MODE
     ══════════════════════════════════════════════════════════════ */
  function updateBillPaymentMode(billIdOrNo, newMode) {
    const bills = T.get('bills');
    const i = bills.findIndex(b => b.id === billIdOrNo || b.billNo === billIdOrNo);
    if (i === -1) return { success: false, error: 'Bill not found' };

    bills[i].paymentMode   = newMode;
    bills[i].paymentMethod = newMode;
    bills[i].updatedAt     = _now();
    T.set('bills', bills);

    if (typeof DiskStorage !== 'undefined') {
      try {
        const items = BillItems.forBill(bills[i].id);
        DiskStorage.writeBillFile(bills[i], items);
      } catch (e) {}
    }
    _syncToIndexedDB();

    return { success: true, bill: bills[i] };
  }

  /* ══════════════════════════════════════════════════════════════
     DELETE & RESTORE BILL (Soft Delete with Stock Reversal)
     ══════════════════════════════════════════════════════════════ */

  function deleteBill(billIdOrNo) {
    const bills = T.get('bills');
    const i = bills.findIndex(b => b.id === billIdOrNo || b.billNo === billIdOrNo);
    if (i === -1) return { success: false, error: 'Bill not found' };

    const bill = bills[i];
    if (bill.isDeleted) return { success: false, error: 'Bill already deleted' };

    const snapshot = _createSnapshot();

    try {
      // Step 1: Soft-delete bill in memory & storage (instant)
      bills[i].isDeleted = true;
      bills[i].deletedAt = _now();
      T.set('bills', bills);

      // Step 2: Update customer aggregate totals
      if (bill.customerId) {
        const custs = T.get('customers');
        const ci = custs.findIndex(c => c.id === bill.customerId);
        if (ci !== -1) {
          custs[ci].totalBills = Math.max(0, (custs[ci].totalBills || 1) - 1);
          custs[ci].totalAmount = Math.max(0, (custs[ci].totalAmount || 0) - (bill.grandTotal || 0));
          custs[ci].updatedAt = _now();
          T.set('customers', custs);
        }
      }

      // Step 3: Restore product stock quantities SYNCHRONOUSLY and ATOMICALLY
      const items = BillItems.forBill(bill.id);
      items.forEach(item => {
        if (item.productId) {
          Products.adjustStock(item.productId, -(item.qty || 0), bill.billNo);
        }
      });

      _syncToIndexedDB();
      return { success: true, bill: bills[i] };
    } catch (err) {
      console.error('[DB] Error in deleteBill, rolling back:', err);
      _rollback(snapshot);
      return { success: false, error: err.message || 'Failed to delete bill' };
    }
  }

  function permanentlyDeleteBill(billIdOrNo) {
    const bills = T.get('bills');
    const bill = bills.find(b => b.id === billIdOrNo || b.billNo === billIdOrNo);
    if (!bill) return { success: false, error: 'Bill not found' };

    const snapshot = _createSnapshot();
    try {
      // Remove bill and bill items permanently
      const updatedBills = bills.filter(b => b.id !== bill.id);
      const updatedItems = T.get('bill_items').filter(i => i.billId !== bill.id);
      T.set('bills', updatedBills);
      T.set('bill_items', updatedItems);

      if (typeof DiskStorage !== 'undefined') {
        try { DiskStorage.removeBillFile(bill.billNo); } catch (e) {}
      }
      _syncToIndexedDB();
      return { success: true, bill };
    } catch (err) {
      _rollback(snapshot);
      return { success: false, error: err.message };
    }
  }

  function restoreBill(billIdOrNo) {
    const bills = T.get('bills');
    const i = bills.findIndex(b => b.id === billIdOrNo || b.billNo === billIdOrNo);
    if (i === -1) return { success: false, error: 'Bill not found' };

    const bill = bills[i];
    if (!bill.isDeleted) return { success: false, error: 'Bill is not deleted' };

    const snapshot = _createSnapshot();
    try {
      // 1. Fetch items and re-deduct product stock
      const items = BillItems.forBill(bill.id);
      items.forEach(item => {
        if (item.productId) {
          Products.adjustStock(item.productId, item.qty || 0, bill.billNo);
        }
      });

      // 2. Clear soft-delete flag
      bills[i].isDeleted = false;
      delete bills[i].deletedAt;
      T.set('bills', bills);

      // 3. Re-add customer aggregate totals
      if (bill.customerId) {
        const custs = T.get('customers');
        const ci = custs.findIndex(c => c.id === bill.customerId);
        if (ci !== -1) {
          custs[ci].totalBills = (custs[ci].totalBills || 0) + 1;
          custs[ci].totalAmount = (custs[ci].totalAmount || 0) + (bill.grandTotal || 0);
          custs[ci].updatedAt = _now();
          T.set('customers', custs);
        }
      }

      _syncToIndexedDB();
      return { success: true, bill: bills[i] };
    } catch (err) {
      _rollback(snapshot);
      return { success: false, error: err.message };
    }
  }

  /* ══════════════════════════════════════════════════════════════
     DASHBOARD STATS
     ══════════════════════════════════════════════════════════════ */

  function stats() {
    return {
      todayBills:     Bills.todayCount(),
      todayRevenue:   Bills.todayRevenue(),
      totalBills:     Bills.count(),
      totalCustomers: Customers.count(),
      totalProducts:  Products.count(),
      totalRevenue:   Bills.totalRevenue(),
    };
  }

  /* ══════════════════════════════════════════════════════════════
     INITIALISATION  (run once on first app launch)
     ══════════════════════════════════════════════════════════════ */

  function init() {
    // 0. Clear in-memory cache to ensure fresh read from persistent storage
    for (const k of Object.keys(_cache)) {
      delete _cache[k];
    }

    // 1. One-time cleanup of legacy duplicate mirror keys in localStorage to prevent QuotaExceededError
    try {
      if (typeof localStorage !== 'undefined') {
        const legacyBills = localStorage.getItem('bills');
        const canonBills = localStorage.getItem(PFX + 'bills');
        if (legacyBills && (!canonBills || canonBills === '[]')) {
          localStorage.setItem(PFX + 'bills', legacyBills);
        }
        localStorage.removeItem('bills'); // Remove redundant mirror copy

        // Remove legacy fake disk files that clogged localStorage
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const k = localStorage.key(i);
          if (k && k.startsWith('svmh_disk_bill_')) {
            localStorage.removeItem(k);
          }
        }
      }
    } catch (e) {}

    // 2. Perform one-time historical duplicate repair if needed
    _repairHistoricalDuplicateInvoiceNumbers();

    // 3. Check existing data: NEVER overwrite if data already exists
    const existingProducts = T.get('products');
    const existingBills = T.get('bills');

    if (existingProducts.length > 0) {
      const currentMeta = Meta.get();
      let maxSeq = 0;
      existingBills.forEach(b => {
        const no = String(b.billNo || b.invoiceNo || '');
        const match = no.match(/-(\d+)$/);
        if (match) {
          const s = parseInt(match[1], 10);
          if (!isNaN(s) && s > maxSeq) maxSeq = s;
        }
      });

      Meta.patch({
        initialized: true,
        billCounter: Math.max(currentMeta.billCounter || 0, maxSeq),
      });

      console.log(`[DB] Ready — ${existingProducts.length} products, ${existingBills.length} bills preserved`);
      _syncToIndexedDB();
      return;
    }

    // 4. Seed products synchronously on first run if products table is empty
    if (typeof SampleProducts !== 'undefined' && SampleProducts.length > 0) {
      const seeded = SampleProducts.map((p, i) => _stamp({
        id:    p.id || `PRD${String(i + 1).padStart(3, '0')}`,
        name:  p.name,
        hsn:   String(p.hsn || ''),
        unit:  p.unit || 'Nos',
        rate:  p.rate || 0,
        gst:   p.gst || 0,
        stock: p.stock !== undefined ? p.stock : 500, // Default opening stock
      }));
      T.set('products', seeded);
      console.log(`[DB] Seeded ${seeded.length} products`);
    }

    const currentMeta = Meta.get();
    let maxSeq = 0;
    existingBills.forEach(b => {
      const no = String(b.billNo || b.invoiceNo || '');
      const match = no.match(/-(\d+)$/);
      if (match) {
        const s = parseInt(match[1], 10);
        if (!isNaN(s) && s > maxSeq) maxSeq = s;
      }
    });

    Meta.set({
      initialized: true,
      billCounter: Math.max(currentMeta.billCounter || 0, maxSeq),
      version:     '1.0.0',
      createdAt:   currentMeta.createdAt || _now(),
    });
    _syncToIndexedDB();
    console.log('[DB] Initialized successfully');
  }

  /* ══════════════════════════════════════════════════════════════
     DEBUG / DEV UTILITIES
     ══════════════════════════════════════════════════════════════ */

  /** Clear all data and re-initialize (dev use only). */
  function _hardReset() {
    ['products', 'customers', 'bills', 'bill_items', 'product_history'].forEach(T.clear);
    T.clear('meta');  // triggers re-seed on next init()
    console.warn('[DB] Hard reset — all data cleared');
    init();
  }

  /* ══════════════════════════════════════════════════════════════
     SETTINGS & BACKUP / RESTORE
     ══════════════════════════════════════════════════════════════ */
  const Settings = {
    get: () => T.get('settings') || {
      shopName: 'Sree Vel Murugan Hardware and Tiles',
      gstin: '33ARRPJ3902G3ZU',
      address: 'No.143, Kundrathur Main Road, Porur, Chennai - 600116',
      phone: '7305274926 / 9840461152',
      defaultPaymentMode: 'Cash',
      footerText: 'Thank you for your business! Goods once sold cannot be returned.',
      thermalPrinter: false,
      a4Printer: true,
      logoUrl: '',
    },
    set: (data) => {
      const current = Settings.get();
      const updated = { ...current, ...data, updatedAt: _now() };
      T.set('settings', updated);
      return updated;
    }
  };

  function backupData() {
    const tables = {
      meta: Meta.get(),
      settings: Settings.get(),
      products: Products.all(),
      customers: Customers.all(),
      bills: Bills.all(),
      billItems: T.get('bill_items'),
      productHistory: T.get('product_history'),
      deletedBills: Bills.deleted(),
    };
    const backup = {
      system: 'SVMH_BILLING_SYSTEM',
      version: '1.0.0',
      exportedAt: _now(),
      ...tables,
      data: tables
    };
    return JSON.stringify(backup, null, 2);
  }

  function restoreData(inputData) {
    try {
      let data = (typeof inputData === 'string') ? JSON.parse(inputData) : inputData;
      if (!data) return { success: false, error: 'Empty or invalid backup payload.' };

      // Handle nested container formats (e.g. data.data, data.folders, or root)
      let payload = data.data || data.folders || data;

      const products = payload.products || data.products;
      const customers = payload.customers || data.customers;
      const bills = payload.bills || data.bills;
      const billItems = payload.billItems || data.billItems;
      const productHistory = payload.productHistory || data.productHistory;
      const settings = payload.settings || data.settings;
      const deletedBills = payload.deletedBills || data.deletedBills;
      const meta = payload.meta || data.meta;

      // Validation check
      const hasProducts = Array.isArray(products);
      const hasCustomers = Array.isArray(customers);
      const hasBills = Array.isArray(bills);
      const hasSettings = typeof settings === 'object' && settings !== null;

      if (!hasProducts && !hasCustomers && !hasBills && !hasSettings) {
        return { success: false, error: 'Invalid Billing System backup file format. Required data tables are missing.' };
      }

      // 1. Create safety snapshot of CURRENT data before modifying
      const safetySnapshot = backupData();
      localStorage.setItem(PFX + 'backup_before_restore', safetySnapshot);

      // 2. Perform safe restoration of stored tables
      if (products)       T.set('products', products);
      if (customers)      T.set('customers', customers);
      if (bills)          T.set('bills', bills);
      if (billItems)      T.set('bill_items', billItems);
      if (productHistory) T.set('product_history', productHistory);
      if (settings)       T.set('settings', settings);
      if (deletedBills)   T.set('deleted_bills', deletedBills);
      if (meta)           T.set('meta', meta);

      // Re-initialize DB in-memory cache
      init();

      return { success: true, billsCount: (bills || []).length };
    } catch (e) {
      console.error('[DB] Restore error:', e);
      // Attempt rollback from safety snapshot
      try {
        const snap = localStorage.getItem(PFX + 'backup_before_restore');
        if (snap) {
          const snapObj = JSON.parse(snap);
          const p = snapObj.data || snapObj;
          if (p.products)       T.set('products', p.products);
          if (p.customers)      T.set('customers', p.customers);
          if (p.bills)          T.set('bills', p.bills);
          if (p.billItems)      T.set('bill_items', p.billItems);
          if (p.productHistory) T.set('product_history', p.productHistory);
          if (p.settings)       T.set('settings', p.settings);
          init();
        }
      } catch (rbErr) {
        console.error('[DB] Rollback failed:', rbErr);
      }
      return { success: false, error: e.message || 'Corrupted or invalid backup package.' };
    }
  }

  /* ── Public API ─────────────────────────────────────────────── */
  return {
    Products,
    Customers,
    Bills,
    BillItems,
    ProductHistory,
    Settings,
    nextBillNo,
    saveBill,
    updateBill,
    deleteBill,
    permanentlyDeleteBill,
    restoreBill,
    updateBillPaymentMode,
    backupData,
    restoreData,
    stats,
    init,
    // dev helpers (available from browser console)
    _hardReset,
    _raw: (table) => T.get(table),
  };

})();
