import { useEffect, useState } from 'react';
import { storage } from '../services/storage.js';
export function usePwa(toast) {
  const [prompt, setPrompt] = useState(null);
  const [dismissed, setDismissed] = useState(() => storage.get('install_dismissed') === 'true');
  useEffect(() => {
    const beforeInstall = (event) => { event.preventDefault(); setPrompt(event); };
    const installed = () => { setPrompt(null); setDismissed(true); storage.set('install_dismissed', 'true'); toast('🎉 تم تثبيت التطبيق!', 'success'); };
    window.addEventListener('beforeinstallprompt', beforeInstall); window.addEventListener('appinstalled', installed);
    return () => { window.removeEventListener('beforeinstallprompt', beforeInstall); window.removeEventListener('appinstalled', installed); };
  }, [toast]);
  return { show: Boolean(prompt) && !dismissed && !window.matchMedia('(display-mode: standalone)').matches,
    close: () => { setDismissed(true); storage.set('install_dismissed', 'true'); },
    install: async () => { if (!prompt) { toast('افتح القائمة واختر «إضافة للشاشة الرئيسية»', 'info'); return; } await prompt.prompt(); await prompt.userChoice; setPrompt(null); } };
}
