'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Boxes, ChevronRight, CircleAlert, Download, History, Layers3, LayoutGrid, Menu, PanelTop, Printer, RotateCcw, Ruler, Scissors, SlidersHorizontal, Square, Wrench, X } from 'lucide-react';
import { type Piece, type Project, type Stage, facadeDims, getPieces, mm, pieceCount, size, sqm, validateProject } from '../lib/kitchen';
import { initialProject } from '../lib/seed';
import { nest } from '../lib/nesting';
import { type Collection, type EditTarget, ProjectEditor } from './editors';
import { download, PrintReport } from './reports';
import { Modal, PlusButton } from './ui';
import { Cabinets, CutView, Drawers, Facades, HardwareView, HistoryView, Implantation, Settings, Stat, StockView, type Revision, dateText } from './views';

const nav = [
  { id:'implantation',label:'Implantation',icon:LayoutGrid,group:'Projet' },
  { id:'caissons',label:'Caissons',icon:Boxes,group:'Projet' },
  { id:'facades',label:'Façades',icon:Square,group:'Projet' },
  { id:'tiroirs',label:'Tiroirs',icon:PanelTop,group:'Projet' },
  { id:'debit',label:'Plan de débit',icon:Scissors,group:'Atelier' },
  { id:'panneaux',label:'Panneaux et chutes',icon:Layers3,group:'Atelier' },
  { id:'quincaillerie',label:'Quincaillerie',icon:Wrench,group:'Atelier' },
  { id:'regles',label:'Règles d’usinage',icon:SlidersHorizontal,group:'Atelier' },
  { id:'historique',label:'Historique',icon:History,group:'Suivi' },
] as const;
type View = typeof nav[number]['id'];
const descriptions:Record<View,string>={
  implantation:'Implantation en L et fabrication des meubles bas et hauts.',
  caissons:'Cotes, assemblage et avancement de chaque corps.',
  facades:'Portes à cadre massif et façades de tiroirs en CP.',
  tiroirs:'Caisses, fonds et coulisses Blum MOVENTO.',
  debit:'Débits par pièce, quantités de matériaux et répartition sur les panneaux.',
  panneaux:'Panneaux disponibles et chutes de coupe.',
  quincaillerie:'Quantités de coulisses, charnières, embases et suspensions.',
  regles:'Épaisseurs, jeux, assemblages et formats d’achat.',
  historique:'Consulte et restaure les cotes enregistrées.',
};
const addActions:Partial<Record<View,{kind:Collection;label:string}>>={
  implantation:{kind:'cabinets',label:'Ajouter un caisson'}, caissons:{kind:'cabinets',label:'Ajouter un caisson'},
  facades:{kind:'facades',label:'Ajouter une façade'}, tiroirs:{kind:'drawers',label:'Ajouter un tiroir'},
  debit:{kind:'custom',label:'Ajouter une pièce libre'}, panneaux:{kind:'stock',label:'Ajouter un panneau'},
};
const startRevision:Revision={id:0,label:'Configuration de départ',created_at:''};
type ProjectResponse={data:Project;version:number;history:Revision[]};
type ChangeRequest={data:Project;label:string};
type SavedResponse={version:number;revision:Revision;error?:string};
type DeleteTarget={kind:Collection;id:string};
type Historical={revision:Revision;data:Project};

function Brand({click}:{click:()=>void}) {
  return <button className="brand" onClick={click} aria-label="Retour à l’implantation">
    <span className="brand-icon"><svg viewBox="0 0 34 34" fill="none" aria-hidden="true"><path d="M8 7h18v21H8zM8 14h18m-9 0v14m-5-10v4m10-4v4" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round"/></svg></span>
    <span className="brand-text"><strong>Atelier</strong><small>CUISINE</small></span>
  </button>;
}
function compactDiff(old:Project,current:Project) {
  const diffs:string[]=[];
  for(const c of old.cabinets) {
    const updated=current.cabinets.find(x=>x.id===c.id);
    if(!updated) {diffs.push(c.id+' · '+c.name+' avait été enregistré dans cette version.');continue;}
    if(c.width!==updated.width||c.height!==updated.height||c.depth!==updated.depth) {
      diffs.push(c.id+' : '+size(c.width,c.height,c.depth)+' → '+size(updated.width,updated.height,updated.depth)+' mm');
    }
  }
  for(const key of ['runA','runB','worktopH','sinkH','worktopD'] as const) {
    const labels={runA:'Linéaire A',runB:'Retour B',worktopH:'Hauteur du plan',sinkH:'Hauteur évier',worktopD:'Profondeur du plan'};
    if(old[key]!==current[key]) diffs.push(labels[key]+' : '+mm(old[key])+' → '+mm(current[key])+' mm');
  }
  const before=new Map(getPieces(old).map(p=>[p.id,p]));
  for(const p of getPieces(current)) {
    const previous=before.get(p.id);
    if(previous&&(p.length!==previous.length||p.width!==previous.width||p.thickness!==previous.thickness)) {
      diffs.push(p.id+' '+p.name+' : '+size(previous.length,previous.width,previous.thickness)+' → '+size(p.length,p.width,p.thickness)+' mm');
    }
  }
  return diffs;
}

export default function Home() {
  const [project,setProject]=useState(initialProject);
  const [view,setView]=useState<View>('implantation');
  const [version,setVersion]=useState(0);
  const [history,setHistory]=useState<Revision[]>([startRevision]);
  const [hasMore,setHasMore]=useState(false);
  const [loadingHistory,setLoadingHistory]=useState(false);
  const [ready,setReady]=useState(false);
  const [saving,setSaving]=useState(false);
  const [saveError,setSaveError]=useState('');
  const [conflict,setConflict]=useState(false);
  const [mobileOpen,setMobileOpen]=useState(false);
  const [target,setTarget]=useState<EditTarget|null>(null);
  const [deleteTarget,setDeleteTarget]=useState<DeleteTarget|null>(null);
  const [deleteError,setDeleteError]=useState('');
  const [historical,setHistorical]=useState<Historical|null>(null);
  const [historyError,setHistoryError]=useState('');
  const [selected,setSelected]=useState('C01');
  const [cutTab,setCutTab]=useState<'list'|'nest'>('list');
  const [owner,setOwner]=useState('');
  const [remaining,setRemaining]=useState(true);
  const draft=useRef(project);
  const base=useRef(0);
  const queue=useRef<ChangeRequest[]>([]);
  const busy=useRef(false);

  const loadProject=useCallback(async()=>{
    setSaveError('');
    try {
      const response=await fetch('/api/project',{cache:'no-store'});
      const result=await response.json() as ProjectResponse&{error?:string};
      if(!response.ok) throw new Error(result.error || 'Connexion indisponible.');
      draft.current=result.data;
      base.current=result.version;
      queue.current=[];
      setProject(result.data);
      setVersion(result.version);
      setHistory(result.history.length?result.history:[startRevision]);
      setHasMore(result.history.length===40);
      setReady(true);
      setConflict(false);
    } catch {
      setSaveError('Le projet ne se charge pas. Réessaie dans un instant.');
    }
  },[]);

  useEffect(()=>{
    void loadProject();
    function updateView() {
      const hash=location.hash.slice(1);
      if(nav.some(n=>n.id===hash)) setView(hash as View);
    }
    updateView();
    window.addEventListener('hashchange',updateView);
    const protectDraft=(event:BeforeUnloadEvent)=>{
      if(queue.current.length) {event.preventDefault();event.returnValue='';}
    };
    window.addEventListener('beforeunload',protectDraft);
    return ()=>{
      window.removeEventListener('hashchange',updateView);
      window.removeEventListener('beforeunload',protectDraft);
    };
  },[loadProject]);

  async function flush() {
    if(busy.current||!queue.current.length)return;
    busy.current=true;
    setSaving(true);
    setSaveError('');
    try {
      while(queue.current.length) {
        const job=queue.current[0];
        const response=await fetch('/api/project',{
          method:'PUT',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({...job,baseVersion:base.current}),
        });
        const data=await response.json() as SavedResponse;
        if(!response.ok) {
          if(response.status===409)setConflict(true);
          throw new Error(data.error||'Enregistrement indisponible.');
        }
        base.current=data.version;
        queue.current.shift();
        setVersion(data.version);
        setHistory(old=>[data.revision,...old]);
      }
    } catch(error) {
      setSaveError(error instanceof Error?error.message:'Enregistrement indisponible.');
    } finally {
      setSaving(false);
      busy.current=false;
    }
  }

  function navigate(next:View) {
    setView(next);
    setMobileOpen(false);
    if(next!=='debit')setOwner('');
    window.history.replaceState(null,'','#'+next);
    window.scrollTo({top:0,behavior:'instant'});
  }
  function edit(next:EditTarget) { if(ready)setTarget(next); }
  function commit(apply:(p:Project)=>void,label:string) {
    if(!ready)return 'Attends le chargement du projet.';
    const copy=structuredClone(draft.current);
    apply(copy);
    const result=validateProject(copy);
    if(!result.data)return result.error;
    if(JSON.stringify(result.data)!==JSON.stringify(draft.current)) {
      draft.current=result.data;
      setProject(result.data);
      queue.current.push({data:result.data,label});
      if(!conflict)void flush();
    }
    setTarget(null);
    return undefined;
  }
  function change(kind:Collection,id:string,stage:Stage) {
    commit(p=>{
      if(kind==='stock')return;
      const item=p[kind].find(x=>x.id===id);
      if(item)item.stage=stage;
    },id+' · '+stage);
  }
  function changePart(piece:Piece,stage:Stage) {
    commit(p=>{
      const custom=p.custom.find(x=>x.id===piece.owner);
      if(custom)custom.stage=stage;
      else p.partStages[piece.id]=stage;
    },piece.id+' · '+stage);
  }
  function remove() {
    if(!deleteTarget)return;
    const {kind,id}=deleteTarget;
    if(kind==='cabinets'&&draft.current.drawers.some(d=>d.cabinetId===id)) {
      setDeleteError('Déplace ou supprime les tiroirs liés avant de retirer ce caisson.');
      return;
    }
    const result=commit(p=>{
      if(kind==='cabinets') {
        p.cabinets=p.cabinets.filter(x=>x.id!==id);
        for(const facade of p.facades.filter(f=>f.cabinetId===id)) {
          const dimensions=facadeDims(draft.current,facade);
          facade.width=dimensions.width;
          facade.height=dimensions.height;
          facade.cabinetId='';facade.autoWidth=false;facade.autoHeight=false;
        }
      } else if(kind==='drawers')p.drawers=p.drawers.filter(x=>x.id!==id);
      else if(kind==='facades')p.facades=p.facades.filter(x=>x.id!==id);
      else if(kind==='stock')p.stock=p.stock.filter(x=>x.id!==id);
      else p.custom=p.custom.filter(x=>x.id!==id);
      for(const key of Object.keys(p.partStages))if(key.startsWith(id+'-'))delete p.partStages[key];
    },'Suppression '+id);
    if(result)setDeleteError(result);else setDeleteTarget(null);
  }
  async function inspect(revision:Revision) {
    setHistoryError('');
    try {
      const response=await fetch('/api/project?version='+revision.id,{cache:'no-store'});
      if(!response.ok) throw new Error();
      const data=await response.json() as {data:Project};
      setHistorical({revision,data:data.data});
    } catch {setHistoryError('Cette version ne se charge pas. Réessaie.');}
  }
  async function loadOlder() {
    setLoadingHistory(true);
    setHistoryError('');
    try {
      const response=await fetch('/api/project?before='+history.at(-1)?.id,{cache:'no-store'});
      if(!response.ok)throw new Error();
      const data=await response.json() as ProjectResponse;
      setHistory(old=>[...old,...data.history.filter(x=>!old.some(y=>y.id===x.id))]);
      setHasMore(data.history.length===40);
    } catch {setHistoryError('Les versions précédentes ne se chargent pas.');}
    finally {setLoadingHistory(false);}
  }
  function openCut(id:string) {setOwner(id);setCutTab('list');setRemaining(false);navigate('debit');}
  function openNest() {setOwner('');setCutTab('nest');navigate('debit');}
  function backup() {
    download('cuisine-version-'+version+'.json',JSON.stringify(draft.current,null,2),'application/json');
  }

  const plan=useMemo(()=>nest(project,remaining),[project,remaining]);
  const current=nav.find(n=>n.id===view)!;
  const parts=useMemo(()=>getPieces(project),[project]);
  const cpArea=parts.filter(p=>p.material==='cp'&&p.stage==='À concevoir').reduce((sum,p)=>sum+p.qty*p.length*p.width,0);
  const todo=pieceCount(parts.filter(p=>p.stage==='À concevoir'));
  const complete=project.cabinets.filter(c=>c.stage==='Terminé').length;
  const add=addActions[view];
  const shared={project,edit,change};
  const diffs=historical?compactDiff(historical.data,project):[];
  return <>
    <div className="workspace">
      {mobileOpen&&<button className="nav-scrim" aria-label="Fermer le menu" onClick={()=>setMobileOpen(false)}/>}
      <aside className={'sidebar'+(mobileOpen?' mobile-open':'')}>
        <Brand click={()=>navigate('implantation')}/>
        <nav aria-label="Navigation du projet">
          {['Projet','Atelier','Suivi'].map(group=><div className="nav-group" key={group}><p>{group}</p>{nav.filter(n=>n.group===group).map(n=><button key={n.id} title={n.label} aria-label={n.label}
            className={n.id===view?'active':''} aria-current={n.id===view?'page':undefined} onClick={()=>navigate(n.id)}><n.icon size={18}/><span>{n.label}</span>{n.id===view&&<i/>}</button>)}</div>)}
        </nav>
        <div className="sidebar-footer"><span className="avatar">B</span><div><strong>Benoît</strong><small>Projet privé</small></div></div>
      </aside>
      <div className="content">
        <header className="topbar">
          <button className="icon-button mobile-menu" aria-label={mobileOpen?'Fermer le menu':'Ouvrir le menu'} onClick={()=>setMobileOpen(v=>!v)}>{mobileOpen?<X size={21}/>:<Menu size={21}/>}</button>
          <div className="breadcrumb"><span>Cuisine</span><ChevronRight size={14}/><strong>{current.label}</strong></div>
          <div className="save-state" role="status"><span className={'save-dot '+(saveError?'error':saving?'busy':'')}/>{saveError?'À synchroniser':!ready?'Chargement':saving?'Enregistrement…':'Version '+version+' enregistrée'}</div>
          <button className="button print-button" aria-label="Imprimer le débit" onClick={()=>window.print()}><Printer size={17}/><span>Imprimer le débit</span></button>
        </header>
        <main className="main-content">
          <div className="page-header">
            <div>{view==='implantation'&&<p className="eyebrow">PROJET CUISINE</p>}
              <h1>{view==='implantation'?project.name:current.label}</h1><p>{descriptions[view]}</p></div>
            {add&&<PlusButton onClick={()=>edit({kind:add.kind})}>{add.label}</PlusButton>}
            {view==='historique'&&<button className="button" onClick={backup}><Download size={17}/> Sauvegarder une copie</button>}
          </div>
          {saveError&&<div className="error-banner" role="alert"><CircleAlert size={19}/><div>{saveError}</div>
            {conflict?<><button className="button" onClick={backup}>Télécharger le brouillon</button><button className="button" onClick={()=>void loadProject()}>Recharger</button></>:
            <button className="button" onClick={()=>void(ready?flush():loadProject())}><RotateCcw size={15}/> Réessayer</button>}</div>}
          {view==='implantation'&&<>
            <div className="stats">
              <button className="stat-link" onClick={()=>navigate('caissons')}><Stat icon={<Boxes size={18}/>} value={String(project.cabinets.length)} label="Caissons" detail={complete+' terminés'}/></button>
              <button className="stat-link" onClick={()=>{setRemaining(true);setCutTab('list');navigate('debit');}}><Stat icon={<Scissors size={18}/>} value={String(todo)} label="Pièces à débiter" detail="Selon l’avancement"/></button>
              <button className="stat-link" onClick={()=>navigate('panneaux')}><Stat icon={<Layers3 size={18}/>} value={sqm(cpArea)} label="Contreplaqué net" detail="Pièces restantes"/></button>
              <button className="stat-link" onClick={()=>{setRemaining(true);openNest();}}><Stat icon={<Ruler size={18}/>} value={remaining?String(plan.purchaseCount):'Voir'} label="Panneaux à prévoir" detail="Selon le stock confirmé"/></button>
            </div>
            <Implantation {...shared} selected={selected} select={setSelected} allCabinets={()=>navigate('caissons')}/>
          </>}
          {view==='caissons'&&<Cabinets {...shared}/>}
          {view==='facades'&&<Facades {...shared} openCut={openCut}/>}
          {view==='tiroirs'&&<Drawers {...shared} openCut={openCut}/>}
          {view==='debit'&&<CutView project={project} plan={plan} edit={edit} tab={cutTab} setTab={setCutTab} remaining={remaining} setRemaining={setRemaining} owner={owner} clearOwner={()=>setOwner('')} changePart={changePart}/>}
          {view==='panneaux'&&<StockView project={project} plan={plan} edit={edit} openNest={openNest}/>}
          {view==='quincaillerie'&&<HardwareView project={project}/>}
          {view==='regles'&&<Settings project={project} edit={edit}/>}
          {view==='historique'&&<>
            {historyError&&<p className="form-error" role="alert">{historyError}</p>}
            <HistoryView history={history} version={version} inspect={r=>void inspect(r)} more={()=>void loadOlder()} canMore={hasMore} busy={loadingHistory}/>
          </>}
        </main>
      </div>
    </div>
    {target&&!deleteTarget&&<ProjectEditor key={JSON.stringify(target)} project={project} target={target} onCommit={commit} close={()=>setTarget(null)}
      remove={(kind,id)=>{setDeleteError('');setDeleteTarget({kind,id});}}/>}
    {deleteTarget&&<Modal title={'Retirer '+deleteTarget.id+' du projet'} close={()=>setDeleteTarget(null)}>
      <div className="dialog-content"><p>L’élément {deleteTarget.id} sera retiré du projet actif. Les versions précédentes restent consultables.</p>{deleteError&&<p className="form-error" role="alert">{deleteError}</p>}</div>
      <div className="dialog-actions"><span className="spacer"/><button className="button" onClick={()=>setDeleteTarget(null)}>Annuler</button><button className="button danger" onClick={remove}>Supprimer</button></div>
    </Modal>}
    {historical&&<Modal title={'Version '+historical.revision.id+' · '+historical.revision.label} close={()=>setHistorical(null)} wide>
      <div className="dialog-content"><p className="muted">{dateText(historical.revision.created_at)}</p>
        <div className="version-metrics"><div><strong>{historical.data.cabinets.length}</strong><span>Caissons</span></div><div><strong>{pieceCount(getPieces(historical.data))}</strong><span>Pièces</span></div><div><strong>{historical.data.drawers.length}</strong><span>Tiroirs</span></div></div>
        <h3>Cotes de cette version → cotes actuelles</h3>
        {diffs.length?<ul className="diff-list">{diffs.map((diff,i)=><li key={i}>{diff}</li>)}</ul>:<p>Aucune différence de cote dans les pièces communes.</p>}
        <p>Restaurer crée une nouvelle version à partir de cet instantané.</p>
      </div>
      <div className="dialog-actions"><button className="button" onClick={()=>download('cuisine-version-'+historical.revision.id+'.json',JSON.stringify(historical.data,null,2),'application/json')}><Download size={16}/> Télécharger</button><span className="spacer"/><button className="button primary" onClick={()=>{
        const result=commit(p=>Object.assign(p,historical.data),'Restauration de la version '+historical.revision.id);
        if(result)setHistoryError(result);setHistorical(null);
      }}><RotateCcw size={16}/> Restaurer</button></div>
    </Modal>}
    <PrintReport project={project} version={version} pending={saving||Boolean(saveError)} plan={plan} remaining={remaining}/>
  </>;
}
