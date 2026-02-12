/* ================================================================
   AgentMesh Documentation — Shared JavaScript
   ================================================================ */

(function () {
  'use strict';

  // ─── Theme Toggle ──────────────────────────────────────────────

  const THEME_KEY = 'agentmesh-theme';

  function getPreferredTheme() {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored) return stored;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);

    // Update toggle button text
    const btn = document.querySelector('.theme-toggle');
    if (btn) {
      btn.textContent = theme === 'dark' ? '\u2600' : '\u263E';  // ☀ or ☾
      btn.title = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
    }
  }

  // Apply theme immediately (before DOMContentLoaded to avoid flash)
  applyTheme(getPreferredTheme());

  document.addEventListener('DOMContentLoaded', function () {
    // Re-apply to make sure button text is correct
    applyTheme(getPreferredTheme());

    // Toggle listener
    const toggleBtn = document.querySelector('.theme-toggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', function () {
        const current = document.documentElement.getAttribute('data-theme') || 'dark';
        const next = current === 'dark' ? 'light' : 'dark';
        applyTheme(next);

        // Re-render Mermaid diagrams with updated theme (if available)
        if (window.__rerenderMermaid) {
          window.__rerenderMermaid(next);
        }
      });
    }

    // ─── Mobile Sidebar Toggle ─────────────────────────────────

    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    const hamburger = document.querySelector('.hamburger');

    function closeSidebar() {
      if (sidebar) sidebar.classList.remove('open');
      if (backdrop) backdrop.classList.remove('visible');
      if (hamburger) hamburger.textContent = '\u2630';
    }

    if (hamburger && sidebar) {
      hamburger.addEventListener('click', function () {
        var isOpen = sidebar.classList.toggle('open');
        if (backdrop) backdrop.classList.toggle('visible', isOpen);
        hamburger.textContent = isOpen ? '\u2715' : '\u2630';
      });
    }

    if (backdrop) {
      backdrop.addEventListener('click', closeSidebar);
    }

    // Close sidebar when clicking a link (mobile)
    document.querySelectorAll('.sidebar-nav a').forEach(function (link) {
      link.addEventListener('click', closeSidebar);
    });

    // ─── Active Nav Link ───────────────────────────────────────

    var currentPath = window.location.pathname;
    // Handle both /docs/page.html and /page.html
    var currentFile = currentPath.split('/').pop() || 'index.html';

    document.querySelectorAll('.sidebar-nav a').forEach(function (link) {
      var href = link.getAttribute('href');
      var linkFile = href.split('/').pop() || 'index.html';
      if (linkFile === currentFile) {
        link.classList.add('active');
      }
    });

    // ─── Copy Buttons on Code Blocks ───────────────────────────

    document.querySelectorAll('.code-block').forEach(function (block) {
      var pre = block.querySelector('pre');
      if (!pre) return;

      var btn = document.createElement('button');
      btn.className = 'copy-btn';
      btn.textContent = 'Copy';

      btn.addEventListener('click', function () {
        var code = pre.querySelector('code');
        var text = (code || pre).textContent;

        navigator.clipboard.writeText(text).then(function () {
          btn.textContent = 'Copied!';
          btn.classList.add('copied');
          setTimeout(function () {
            btn.textContent = 'Copy';
            btn.classList.remove('copied');
          }, 2000);
        });
      });

      block.appendChild(btn);
    });

    // ─── Smooth scroll for anchor links ────────────────────────

    document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
      anchor.addEventListener('click', function (e) {
        var target = document.querySelector(this.getAttribute('href'));
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth' });
          history.pushState(null, '', this.getAttribute('href'));
        }
      });
    });
  });
})();
