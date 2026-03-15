import { useEffect, useRef } from 'react';
import { useSocket } from '../lib/socket.jsx';

function playAlertSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = 'sine';
    gain.gain.value = 0.3;
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
    setTimeout(() => {
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.frequency.value = 1100;
      osc2.type = 'sine';
      gain2.gain.value = 0.3;
      osc2.start();
      osc2.stop(ctx.currentTime + 0.2);
    }, 200);
  } catch (e) { /* audio not supported */ }
}

export default function Notifications() {
  const socket = useSocket();
  const permissionRef = useRef(false);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(p => { permissionRef.current = p === 'granted'; });
    } else if ('Notification' in window) {
      permissionRef.current = Notification.permission === 'granted';
    }
  }, []);

  useEffect(() => {
    const checkForAlerts = async (topic) => {
      if (topic !== 'incidents') return;
      try {
        const res = await fetch('/api/incidents');
        const incidents = await res.json();
        const p1Open = incidents.filter(i => i.severity === 'P1' && i.status === 'open');
        if (p1Open.length > 0) {
          playAlertSound();
          if (permissionRef.current && document.hidden) {
            new Notification('NOC Hub — P1 Alert', {
              body: p1Open[0].title,
              icon: '/favicon.svg',
              tag: 'p1-alert',
            });
          }
        }
      } catch (e) { /* ignore */ }
    };

    socket.on('data_updated', checkForAlerts);
    return () => socket.off('data_updated', checkForAlerts);
  }, [socket]);

  return null;
}
