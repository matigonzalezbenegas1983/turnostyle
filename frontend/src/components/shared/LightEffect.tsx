import { useEffect, useRef } from 'react';

/**
 * Mouse-following warm light effect.
 * Uses rAF loop with lerp (0.04) so the glow lags behind the cursor
 * like a real light source sweeping across surfaces.
 */
export default function LightEffect() {
  const elRef  = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number>(0);
  const mouse  = useRef({ tx: 50, ty: 50, cx: 50, cy: 50 });

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;

    const onMove = (e: MouseEvent) => {
      mouse.current.tx = (e.clientX / window.innerWidth)  * 100;
      mouse.current.ty = (e.clientY / window.innerHeight) * 100;
    };

    const tick = () => {
      const m = mouse.current;
      m.cx += (m.tx - m.cx) * 0.04;
      m.cy += (m.ty - m.cy) * 0.04;
      el.style.setProperty('--mx', `${m.cx.toFixed(2)}%`);
      el.style.setProperty('--my', `${m.cy.toFixed(2)}%`);
      frameRef.current = requestAnimationFrame(tick);
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    frameRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(frameRef.current);
    };
  }, []);

  return <div ref={elRef} className="light-effect" aria-hidden="true" />;
}
