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

function navRoleSuffix(roleNorm) {
  var r = (roleNorm || '').toString().toUpperCase();
  if (r === 'ADM') return ' (Super Admin)';
  if (r === 'ADMIN_EMPRESA') return ' (Admin Empresa)';
  return ' (Vendedor)';
}

function fillNavUser() {
  var el1 = document.getElementById('userDisplay');
  var el2 = document.getElementById('userName');
  var el3 = document.getElementById('navUserName');
  if (el1) el1.textContent = 'Olá, …';
  if (el2) el2.textContent = 'Olá, …';
  if (el3) el3.textContent = '…';

  if (typeof window.syncCurrentUserFromApi !== 'function') {
    try {
      var user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
      var name = user && user.username ? user.username : 'Usuário';
      var line = 'Olá, ' + name + navRoleSuffix(user && user.role);
      if (el1) el1.textContent = line;
      if (el2) el2.textContent = line;
      if (el3) el3.textContent = name;
    } catch (_) {}
    return Promise.resolve();
  }

  return window.syncCurrentUserFromApi().then(function (me) {
    if (!me || !me.username) return;
    var line = 'Olá, ' + me.username + navRoleSuffix(me.role);
    if (el1) el1.textContent = line;
    if (el2) el2.textContent = line;
    if (el3) el3.textContent = me.username;
  });
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
  var p = fillNavUser();
  var done = function () {
    applyNavPermissions();
    setActiveNavLink();
  };
  if (p && typeof p.then === 'function') {
    p.then(done).catch(done);
  } else {
    done();
  }
});

