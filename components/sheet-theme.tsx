import type { CSSProperties } from 'react';
import { ClassIcon } from './ui';

const THEMES: Record<string,{accent:string;dark:string;wash:string;motif:string}> = {
  'class-artificiero': {accent:'#9b692f',dark:'#463b2d',wash:'#f2e9db',motif:'mechanical'},
  'class-barbaro': {accent:'#aa563e',dark:'#49332e',wash:'#f4e7df',motif:'steel'},
  'class-bardo': {accent:'#946247',dark:'#49383b',wash:'#f5eae2',motif:'arcane'},
  'class-brujo': {accent:'#806299',dark:'#322b43',wash:'#eeE8f3',motif:'arcane'},
  'class-clerigo': {accent:'#a48139',dark:'#45402f',wash:'#f5efdf',motif:'divine'},
  'class-druida': {accent:'#678053',dark:'#2f4335',wash:'#eaf0e4',motif:'nature'},
  'class-explorador': {accent:'#67806b',dark:'#2e433b',wash:'#e7eee6',motif:'nature'},
  'class-guerrero': {accent:'#8f7151',dark:'#3e4140',wash:'#efeae2',motif:'steel'},
  'class-hechicero': {accent:'#a35662',dark:'#492e40',wash:'#f4e6ec',motif:'arcane'},
  'class-mago': {accent:'#6b6e9c',dark:'#30364a',wash:'#e9ebf4',motif:'arcane'},
  'class-monje': {accent:'#9d7a45',dark:'#443f31',wash:'#f4eddf',motif:'divine'},
  'class-paladin': {accent:'#9b843f',dark:'#3b4040',wash:'#f3efdf',motif:'divine'},
  'class-picaro': {accent:'#7e728d',dark:'#343340',wash:'#ece9ef',motif:'shadow'},
};
export function sheetTheme(classId?:string) {
  const theme=THEMES[classId??'']??THEMES['class-guerrero'];
  return {motif:theme.motif,style:{'--class-accent':theme.accent,'--class-dark':theme.dark,'--class-wash':theme.wash} as CSSProperties};
}
export function ClassOrnament({classId,motif}:{classId?:string;motif:string}) {
  return <div className={`class-ornament ${motif}`} aria-hidden="true"><svg viewBox="0 0 180 180" fill="none"><circle cx="90" cy="90" r="73"/><circle cx="90" cy="90" r="62" strokeDasharray={motif==='mechanical'?'4 5':'1 9'}/>{motif==='nature'?<path d="M90 12C35 36 20 75 42 128M90 12c55 24 70 63 48 116M29 57l27 12-9-30m-18 55 26-3-21 25m117-59-27 12 9-30m18 55-26-3 21 25M57 145l33 20 33-20"/>:motif==='steel'||motif==='shadow'?<path d="M90 18l53 32v60l-53 48-53-48V50ZM28 27l124 126M152 27 28 153"/>:<path d="m90 9 70 121H20ZM90 171 20 50h140ZM90 0v22m0 136v22M0 90h22m136 0h22"/>}</svg><ClassIcon id={classId} size={47}/></div>;
}
