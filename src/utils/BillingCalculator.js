/**
 * BillingCalculator.js – Billing Calculation Engine
 *
 * Pure, stateless calculation functions — no DOM access.
 *
 * Calculation model (GST Bill):
 *   base_amount     = qty × rate
 *   discount_amount = base_amount × (disc% / 100)
 *   taxable_amount  = base_amount − discount_amount
 *   gst_amount      = taxable_amount × (gst% / 100)
 *   row_total       = taxable_amount + gst_amount
 *
 * Normal Bill (isGstBill = false):
 *   gst_amount = 0
 *   row_total  = taxable_amount
 *
 * Bill totals:
 *   subtotal          = Σ base_amount
 *   totalItemDiscount = Σ discount_amount
 *   totalTaxable      = Σ taxable_amount
 *   totalGst          = Σ gst_amount
 *   grand_before_round = totalTaxable + totalGst − billDiscountAmt
 *   roundOff          = round(grand_before_round) − grand_before_round
 *   grandTotal        = round(grand_before_round)
 *
 * Project: Sree Vel Murugan Hardware and Tiles – Billing System
 */

const BillingCalculator = (() => {

  /** Supported GST slab rates. */
  const VALID_GST_RATES = [0, 5, 12, 18, 28];

  /* ── Arithmetic helpers ─────────────────────────────────────── */

  /** Round to 2 decimal places using standard rounding. */
  function round2(n) {
    return Math.round(n * 100) / 100;
  }

  /** Safely coerce to non-negative float. */
  function _pos(v, max = Infinity) {
    return Math.min(max, Math.max(0, parseFloat(v) || 0));
  }

  /* ── Row-level calculation ──────────────────────────────────── */

  /**
   * Calculate values for a single bill row.
   *
   * @param {number|string} qty
   * @param {number|string} rate        - unit rate (excl. GST)
   * @param {number|string} discPct     - item-level discount percentage (0-100)
   * @param {number|string} gstPct      - GST rate (0/5/12/18/28)
   * @param {boolean}       isGstBill   - false → GST not applied
   *
   * @returns {{ baseAmount, discountAmount, taxableAmount, gstAmount, rowTotal }}
   */
  function calcRow(qty, rate, discPct, gstPct, isGstBill) {
    qty     = _pos(qty);
    rate    = _pos(rate);
    discPct = _pos(discPct, 100);   // cap at 100 %
    gstPct  = _pos(gstPct);

    const baseAmount     = round2(qty * rate);
    const discountAmount = round2(baseAmount * discPct / 100);
    const taxableAmount  = round2(baseAmount - discountAmount);
    const gstAmount      = isGstBill ? round2(taxableAmount * gstPct / 100) : 0;
    const rowTotal       = round2(taxableAmount + gstAmount);

    return { baseAmount, discountAmount, taxableAmount, gstAmount, rowTotal };
  }

  /* ── Bill-level aggregation ─────────────────────────────────── */

  /**
   * Aggregate row results into bill totals.
   *
   * @param {Array}         rowResults      - array of calcRow() results
   * @param {number|string} billDiscountAmt - additional bill-level discount (₹)
   * @param {boolean}       isGstBill
   *
   * @returns {{
   *   subtotal, totalItemDiscount, totalTaxable, totalGst,
   *   billDiscount, grandBeforeRound, roundOff, grandTotal
   * }}
   */
  function calcBillTotals(rowResults, billDiscountAmt, isGstBill) {
    billDiscountAmt = _pos(billDiscountAmt);

    const sum = (field) => round2(rowResults.reduce((s, r) => s + (r[field] || 0), 0));

    const subtotal          = sum('baseAmount');
    const totalItemDiscount = sum('discountAmount');
    const totalTaxable      = sum('taxableAmount');
    const totalGst          = isGstBill ? sum('gstAmount') : 0;

    const afterGst         = round2(totalTaxable + totalGst);
    const billDiscount     = round2(Math.min(billDiscountAmt, afterGst));
    const grandBeforeRound = round2(afterGst - billDiscount);
    const grandRounded     = Math.round(grandBeforeRound);
    const roundOff         = round2(grandRounded - grandBeforeRound);

    return {
      subtotal,
      totalItemDiscount,
      totalTaxable,
      totalGst,
      billDiscount,
      grandBeforeRound,
      roundOff,
      grandTotal: grandRounded,
    };
  }

  /* ── GST rate-wise breakdown ────────────────────────────────── */

  /**
   * Group GST amounts by their slab rate across all rows.
   *
   * @param {Array}   rows        - [{gstPct, gstAmount}, ...]
   * @param {boolean} isGstBill
   * @returns {Object}  { 5: 120.00, 18: 648.00, … }
   */
  function gstByRate(rows, isGstBill) {
    if (!isGstBill) return {};
    const breakdown = {};
    rows.forEach(r => {
      const pct = r.gstPct || 0;
      breakdown[pct] = round2((breakdown[pct] || 0) + (r.gstAmount || 0));
    });
    return breakdown;
  }

  /* ── Formatting ─────────────────────────────────────────────── */

  /**
   * Format a number as Indian-locale rupees.
   * @param {number}  amount
   * @param {boolean} showPlus  – prefix positive numbers with '+'
   */
  function fmt(amount, showPlus = false) {
    if (amount === null || amount === undefined || isNaN(amount)) return '—';
    const abs = Math.abs(amount).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const sign = amount < 0 ? '-' : (showPlus && amount > 0 ? '+' : '');
    return `${sign}₹\u00a0${abs}`;
  }

  /** Format as whole-rupee grand total (no paise). */
  function fmtGrand(amount) {
    if (!amount) return '₹\u00a00';
    return '₹\u00a0' + Math.abs(Math.round(amount)).toLocaleString('en-IN');
  }

  /* ── Public API ─────────────────────────────────────────────── */
  return {
    VALID_GST_RATES,
    calcRow,
    calcBillTotals,
    gstByRate,
    round2,
    fmt,
    fmtGrand,
  };

})();
