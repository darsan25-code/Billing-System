/**
 * router.js – Simple hash-based client-side router (placeholder)
 *
 * Maps URL hashes to page render functions.
 * No navigation logic implemented yet — structure only.
 */

const Router = (() => {
  // Page registry: hash -> page module
  const routes = {
    dashboard: DashboardPage,
    billing:   BillingPage,
    products:  ProductsPage,
    customers: CustomersPage,
    reports:   ReportsPage,
    settings:  SettingsPage,
  };

  const defaultRoute = 'dashboard';

  function navigate(hash) {
    const page = routes[hash] || routes[defaultRoute];
    const container = document.getElementById('page-content');

    // Always clear page-scoped shortcuts before loading a new page.
    // Each page registers its own shortcuts in its render() function.
    if (typeof KeyboardShortcuts !== 'undefined') KeyboardShortcuts.clear();

    if (container && page) {
      page.render(container);
    }
  }

  function init() {
    // Listen for hash changes
    window.addEventListener('hashchange', () => {
      const hash = window.location.hash.replace('#', '') || defaultRoute;
      navigate(hash);
    });

    // Load the initial route
    const hash = window.location.hash.replace('#', '') || defaultRoute;
    navigate(hash);
  }

  return { init, navigate };
})();
