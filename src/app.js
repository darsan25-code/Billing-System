/**
 * app.js – Application entry point
 * Initialises the layout components and loads the default page.
 *
 * Project: Sree Vel Murugan Hardware and Tiles – Billing System
 */

document.addEventListener('DOMContentLoaded', () => {
  // Initialise local database (seeds products on first run)
  if (typeof DB !== 'undefined') DB.init();

  // Mount layout components
  Sidebar.mount(document.getElementById('sidebar'));
  Navbar.mount(document.getElementById('navbar'));

  // Start the client-side router (defaults to Dashboard)
  Router.init();
});
