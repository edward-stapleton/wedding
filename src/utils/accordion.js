export function initAccordion() {
  const buttons = document.querySelectorAll('.accordion-item button');
  if (!buttons.length) return;

  buttons.forEach(button => {
    const panel = button.nextElementSibling;
    if (!panel) return;
    panel.style.maxHeight = '0px';
    panel.addEventListener('transitionend', event => {
      if (event.propertyName !== 'max-height') return;
      if (button.getAttribute('aria-expanded') === 'true') {
        panel.style.maxHeight = 'none';
      } else {
        panel.hidden = true;
      }
    });
    button.addEventListener('click', () => {
      const isExpanded = button.getAttribute('aria-expanded') === 'true';
      const nextState = !isExpanded;
      button.setAttribute('aria-expanded', String(nextState));
      if (nextState) {
        panel.hidden = false;
        panel.classList.add('open');
        panel.style.maxHeight = '0px';
        requestAnimationFrame(() => {
          panel.style.maxHeight = panel.scrollHeight + 'px';
        });
      } else {
        panel.classList.remove('open');
        if (panel.style.maxHeight === 'none') {
          panel.style.maxHeight = panel.scrollHeight + 'px';
        }
        requestAnimationFrame(() => {
          panel.style.maxHeight = '0px';
        });
      }
    });
  });
}
