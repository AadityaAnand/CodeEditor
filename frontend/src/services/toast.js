const CONTAINER_ID = '__app_toast_container__';

function ensureContainer() {
  let c = document.getElementById(CONTAINER_ID);
  if (!c) {
    c = document.createElement('div');
    c.id = CONTAINER_ID;
    c.className = 'toast-container';
    document.body.appendChild(c);
  }
  return c;
}

export function showToast(message, { type = 'info', timeout = 4000 } = {}) {
  try {
    const c = ensureContainer();
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.textContent = message;
    c.appendChild(el);
    // animate in
    requestAnimationFrame(() => el.classList.add('visible'));
    const id = setTimeout(() => {
      el.classList.remove('visible');
      setTimeout(() => el.remove(), 300);
      clearTimeout(id);
    }, timeout);
    return () => { el.remove(); clearTimeout(id); };
  } catch (e) {
    // fallback to alert if DOM not available
    try { alert(message); } catch (e) {}
    return () => {};
  }
}

export default showToast;
