/**
 * Sidebar.js – Left navigation sidebar component (placeholder)
 *
 * Renders the sidebar with menu items for each page.
 * No logic implemented yet — structure only.
 */

const Sidebar = (() => {
  const menuItems = [
    { label: 'Dashboard',  page: 'dashboard',  icon: '🏠' },
    { label: 'Billing',    page: 'billing',    icon: '🧾' },
    { label: 'Products',   page: 'products',   icon: '📦' },
    { label: 'Customers',  page: 'customers',  icon: '👥' },
    { label: 'Reports',    page: 'reports',    icon: '📊' },
    { label: 'Settings',   page: 'settings',   icon: '⚙️'  },
  ];

  function mount(container) {
    const header = document.createElement('div');
    header.className = 'sidebar-brand-header';
    header.innerHTML = `
      <div style="font-size:0.68rem;opacity:0.6;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:4px;font-weight:700;">Billing System</div>
      <div style="font-size:0.95rem;font-weight:800;line-height:1.3;color:#ffffff;letter-spacing:-0.01em;">Sree Vel Murugan<br><span style="color:#f59e0b">Hardware &amp; Tiles</span></div>
    `;
    container.appendChild(header);

    // Navigation list
    const nav = document.createElement('nav');

    menuItems.forEach(item => {
      const link = document.createElement('a');
      link.href = `#${item.page}`;
      link.dataset.page = item.page;
      link.innerHTML = `<span>${item.icon}</span><span>${item.label}</span>`;
      nav.appendChild(link);
    });

    container.appendChild(nav);

    function updateActiveLink() {
      const current = (window.location.hash.replace('#', '') || 'dashboard');
      nav.querySelectorAll('a').forEach(link => {
        const isAct = (link.dataset.page === current);
        link.classList.toggle('active', isAct);
      });
    }

    window.addEventListener('hashchange', updateActiveLink);
    updateActiveLink();
  }

  return { mount };
})();
