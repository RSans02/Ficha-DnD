'use client';

import { useEffect, useRef, useState } from 'react';
import { Dice5, Download, RefreshCw } from 'lucide-react';
import { ABILITIES, SKILLS } from '@/lib/constants';
import { deriveAttack, deriveCharacter } from '@/lib/engine';
import { equippedAttacks } from '@/lib/equipment';
import { d20Notation, damageNotation, type RollMode } from '@/lib/owlbear-rolls';
import { LocalCharacterRepository, importJSON, validateCharacterData } from '@/lib/persistence';
import type { Catalog, Character } from '@/lib/types';
import './owlbear-panel.css';

type OwlbearSdk = typeof import('@owlbear-rodeo/sdk').default;
type Audience = 'everyone' | 'self' | 'dm';
const SOURCE = 'grimorio.character-sheet';
const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function dicePlusReady(obr: OwlbearSdk): Promise<boolean> {
  const requestId = crypto.randomUUID();
  return new Promise(resolve => {
    let finished = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const finish = (ready: boolean) => { if (finished) return; finished = true; clearTimeout(timer); unsubscribe(); resolve(ready); };
    const unsubscribe = obr.broadcast.onMessage('dice-plus/isReady', event => {
      if (record(event.data) && event.data.requestId === requestId && event.data.ready === true) finish(true);
    });
    timer = setTimeout(() => finish(false), 1500);
    void obr.broadcast.sendMessage('dice-plus/isReady', { requestId, timestamp: Date.now() }, { destination: 'ALL' }).catch(() => finish(false));
  });
}

export function OwlbearPanel() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [connection, setConnection] = useState<'loading' | 'outside' | 'ready' | 'missing'>('loading');
  const [audience, setAudience] = useState<Audience>('everyone');
  const [mode, setMode] = useState<RollMode>('normal');
  const [tab, setTab] = useState<'checks' | 'combat'>('checks');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [storageWarning, setStorageWarning] = useState('');
  const obr = useRef<OwlbearSdk | null>(null);
  const repository = useRef<LocalCharacterRepository | null>(null);

  useEffect(() => {
    let live = true;
    void fetch('/api/catalog').then(response => {
      if (!response.ok) throw new Error('No se pudo cargar el catálogo.');
      return response.json() as Promise<Catalog>;
    }).then(async data => {
      const repo = new LocalCharacterRepository(data);
      let list: Character[] = [];
      try { list = await repo.list(); }
      catch { if (live) setStorageWarning('El almacenamiento del panel no está disponible. Puedes importar un personaje para esta sesión.'); }
      if (!live) return;
      repository.current = repo;
      setCatalog(data);
      setCharacters(list);
      setSelectedId(list[0]?.id ?? '');
    }).catch(cause => { if (live) setError(cause instanceof Error ? cause.message : 'No se pudo abrir la ficha.'); });
    void import('@owlbear-rodeo/sdk').then(({ default: sdk }) => {
      if (!live) return;
      if (!sdk.isAvailable) { setConnection('outside'); return; }
      const connect = () => {
        if (!live) return;
        obr.current = sdk;
        void dicePlusReady(sdk).then(ready => { if (live) setConnection(ready ? 'ready' : 'missing'); });
      };
      if (sdk.isReady) connect(); else sdk.onReady(connect);
    }).catch(() => { if (live) setConnection('outside'); });
    return () => { live = false; };
  }, []);

  const refresh = async () => {
    try {
      const list = await repository.current?.list() ?? [];
      setCharacters(list);
      setSelectedId(current => list.some(character => character.id === current) ? current : list[0]?.id ?? '');
      setError('');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo leer la biblioteca.'); }
  };

  const importCharacter = async (file?: File) => {
    if (!file || !catalog) return;
    setError('');
    try {
      if (file.size > MAX_IMPORT_BYTES) throw new Error('El archivo supera 5 MB.');
      const character = importJSON(await file.text());
      const issues = validateCharacterData(character, catalog);
      if (issues.length) throw new Error(`Falta contenido de la ficha: ${issues[0]}`);
      character.id = crypto.randomUUID();
      character.ownerId = 'local';
      character.isDemo = false;
      character.updatedAt = new Date().toISOString();
      let saved = false;
      try { await repository.current?.save(character); saved = Boolean(repository.current); }
      catch { setStorageWarning('El almacenamiento del panel no está disponible. El personaje importado durará solo esta sesión.'); }
      if (saved) await refresh();
      else setCharacters(current => [character, ...current]);
      setSelectedId(character.id);
      setMessage(`${character.name} importado ${saved ? 'en este navegador' : 'para esta sesión'}.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Archivo no válido.'); }
  };

  const roll = async (label: string, notation: string) => {
    if (!obr.current || connection !== 'ready' || busy) return;
    setBusy(true);
    setMessage('');
    setError('');
    const sdk = obr.current;
    const rollId = crypto.randomUUID();
    let unsubscribeResult = () => {};
    let unsubscribeError = () => {};
    let timer: ReturnType<typeof setTimeout> | undefined;
    const finish = () => { unsubscribeResult(); unsubscribeError(); if (timer) clearTimeout(timer); setBusy(false); };
    try {
      if (!await dicePlusReady(sdk)) { setConnection('missing'); throw new Error('Dice+ no responde. Actívalo en esta sala.'); }
      unsubscribeResult = sdk.broadcast.onMessage(`${SOURCE}/roll-result`, event => {
        if (!record(event.data) || event.data.rollId !== rollId) return;
        const result = event.data.result;
        if (record(result) && typeof result.totalValue === 'number') setMessage(`${label}: ${result.totalValue} (${notation})`);
        finish();
      });
      unsubscribeError = sdk.broadcast.onMessage(`${SOURCE}/roll-error`, event => {
        if (!record(event.data) || event.data.rollId !== rollId) return;
        setError(typeof event.data.error === 'string' ? event.data.error : 'Dice+ no pudo completar la tirada.');
        finish();
      });
      timer = setTimeout(() => { setError('No llegó el resultado de Dice+. Comprueba que siga activo.'); finish(); }, 15000);
      await sdk.broadcast.sendMessage('dice-plus/roll-request', {
        rollId,
        playerId: sdk.player.id,
        playerName: await sdk.player.getName(),
        rollTarget: audience,
        diceNotation: notation,
        showResults: true,
        timestamp: Date.now(),
        source: SOURCE,
      }, { destination: 'ALL' });
    } catch (cause) { finish(); setError(cause instanceof Error ? cause.message : 'No se pudo enviar la tirada.'); }
  };

  const character = characters.find(item => item.id === selectedId);
  const derived = character && catalog ? deriveCharacter(character, catalog) : null;
  const attacks = character && catalog ? [...character.attacks, ...equippedAttacks(character, catalog)] : [];
  const rollD20 = (label: string, modifier: number, automatic?: 'advantage' | 'disadvantage') =>
    void roll(label, d20Notation(modifier, mode === 'normal' ? automatic ?? 'normal' : mode));
  const available = connection === 'ready' && !busy;

  return <main className="owlbear-panel">
    <header className="owlbear-header"><div><span>GRIMORIO · OWLBEAR</span><h1>Tiradas de personaje</h1></div><Dice5 size={28} aria-hidden="true"/></header>
    <div className="owlbear-status" role="status">{connection === 'ready' ? 'Conectado a Dice+' : connection === 'loading' ? 'Conectando con Owlbear…' : connection === 'outside' ? 'Abre este panel como extensión en Owlbear Rodeo.' : 'Activa Dice+ en esta sala para tirar.'}</div>
    {storageWarning && <p className="owlbear-hint">{storageWarning}</p>}
    {connection === 'missing' && <button className="owlbear-link" onClick={() => { if (obr.current) void dicePlusReady(obr.current).then(ready => setConnection(ready ? 'ready' : 'missing')); }}>Volver a comprobar Dice+</button>}
    <div className="owlbear-controls"><label>Personaje<select aria-label="Personaje" value={selectedId} onChange={event => setSelectedId(event.target.value)}><option value="">Selecciona un personaje</option>{characters.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><button title="Actualizar biblioteca" aria-label="Actualizar biblioteca" onClick={() => void refresh()}><RefreshCw size={17}/></button></div>
    <label className="owlbear-import"><Download size={16}/>Importar personaje JSON<input type="file" accept="application/json,.json" onChange={event => { void importCharacter(event.target.files?.[0]); event.target.value = ''; }}/></label>
    {!characters.length && catalog && <p className="owlbear-hint">No hay personajes guardados en este contexto del navegador. Exporta un personaje desde Grimorio e importa su JSON aquí.</p>}
    {character && derived && <>
      <div className="owlbear-character"><strong>{character.name}</strong><small>Nivel {derived.level} · CA {derived.ac.value} · PG {character.hp.current}/{derived.hpMax.value}</small></div>
      <div className="owlbear-options"><label>Visibilidad<select value={audience} onChange={event => setAudience(event.target.value as Audience)}><option value="everyone">Toda la sala</option><option value="self">Solo yo</option><option value="dm">DJ y yo</option></select></label><label>d20<select value={mode} onChange={event => setMode(event.target.value as RollMode)}><option value="normal">Según la ficha</option><option value="advantage">Ventaja</option><option value="disadvantage">Desventaja</option></select></label></div>
      <div className="owlbear-tabs"><button className={tab === 'checks' ? 'active' : ''} onClick={() => setTab('checks')}>Pruebas y salvaciones</button><button className={tab === 'combat' ? 'active' : ''} onClick={() => setTab('combat')}>Combate</button></div>
      {tab === 'checks' ? <>
        <h2>Características</h2><div className="owlbear-grid">{ABILITIES.map(ability => <button disabled={!available} key={ability.id} onClick={() => rollD20(ability.label, derived.abilities[ability.id].modifier, derived.rollModes[`ability.${ability.id}`])}>{ability.label} <strong>{signed(derived.abilities[ability.id].modifier)}</strong></button>)}</div>
        <h2>Salvaciones</h2><div className="owlbear-grid">{ABILITIES.map(ability => <button disabled={!available} key={ability.id} onClick={() => rollD20(`Salvación de ${ability.label}`, derived.saves[ability.id].value, derived.rollModes[`save.${ability.id}`])}>{ability.label} <strong>{signed(derived.saves[ability.id].value)}</strong></button>)}</div>
        <h2>Habilidades</h2><div className="owlbear-grid">{SKILLS.map(skill => <button disabled={!available} key={skill.id} onClick={() => rollD20(skill.name, derived.skills[skill.id].value, derived.rollModes[`skill.${skill.id}`])}>{skill.name} <strong>{signed(derived.skills[skill.id].value)}</strong></button>)}</div>
      </> : <>
        <h2>Iniciativa</h2><div className="owlbear-grid"><button disabled={!available} onClick={() => rollD20('Iniciativa', derived.initiative.value)}>Iniciativa <strong>{signed(derived.initiative.value)}</strong></button></div>
        <h2>Ataques y daño</h2>{attacks.length === 0 && derived.spellcasting.length === 0 && <p className="owlbear-hint">Añade ataques o conjuros en la ficha para verlos aquí.</p>}
        {attacks.map(attack => { const values = deriveAttack(character, attack, catalog!); const damage = damageNotation(attack.damage, values.damageBonus); return <div className="owlbear-attack" key={attack.id}><strong>{attack.name}</strong><div><button disabled={!available} onClick={() => rollD20(`Ataque: ${attack.name}`, values.attack.value, derived.rollModes.attack)}>Ataque {signed(values.attack.value)}</button><button disabled={!available || !damage} title={damage ? undefined : 'La fórmula de daño requiere revisión manual'} onClick={() => { if (damage) void roll(`Daño: ${attack.name}`, damage); }}>Daño {damage ?? 'manual'}</button></div>{attack.extraDamage?.map((extra, index) => { const notation = damageNotation(extra.dice); return <button className="owlbear-extra" disabled={!available || !notation} key={index} onClick={() => { if (notation) void roll(`${attack.name}: daño ${extra.damageType}${extra.condition ? ` (${extra.condition})` : ''}`, notation); }}>+ {extra.dice} {extra.damageType}{extra.condition ? ` · ${extra.condition}` : ''}</button>; })}</div>; })}
        {derived.spellcasting.map(caster => <div className="owlbear-attack" key={caster.classId}><strong>Ataque de conjuro · {catalog?.classes.find(item => item.id === caster.classId)?.name ?? caster.classId}</strong><div><button disabled={!available} onClick={() => rollD20('Ataque de conjuro', caster.attack.value, derived.rollModes.attack)}>Ataque {signed(caster.attack.value)}</button><span>CD {caster.dc.value}</span></div></div>)}
      </>}
    </>}
    {message && <p className="owlbear-result" role="status">{message}</p>}
    {error && <p className="owlbear-error" role="alert">{error}</p>}
  </main>;
}

function signed(value: number) { return value >= 0 ? `+${value}` : String(value); }
