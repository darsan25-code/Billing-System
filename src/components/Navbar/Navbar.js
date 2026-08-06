/**
 * Navbar.js – Top navigation bar component (placeholder)
 *
 * Renders the top bar with the current page title.
 * No logic implemented yet — structure only.
 */

const Navbar = (() => {
  function mount(container) {
    container.innerHTML = `
      <span id="navbar-page-title" style="font-size:1rem;font-weight:600;color:#333;">
        Dashboard
      </span>
    `;
  }

  return { mount };
})();
