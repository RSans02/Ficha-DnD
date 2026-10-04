import test from 'node:test';
import assert from 'node:assert/strict';
import { catalog } from '../lib/catalog';
import { createCharacter } from '../lib/engine';
import { applyStartingEquipment, equipmentForPick, inventorySummary, resolveStartingEquipment, startingEquipmentIssues, startingEquipmentSelection } from '../lib/equipment';
import { abilityGenerationIssues, abilityScoresFrom, pointBuyCost, rollScore, STANDARD_ARRAY } from '../lib/ability-generation';
import { exportJSON, importJSON, validateCharacterData } from '../lib/persistence';

function rogue() {
  const c=createCharacter();c.name='Pícaro de prueba';c.classes=[{classId:'class-picaro',level:1}];
  c.backgroundId=catalog.backgrounds.find(b=>b.name==='Acólito')?.id??catalog.backgrounds[0].id;
  c.startingEquipment=startingEquipmentSelection(c);
  for(const [source,definition] of [[c.classes[0].classId,catalog.startingEquipment![c.classes[0].classId]],[c.backgroundId,catalog.backgroundEquipment![c.backgroundId]]] as const) {
    for(const group of definition.groups){const option=group.options[0],key=`${source}.${group.id}`;c.startingEquipment.selections[key]=option.id;
      for(const pick of option.picks??[])c.startingEquipment.picks[`${key}.${option.id}.${pick.id}`]=Array(pick.quantity).fill(equipmentForPick(catalog.equipment,pick.category)[0].id);
    }
  }
  return c;
}

test('rogue receives selected gear, fixed two daggers and background, preserving extras exactly once',()=>{
  const c=rogue();assert.deepEqual(startingEquipmentIssues(c,catalog),[]);
  c.inventory.push({id:'homebrew-test',name:'Brújula de ecos',category:'Objetos',quantity:3,weight:0.2,equipped:false,attuned:false,description:'Objeto de la mesa',notes:'',homebrew:true});
  const resolved=applyStartingEquipment(c,catalog);
  assert.equal(resolved.inventory.find(i=>i.equipmentId==='equipment-armas-daga')?.quantity,2);
  assert(resolved.inventory.some(i=>i.startingEquipmentOrigin===c.backgroundId));
  assert.equal(resolved.inventory.find(i=>i.id==='homebrew-test')?.quantity,3);
  assert.deepEqual(applyStartingEquipment(resolved,catalog),resolved);
  assert.equal(c.inventory.length,1);
  assert.deepEqual(importJSON(exportJSON(resolved),catalog).inventory,resolved.inventory);
});

test('gold replaces both class and background items and money, without duplicating on apply',()=>{
  const c=rogue();c.startingEquipment={...c.startingEquipment!,mode:'gold',goldRoll:10};
  const preview=resolveStartingEquipment(c,catalog);assert.equal(preview.coins.po,100);assert.equal(preview.items.length,0);
  const resolved=applyStartingEquipment(c,catalog);assert.equal(resolved.money.po,(c.money.po??0)+100);assert.equal(resolved.inventory.length,0);
  c.startingEquipment.goldRoll=17;assert(startingEquipmentIssues(c,catalog).length>0);assert.throws(()=>applyStartingEquipment(c,catalog));
});

test('changing class discards old initial selections; partial repeated picks remain valid draft data',()=>{
  const c=rogue();c.classes=[{classId:'class-artificiero',level:1}];assert.deepEqual(startingEquipmentSelection(c).selections,{});
  c.startingEquipment=startingEquipmentSelection(c);c.startingEquipment.picks['test']=['equipment-armas-daga',''];
  assert.deepEqual(validateCharacterData(c,catalog),[]);assert(startingEquipmentIssues(c,catalog).length>0);
});

test('2014 score methods check points, assigned array and retained 4d6 evidence',()=>{
  const c=createCharacter();c.abilityGeneration={method:'standard'};c.abilities=abilityScoresFrom(STANDARD_ARRAY);assert.deepEqual(abilityGenerationIssues(c),[]);
  c.abilities.str=14;assert(abilityGenerationIssues(c).length>0);
  c.abilityGeneration={method:'point-buy'};c.abilities=abilityScoresFrom([15,15,15,8,8,8]);assert.equal(pointBuyCost(c.abilities),27);assert.deepEqual(abilityGenerationIssues(c),[]);
  c.abilities.cha=9;assert(abilityGenerationIssues(c).length>0);
  assert.equal(rollScore([1,6,4,5]),15);
  const rolls=Array.from({length:6},()=>[1,6,4,5]);c.abilityGeneration={method:'rolled',rolls};c.abilities=abilityScoresFrom(rolls.map(rollScore));assert.deepEqual(abilityGenerationIssues(c),[]);
  c.abilities.str=16;assert(abilityGenerationIssues(c).length>0);
});

test('every class and background can resolve every equipment alternative and its filtered picks',()=>{
  for(const [id,definition] of Object.entries({...catalog.startingEquipment,...catalog.backgroundEquipment})) {
    const c=createCharacter();c.classes=[{classId:id.startsWith('class-')?id:'class-picaro',level:1}];c.backgroundId=id.startsWith('background-')?id:'';c.startingEquipment=startingEquipmentSelection(c);
    for(const group of definition.groups) for(const option of group.options) {
      const key=`${id}.${group.id}`;c.startingEquipment.selections[key]=option.id;
      if(option.requiresProficiency?.length)c.startingEquipment.verified.push(`${key}.${option.id}`);
      for(const pick of option.picks??[]) {const allowed=equipmentForPick(catalog.equipment,pick.category);assert(allowed.length,`${id}: ${pick.category} has equipment`);c.startingEquipment.picks[`${key}.${option.id}.${pick.id}`]=Array(pick.quantity).fill(allowed[0].id);if(pick.requiresProficiency)for(let index=0;index<pick.quantity;index++)c.startingEquipment.verified.push(`${key}.${option.id}.${pick.id}.${index}`);}
      assert(resolveStartingEquipment(c,catalog).items.every(item=>item.name&&item.quantity>0),`${id}: ${option.id}`);
    }
    assert.deepEqual(startingEquipmentIssues(c,catalog).filter(error=>error.startsWith((id.startsWith('class-')?catalog.classes:catalog.backgrounds).find(x=>x.id===id)!.name)),[],id);
  }
});

test('inventory includes coin weight and the artificer-specific attunement limits',()=>{
  const c=createCharacter();c.money.po=50;assert.equal(inventorySummary(c).coinWeight,1);assert.equal(inventorySummary(c).attunementLimit,3);
  for(const [level,limit] of [[9,3],[10,4],[14,5],[18,6]]) {c.classes=[{classId:'class-artificiero',level}];assert.equal(inventorySummary(c).attunementLimit,limit);}
});
