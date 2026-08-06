/**
 * KeyboardShortcuts.js – Global Keyboard Shortcut Registry
 *
 * A centralised, page-scoped shortcut manager.
 * Listens at the document capture phase so shortcuts work even when
 * an input is focused (e.g. F2 while typing in a search box).
 *
 * Public API:
 *   KeyboardShortcuts.register(key, handler)  – e.g. 'ctrl+s', 'f2', 'delete'
 *   KeyboardShortcuts.unregister(key)
 *   KeyboardShortcuts.clear()                 – Remove all registered shortcuts
 *   KeyboardShortcuts.disable() / .enable()
 *   KeyboardShortcuts.list()                  – Returns array of active keys
 *
 * Key format: lowercase, modifiers first joined by '+'.
 * Examples:  'f2'  |  'ctrl+s'  |  'ctrl+shift+n'  |  'delete'  |  'escape'
 *
 * Project: Sree Vel Murugan Hardware and Tiles – Billing System
 */

const KeyboardShortcuts = (() => {

  /* ── State ─────────────────────────────────────────────────── */
  const _registry = new Map();  // key string → handler function
  let _enabled    = true;

  /* ── Normalise a KeyboardEvent into a key string ────────────── */
  function _normalise(e) {
    const parts = [];
    if (e.ctrlKey || e.metaKey) parts.push('ctrl');
    if (e.altKey)               parts.push('alt');
    if (e.shiftKey)             parts.push('shift');
    parts.push(e.key.toLowerCase());   // e.g. 'f2', 's', 'delete', 'escape'
    return parts.join('+');
  }

  /* ── Global keydown handler (capture phase) ─────────────────── */
  function _onKeydown(e) {
    if (!_enabled) return;
    const key = _normalise(e);
    const fn  = _registry.get(key);
    if (fn) fn(e);
  }

  // Use capture phase so we can intercept before target element handlers
  document.addEventListener('keydown', _onKeydown, { capture: true });

  /* ── Public API ─────────────────────────────────────────────── */
  return {

    /**
     * Register a shortcut.
     * @param {string}   key     - e.g. 'f2', 'ctrl+s', 'delete', 'escape'
     * @param {Function} handler - receives the KeyboardEvent
     */
    register(key, handler) {
      _registry.set(key.toLowerCase(), handler);
    },

    /** Remove one shortcut by key string. */
    unregister(key) {
      _registry.delete(key.toLowerCase());
    },

    /**
     * Remove all registered shortcuts.
     * Call this at the start of every page render() to prevent
     * shortcuts from leaking across page navigations.
     */
    clear() {
      _registry.clear();
    },

    /** Temporarily suppress all shortcut handling (e.g. while a modal is open). */
    disable() { _enabled = false; },

    /** Resume shortcut handling. */
    enable()  { _enabled = true;  },

    /** Returns an array of all currently registered key strings. */
    list()    { return [..._registry.keys()]; },

  };

})();
