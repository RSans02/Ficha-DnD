'use client';
import { useState } from 'react';
import { Check, Moon, Plus } from 'lucide-react';
import type { Catalog, Character } from '@/lib/types';
import { applyRest, deriveCharacter, longRestHitDiceRecovery, restPreview, spendHitDie, totalLevel } from '@/lib/engine';
import { Button, Field, Modal, sign } from './ui';

export function RestDialog({ character, catalog, kind, onClose, onApply }: { character: Character; catalog: Catalog; kind: 'short'|'long'; onClose:()=>void; onApply:(c:Character)=>void }) {
  const [draft,setDraft] = useState(character), [recovery,setRecovery] = useState(()=>longRestHitDiceRecovery(character,catalog)), [rolls,setRolls] = useState<Record<string,string>>({}), [food,setFood] = useState(false), [error,setError] = useState('');
  const d=deriveCharacter(draft,catalog), recoveryLimit=Math.max(1,Math.floor(totalLevel(draft)/2)), chosen=Object.values(recovery).reduce((a,b)=>a+b,0);
  const spend = (classId:string) => { try { setDraft(spendHitDie(draft,classId,Number(rolls[classId]),catalog)); setError(''); setRolls({...rolls,[classId]:''}); } catch(e) { setError(e instanceof Error?e.message:String(e)); } };
  return <Modal open title={`Descanso ${kind==='short'?'corto':'largo'}`} onClose={onClose} description={kind==='short'?'Al menos 1 hora de reposo. Puedes gastar dados de golpe para curarte.':'Al menos 8 horas, con 6 de sueño y hasta 2 de actividad ligera. Solo puedes beneficiarte una vez cada 24 horas y debes empezar con al menos 1 PG.'}>
    <div className="stack">
      {kind==='short' && <><p className="info-box">PG: {draft.hp.current} / {d.hpMax.value}. Cada dado recupera su tirada {sign(d.abilities.con.modifier)} de Constitución (mínimo 0).</p>{draft.classes.map(cl=>{const cls=catalog.classes.find(x=>x.id===cl.classId),available=cl.level-(draft.hp.hitDiceUsed[cl.classId]||0);return <div className="stack" key={cl.classId}><strong>{cls?.name}: {available} dados d{cls?.hitDie} disponibles</strong><div className="equipment-add-controls"><Field label={`Tirada de d${cls?.hitDie} de ${cls?.name}`}><input type="number" min={1} max={cls?.hitDie??20} value={rolls[cl.classId]??''} onChange={e=>setRolls({...rolls,[cl.classId]:e.target.value})}/></Field><Button disabled={available<=0||!rolls[cl.classId]} onClick={()=>spend(cl.classId)}><Plus size={15}/>Gastar un dado</Button></div></div>;})}</>}
      {kind==='long' && <><h3>Dados de golpe a recuperar</h3><p className="subtle">Hasta {recoveryLimit} dados en total: la mitad de tu nivel, redondeada hacia abajo, con un mínimo de 1. Elegidos: {chosen}.</p>{draft.classes.map(cl=>{const used=Math.min(cl.level,draft.hp.hitDiceUsed[cl.classId]||0),cls=catalog.classes.find(x=>x.id===cl.classId);return used>0?<Field key={cl.classId} label={`${cls?.name} · d${cls?.hitDie} (${used} gastados)`}><input type="number" min={0} max={Math.min(used,recoveryLimit)} value={recovery[cl.classId]??0} onChange={e=>setRecovery({...recovery,[cl.classId]:Number(e.target.value)})}/></Field>:null;})}<label className="flex subtle"><input type="checkbox" checked={food} onChange={e=>setFood(e.target.checked)}/>He comido y bebido lo necesario: reducir 1 nivel de agotamiento.</label></>}
      {restPreview(draft,kind,catalog,kind==='long'?recovery:undefined,{foodAndWater:food}).map((text,i)=><p className="subtle flex" key={i}><Check size={14}/>{text}</p>)}
      {error&&<p className="error-box" role="alert">{error}</p>}
    </div><div className="modal-footer"><Button onClick={onClose}>Cancelar</Button><Button variant="primary" onClick={()=>{try{onApply(applyRest(draft,kind,catalog,kind==='long'?recovery:undefined,{foodAndWater:food}));}catch(e){setError(e instanceof Error?e.message:String(e));}}}><Moon size={15}/>Confirmar descanso</Button></div>
  </Modal>;
}

export function ExhaustionControl({character:c,catalog,onChange}:{character:Character;catalog:Catalog;onChange:(c:Character)=>void}) {
  const descriptions=['Sin agotamiento','Desventaja en pruebas de característica','Velocidad a la mitad','Desventaja en ataques y salvaciones','PG máximos a la mitad','Velocidad 0','Muerte'];
  const level=c.exhaustionLevel??0;
  return <div className="stack" style={{marginTop:18,gap:8}}><Field label="Agotamiento · D&D 2014"><select value={level} onChange={e=>{const value=Number(e.target.value),next={...c,exhaustionLevel:value,conditions:value?[...c.conditions.filter(x=>x!=='Agotamiento'),'Agotamiento']:c.conditions.filter(x=>x!=='Agotamiento')};onChange({...next,hp:{...next.hp,current:value===6?0:Math.min(next.hp.current,deriveCharacter(next,catalog).hpMax.value)}});}}>{descriptions.map((text,index)=><option key={index} value={index}>{index} · {text}</option>)}</select></Field>{level>0&&<p className="subtle">Efectos acumulativos: {descriptions.slice(1,level+1).join('; ')}. Las desventajas se aplican al tirar los dados.</p>}{c.conditions.includes('Agotamiento')&&!level&&<p className="info-box">Esta ficha tenía agotamiento sin nivel registrado. Selecciona el nivel correspondiente.</p>}</div>;
}
