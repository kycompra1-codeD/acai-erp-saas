import { useEffect, useRef } from 'react';

function lerp(val, inMin, inMax, outMin, outMax) {
  const clamped = Math.min(inMax, Math.max(inMin, parseFloat(val) || 0));
  return outMin + ((clamped - inMin) / (inMax - inMin)) * (outMax - outMin);
}

export default function ProductBox3D({ width, height, length, packagingType = 'pacote' }) {
  const w = lerp(width, 0, 100, 40, 120);
  const h = lerp(height, 0, 100, 40, 120);
  const l = lerp(length, 0, 100, 30, 100);

  // Colors per face
  const colors = {
    front:  'rgba(139,92,246,0.85)',
    back:   'rgba(109,62,216,0.85)',
    top:    'rgba(167,139,250,0.85)',
    bottom: 'rgba(89,42,196,0.85)',
    right:  'rgba(119,72,226,0.85)',
    left:   'rgba(99,52,206,0.85)',
  };

  if (packagingType === 'envelope') {
    // Flat envelope shape
    const ew = w * 1.4;
    const eh = h * 0.5;
    const el = l * 0.2;
    return (
      <div style={{ width: 160, height: 130, display: 'flex', alignItems: 'center', justifyContent: 'center', perspective: '600px' }}>
        <div style={{ position: 'relative', width: ew, height: eh, transformStyle: 'preserve-3d', transform: 'rotateX(-20deg) rotateY(30deg)', transition: 'all 0.5s cubic-bezier(0.4,0,0.2,1)' }}>
          <div style={{ position: 'absolute', width: '100%', height: '100%', background: colors.front, border: '1.5px solid rgba(255,255,255,0.3)', transform: `translateZ(${el/2}px)` }} />
          <div style={{ position: 'absolute', width: '100%', height: '100%', background: colors.back, border: '1.5px solid rgba(255,255,255,0.2)', transform: `rotateY(180deg) translateZ(${el/2}px)` }} />
          <div style={{ position: 'absolute', width: '100%', height: el, background: colors.top, border: '1.5px solid rgba(255,255,255,0.2)', top: 0, transform: 'rotateX(90deg) translateZ(0)', transformOrigin: 'top' }} />
          <div style={{ position: 'absolute', width: '100%', height: el, background: colors.bottom, border: '1.5px solid rgba(255,255,255,0.2)', bottom: 0, transform: 'rotateX(-90deg) translateZ(0)', transformOrigin: 'bottom' }} />
          <div style={{ position: 'absolute', width: el, height: '100%', background: colors.right, border: '1.5px solid rgba(255,255,255,0.2)', right: 0, transform: 'rotateY(90deg) translateZ(0)', transformOrigin: 'right' }} />
          <div style={{ position: 'absolute', width: el, height: '100%', background: colors.left, border: '1.5px solid rgba(255,255,255,0.2)', left: 0, transform: 'rotateY(-90deg) translateZ(0)', transformOrigin: 'left' }} />
        </div>
        <Labels style={{ bottom: 6 }}>A · L · C</Labels>
      </div>
    );
  }

  if (packagingType === 'rolo') {
    // Cylinder approximation using border-radius
    const rw = w * 0.6;
    const rh = h;
    return (
      <div style={{ width: 160, height: 130, display: 'flex', alignItems: 'center', justifyContent: 'center', perspective: '600px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, transform: 'rotateX(-15deg) rotateY(25deg)', transformStyle: 'preserve-3d', transition: 'all 0.5s cubic-bezier(0.4,0,0.2,1)' }}>
          {/* top ellipse */}
          <div style={{ width: rw, height: rw * 0.35, borderRadius: '50%', background: colors.top, border: '1.5px solid rgba(255,255,255,0.3)', transform: 'translateZ(0)' }} />
          {/* body */}
          <div style={{ width: rw, height: rh, background: `linear-gradient(90deg, ${colors.left}, ${colors.front}, ${colors.right})`, border: '1.5px solid rgba(255,255,255,0.2)', marginTop: -rw * 0.17, marginBottom: -rw * 0.17 }} />
          {/* bottom ellipse */}
          <div style={{ width: rw, height: rw * 0.35, borderRadius: '50%', background: colors.bottom, border: '1.5px solid rgba(255,255,255,0.3)' }} />
        </div>
      </div>
    );
  }

  // Default: Pacote / Caixa
  return (
    <div style={{ width: 160, height: 130, display: 'flex', alignItems: 'center', justifyContent: 'center', perspective: '600px', position: 'relative' }}>
      <div style={{ position: 'relative', width: w, height: h, transformStyle: 'preserve-3d', transform: 'rotateX(-22deg) rotateY(33deg)', transition: 'all 0.5s cubic-bezier(0.4,0,0.2,1)' }}>
        <div style={{ position: 'absolute', width: '100%', height: '100%', background: colors.front, border: '1.5px solid rgba(255,255,255,0.3)', transform: `translateZ(${l/2}px)` }} />
        <div style={{ position: 'absolute', width: '100%', height: '100%', background: colors.back, border: '1.5px solid rgba(255,255,255,0.15)', transform: `rotateY(180deg) translateZ(${l/2}px)` }} />
        <div style={{ position: 'absolute', width: '100%', height: l, background: colors.top, border: '1.5px solid rgba(255,255,255,0.25)', top: 0, transform: 'rotateX(90deg) translateZ(0)', transformOrigin: 'top' }} />
        <div style={{ position: 'absolute', width: '100%', height: l, background: colors.bottom, border: '1.5px solid rgba(255,255,255,0.1)', bottom: 0, transform: 'rotateX(-90deg) translateZ(0)', transformOrigin: 'bottom' }} />
        <div style={{ position: 'absolute', width: l, height: '100%', background: colors.right, border: '1.5px solid rgba(255,255,255,0.2)', right: 0, transform: 'rotateY(90deg) translateZ(0)', transformOrigin: 'right' }} />
        <div style={{ position: 'absolute', width: l, height: '100%', background: colors.left, border: '1.5px solid rgba(255,255,255,0.12)', left: 0, transform: 'rotateY(-90deg) translateZ(0)', transformOrigin: 'left' }} />
      </div>
      {/* Labels */}
      <div style={{ position: 'absolute', bottom: 4, fontSize: 9, fontWeight: 800, color: 'rgba(167,139,250,0.7)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
        A · L · C
      </div>
    </div>
  );
}

function Labels({ children, style }) {
  return (
    <div style={{ position: 'absolute', fontSize: 9, fontWeight: 800, color: 'rgba(167,139,250,0.7)', letterSpacing: '0.12em', textTransform: 'uppercase', ...style }}>
      {children}
    </div>
  );
}
