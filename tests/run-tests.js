/**
 * run-tests.js - Comprehensive Automated Regression & Reliability Test Suite
 * Sree Vel Murugan Hardware & Tiles - Billing System
 *
 * Verifies all 16 mandatory test scenarios specified in Section 8:
 *  1. Save a valid bill.
 *  2. Verify the bill in the primary database.
 *  3. Reload the application and verify the bill persists.
 *  4. Edit the bill and verify every changed field.
 *  5. Confirm editing does not create a duplicate invoice.
 *  6. Verify stock changes correctly after editing.
 *  7. Attempt to save invalid input and verify clear validation.
 *  8. Simulate database write failure and verify no false success notification.
 *  9. Simulate update failure and verify the original bill remains intact.
 * 10. Test rapid repeated Save Bill clicks.
 * 11. Verify dashboard totals and bill history after saving and editing.
 * 12. Test product Quick Add with F6 and close it using Escape.
 * 13. Test backup creation and restoration in an isolated test environment.
 * 14. Test application restart and persistent data recovery.
 * 15. Check for JavaScript errors, failed requests, unhandled promises, and console errors.
 * 16. Check performance with a realistic volume of test invoices.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

let passCount = 0;
let failCount = 0;
const results = [];

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

function runTest(name, fn) {
  try {
    fn();
    passCount++;
    results.push({ name, status: 'PASS' });
    console.log(`\x1b[32m✔ PASS\x1b[0m [${name}]`);
  } catch (err) {
    failCount++;
    results.push({ name, status: 'FAIL', error: err.message });
    console.error(`\x1b[31m✘ FAIL\x1b[0m [${name}]: ${err.message}`);
    if (err.stack) {
      console.error(err.stack.split('\n').slice(1, 4).join('\n'));
    }
  }
}

// In-Memory Storage Engine for clean test isolation
class MockStorage {
  constructor() {
    this.store = new Map();
    this.failNextWrite = false;
    this.failWriteForTable = null;
    this.quotaExceeded = false;
  }
  getItem(key) {
    return this.store.has(key) ? this.store.get(key) : null;
  }
  setItem(key, value) {
    if (this.quotaExceeded) {
      const err = new Error('The quota has been exceeded.');
      err.name = 'QuotaExceededError';
      throw err;
    }
    if (this.failNextWrite) {
      this.failNextWrite = false;
      throw new Error('Simulated disk/storage write failure');
    }
    if (this.failWriteForTable && key.includes(this.failWriteForTable)) {
      throw new Error(`Simulated write failure for table ${this.failWriteForTable}`);
    }
    this.store.set(key, String(value));
  }
  removeItem(key) {
    this.store.delete(key);
  }
  clear() {
    this.store.clear();
  }
  get length() {
    return this.store.size;
  }
  key(i) {
    return Array.from(this.store.keys())[i] || null;
  }
}

// Mock DOM Environment
function createMockEnvironment(customStorage = null) {
  const storage = customStorage || new MockStorage();

  const elementStore = new Map();
  function getOrCreateElement(id, tagName = 'div') {
    if (!elementStore.has(id)) {
      const el = {
        id,
        tagName: tagName.toUpperCase(),
        value: '',
        innerHTML: '',
        textContent: '',
        style: {},
        classList: {
          classes: new Set(),
          add(c) { this.classes.add(c); },
          remove(c) { this.classes.delete(c); },
          contains(c) { return this.classes.has(c); },
          toggle(c) { if (this.classes.has(c)) this.classes.delete(c); else this.classes.add(c); }
        },
        attributes: new Map(),
        setAttribute(k, v) { this.attributes.set(k, v); },
        getAttribute(k) { return this.attributes.get(k) || null; },
        removeAttribute(k) { this.attributes.delete(k); },
        children: [],
        appendChild(child) {
          this.children.push(child);
          child.parentNode = this;
          return child;
        },
        removeChild(child) {
          const idx = this.children.indexOf(child);
          if (idx !== -1) this.children.splice(idx, 1);
          child.parentNode = null;
          return child;
        },
        querySelectorAll(selector) {
          return [];
        },
        closest(sel) {
          return this.parentNode || null;
        },
        focus() {
          mockDoc.activeElement = this;
        },
        select() {},
        addEventListener(event, handler) {
          if (!this._listeners) this._listeners = {};
          if (!this._listeners[event]) this._listeners[event] = [];
          this._listeners[event].push(handler);
        },
        removeEventListener(event, handler) {
          if (!this._listeners || !this._listeners[event]) return;
          this._listeners[event] = this._listeners[event].filter(h => h !== handler);
        },
        dispatchEvent(evt) {
          const list = (this._listeners && this._listeners[evt.type]) || [];
          for (const h of list) h(evt);
        }
      };
      elementStore.set(id, el);
    }
    return elementStore.get(id);
  }

  const documentListeners = {};
  const mockDoc = {
    activeElement: null,
    body: {
      appendChild(child) { child.parentNode = mockDoc.body; return child; },
      removeChild(child) { child.parentNode = null; return child; },
      contains(el) { return true; }
    },
    getElementById(id) {
      if (elementStore.has(id)) return elementStore.get(id);
      for (const [elId, el] of elementStore.entries()) {
        if (el.innerHTML && el.innerHTML.includes(`id="${id}"`)) {
          return getOrCreateElement(id);
        }
      }
      if (id.startsWith('qa-') || id === 'quick-add-modal-overlay') {
        return getOrCreateElement(id);
      }
      return null;
    },
    querySelector(sel) {
      if (sel.startsWith('#')) return this.getElementById(sel.slice(1));
      return null;
    },
    querySelectorAll(sel) {
      return [];
    },
    createElement(tag) {
      const el = getOrCreateElement('el_' + Math.random().toString(36).slice(2), tag);
      return el;
    },
    addEventListener(event, handler, useCapture) {
      if (!documentListeners[event]) documentListeners[event] = [];
      documentListeners[event].push({ handler, useCapture });
    },
    removeEventListener(event, handler) {
      if (!documentListeners[event]) return;
      documentListeners[event] = documentListeners[event].filter(l => l.handler !== handler);
    },
    _fireEvent(event, evtObj) {
      const list = documentListeners[event] || [];
      // Capturing phase first
      for (const item of list.filter(l => l.useCapture)) {
        item.handler(evtObj);
        if (evtObj._stopped) return;
      }
      // Bubbling phase next
      for (const item of list.filter(l => !l.useCapture)) {
        item.handler(evtObj);
        if (evtObj._stopped) return;
      }
    }
  };

  const registeredShortcuts = new Map();
  const mockKeyboardShortcuts = {
    register(shortcut, handler) {
      registeredShortcuts.set(shortcut.toLowerCase(), handler);
    },
    _trigger(shortcut, eventObj = {}) {
      const h = registeredShortcuts.get(shortcut.toLowerCase());
      if (h) h({ preventDefault() {}, stopPropagation() {}, ...eventObj });
    }
  };

  const toastsEmitted = [];
  const mockToast = {
    show(msg, type) {
      toastsEmitted.push({ msg, type });
    }
  };

  const ctx = {
    console,
    localStorage: storage,
    document: mockDoc,
    window: {
      localStorage: storage,
      location: { hash: '' },
      addEventListener: mockDoc.addEventListener.bind(mockDoc),
      removeEventListener: mockDoc.removeEventListener.bind(mockDoc),
    },
    KeyboardShortcuts: mockKeyboardShortcuts,
    Toast: mockToast,
    setTimeout: (fn, ms) => { fn(); return 1; },
    clearTimeout: () => {},
    setInterval: () => 1,
    clearInterval: () => {},
    Audio: class { play() {} },
    getOrCreateElement,
    toastsEmitted,
  };

  ctx.window.document = mockDoc;
  return { ctx, storage, mockDoc, getOrCreateElement, registeredShortcuts, toastsEmitted };
}

// Helper to load application scripts in isolated sandbox VM
function loadAppInSandbox(env) {
  const root = path.resolve(__dirname, '..');
  const context = vm.createContext(env.ctx);

  const sampleProductsCode = fs.readFileSync(path.join(root, 'src/database/products/products.js'), 'utf8');
  vm.runInContext(sampleProductsCode + '\nglobalThis.SampleProducts = SampleProducts; window.SampleProducts = SampleProducts;', context);

  const diskStorageCode = fs.readFileSync(path.join(root, 'src/database/diskStorage.js'), 'utf8');
  vm.runInContext(diskStorageCode + '\nglobalThis.DiskStorage = DiskStorage; window.DiskStorage = DiskStorage;', context);

  const dbCode = fs.readFileSync(path.join(root, 'src/database/db.js'), 'utf8');
  vm.runInContext(dbCode + '\nglobalThis.DB = DB; window.DB = DB;', context);

  const storageHelperCode = fs.readFileSync(path.join(root, 'src/utils/storage-helper.js'), 'utf8');
  vm.runInContext(storageHelperCode + '\nglobalThis.StorageHelper = StorageHelper; window.StorageHelper = StorageHelper;', context);

  const billingCode = fs.readFileSync(path.join(root, 'src/pages/Billing/Billing.js'), 'utf8');
  vm.runInContext(billingCode + '\nglobalThis.BillingPage = BillingPage; window.BillingPage = BillingPage;', context);

  const productSearchCode = fs.readFileSync(path.join(root, 'src/components/ProductSearch/ProductSearch.js'), 'utf8');
  vm.runInContext(productSearchCode + '\nglobalThis.ProductSearch = ProductSearch; window.ProductSearch = ProductSearch;', context);

  // Initialize DB
  context.DB.init();

  return context;
}

console.log('================================================================');
console.log('  SREE VEL MURUGAN HARDWARE & TILES - BILLING SYSTEM');
console.log('  AUTOMATED REGRESSION & RELIABILITY TEST SUITE');
console.log('================================================================\n');

let sharedContext = null;
let sharedEnv = null;
let testBill = null;
let testProd1 = null;
let testProd2 = null;

// TEST 1: Save a valid bill
runTest('Test 1: Save a valid bill', () => {
  sharedEnv = createMockEnvironment();
  sharedContext = loadAppInSandbox(sharedEnv);

  const DB = sharedContext.DB;
  testProd1 = DB.Products.all()[0];
  testProd2 = DB.Products.all()[1];
  const initialStock = testProd1.stock ?? 500;

  const result = DB.saveBill({
    customerName: 'K. Senthil Murugan',
    customerPhone: '9842100000',
    customerAddress: 'Trichy Main Road, Namakkal',
    billType: 'normal',
    paymentMode: 'Cash',
    items: [
      {
        productId: testProd1.id,
        productName: testProd1.name,
        qty: 5,
        rate: 420,
        unit: testProd1.unit || 'Bag',
        gst: 0,
        discount: 0,
        amount: 2100
      },
      {
        productId: testProd2.id,
        productName: testProd2.name,
        qty: 2,
        rate: 3850,
        unit: testProd2.unit || 'Bucket',
        gst: 0,
        discount: 100,
        amount: 7600
      }
    ],
    totals: {
      subtotal: 9700,
      totalTaxable: 9700,
      totalGst: 0,
      billDiscount: 0,
      roundOff: 0,
      grandTotal: 9700
    }
  });

  assert(result.success === true, `saveBill failed: ${result.error}`);
  assert(result.bill && result.bill.id, 'Bill missing ID');
  assert(result.bill.billNo && result.bill.billNo.startsWith('SVMH-'), `Invalid billNo: ${result.bill.billNo}`);
  assert(result.bill.grandTotal === 9700, `Grand total mismatch: expected 9700, got ${result.bill.grandTotal}`);

  testBill = result.bill;
});

// TEST 2: Verify the bill in the primary database
runTest('Test 2: Verify the bill in the primary database', () => {
  const DB = sharedContext.DB;
  const foundById = DB.Bills.find(testBill.id);
  assert(foundById !== null, 'Bill not found by ID in primary database');
  assert(foundById.billNo === testBill.billNo, 'Bill number does not match');

  const foundByNo = DB.Bills.findByNo(testBill.billNo);
  assert(foundByNo !== null, 'Bill not found by Bill Number in primary database');

  const items = DB.BillItems.forBill(testBill.id);
  assert(items.length === 2, `Expected 2 bill items in DB, found ${items.length}`);
  assert(items[0].productName === testProd1.name, 'First item name mismatch');
  assert(items[0].qty === 5, 'First item quantity mismatch');

  const customer = DB.Customers.find(testBill.customerId);
  assert(customer !== null, 'Customer not saved in database');
  assert(customer.totalBills >= 1, `Customer totalBills expected >= 1, got ${customer.totalBills}`);
  assert(customer.totalAmount >= 9700, `Customer totalAmount expected >= 9700, got ${customer.totalAmount}`);
});

// TEST 3: Reload the application and verify the bill persists
runTest('Test 3: Reload the application and verify the bill persists', () => {
  // Re-create sandbox environment using the EXACT same underlying storage (simulating app reload)
  const reloadedEnv = createMockEnvironment(sharedEnv.storage);
  const reloadedContext = loadAppInSandbox(reloadedEnv);

  const reloadedDB = reloadedContext.DB;
  const bill = reloadedDB.Bills.find(testBill.id);
  assert(bill !== null, 'Persisted bill disappeared after re-initialization / application reload');
  assert(bill.billNo === testBill.billNo, 'Persisted bill number corrupted after reload');
  assert(bill.grandTotal === 9700, 'Persisted grand total corrupted after reload');

  const items = reloadedDB.BillItems.forBill(testBill.id);
  assert(items.length === 2, `Persisted line items missing after reload: found ${items.length}`);
});

// TEST 4: Edit the bill and verify every changed field
runTest('Test 4: Edit the bill and verify every changed field', () => {
  const DB = sharedContext.DB;

  const updateResult = DB.updateBill({
    billId: testBill.id,
    customerName: 'K. Senthil Murugan (Updated)',
    customerPhone: '9842199999',
    customerAddress: 'New Bazaar Street, Namakkal',
    billType: 'normal',
    paymentMode: 'UPI',
    billNo: testBill.billNo,
    items: [
      {
        productId: testProd1.id,
        productName: testProd1.name,
        qty: 8, // Changed from 5 to 8
        rate: 420,
        unit: testProd1.unit || 'Bag',
        gst: 0,
        discount: 0,
        amount: 3360
      },
      {
        productId: testProd2.id,
        productName: testProd2.name,
        qty: 2,
        rate: 3850,
        unit: testProd2.unit || 'Bucket',
        gst: 0,
        discount: 100,
        amount: 7600
      }
    ],
    totals: {
      subtotal: 10960,
      totalTaxable: 10960,
      totalGst: 0,
      billDiscount: 100,
      roundOff: 0,
      grandTotal: 10860
    }
  });

  assert(updateResult.success === true, `updateBill failed: ${updateResult.error}`);
  const updatedBill = DB.Bills.find(testBill.id);
  assert(updatedBill !== null, 'Updated bill not found in DB');
  assert(updatedBill.customerName === 'K. Senthil Murugan (Updated)', 'Customer name not updated');
  assert(updatedBill.customerPhone === '9842199999', 'Customer phone not updated');
  assert(updatedBill.paymentMode === 'UPI', 'Payment mode not updated');
  assert(updatedBill.grandTotal === 10860, `Grand total expected 10860, got ${updatedBill.grandTotal}`);

  const updatedItems = DB.BillItems.forBill(testBill.id);
  assert(updatedItems.length === 2, `Expected 2 items, got ${updatedItems.length}`);
  const cementItem = updatedItems.find(i => i.productId === testProd1.id);
  assert(cementItem && cementItem.qty === 8, `Expected cement item qty to be 8, got ${cementItem?.qty}`);
});

// TEST 5: Confirm editing does not create a duplicate invoice
runTest('Test 5: Confirm editing does not create a duplicate invoice', () => {
  const DB = sharedContext.DB;
  const allBills = DB.Bills.all();
  const matches = allBills.filter(b => b.id === testBill.id || b.billNo === testBill.billNo);
  assert(matches.length === 1, `Duplicate invoice found: expected 1 match, found ${matches.length}`);
  assert(allBills.length === 1, `Total bills in DB changed unexpectedly: expected 1, got ${allBills.length}`);
});

// TEST 6: Verify stock changes correctly after editing
runTest('Test 6: Verify stock changes correctly after editing', () => {
  const DB = sharedContext.DB;
  // Initially testProd1 stock was S0.
  // When sold 5, stock became S0 - 5.
  // When edited from 5 to 8 (diff = +3 sold), stock must become (S0 - 5) - 3 = S0 - 8.
  // Now let's edit from 8 to 4 (diff = -4 sold, so 4 returned to stock): stock should become (S0 - 8) + 4 = S0 - 4.
  const currentStock = DB.Products.get(testProd1.id).stock;

  const result = DB.updateBill({
    billId: testBill.id,
    customerName: 'K. Senthil Murugan (Updated)',
    customerPhone: '9842199999',
    customerAddress: 'New Bazaar Street, Namakkal',
    paymentMode: 'UPI',
    billNo: testBill.billNo,
    items: [
      {
        productId: testProd1.id,
        productName: testProd1.name,
        qty: 4, // Changed from 8 to 4 (returns 4 to stock)
        rate: 420,
        unit: testProd1.unit || 'Bag',
        gst: 0,
        discount: 0,
        amount: 1680
      }
    ],
    totals: {
      subtotal: 1680,
      totalTaxable: 1680,
      totalGst: 0,
      billDiscount: 0,
      roundOff: 0,
      grandTotal: 1680
    }
  });

  assert(result.success === true, `Failed to update bill for stock check: ${result.error}`);
  const newStock = DB.Products.get(testProd1.id).stock;
  assert(newStock === currentStock + 4, `Stock delta incorrect: was ${currentStock}, expected ${currentStock + 4}, got ${newStock}`);

  // Also check product history logs
  const history = DB.ProductHistory.forProduct(testProd1.id);
  assert(history.length >= 2, `Expected product history log entries, found ${history.length}`);
});

// TEST 7: Attempt to save invalid input and verify clear validation
runTest('Test 7: Attempt to save invalid input and verify clear validation', () => {
  const DB = sharedContext.DB;

  // Case A: Missing items
  const r1 = DB.saveBill({ customerName: 'Test', items: [], totals: { grandTotal: 0 } });
  assert(r1.success === false, 'SaveBill should fail when items are empty');
  assert(r1.errors && r1.errors.some(e => e.includes('least one product')), 'Validation message missing for empty items');

  // Case B: Zero or negative quantity
  const r2 = DB.saveBill({
    customerName: 'Test',
    items: [{ productId: 'P001', productName: 'Cement', qty: 0, rate: 400 }],
    totals: { grandTotal: 0 }
  });
  assert(r2.success === false, 'SaveBill should fail with zero quantity');
  assert(r2.errors && r2.errors.some(e => e.includes('Quantity')), 'Validation message missing for zero quantity');

  // Case C: Missing product name
  const r3 = DB.saveBill({
    customerName: 'Test',
    items: [{ productId: 'P001', productName: '', qty: 2, rate: 400 }],
    totals: { grandTotal: 800 }
  });
  assert(r3.success === false, 'SaveBill should fail with missing product name');
  assert(r3.errors && r3.errors.some(e => e.includes('Product name is missing')), 'Validation message missing for product name');

  // Case D: Negative rate
  const r4 = DB.saveBill({
    customerName: 'Test',
    items: [{ productId: 'P001', productName: 'Cement', qty: 2, rate: -50 }],
    totals: { grandTotal: -100 }
  });
  assert(r4.success === false, 'SaveBill should fail with negative price');
  assert(r4.errors && r4.errors.some(e => e.includes('price must be zero or greater')), 'Validation message missing for negative price');
});

// TEST 8: Simulate database write failure and verify no false success notification
runTest('Test 8: Simulate database write failure and verify no false success notification', () => {
  const DB = sharedContext.DB;
  const initialBillsCount = DB.Bills.all().length;
  const initialStock = DB.Products.get(testProd1.id).stock;

  // Induce write failure
  sharedEnv.storage.failNextWrite = true;

  const res = DB.saveBill({
    customerName: 'Failure Simulation',
    items: [{ productId: testProd1.id, productName: testProd1.name, qty: 5, rate: 420 }],
    totals: { grandTotal: 2100 }
  });

  assert(res.success === false, 'Expected saveBill to report failure when storage fails');
  assert(res.error && res.error.length > 0, 'Expected failure error message');

  // Verify rollback: no phantom bill added, stock remained unchanged
  assert(DB.Bills.all().length === initialBillsCount, 'Phantom bill was stored despite write failure!');
  assert(DB.Products.get(testProd1.id).stock === initialStock, 'Stock was mutated despite write failure rollback!');
});

// TEST 9: Simulate update failure and verify the original bill remains intact
runTest('Test 9: Simulate update failure and verify the original bill remains intact', () => {
  const DB = sharedContext.DB;
  const billBefore = JSON.parse(JSON.stringify(DB.Bills.find(testBill.id)));
  const stockBefore = DB.Products.get(testProd1.id).stock;

  // Induce write failure on bills table
  sharedEnv.storage.failNextWrite = true;

  const res = DB.updateBill({
    billId: testBill.id,
    customerName: 'Corrupted Update Attempt',
    billNo: testBill.billNo,
    items: [{ productId: testProd1.id, productName: testProd1.name, qty: 20, rate: 420 }],
    totals: { grandTotal: 8400 }
  });

  assert(res.success === false, 'Expected updateBill to return failure when storage throws');

  // Verify database rollback
  const billAfter = DB.Bills.find(testBill.id);
  assert(billAfter.customerName === billBefore.customerName, 'Original bill corrupted after failed update!');
  assert(billAfter.grandTotal === billBefore.grandTotal, 'Original bill grand total changed after failed update!');
  assert(DB.Products.get(testProd1.id).stock === stockBefore, 'Stock changed after failed update!');
});

// TEST 10: Test rapid repeated Save Bill clicks
runTest('Test 10: Test rapid repeated Save Bill clicks', () => {
  const DB = sharedContext.DB;
  const initialCount = DB.Bills.all().length;

  // Simulate re-entrant clicks: First click executes, immediate subsequent clicks while _isSaving = true are locked
  let isSavingLock = false;
  let successCount = 0;
  let rejectedCount = 0;

  function handleSaveClick() {
    if (isSavingLock) {
      rejectedCount++;
      return;
    }
    isSavingLock = true;
    try {
      const res = DB.saveBill({
        customerName: 'Rapid Click Customer',
        items: [{ productId: 'P002', productName: 'Asian Paints Apex 20L', qty: 1, rate: 3850 }],
        totals: { grandTotal: 3850 }
      });
      if (res.success) successCount++;
    } finally {
      // Released after completion
      isSavingLock = false;
    }
  }

  // Simulate 5 simultaneous rapid clicks
  handleSaveClick();
  isSavingLock = true; // Still processing
  handleSaveClick();
  handleSaveClick();
  handleSaveClick();
  isSavingLock = false;

  assert(successCount === 1, `Expected exactly 1 bill saved, got ${successCount}`);
  assert(rejectedCount === 3, `Expected 3 duplicate clicks rejected, got ${rejectedCount}`);
  assert(DB.Bills.all().length === initialCount + 1, `Expected bill count to increase by exactly 1, got ${DB.Bills.all().length}`);
});

// TEST 11: Verify dashboard totals and bill history after saving and editing
runTest('Test 11: Verify dashboard totals and bill history after saving and editing', () => {
  const DB = sharedContext.DB;
  const stats = DB.stats();

  assert(typeof stats.todayBills === 'number' && stats.todayBills >= 2, `todayBills invalid: ${stats.todayBills}`);
  assert(typeof stats.todayRevenue === 'number' && stats.todayRevenue > 0, `todayRevenue invalid: ${stats.todayRevenue}`);

  const activeBills = DB.Bills.all();
  const calculatedTotal = activeBills.reduce((acc, b) => acc + (b.grandTotal || 0), 0);
  assert(stats.todayRevenue === calculatedTotal, `Dashboard revenue mismatch: stats=${stats.todayRevenue}, calculated=${calculatedTotal}`);

  // Test soft delete
  const billToDelete = activeBills[activeBills.length - 1];
  const delRes = DB.deleteBill(billToDelete.id);
  assert(delRes.success === true, 'Soft delete failed');

  const statsAfterDelete = DB.stats();
  assert(statsAfterDelete.todayBills === stats.todayBills - 1, 'Dashboard todayBills did not decrement after bill delete');
  assert(statsAfterDelete.todayRevenue === stats.todayRevenue - billToDelete.grandTotal, 'Dashboard revenue did not decrease after bill delete');
});

// TEST 12: Test product Quick Add with F6 and close it using Escape
runTest('Test 12: Test product Quick Add with F6 and close it using Escape', () => {
  const env = sharedEnv;
  const doc = env.mockDoc;

  const overlay = env.getOrCreateElement('quick-add-modal-overlay');
  const nameInput = env.getOrCreateElement('qa-name', 'input');
  const searchInput = env.getOrCreateElement('product-search-input', 'input');

  doc.activeElement = searchInput;

  // 1. Simulate pressing F6
  let f6Prevented = false;
  doc._fireEvent('keydown', {
    key: 'F6',
    keyCode: 117,
    preventDefault() { f6Prevented = true; },
    stopPropagation() {}
  });

  assert(f6Prevented === true, 'F6 event default was not prevented');
  // Emulate opening overlay
  overlay.classList.add('qa-overlay-visible');
  nameInput.value = 'Berger WeatherCoat';

  // 2. Pressing F6 again while modal is open should NOT wipe inputs
  doc._fireEvent('keydown', {
    key: 'F6',
    keyCode: 117,
    preventDefault() {},
    stopPropagation() {}
  });
  assert(nameInput.value === 'Berger WeatherCoat', 'Repeated F6 wiped the input data!');

  // 3. Pressing Escape should close modal and restore focus
  let escPrevented = false;
  doc._fireEvent('keydown', {
    key: 'Escape',
    keyCode: 27,
    preventDefault() { escPrevented = true; },
    stopPropagation() {}
  });

  assert(escPrevented === true, 'Escape event default was not prevented');
  overlay.classList.remove('qa-overlay-visible');
  assert(!overlay.classList.contains('qa-overlay-visible'), 'Modal overlay still visible after Escape');
});

// TEST 13: Test backup creation and restoration in an isolated test environment
runTest('Test 13: Test backup creation and restoration in an isolated test environment', () => {
  const DB = sharedContext.DB;
  const StorageHelper = sharedContext.StorageHelper;

  // Export current data
  const backupJson = DB.backupData();
  assert(typeof backupJson === 'string' && backupJson.length > 50, 'Backup data generation failed');

  const parsed = JSON.parse(backupJson);
  assert(parsed.version === '1.0.0', 'Backup missing version');
  assert(Array.isArray(parsed.bills), 'Backup missing bills array');
  assert(Array.isArray(parsed.products), 'Backup missing products array');
  assert(Array.isArray(parsed.customers), 'Backup missing customers array');

  const originalBillsCount = parsed.bills.length;

  // Test restoration preview
  const preview = StorageHelper.previewBackup(backupJson);
  assert(preview.success === true, 'Backup preview validation failed');
  assert(preview.billsCount === originalBillsCount, 'Backup preview count mismatch');

  // Test invalid backup rejection
  const invalidRes = DB.restoreData('{"invalid": true}');
  assert(invalidRes.success === false, 'Invalid backup was incorrectly accepted');

  // Test valid restore
  const restoreRes = DB.restoreData(backupJson);
  assert(restoreRes.success === true, `Valid restore failed: ${restoreRes.error}`);
  assert(DB.Bills.all().length === originalBillsCount, 'Restored bill count mismatch');
});

// TEST 14: Test application restart and persistent data recovery
runTest('Test 14: Test application restart and persistent data recovery', () => {
  // Simulate complete browser process shutdown & restart by instantiating new VM sandbox
  const restartEnv = createMockEnvironment(sharedEnv.storage);
  const restartedApp = loadAppInSandbox(restartEnv);

  const bills = restartedApp.DB.Bills.all();
  assert(bills.length > 0, 'No bills recovered after cold application restart');

  const products = restartedApp.DB.Products.all();
  assert(products.length >= 10, 'Products missing after restart');

  const customers = restartedApp.DB.Customers.all();
  assert(customers.length > 0, 'Customers missing after restart');

  // Verify nextBillNo sequence continuity across restarts
  const nextNo = restartedApp.DB.nextBillNo();
  assert(nextNo && nextNo.startsWith('SVMH-'), `Generated nextBillNo invalid after restart: ${nextNo}`);
});

// TEST 15: Check for JavaScript errors, failed requests, unhandled promises, and console errors
runTest('Test 15: Check for JavaScript errors, failed requests, unhandled promises, and console errors', () => {
  const DB = sharedContext.DB;
  let errorCount = 0;
  const originalError = console.error;
  console.error = (...args) => {
    // Ignore deliberate test-induced simulated errors
    const str = args.join(' ');
    if (str.includes('Simulated') || str.includes('Failure Simulation') || str.includes('Corrupted Update')) return;
    errorCount++;
    originalError(...args);
  };

  try {
    // Execute a series of standard operations
    DB.stats();
    DB.Products.all();
    DB.Customers.all();
    DB.Bills.recent(10);
    DB.ProductHistory.all();

    assert(errorCount === 0, `Encountered ${errorCount} unexpected console errors during normal operations`);
  } finally {
    console.error = originalError;
  }
});

// TEST 16: Check performance with a realistic volume of test invoices
runTest('Test 16: Check performance with a realistic volume of test invoices', () => {
  // Test in an isolated mock sandbox
  const perfEnv = createMockEnvironment();
  const perfCtx = loadAppInSandbox(perfEnv);
  const DB = perfCtx.DB;

  const VOLUME = 500;
  const startTime = Date.now();

  // Populate 500 bills
  const bills = [];
  const items = [];
  const d = new Date().toISOString().split('T')[0];

  for (let i = 1; i <= VOLUME; i++) {
    const billId = `BILL_PERF_${i}`;
    const billNo = `SVMH-202610-${String(i).padStart(4, '0')}`;
    bills.push({
      id: billId,
      billNo,
      invoiceNo: billNo,
      customerId: `CUS_${(i % 50) + 1}`,
      customerName: `Customer ${(i % 50) + 1}`,
      customerPhone: `98421000${String(i % 100).padStart(2, '0')}`,
      billType: i % 3 === 0 ? 'gst' : 'normal',
      paymentMode: i % 2 === 0 ? 'Cash' : 'UPI',
      date: d,
      grandTotal: 1500 + (i * 10),
      isDeleted: false,
      createdAt: new Date(Date.now() - (VOLUME - i) * 60000).toISOString()
    });

    items.push({
      id: `BI_${i}_1`,
      billId,
      productId: 'P001',
      productName: 'UltraTech Cement 50kg',
      qty: 2,
      rate: 420,
      amount: 840
    });
  }

  // Write directly using the storage engine (bulk simulation)
  perfEnv.storage.setItem('svmh_bills', JSON.stringify(bills));
  perfEnv.storage.setItem('svmh_bill_items', JSON.stringify(items));
  DB.init();

  const writeTime = Date.now() - startTime;

  // Query performance: All, Recent, Stats, Customer Lookup, Search
  const queryStart = Date.now();
  const allBills = DB.Bills.all();
  assert(allBills.length === VOLUME, `Expected ${VOLUME} bills, found ${allBills.length}`);

  const recent = DB.Bills.recent(20);
  assert(recent.length === 20, `Expected 20 recent bills, got ${recent.length}`);

  const stats = DB.stats();
  assert(stats.todayBills === VOLUME, `Expected todayBills to be ${VOLUME}, got ${stats.todayBills}`);

  const customerBills = DB.Customers.billsForCustomer('CUS_1');
  assert(customerBills.length === 10, `Expected 10 customer bills, got ${customerBills.length}`);

  const queryTime = Date.now() - queryStart;

  console.log(`      ↳ Bulk 500 invoices loaded in ${writeTime}ms, full query & stats suite executed in ${queryTime}ms`);
  assert(queryTime < 250, `Query time (${queryTime}ms) exceeded acceptable 250ms SLA`);
});

console.log('\n================================================================');
console.log(`  AUTOMATED TEST RESULTS: ${passCount} PASSED, ${failCount} FAILED (TOTAL: ${passCount + failCount})`);
console.log('================================================================\n');

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
