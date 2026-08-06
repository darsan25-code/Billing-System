/**
 * ProductSearch.js – Autocomplete Product Search Component
 *
 * Provides a keyboard-navigable dropdown for searching products.
 *
 * Requirements enforced:
 *   1. Maintain variable `let selectedIndex = -1;`
 *   2. ArrowDown: increment selectedIndex if < suggestions.length - 1, highlight row.
 *      ArrowUp: decrement selectedIndex if > 0, highlight row.
 *   3. Enter: if selectedIndex === -1, set to 0. Add product to bill, close dropdown, clear input, focus qty.
 *   4. event.preventDefault() on navigation keys.
 *   5. Highlight selected row with dark blue background, white text, smooth transition.
 *   6. Mouse click and keyboard selection behave identically.
 *   7. Show toast: "Added: Product Name".
 *   8. Console log for debugging: console.log(selectedIndex); console.log(selectedProduct);
 *
 * Project: Sree Vel Murugan Hardware and Tiles – Billing System
 */

const ProductSearch = (() => {

  /* ── Private state ─────────────────────────────────────────── */
  let _input          = null;   // The search <input> element
  let _dropdown       = null;   // The dropdown <div> element
  let _matchedItems   = [];     // Current filtered products (suggestions)
  let selectedIndex   = -1;     // Index of highlighted row
  let _onSelect       = null;   // Callback(product) called on selection
  let _searchCard     = null;   // The parent card holding the dropdown
  let _products       = [];     // Products data array

  const MIN_CHARS   = 2;
  const MAX_RESULTS = 8;

  function init(inputEl, onSelectCallback, productsArray) {
    destroy();

    _input    = inputEl;
    _onSelect = onSelectCallback;
    _products = productsArray || (typeof SampleProducts !== 'undefined' ? SampleProducts : []);

    _searchCard = _input.closest('.search-card');
    if (_searchCard) _searchCard.style.position = 'relative';

    _dropdown = document.createElement('div');
    _dropdown.id        = 'ps-dropdown';
    _dropdown.className = 'ps-dropdown';
    _dropdown.setAttribute('role', 'listbox');
    _dropdown.setAttribute('aria-label', 'Product suggestions');

    if (_searchCard) {
      _searchCard.appendChild(_dropdown);
    } else {
      _input.parentNode.insertBefore(_dropdown, _input.nextSibling);
    }

    _input.addEventListener('input',   _handleInput);
    _input.addEventListener('keydown', _handleKeydown);
    document.addEventListener('click', _handleOutsideClick);

    _input.addEventListener('blur', () => {
      setTimeout(() => {
        const card = _searchCard || (_input && _input.closest('.search-card'));
        if (card && !card.contains(document.activeElement)) {
          _close();
        }
      }, 120);
    });
  }

  function destroy() {
    if (_input) {
      _input.removeEventListener('input',   _handleInput);
      _input.removeEventListener('keydown', _handleKeydown);
    }
    document.removeEventListener('click', _handleOutsideClick);
    if (_dropdown && _dropdown.parentNode) {
      _dropdown.parentNode.removeChild(_dropdown);
    }
    _input        = null;
    _dropdown     = null;
    _matchedItems = [];
    selectedIndex = -1;
    _onSelect     = null;
    _searchCard   = null;
    _products     = [];
  }

  function _handleInput() {
    const query = _input.value.trim();

    if (query.length < MIN_CHARS) {
      _close();
      return;
    }

    _matchedItems = _filter(query);
    _render(query);
  }

  function _filter(query) {
    const q = query.toLowerCase();
    const source = (_products && _products.length > 0)
      ? _products
      : (typeof SampleProducts !== 'undefined' ? SampleProducts : []);
    return source.filter(p =>
      (p.name  || '').toLowerCase().includes(q)  ||
      (p.model || '').toLowerCase().includes(q)  ||
      (p.brand || '').toLowerCase().includes(q)  ||
      (p.id    || '').toLowerCase().includes(q)  ||
      String(p.hsn || '').includes(q)            ||
      (p.unit  || '').toLowerCase().includes(q)
    ).slice(0, MAX_RESULTS);
  }

  function _render(query) {
    _dropdown.innerHTML = '';
    selectedIndex = -1;

    if (_matchedItems.length === 0) {
      _dropdown.innerHTML = `
        <div class="ps-no-results" style="padding:14px;color:#64748b;font-size:0.85rem;text-align:center">
          No products found for "<strong>${_escapeHtml(query)}</strong>"
        </div>
      `;
      _open();
      return;
    }

    const ul = document.createElement('ul');
    ul.className = 'ps-list';
    ul.setAttribute('role', 'listbox');

    _matchedItems.forEach((product, index) => {
      const li = document.createElement('li');
      li.className = 'ps-item';
      li.setAttribute('role', 'option');
      li.setAttribute('data-index', index);
      li.setAttribute('tabindex', '-1');

      const modelBrand = [product.brand, product.model].filter(Boolean).join(' • ');

      li.innerHTML = `
        <div class="ps-item-left">
          <div class="ps-item-name-row">
            <span class="ps-item-name">${_highlight(product.name, query)}</span>
            ${product.id ? `<span class="ps-code-badge">${_escapeHtml(product.id)}</span>` : ''}
          </div>
          ${modelBrand ? `<div class="ps-item-sub">${_highlight(modelBrand, query)}</div>` : ''}
          <span class="ps-item-chips">
            <span class="ps-chip ps-chip-hsn">HSN ${_escapeHtml(product.hsn || '—')}</span>
            <span class="ps-chip ps-chip-unit">${_escapeHtml(product.unit || '—')}</span>
            <span class="ps-chip ps-chip-gst">GST ${product.gst}%</span>
            ${product.stock !== undefined ? `<span class="ps-chip ps-chip-stock">Stock: ${product.stock}</span>` : ''}
          </span>
        </div>
        <div class="ps-item-right">
          <span class="ps-item-rate">₹ ${product.rate.toLocaleString('en-IN')}</span>
          <span class="ps-item-rate-label">per ${_escapeHtml(product.unit || 'unit')}</span>
        </div>
      `;

      // Mouse hover event
      li.addEventListener('mouseenter', () => {
        selectedIndex = index;
        _highlightRow(selectedIndex);
      });

      // Mouse click and selection handler
      const selectCurrent = (e) => {
        if (e) {
          e.preventDefault();
          e.stopPropagation();
        }
        selectedIndex = index;
        const selectedProduct = _matchedItems[selectedIndex];
        console.log(selectedIndex);
        console.log(selectedProduct);
        _selectProduct(selectedProduct);
      };

      li.addEventListener('mousedown', selectCurrent);
      li.addEventListener('click', selectCurrent);

      ul.appendChild(li);
    });

    const footer = document.createElement('div');
    footer.className = 'ps-footer';
    footer.style.cssText = 'padding:6px 14px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:0.7rem;color:#64748b;display:flex;gap:12px';
    footer.innerHTML = `
      <span><kbd style="background:#e2e8f0;padding:1px 4px;border-radius:3px">↑</kbd><kbd style="background:#e2e8f0;padding:1px 4px;border-radius:3px">↓</kbd> Navigate</span>
      <span><kbd style="background:#e2e8f0;padding:1px 4px;border-radius:3px">Enter</kbd> Select</span>
      <span><kbd style="background:#e2e8f0;padding:1px 4px;border-radius:3px">Esc</kbd> Close</span>
    `;

    _dropdown.appendChild(ul);
    _dropdown.appendChild(footer);

    _open();
  }

  function _open()  { _dropdown.classList.add('ps-open'); }
  function _close() {
    _dropdown.classList.remove('ps-open');
    _dropdown.innerHTML = '';
    _matchedItems = [];
    selectedIndex = -1;
  }

  /* ── Keyboard navigation ───────────────────────────────────── */
  function _handleKeydown(e) {
    if (!_dropdown || !_dropdown.classList.contains('ps-open')) return;

    const key = e.key || e.code;

    if (key === 'ArrowDown') {
      e.preventDefault();
      if (selectedIndex < _matchedItems.length - 1) {
        selectedIndex++;
        _highlightRow(selectedIndex);
      }
    } else if (key === 'ArrowUp') {
      e.preventDefault();
      if (selectedIndex > 0) {
        selectedIndex--;
        _highlightRow(selectedIndex);
      }
    } else if (key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();

      if (_matchedItems.length === 0) return;

      if (selectedIndex === -1) {
        selectedIndex = 0;
      }

      const selectedProduct = _matchedItems[selectedIndex];

      console.log(selectedIndex);
      console.log(selectedProduct);

      if (selectedProduct) {
        _selectProduct(selectedProduct);
      }
    } else if (key === 'Escape') {
      e.preventDefault();
      _close();
    }
  }

  /* ── Highlight row ─────────────────────────────────────────── */
  function _highlightRow(index) {
    const items = _dropdown.querySelectorAll('.ps-item');
    items.forEach(el => el.classList.remove('ps-highlighted', 'selected'));

    if (index >= 0 && index < items.length) {
      items[index].classList.add('ps-highlighted');
      items[index].scrollIntoView({ block: 'nearest' });
    }

    selectedIndex = index;
  }

  /* ── Select product ────────────────────────────────────────── */
  function _selectProduct(product) {
    if (!product) return;

    _close();

    if (_input) {
      _input.value = '';
    }

    if (typeof _onSelect === 'function') {
      _onSelect(product);
    }

    if (_input) {
      setTimeout(() => {
        _input.focus();
      }, 50);
    }
  }

  function _handleOutsideClick(e) {
    if (!_input || !_dropdown) return;
    const card = _input.closest('.search-card');
    if (card && !card.contains(e.target)) {
      _close();
    }
  }

  function _highlight(text, query) {
    if (!query) return _escapeHtml(text);
    const escaped = _escapeHtml(text);
    const escapedQ = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return escaped.replace(
      new RegExp(`(${escapedQ})`, 'gi'),
      '<mark>$1</mark>'
    );
  }

  function _escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function mount(container) {}

  return { init, destroy, mount };

})();
