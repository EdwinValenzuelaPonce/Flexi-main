import React, { useEffect, useRef, useState } from "react";
import { Phone, MessageCircle, Car, Home as HomeIcon } from "lucide-react";

const ROUTE = "M300 38 C262 38 250 96 196 100 S118 150 72 172";
const TRAVEL_SECONDS = 60; // demo: el recorrido completo dura 1 min reales
const ETA_MINUTES = 15;    // tiempo que se muestra al cliente al salir

const CSS = `
.fwm{display:flex;flex-direction:column;gap:10px}
.fwm>svg{width:100%;height:auto;border-radius:16px;display:block;background:#E4EEE9}
.fwm-car{transition:transform 1s linear}
@media (prefers-reduced-motion:reduce){.fwm-car{transition:none}}
.fwm-eta{display:flex;align-items:center;justify-content:space-between;gap:10px;background:var(--fw-surface,#fff);border:1px solid var(--fw-line,#dfe8e6);border-radius:14px;padding:12px 14px}
.fwm-eta strong{font-size:15px;display:block}.fwm-eta span{font-size:12px;color:var(--fw-ink-soft,#5b7270)}
.fwm-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.fwm-actions button{display:flex;align-items:center;justify-content:center;gap:6px;font:inherit;cursor:pointer;border:1px solid var(--fw-line,#dfe8e6);border-radius:12px;padding:11px;font-weight:700;font-size:13px;color:var(--fw-ink,#0f2a2e);background:var(--fw-surface,#fff)}
`;

export default function TrackingMap({ step = 0, status = "pending", startedAt, providerName = "Tu prestador", street = "Tu dirección", onCall, onChat }) {
  const routeRef = useRef(null);
  const [now, setNow] = useState(() => Date.now());
  const [pt, setPt] = useState({ x: 300, y: 38 });

  useEffect(() => {
    if (step !== 1) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [step]);

  const progress = step >= 2 ? 1 : step === 1 ? Math.min(1, Math.max(0, (now - (startedAt || now)) / (TRAVEL_SECONDS * 1000))) : 0;

  useEffect(() => {
    const el = routeRef.current;
    if (!el) return;
    const p = el.getPointAtLength(progress * el.getTotalLength());
    setPt({ x: p.x, y: p.y });
  }, [progress]);

  const eta = Math.max(1, Math.ceil((1 - progress) * ETA_MINUTES));
  const km = ((1 - progress) * 3.2).toFixed(1);
  const declined = status === "declined";
  const text = declined ? ["Solicitud rechazada", "No hay servicio en curso"]
    : step >= 3 ? ["Servicio finalizado", "Gracias por elegir FlexiWash"]
    : step === 2 ? ["Servicio en proceso", `${providerName} está en tu domicilio`]
    : step === 1 ? (progress >= 1 ? ["Tu prestador llegó", street] : [`Llega en ${eta} min`, `A ${km} km de ${street}`])
    : status === "accepted" ? ["Confirmado", `${providerName} saldrá hacia tu domicilio`]
    : ["Esperando confirmación", `${providerName} aún no responde`];
  const showActions = !declined && step < 3 && status !== "pending";

  return (
    <div className="fwm">
      <style>{CSS}</style>
      <svg viewBox="0 0 360 210" role="img" aria-label={`Mapa del servicio. ${text[0]}. ${text[1]}`}>
        <path d="M0 150 C90 120 150 190 230 150 S330 110 360 130 V210 H0Z" fill="#B9D6EE" opacity=".75" />
        {[40, 100, 160].map((y) => <path key={y} d={`M0 ${y} H360`} stroke="#fff" strokeWidth="7" />)}
        {[60, 140, 220, 300].map((x) => <path key={x} d={`M${x} 0 V210`} stroke="#fff" strokeWidth="7" />)}
        <path ref={routeRef} d={ROUTE} fill="none" stroke="#9fb5b2" strokeWidth="4" strokeDasharray="2 7" strokeLinecap="round" pathLength="1" />
        <path d={ROUTE} fill="none" stroke="var(--fw-teal,#1a9c94)" strokeWidth="5" strokeLinecap="round" pathLength="1" strokeDasharray={`${progress} 1`} />
        <g transform="translate(72 172)"><circle r="15" fill="#fff" stroke="var(--fw-teal,#1a9c94)" strokeWidth="3" /><g transform="translate(-8 -8)"><HomeIcon size={16} color="#0f2a2e" /></g></g>
        <g className="fwm-car" style={{ transform: `translate(${pt.x}px, ${pt.y}px)` }} opacity={declined ? 0.35 : 1}>
          <circle r="16" fill="var(--fw-teal,#1a9c94)" /><g transform="translate(-9 -9)"><Car size={18} color="#fff" /></g>
        </g>
      </svg>
      <div className="fwm-eta" aria-live="polite"><div><strong>{text[0]}</strong><span>{text[1]}</span></div></div>
      {showActions && (
        <div className="fwm-actions">
          <button onClick={onCall}><Phone size={16} /> Llamar</button>
          <button onClick={onChat}><MessageCircle size={16} /> Mensaje</button>
        </div>
      )}
    </div>
  );
}
