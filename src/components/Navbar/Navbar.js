/**
 * Navbar.js – Top navigation bar component (placeholder)
 *
 * Renders the top bar with the current page title.
 * No logic implemented yet — structure only.
 */

const Navbar = (() => {
  function mount(container) {
    container.innerHTML = `
      <span id="navbar-page-title">
        Dashboard
      </span>
      <div class="navbar-right" style="display:flex;align-items:center;gap:12px">
        <span style="display:inline-flex;align-items:center;gap:6px;background:#f1f5f9;color:#334155;border:1px solid #cbd5e1;padding:4px 10px;border-radius:20px;font-size:0.72rem;font-weight:700">
          <span style="width:6px;height:6px;border-radius:50%;background:#10b981;display:inline-block"></span>
          Disk Storage Active &bull; Auto-Save ON
        </span>
      </div>
    `;
  }

  return { mount };
})();
