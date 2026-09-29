import { useEffect, useState } from "react";

// "Backend" simulado: solicitudes compartidas entre el panel del cliente y el del
// prestador mediante localStorage. Funciona entre pestañas/ventanas del mismo navegador.
// Para producción reemplaza estas funciones por llamadas a tu API (REST/WebSocket).
const KEY = "fw:shared:requests";
const listeners = new Set();
const read = () => { try { return JSON.parse(window.localStorage.getItem(KEY)) || []; } catch { return []; } };
const emit = () => listeners.forEach((f) => f());
const write = (list) => { try { window.localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* ignorar */ } emit(); };
window.addEventListener("storage", (e) => { if (e.key === KEY) emit(); });

export const saveRequest = (r) => write([...read().filter((x) => x.id !== r.id), { step: 0, status: "pending", createdAt: Date.now(), ...r }].slice(-100));
export const updateRequest = (id, patch) => write(read().map((x) => (x.id === id ? { ...x, ...patch, updatedAt: Date.now() } : x)));

export function useRequests() {
  const [list, setList] = useState(read);
  useEffect(() => {
    const f = () => setList(read());
    listeners.add(f); f();
    return () => listeners.delete(f);
  }, []);
  return list;
}

/* ---- Mensajes y llamadas (simulados; una llamada real requiere WebRTC + servidor) ---- */
function collection(key) {
  const subs = new Set();
  const rd = () => { try { return JSON.parse(window.localStorage.getItem(key)) || []; } catch { return []; } };
  const wr = (l) => { try { window.localStorage.setItem(key, JSON.stringify(l)); } catch { /* ignorar */ } subs.forEach((f) => f()); };
  window.addEventListener("storage", (e) => { if (e.key === key) subs.forEach((f) => f()); });
  const use = () => {
    const [l, setL] = useState(rd);
    useEffect(() => { const f = () => setL(rd()); subs.add(f); f(); return () => subs.delete(f); }, []);
    return l;
  };
  return { rd, wr, use };
}
const msgs = collection("fw:shared:messages");
const calls = collection("fw:shared:calls");

export const sendMessage = (reqId, from, text) =>
  msgs.wr([...msgs.rd(), { id: Date.now() + Math.random(), reqId, from, text: text.trim().slice(0, 500), ts: Date.now() }].slice(-300));
export const useAllMessages = () => msgs.use();
export const useCalls = () => calls.use();
export const startCall = (reqId, from) => calls.wr([...calls.rd().filter((c) => c.reqId !== reqId), { reqId, from, status: "ringing", ts: Date.now() }]);
export const updateCall = (reqId, patch) => calls.wr(calls.rd().map((c) => (c.reqId === reqId ? { ...c, ...patch } : c)));

/* ---- Agenda/disponibilidad del prestador y calificaciones (compartidas cliente <-> prestador) ---- */
const provCfg = collection("fw:shared:providerCfg");   // [{ id, available, schedule }]
const ratingsCol = collection("fw:shared:ratings");    // [{ reqId, providerId, avg, answers, comment, ts }]

export const useProviderCfgs = () => provCfg.use();
export const setProviderCfg = (id, patch) => {
  const l = provCfg.rd();
  provCfg.wr(l.some((c) => c.id === id) ? l.map((c) => (c.id === id ? { ...c, ...patch } : c)) : [...l, { id, ...patch }]);
};
export const useRatings = () => ratingsCol.use();
// Una calificación por solicitud: si se vuelve a enviar, reemplaza la anterior.
export const saveRating = (r) => ratingsCol.wr([...ratingsCol.rd().filter((x) => x.reqId !== r.reqId), { ...r, ts: Date.now() }].slice(-500));

export const DAY_NAMES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const hh = (n) => `${String(n).padStart(2, "0")}:00`;
// Horario por defecto de un prestador (días 0=lun … 6=dom, from/to en horas)
export const defaultSchedule = (m) => DAY_NAMES.map((d, i) => ({ d, on: m.days.includes(i), from: hh(m.from), to: hh(m.to) }));

// Promedio ponderado: la calificación base del prestador cuenta como `seedCount` reseñas previas.
export const blendRating = (seedAvg, seedCount, list) => {
  const total = seedCount + list.length;
  return { avg: total ? (seedAvg * seedCount + list.reduce((s, r) => s + r.avg, 0)) / total : seedAvg, count: total };
};
// Prestador "en vivo": datos base + agenda/disponibilidad y calificaciones compartidas.
export const liveMember = (m, cfgs, ratings) => {
  const c = cfgs.find((x) => x.id === m.id);
  const { avg, count } = blendRating(m.rating, m.reviews ?? 0, ratings.filter((r) => r.providerId === m.id));
  return { ...m, schedule: c?.schedule ?? defaultSchedule(m), available: c?.available ?? true, rating: avg, reviews: count };
};
