// nav.js - Menu lateral (hambúrguer) para telas da retaguarda (não-PDV)

function openSidebar() {
  const sidebar = document.getElementById('navSidebar');
  const overlay = document.getElementById('navOverlay');
  if (!sidebar || !overlay) return;
  sidebar.classList.add('is-open');
  overlay.classList.add('is-open');
  document.body.classList.add('nav-locked');
}

function closeSidebar() {
  const sidebar = document.getElementById('navSidebar');
  const overlay = document.getElementById('navOverlay');
  if (!sidebar || !overlay) return;
  sidebar.classList.remove('is-open');
  overlay.classList.remove('is-open');
  document.body.classList.remove('nav-locked');
}

function toggleSidebar() {
  const sidebar = document.getElementById('navSidebar');
  if (!sidebar) return;
  if (sidebar.classList.contains('is-open')) closeSidebar();
  else openSidebar();
}

function setActiveNavLink() {
  const path = (window.location.pathname || '').toLowerCase();
  const file = path.split('/').pop() || 'index.html';

  const links = document.querySelectorAll('#navSidebar .nav-links a[href]');
  links.forEach((a) => a.classList.remove('is-active'));

  links.forEach((a) => {
    const href = (a.getAttribute('href') || '').toLowerCase();
    if (href === file) a.classList.add('is-active');
  });
}

function fillNavUser() {
  try {
    const user = (typeof getCurrentUser === 'function') ? getCurrentUser() : null;
    const name = user && user.username ? user.username : 'Usuário';
    const el1 = document.getElementById('userDisplay');
    if (el1) el1.textContent = 'Olá, ' + name;
    const el2 = document.getElementById('userName');
    if (el2) el2.textContent = 'Olá, ' + name;
    const el3 = document.getElementById('navUserName');
    if (el3) el3.textContent = name;
  } catch (_) {
    // ignore
  }
}

function applyNavPermissions() {
  // Reaproveita as regras existentes do auth.js que escondem `.menu-item-admin`
  if (typeof checkAuth === 'function') checkAuth();
  if (typeof checkPermission === 'function') {
    // Algumas telas já chamam checkPermission inline; aqui só garantimos o hide do menu.
  }
  if (typeof isAdmin === 'function' && !isAdmin()) {
    const menuItems = document.querySelectorAll('.menu-item-admin');
    menuItems.forEach((item) => {
      item.style.display = 'none';
    });
  }
}

document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') closeSidebar();
});

document.addEventListener('DOMContentLoaded', function () {
  var sidebar = document.getElementById('navSidebar');
  if (sidebar) {
    document.body.classList.add('has-nav-sidebar');
  }
  fillNavUser();
  applyNavPermissions();
  setActiveNavLink();
});

