import type { Piece, Project } from '../lib/kitchen';
import { hardware, materials, mm, pieceCount, size, sqm, warnings } from '../lib/kitchen';
import { materialTotals, reusableOffcuts, type nest } from '../lib/nesting';
import { SheetSketch } from './visuals';

export function download(name:string,body:string,mime:string) {
  const url=URL.createObjectURL(new Blob([body],{type:mime}));
  const link=document.createElement('a');
  link.href=url;link.download=name;link.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export function exportCsv(parts:Piece[]) {
  const row=(cells:(string|number)[])=>cells.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(';');
  const lines=[row(['Repère','Pièce','Famille','Matériau','Longueur mm','Largeur mm','Épaisseur mm','Qté','Avancement','Usinage'])];
  for(const p of parts) lines.push(row([p.id,p.name,p.category,materials[p.material],mm(p.length),mm(p.width),mm(p.thickness),p.qty,p.stage,p.note]));
  download('debit-cuisine.csv','\ufeff'+lines.join('\r\n'),'text/csv;charset=utf-8');
}

export function PrintReport({project,version,pending,plan,remaining}:{project:Project;version:number;pending:boolean;plan:ReturnType<typeof nest>;remaining:boolean}) {
  return <div className="print-report">
    <header><p className="eyebrow">ATELIER CUISINE</p><h1>{project.name}</h1><p>{remaining?'Débit restant':'Récapitulatif du débit complet'} · version {version}{pending?' + modifications en cours':''}</p></header>
    <p>Linéaire A {mm(project.runA)} mm · retour B {mm(project.runB)} mm · plan de travail {size(project.worktopD,project.worktopH)} mm</p>
    <h2>Pièces à débiter · {pieceCount(plan.selected)}</h2>
    <table><thead><tr><th>Repère</th><th>Pièce</th><th>Matériau</th><th>L × l × ép. (mm)</th><th>Qté</th><th>Avancement</th></tr></thead>
      <tbody>{plan.selected.map(p=><tr key={p.id}><td>{p.id}</td><td>{p.name}{p.note&&<small>{p.note}</small>}</td><td>{materials[p.material]}</td><td>{size(p.length,p.width,p.thickness)}</td><td>{p.qty}</td><td>{p.stage}</td></tr>)}</tbody></table>
    <h2>Quantités de matériaux</h2>
    <table><thead><tr><th>Matériau</th><th>Épaisseur</th><th>Quantité nette</th><th>Pièces</th></tr></thead>
      <tbody>{materialTotals(plan.selected).map(m=><tr key={m.key}><td>{materials[m.material]}</td><td>{mm(m.thickness)} mm</td>
        <td>{m.material==='massif'?mm(m.linear/1000)+' m lin. × '+m.section+' mm':sqm(m.area)}</td><td>{m.count}</td></tr>)}</tbody></table>
    <h2>Quincaillerie du projet</h2>
    <table><thead><tr><th>Équipement</th><th>Quantité</th><th>Notes</th></tr></thead><tbody>{hardware(project).map(h=><tr key={h.name}><td>{h.name}</td><td>{h.qty} {h.unit}</td><td>{h.note}</td></tr>)}</tbody></table>
    <h2>Réglages et points à vérifier</h2>
    <p>Trait de scie {mm(project.rules.kerf)} mm. Délignage {mm(project.rules.trim)} mm par rive. Cadre {size(project.rules.frameW,project.rules.frameE)} mm. Jeu en périphérie {mm(project.rules.gap)} mm par rive.</p>
    <p>Fond de tiroir CP {mm(project.rules.floorE)} mm. Hauteur de rainure avant et arrière {mm(project.rules.drawerE/2)} mm. Profondeur {mm(project.rules.grooveDepth)} mm. Appui latéral en feuillure {mm(project.rules.sideRebate)} mm.</p>
    <ul>{warnings(project).map(w=><li key={w}>{w}</li>)}{plan.missing.map(({piece,number})=><li key={piece.id+number}>{piece.id}/{number} ne tient pas dans les formats choisis.</li>)}</ul>
    {plan.sheets.length>0&&<h2>Calepinage des panneaux</h2>}
    {plan.sheets.map(s=><div className="print-sheet" key={s.id}>
      <h3>{s.name} · {materials[s.material]} · {size(s.length,s.width,s.thickness)} mm</h3>
      <p>{s.purchase?'Format à prévoir':'Pris dans le stock confirmé'} · {s.placed.length} pièces</p>
      <SheetSketch sheet={s}/>
      <p>Chutes d’au moins 50 mm dans les deux sens : {reusableOffcuts(s).map(f=>size(f.w,f.h)+' mm').join(' · ')||'aucune'}</p>
    </div>)}
  </div>;
}
