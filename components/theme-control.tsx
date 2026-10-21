'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, Moon, Sun } from 'lucide-react';
import { THEME_STORAGE_KEY, type ThemePreference } from '@/lib/theme';

export function ThemeControl() {
  const [preference, setPreference] = useState<ThemePreference>('light');

  useEffect(() => {
    let saved: ThemePreference = 'light';
    try {
      const value = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (value === 'dark') saved = 'dark';
    } catch {}
    setPreference(saved);
    document.documentElement.dataset.theme = saved;
  }, []);

  const change = (next: ThemePreference) => {
    setPreference(next);
    document.documentElement.dataset.theme = next;
    try { window.localStorage.setItem(THEME_STORAGE_KEY, next); } catch {}
  };

  return <label className="theme-control" title="Apariencia de la web">
    {documentThemeIcon(preference)}
    <span>Tema</span>
    <select aria-label="Tema de la web" value={preference} onChange={event => change(event.target.value as ThemePreference)}>
      <option value="light">Claro</option>
      <option value="dark">Oscuro</option>
    </select>
    <ChevronDown className="theme-control-chevron" size={13} aria-hidden="true" />
  </label>;
}

function documentThemeIcon(preference: ThemePreference) {
  return preference === 'dark' ? <Moon size={16} aria-hidden="true" /> : <Sun size={16} aria-hidden="true" />;
}
