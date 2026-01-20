export function initNav() {
  const siteNav = document.querySelector('.site-nav');
  const navToggle = document.querySelector('.nav-toggle');
  const navLinks = document.querySelectorAll('.nav-links a');
  const header = document.querySelector('.site-header');

  const updateHeaderOffset = () => {
    if (!header) return;
    const isDesktop = window.matchMedia('(min-width: 768px)').matches;
    const height = isDesktop ? header.offsetHeight : 0;
    document.documentElement.style.setProperty('--header-height', `${height}px`);
  };

  const toggleNavigation = force => {
    if (!siteNav || !navToggle) return;
    const isOpen = typeof force === 'boolean' ? force : !siteNav.classList.contains('open');
    siteNav.classList.toggle('open', isOpen);
    navToggle.setAttribute('aria-expanded', String(isOpen));
    document.body.classList.toggle('nav-open', isOpen);
    requestAnimationFrame(updateHeaderOffset);
  };

  if (navToggle) {
    navToggle.addEventListener('click', () => toggleNavigation());
  }

  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      if (siteNav?.classList.contains('open')) {
        toggleNavigation(false);
      }
    });
  });

  const desktopMedia = window.matchMedia('(min-width: 768px)');
  const handleDesktopChange = event => {
    if (event.matches) {
      toggleNavigation(false);
    }
  };

  if (desktopMedia.addEventListener) {
    desktopMedia.addEventListener('change', handleDesktopChange);
  } else if (desktopMedia.addListener) {
    desktopMedia.addListener(handleDesktopChange);
  }

  window.addEventListener('resize', updateHeaderOffset);
  window.addEventListener('load', updateHeaderOffset);
  updateHeaderOffset();
}
