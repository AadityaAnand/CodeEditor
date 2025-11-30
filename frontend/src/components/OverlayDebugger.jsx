import { useEffect } from 'react';

export default function OverlayDebugger() {
  useEffect(() => {
    const overlays = [];
    const MIN_Z = 100; // anything likely to float above
    const nodes = Array.from(document.querySelectorAll('body *'));
    nodes.forEach((el) => {
      const style = window.getComputedStyle(el);
      const pos = style.position;
      const zi = parseInt(style.zIndex, 10);
      if ((pos === 'fixed' || pos === 'absolute') && !isNaN(zi) && zi >= MIN_Z) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          const hint = document.createElement('div');
          hint.style.position = 'fixed';
          hint.style.left = `${rect.left}px`;
          hint.style.top = `${rect.top}px`;
          hint.style.width = `${rect.width}px`;
          hint.style.height = `${rect.height}px`;
          hint.style.border = '2px dashed rgba(255,0,0,0.7)';
          hint.style.pointerEvents = 'none';
          hint.style.zIndex = '999999';
          hint.title = `${el.className || el.tagName} z:${zi} pos:${pos}`;
          document.body.appendChild(hint);
          overlays.push(hint);
        }
      }
    });

    console.info('[OverlayDebugger] highlighted', overlays.length, 'elements');
    return () => { overlays.forEach((n) => n.remove()); };
  }, []);

  return null;
}
