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
    // Business name header
    const header = document.createElement('div');
    header.style.cssText = 'padding:20px 16px 16px;border-bottom:1px solid rgba(255,255,255,0.1);';
    header.innerHTML = `
      <div style="font-size:0.7rem;opacity:0.55;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:4px;">Billing System</div>
      <div style="font-size:0.95rem;font-weight:600;line-height:1.3;">Sree Vel Murugan<br>Hardware &amp; Tiles</div>
    `;
    container.appendChild(header);

    // Navigation list
    const nav = document.createElement('nav');
    nav.style.cssText = 'padding:12px 0;flex:1;';

    menuItems.forEach(item => {
      const link = document.createElement('a');
      link.href = `#${item.page}`;
      link.dataset.page = item.page;
      link.style.cssText =
        'display:flex;align-items:center;gap:12px;padding:11px 20px;color:rgba(255,255,255,0.75);' +
        'text-decoration:none;font-size:0.92rem;transition:background 0.15s,color 0.15s;';
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
