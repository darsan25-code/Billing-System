/**
 * safety-checks.js – Pre-save Validation & Integrity Verification
 *
 * Checks:
 *   • Duplicate bill number (❌ Duplicate bill)
 *   • Negative stock (❌ Invalid stock)
 *   • Empty items (❌ Empty items)
 *   • Invalid GST (❌ Invalid GST)
 *
 * Project: Sree Vel Murugan Hardware and Tiles – Billing System
 */

const SafetyChecks = (() => {

  function validateBill(billData) {
    if (!billData) {
      return { valid: false, error: '❌ Database error' };
    }

    // 1. Empty items check
    if (!billData.items || !Array.isArray(billData.items) || billData.items.length === 0) {
      return { valid: false, error: '❌ Empty items' };
    }

    // 2. Duplicate bill number check
    if (billData.billNo && typeof DB !== 'undefined') {
      const existing = DB.Bills.all().find(b => b.billNo === billData.billNo && !b.isDeleted);
      if (existing) {
        return { valid: false, error: '❌ Duplicate bill' };
      }
    }

    // 3. Negative quantity or stock check
    const invalidQty = billData.items.some(i => !i.qty || parseFloat(i.qty) <= 0);
    if (invalidQty) {
      return { valid: false, error: '❌ Invalid stock' };
    }

    // 4. Invalid GST rate check
    const invalidGst = billData.items.some(i => {
      const rate = parseFloat(i.gstPct);
      return isNaN(rate) || rate < 0 || rate > 50;
    });
    if (invalidGst) {
      return { valid: false, error: '❌ Invalid GST' };
    }

    return { valid: true };
  }

  return { validateBill };

})();
