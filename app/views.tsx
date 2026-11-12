'use client';
import { useState } from 'react';
import { ArrowRight, Check, ChevronRight, Clock3, Download, Layers3, Minus, Plus, Ruler, Search, TriangleAlert, Wrench } from 'lucide-react';
import { type Cabinet, type Piece, type Project, type Stage, drawerDims, facadeDims, hardware, materials, mm, pieceCount, size, sqm, warnings, zones } from '../lib/kitchen';
import { type nest, materialTotals, reusableOffcuts, sheetAreaUsed } from '../lib/nesting';
import { type Collection, type EditTarget, type RulesGroup, rulesInfo } from './editors';
import { Blank, CardTitle, EditButton, Note, PlusButton, StageSelect } from './ui';
import { CabinetSketch, DrawerSketch, FacadeSketch, KitchenPlan, SheetSketch } from './visuals';
import { exportCsv } from './reports';

type Edit = (target:EditTarget)=>void;
type Change = (kind:Collection,id:string,value:Stage)=>void;
type CutPlan = ReturnType<typeof nest>;
type ViewProps = {project:Project;edit:Edit;change:Change};

export function CabinetTable({project,edit,change,items,select}:{items:Cabinet[];select?:(id:string)=>void}&ViewProps) {
  return <div className="table-scroll"><table className="data-table">
    <thead><tr><th>Caisson</th><th>Cotes L × H × P</th><th>Emplacement</th><th>Avancement</th><th><span className="sr-only">Modifier</span></th></tr></thead>
    <tbody>{items.map(c=><tr key={c.id}>
      <td><button type="button" className="row-name" onClick={()=>select?select(c.id):edit({kind:'cabinets',id:c.id})}><span className="ref">{c.id}</span><span>{c.name}<small>{materials[c.material]} {c.material==='cp'?mm(project.rules.facadeE):mm(project.rules.cabinetE)} mm · {c.make?'À fabriquer':'Corps existant'}</small></span></button></td>
      <td className="numeric">{size(c.width,c.height,c.depth)}</td><td>{zones[c.zone]}</td>
      <td><StageSelect value={c.stage} change={v=>change('cabinets',c.id,v)} label={'Avancement '+c.id}/></td>
      <td><EditButton onClick={()=>edit({kind:'cabinets',id:c.id})} label={'Modifier '+c.id}/></td>
    </tr>)}</tbody>
  </table>{!items.length&&<Blank>Aucun caisson dans cette zone.</Blank>}</div>;
}

export function Implantation({project,edit,change,selected,select,allCabinets}:{selected:string;select:(id:string)=>void;allCabinets:()=>void}&ViewProps) {
  const [elevation,setElevation]=useState(false);
  const [zoom,setZoom]=useState(1);
  const current=project.cabinets.find(c=>c.id===selected);
  const visible=project.cabinets.filter(c=>elevation?c.zone==='hauts':c.zone==='A'||c.zone==='B');
  const chosen=current??visible[0];
  const usedA=project.cabinets.filter(c=>c.zone==='A').reduce((sum,c)=>sum+c.width,0);
  const remaining=project.runA-usedA;
  function switchElevation(value:boolean) {
    setElevation(value);setZoom(1);
    const first=project.cabinets.find(c=>value?c.zone==='hauts':c.zone==='A'||c.zone==='B');
    select(first?.id??'');
  }
  return <>
    <div className="layout-columns">
      <section className="card plan-card">
        <CardTitle title="Plan d’implantation" description="Sélectionne un caisson pour consulter ses cotes." action={<EditButton onClick={()=>edit({kind:'project'})} label="Modifier les cotes d’implantation"/>}/>
        <div className="plan-controls">
          <div className="segmented" aria-label="Vue d’implantation">
            <button aria-pressed={!elevation} onClick={()=>switchElevation(false)}>Cuisine en L</button>
            <button aria-pressed={elevation} onClick={()=>switchElevation(true)}>Meubles hauts</button>
          </div>
          <div className="zoom-controls">
            <button className="icon-button" aria-label="Dézoomer le plan" onClick={()=>setZoom(n=>Math.max(.8,n-.15))}><Minus size={15}/></button>
            <button className="icon-button zoom-value" aria-label="Réinitialiser le zoom" onClick={()=>setZoom(1)}>{Math.round(zoom*100)} %</button>
            <button className="icon-button" aria-label="Zoomer le plan" onClick={()=>setZoom(n=>Math.min(1.9,n+.15))}><Plus size={15}/></button>
          </div>
        </div>
        <div className="plan-board"><KitchenPlan project={project} active={chosen?.id??''} select={select} elevation={elevation} zoom={zoom}/></div>
        <div className="plan-foot"><span><i className="legend-dot green"/> Caisson sélectionné</span><span><i className="legend-dot tan"/> Caisson</span><span className="plan-remaining">{remaining>=0?'Reste A : ':'Dépassement A : '}{mm(Math.abs(remaining))} mm</span></div>
      </section>
      <section className="card inspector">
        <CardTitle title="Cotes du caisson"/>
        {chosen?<div className="inspector-body">
          <div className="inspector-name"><span className="ref">{chosen.id}</span><div><h3>{chosen.name}</h3><p>{zones[chosen.zone]} · {materials[chosen.material]}</p></div></div>
          <div className="cabinet-thumb"><CabinetSketch cabinet={chosen}/></div>
          <dl className="measure-grid">
            <div><dt>Largeur</dt><dd>{mm(chosen.width)}</dd></div>
            <div><dt>Hauteur</dt><dd>{mm(chosen.height)}</dd></div>
            <div><dt>Profond.</dt><dd>{mm(chosen.depth)}</dd></div>
          </dl>
          <div className="inspector-stage"><span>Avancement</span><StageSelect value={chosen.stage} change={v=>change('cabinets',chosen.id,v)} label={'Avancement '+chosen.id}/></div>
          <button type="button" className="button primary full-width" onClick={()=>edit({kind:'cabinets',id:chosen.id})}><Ruler size={16}/> Modifier les cotes</button>
        </div>:<Blank>Ajoute un caisson pour commencer.</Blank>}
      </section>
    </div>
    <section className="card below">
      <CardTitle title={elevation?'Caissons hauts':'Caissons implantés'} description={visible.length+' caissons dans cette vue'} action={<button className="button quiet" onClick={allCabinets}>Tous les caissons <ArrowRight size={16}/></button>}/>
      <CabinetTable project={project} items={visible} select={select} edit={edit} change={change}/>
    </section>
    <section className="card below">
      <CardTitle title="Relevé du chantier" action={<EditButton onClick={()=>edit({kind:'project'})} label="Modifier le relevé"/>}/>
      <div className="room-notes"><p>Plan de travail à {mm(project.worktopH)} mm · Évier à {mm(project.sinkH)} mm · Profondeur {mm(project.worktopD)} mm</p><p>{project.roomNote}</p></div>
    </section>
  </>;
}

export function Cabinets({project,edit,change}:ViewProps) {
  const [zone,setZone]=useState('all');
  const [query,setQuery]=useState('');
  const filtered=project.cabinets.filter(c=>(zone==='all'||c.zone===zone)&&(c.id+' '+c.name).toLowerCase().includes(query.toLowerCase()));
  return <section className="card">
    <CardTitle title="Registre des caissons" description="Dimensions extérieures en mm. Active le débit du corps pour les caissons à fabriquer."/>
    <div className="table-toolbar">
      <label className="search"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Rechercher un caisson" aria-label="Rechercher un caisson"/></label>
      <select value={zone} onChange={e=>setZone(e.target.value)} aria-label="Zone des caissons"><option value="all">Toutes les zones</option>{Object.entries(zones).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select>
    </div>
    <CabinetTable project={project} items={filtered} edit={edit} change={change}/>
  </section>;
}

export function Facades({project,edit,change,openCut}:ViewProps&{openCut:(id:string)=>void}) {
  const [filter,setFilter]=useState('all');
  const list=project.facades.filter(f=>filter==='all'||(filter==='hauts'?project.cabinets.some(c=>c.id===f.cabinetId&&c.zone==='hauts'):f.kind===filter));
  return <>
    <div className="section-tools"><div className="segmented" aria-label="Filtrer les façades">{[['all','Toutes'],['porte','Portes'],['tiroir','Façades de tiroirs'],['hauts','Meubles hauts']].map(([id,label])=><button key={id} aria-pressed={filter===id} onClick={()=>setFilter(id)}>{label}</button>)}</div><span>{list.length} éléments</span></div>
    <div className="item-grid">{list.map(f=>{
      const d=facadeDims(project,f),c=project.cabinets.find(c=>c.id===f.cabinetId);
      return <article className="card item-card" key={f.id}>
        <div className="item-top"><span className="ref">{f.id}</span><EditButton onClick={()=>edit({kind:'facades',id:f.id})} label={'Modifier '+f.id}/></div>
        <div className="facade-visual"><FacadeSketch project={project} facade={f}/></div>
        <div className="item-body">
          <h2>{f.name}</h2>
          <p className="item-measure">{size(d.width,d.height)} mm{f.qty>1?' · ×'+f.qty:''}</p>
          <p>{c?c.id+' · '+c.name:'Affectation à définir'} · {f.frame?'Cadre massif':'CP plein'}</p>
          <p>{f.autoWidth||f.autoHeight?'Cote liée au caisson':'Cote finie saisie'}</p>
          {f.note&&<p className="item-note">{f.note}</p>}
        </div>
        <div className="item-foot"><StageSelect value={f.stage} change={v=>change('facades',f.id,v)} label={'Avancement '+f.id}/><button className="button quiet small-button" onClick={()=>openCut(f.id)}>Débit <ArrowRight size={14}/></button></div>
      </article>;
    })}</div>
    {!list.length&&<Blank>Aucune façade dans cette vue.</Blank>}
  </>;
}

export function Drawers({project,edit,change,openCut}:ViewProps&{openCut:(id:string)=>void}) {
  const [runner,setRunner]=useState('all');
  const r=project.rules;
  const list=project.drawers.filter(d=>runner==='all'||String(d.runner)===runner);
  return <>
    <section className="card drawer-rule">
      <div className="drawer-image"><DrawerSketch/></div>
      <div><h2>Montage des fonds</h2><p>Fond CP {mm(r.floorE)} mm, rainuré à l’avant et à l’arrière. Les côtés portent le fond en feuillure.</p>
        <div className="rule-pills"><span>Hauteur de rainure <b>{mm(r.drawerE/2)} mm</b></span><span>Profondeur <b>{mm(r.grooveDepth)} mm</b></span><span>Appui latéral <b>{mm(r.sideRebate)} mm</b></span></div>
        <button className="button quiet small-button" onClick={()=>edit({kind:'rules',group:'tiroirs'})}>Modifier l’usinage <ArrowRight size={15}/></button>
      </div>
    </section>
    <div className="section-tools"><div className="segmented" aria-label="Filtrer les coulisses">
      {[['all','Tous'],['450','MOVENTO 450'],['300','MOVENTO 300']].map(([id,label])=><button key={id} aria-pressed={runner===id} onClick={()=>setRunner(id)}>{label}</button>)}</div><span>{list.length} tiroirs</span></div>
    <div className="item-grid">{list.map(d=>{
      const g=drawerDims(project,d)!;
      return <article className="card item-card" key={d.id}>
        <div className="item-top"><span className="ref">{d.id}</span><EditButton onClick={()=>edit({kind:'drawers',id:d.id})} label={'Modifier '+d.id}/></div>
        <div className="item-body">
          <h2>{d.name}</h2><p className="item-measure">{size(g.outsideW,d.height,g.boxL)} mm</p>
          <p>{d.cabinetId} · MOVENTO {d.runner} mm{d.qty>1?' · ×'+d.qty:''}</p>
          <dl className="drawer-dims"><div><dt>Fond L × l</dt><dd>{size(g.floorL,g.floorW)} mm</dd></div><div><dt>Avant / arrière</dt><dd>{size(g.ends,d.height)} mm</dd></div></dl>
          {d.note&&<p className="item-note">{d.note}</p>}
        </div>
        <div className="item-foot"><StageSelect value={d.stage} change={v=>change('drawers',d.id,v)} label={'Avancement '+d.id}/><button className="button quiet small-button" onClick={()=>openCut(d.id)}>Débit <ArrowRight size={14}/></button></div>
      </article>;
    })}</div>
    {!list.length&&<Blank>Aucun tiroir dans cette vue.</Blank>}
  </>;
}

export function StockView({project,plan,edit,openNest}:Pick<ViewProps,'project'|'edit'>&{plan:CutPlan;openNest:()=>void}) {
  const confirmed=project.stock.filter(s=>s.confirmed);
  const offcuts=plan.sheets.flatMap(s=>reusableOffcuts(s));
  return <>
    <div className="stats stats-3 compact">
      <Stat icon={<Layers3 size={18}/>} value={String(confirmed.reduce((sum,s)=>sum+s.qty,0))} label="Panneaux confirmés" detail="Pris en compte dans le débit"/>
      <Stat icon={<Ruler size={18}/>} value={sqm(confirmed.reduce((sum,s)=>sum+s.length*s.width*s.qty,0))} label="Surface en stock" detail="Tous matériaux confirmés"/>
      <Stat icon={<Layers3 size={18}/>} value={sqm(offcuts.reduce((sum,f)=>sum+f.w*f.h,0))} label="Chutes calculées" detail="Au moins 50 mm dans chaque sens"/>
    </div>
    <section className="card">
      <CardTitle title="Inventaire des panneaux" description="Confirme les dimensions et la quantité après avoir vérifié ton stock."/>
      <div className="table-scroll"><table className="data-table"><thead><tr><th>Panneau</th><th>Format L × l × ép.</th><th>Quantité</th><th>Disponibilité</th><th/></tr></thead>
        <tbody>{project.stock.map(s=><tr key={s.id}>
          <td><strong>{s.name}</strong><small>{materials[s.material]}{s.note?' · '+s.note:''}</small></td>
          <td className="numeric">{size(s.length,s.width,s.thickness)} mm</td><td>{s.qty}</td>
          <td><span className={'tag '+(s.confirmed?'sage':'amber')}>{s.confirmed?'Disponible':'À vérifier'}</span></td><td><EditButton onClick={()=>edit({kind:'stock',id:s.id})} label={'Modifier '+s.name}/></td>
        </tr>)}</tbody></table></div>
      {!project.stock.length&&<Blank>Aucun panneau dans l’inventaire.</Blank>}
    </section>
    <section className="card below">
      <CardTitle title="Chutes du calepinage" description="Cotes des rectangles libres après sciage. Ajoute les chutes réellement récupérées dans l’inventaire." action={<button className="button quiet" onClick={openNest}>Voir les panneaux <ArrowRight size={16}/></button>}/>
      <div className="offcut-list">{plan.sheets.map(s=><div key={s.id}><strong>{s.name}</strong><span>{reusableOffcuts(s).map(f=>size(f.w,f.h)).join(' · ')||'Aucune chute ≥ 50 mm'} mm</span></div>)}</div>
    </section>
  </>;
}

export function Stat({icon,value,label,detail}:{icon:React.ReactNode;value:string;label:string;detail?:string}) {
  return <div className="stat card"><div className="stat-top"><span>{label}</span><div>{icon}</div></div><strong>{value}</strong>{detail&&<small>{detail}</small>}</div>;
}

export function CutView({project,plan,edit,tab,setTab,remaining,setRemaining,owner,clearOwner,changePart}:{
  project:Project;plan:CutPlan;edit:Edit;tab:'list'|'nest';setTab:(value:'list'|'nest')=>void;
  remaining:boolean;setRemaining:(v:boolean)=>void;owner:string;clearOwner:()=>void;changePart:(piece:Piece,v:Stage)=>void;
}) {
  const [query,setQuery]=useState('');
  const [family,setFamily]=useState('all');
  const [active,setActive]=useState('');
  const chosen=plan.sheets.find(s=>s.id===active)??plan.sheets[0];
  const selected=plan.selected.filter(p=>(!owner||p.owner===owner)&&(family==='all'||p.category===family)&&
    (p.id+' '+p.name+' '+materials[p.material]).toLowerCase().includes(query.toLowerCase()));
  const offcuts=chosen?reusableOffcuts(chosen):[];
  const utilization=chosen?Math.round(100*sheetAreaUsed(chosen)/(chosen.length*chosen.width)):0;
  return <>
    <div className="section-tools wrap">
      <div className="segmented" aria-label="Vue du débit"><button aria-pressed={tab==='list'} onClick={()=>setTab('list')}>Liste des pièces</button><button aria-pressed={tab==='nest'} onClick={()=>setTab('nest')}>Calepinage</button></div>
      <label className="switch-label"><input type="checkbox" checked={remaining} onChange={e=>setRemaining(e.target.checked)}/> Restant à débiter</label>
    </div>
    {tab==='list'?<>
      <section className="card">
        <CardTitle title={owner?'Débit de '+owner:'Liste de débit'} description={pieceCount(selected)+' pièces · longueurs de coupe en mm'}
          action={<button className="button" onClick={()=>exportCsv(selected)}><Download size={16}/> CSV</button>}/>
        <div className="table-toolbar">
          <label className="search"><Search size={17}/><input aria-label="Rechercher une pièce" placeholder="Rechercher une pièce" value={query} onChange={e=>setQuery(e.target.value)}/></label>
          <select aria-label="Famille de pièces" value={family} onChange={e=>setFamily(e.target.value)}><option value="all">Toutes les familles</option>{['Caissons','Façades','Tiroirs','Pièces libres'].map(f=><option key={f}>{f}</option>)}</select>
          {owner&&<button className="button quiet" onClick={clearOwner}>Afficher toutes les pièces</button>}
        </div>
        <div className="table-scroll"><table className="data-table">
          <thead><tr><th>Pièce</th><th>Matériau</th><th>L × l × ép.</th><th>Qté</th><th>Avancement</th><th/></tr></thead>
          <tbody>{selected.map(p=><tr key={p.id}><td><div className="row-name"><span className="ref">{p.id}</span><span>{p.name}{p.note&&<small>{p.note}</small>}</span></div></td>
            <td>{materials[p.material]}</td><td className="numeric">{size(p.length,p.width,p.thickness)}</td><td>{p.qty}</td>
            <td><StageSelect value={p.stage} change={v=>changePart(p,v)} label={'Avancement '+p.id}/></td>
            <td><EditButton label={'Modifier la source de '+p.id} onClick={()=>edit({kind:({Caissons:'cabinets',Façades:'facades',Tiroirs:'drawers','Pièces libres':'custom'} as const)[p.category],id:p.owner})}/></td>
          </tr>)}</tbody></table></div>
        {!selected.length&&<Blank>Aucune pièce ne correspond à cette vue.</Blank>}
      </section>
      <section className="card below">
        <CardTitle title="Quantités nettes" description="Hors trait de scie et marge de délignage."/>
        <div className="material-list">{materialTotals(selected).map(m=><div key={m.key}><span>{materials[m.material]} {mm(m.thickness)} mm</span><strong>{m.material==='massif'?mm(m.linear/1000)+' m lin. · section '+m.section+' × '+mm(m.thickness):sqm(m.area)}</strong><small>{m.count} pièces</small></div>)}</div>
      </section>
      <details className="card below warning-list"><summary><TriangleAlert size={16}/> Cotes et réglages à vérifier</summary><ul>{warnings(project).map(w=><li key={w}>{w}</li>)}</ul></details>
    </>:<>
      <div className="stats stats-3 compact">
        <Stat icon={<Layers3 size={18}/>} value={String(plan.sheets.filter(s=>!s.purchase).length)} label="Panneaux pris en stock"/>
        <Stat icon={<Layers3 size={18}/>} value={String(plan.purchaseCount)} label="Panneaux à prévoir"/>
        <Stat icon={<Ruler size={18}/>} value={String(plan.missing.length)} label="Pièces hors format"/>
      </div>
      {plan.missing.length>0&&<Note>{plan.missing.length} pièces dépassent les formats disponibles. Vérifie les pièces {Array.from(new Set(plan.missing.map(x=>x.piece.id))).join(', ')} ou modifie le format d’achat.</Note>}
      <section className="card below">
        <CardTitle title="Calepinage des panneaux" description={'Trait de scie '+mm(project.rules.kerf)+' mm · délignage '+mm(project.rules.trim)+' mm par rive'}
          action={<button className="button" onClick={()=>edit({kind:'rules',group:'calepinage'})}><Ruler size={16}/> Réglages</button>}/>
        {chosen?<div className="nest-body">
          <div className="sheet-selector"><label>Panneau <select value={chosen.id} aria-label="Panneau du calepinage" onChange={e=>setActive(e.target.value)}>{plan.sheets.map(s=><option key={s.id} value={s.id}>{s.name+' · '+materials[s.material]+' '+mm(s.thickness)+' mm'}</option>)}</select></label><span className={'tag '+(chosen.purchase?'amber':'sage')}>{chosen.purchase?'À prévoir':'Stock confirmé'}</span></div>
          <div className="sheet-stage"><SheetSketch sheet={chosen}/></div>
          <div className="sheet-caption"><span>{size(chosen.length,chosen.width,chosen.thickness)} mm</span><span>{chosen.placed.length} pièces · {utilization} % de surface utilisée</span></div>
          <div className="sheet-details"><div><h3>Pièces placées</h3><div className="sheet-placements">{chosen.placed.map(p=><span key={p.piece.id+p.number}><b>{p.piece.id}{p.piece.qty>1?'/'+p.number:''}</b> {p.piece.name} · {size(p.piece.length,p.piece.width)} mm{p.turned?' · 90°':''}</span>)}</div></div>
            <div><h3>Chutes récupérables</h3>{offcuts.length?<ul>{offcuts.map((f,i)=><li key={i}>{size(f.w,f.h)} mm</li>)}</ul>:<p>Aucune chute de 50 mm ou plus sur les deux côtés.</p>}</div></div>
        </div>:<Blank>Aucun panneau nécessaire pour cette sélection.</Blank>}
      </section>
      {plan.timber.length>0&&<section className="card below"><CardTitle title="Massif des cadres" description="Longueurs nettes à préparer, par section."/><div className="material-list">{materialTotals(plan.timber).map(m=><div key={m.key}><span>Section {m.section} × {mm(m.thickness)} mm</span><strong>{mm(m.linear/1000)} m lin.</strong><small>{m.count} pièces</small></div>)}</div></section>}
      <div className="below"><Note>Le calepinage propose une répartition en rectangles. Les pièces peuvent tourner de 90° si le sens du fil le permet. Vérifie l’ordre des coupes à l’atelier.</Note></div>
    </>}
  </>;
}

export function HardwareView({project}:{project:Project}) {
  return <section className="card">
    <CardTitle title="Quantités de quincaillerie" description="Calculées à partir des tiroirs, des portes et des caissons hauts."/>
    <div className="table-scroll"><table className="data-table"><thead><tr><th>Équipement</th><th>Quantité</th><th>À vérifier</th></tr></thead>
      <tbody>{hardware(project).map(h=><tr key={h.name}><td><div className="row-name"><span className="hardware-icon"><Wrench size={16}/></span>{h.name}</div></td><td className="numeric"><strong>{h.qty}</strong> {h.unit}</td><td>{h.note}</td></tr>)}</tbody>
    </table></div>
  </section>;
}

export function Settings({project,edit}:Pick<ViewProps,'project'|'edit'>) {
  const r=project.rules;
  return <div className="settings-grid">
    <section className="card"><CardTitle title="Cotes d’implantation" action={<EditButton onClick={()=>edit({kind:'project'})} label="Modifier les cotes d’implantation"/>}/>
      <dl className="settings-data">{[['Linéaire A',project.runA],['Retour B',project.runB],['Hauteur du plan',project.worktopH],['Hauteur à l’évier',project.sinkH],['Profondeur du plan',project.worktopD]].map(([label,n])=><div key={label}><dt>{label}</dt><dd>{mm(Number(n))} mm</dd></div>)}</dl>
    </section>
    {(Object.entries(rulesInfo) as [RulesGroup,(typeof rulesInfo)[RulesGroup]][]).map(([key,group])=><section className="card" key={key}>
      <CardTitle title={group.title} action={<EditButton onClick={()=>edit({kind:'rules',group:key})} label={'Modifier '+group.title}/>}/>
      <dl className="settings-data">{group.fields.map(f=><div key={f.key}><dt>{f.label}</dt><dd>{f.type==='checkbox'?(r[f.key as keyof typeof r]?'Oui':'À vérifier'):mm(Number(r[f.key as keyof typeof r]))+' mm'}</dd></div>)}
      {key==='tiroirs'&&<div><dt>Hauteur de rainure calculée</dt><dd>{mm(r.drawerE/2)} mm</dd></div>}</dl>
      {key==='tiroirs'&&<div className="settings-note">MOVENTO bois : largeur intérieure du tiroir = passage utile − 42 mm, longueur extérieure = nominal − 10 mm. <a href="https://ea.blum.com/en/building-a-movento-drawer/" target="_blank" rel="noreferrer">Notice Blum ↗</a></div>}
    </section>)}
  </div>;
}

export type Revision={id:number;label:string;created_at:string};
const day = new Intl.DateTimeFormat('fr-FR',{dateStyle:'medium',timeStyle:'short',timeZone:'Europe/Paris'});
export const dateText=(date:string)=>date?day.format(new Date(date)):'Cotes préremplies';
export function HistoryView({history,version,inspect,more,canMore,busy}:{history:Revision[];version:number;inspect:(revision:Revision)=>void;more:()=>void;canMore:boolean;busy:boolean}) {
  return <section className="card">
    <CardTitle title="Versions du projet" description="Chaque enregistrement garde un instantané des cotes, du stock et de l’avancement."/>
    <div className="history-list">{history.map(rev=><div className="history-row" key={rev.id}>
      <span className="revision-icon"><Clock3 size={19}/></span><div><strong>{rev.label}</strong><small>Version {rev.id} · {dateText(rev.created_at)}</small></div>
      {rev.id===version?<span className="tag sage"><Check size={14}/> Version active</span>:<button className="button" onClick={()=>inspect(rev)}>Consulter <ChevronRight size={15}/></button>}
    </div>)}</div>
    {canMore&&<div className="history-more"><button className="button" disabled={busy} onClick={more}>Versions précédentes</button></div>}
  </section>;
}
