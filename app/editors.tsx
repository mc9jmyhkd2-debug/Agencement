'use client';
import { type Cabinet, type Custom, type Drawer, type Facade, type Material, type Project, type Rules, type Stock, materials, stages, zones } from '../lib/kitchen';
import { EditForm, type Field, type Values } from './ui';

export type Collection = 'cabinets'|'facades'|'drawers'|'stock'|'custom';
export type RulesGroup = 'materiaux'|'tiroirs'|'calepinage';
export type EditTarget = {kind:Collection;id?:string}|{kind:'project'}|{kind:'rules';group:RulesGroup};
export const singular:Record<Collection,string>={cabinets:'caisson',facades:'façade',drawers:'tiroir',stock:'panneau',custom:'pièce libre'};
const number=(key:string,label:string,opts:Partial<Field>={}):Field => ({key,label,type:'number',unit:'mm',...opts});
const count=(key:string,label:string,min=0):Field => number(key,label,{step:'1',unit:undefined,min});
const checkbox=(key:string,label:string,hint?:string):Field => ({key,label,type:'checkbox',hint});
const options=(entries:Record<string,string>) => Object.entries(entries).map(([value,label])=>({value,label}));
const select=(key:string,label:string,entries:Record<string,string>):Field => ({key,label,type:'select',options:options(entries)});
const nameField:Field={key:'name',label:'Nom'};
const noteField:Field={key:'note',label:'Notes d’atelier',type:'textarea'};
const stageField=select('stage','Avancement',Object.fromEntries(stages.map(s=>[s,s])));
const materialField=select('material','Matériau',materials);
const cabinetDimensions=[number('width','Largeur extérieure',{min:1}),number('height','Hauteur extérieure',{min:1}),number('depth','Profondeur extérieure',{min:1})];
const idFor=(p:Project,prefix:string) => {
  const ids=new Set([...p.cabinets,...p.facades,...p.drawers,...p.stock,...p.custom].map(x=>x.id));
  for(let i=1;;i++){const id=prefix+String(i).padStart(2,'0');if(!ids.has(id))return id;}
};

export const rulesInfo:Record<RulesGroup,{title:string;fields:Field[]}> = {
  materiaux:{title:'Matériaux et façades',fields:[
    number('cabinetE','Mélaminé des caissons bas',{min:1}),number('facadeE','CP des façades et caissons hauts',{min:1}),
    number('frameE','Épaisseur des cadres en massif',{min:1}),number('frameW','Largeur visible du cadre',{min:1}),
    number('gap','Jeu en périphérie (par rive)'),number('centerGap','Jeu entre deux portes'),
    number('engagement','Engagement standard du contre-profil',{hint:'Par extrémité. Peut être réglé porte par porte.'}),
    checkbox('frameVerified','Engagements des profils vérifiés sur une chute'),
  ]},
  tiroirs:{title:'Assemblage des tiroirs',fields:[
    number('drawerE','Épaisseur des côtés en CP',{min:1,hint:'Hauteur de rainure = moitié de cette épaisseur.'}),
    number('floorE','Épaisseur du fond en CP',{min:1}),
    number('grooveDepth','Profondeur de rainure avant / arrière',{hint:'Ajoutée à chaque extrémité de la longueur du fond.'}),
    number('sideRebate','Appui dans la feuillure latérale',{hint:'Ajouté de chaque côté à la largeur du fond.'}),
    number('jointDepth','Emboîtement avant / arrière dans les côtés'),
    number('floorPlay','Jeu total du fond sur chaque axe'),
    checkbox('grooveVerified','Profondeurs d’usinage vérifiées sur une chute'),
  ]},
  calepinage:{title:'Panneaux et coupe',fields:[
    number('kerf','Trait de scie'),number('trim','Marge de délignage par rive'),
    number('cpLength','Longueur de panneau CP à prévoir',{min:1}),number('cpWidth','Largeur de panneau CP à prévoir',{min:1}),
    number('melLength','Longueur de panneau mélaminé à prévoir',{min:1}),number('melWidth','Largeur de panneau mélaminé à prévoir',{min:1}),
  ]},
};

export function ProjectEditor({project,target,onCommit,close,remove}:{
  project:Project;target:EditTarget;onCommit:(apply:(p:Project)=>void,label:string)=>string|undefined;
  close:()=>void;remove:(kind:Collection,id:string)=>void;
}) {
  const cabinetOptions=Object.fromEntries(project.cabinets.map(c=>[c.id,c.id+' · '+c.name]));
  if(target.kind==='project') {
    const {name,runA,runB,worktopH,sinkH,worktopD,roomNote}=project;
    return <EditForm title="Cotes d’implantation" initial={{name,runA,runB,worktopH,sinkH,worktopD,roomNote}} close={close}
      fields={[{key:'name',label:'Nom de la cuisine'},number('runA','Linéaire A disponible',{min:1}),
        number('runB','Retour B disponible',{min:1}),number('worktopH','Hauteur du plan',{min:1}),
        number('sinkH','Hauteur à l’évier',{min:1}),number('worktopD','Profondeur du plan',{min:1}),
        {key:'roomNote',label:'Relevé et contraintes',type:'textarea'}]}
      save={v=>onCommit(p=>Object.assign(p,v),'Correction des cotes d’implantation')}/>;
  }
  if(target.kind==='rules') {
    const group=rulesInfo[target.group];
    return <EditForm title={group.title} initial={project.rules} fields={group.fields} close={close}
      save={v=>onCommit(p=>{p.rules=v as Rules;},'Réglages · '+group.title)}/>;
  }

  const itemId=target.id;
  const kind=target.kind;
  const title=itemId ? 'Modifier '+singular[kind]+' '+itemId : 'Ajouter '+(kind==='facades'||kind==='custom'?'une ':'un ')+singular[kind];
  let initial:Values;
  let fields:Field[];
  let save:(v:Values)=>string|undefined;
  const common={name:'',stage:'À concevoir' as const,note:''};
  function changeLabel(name:string,id:string) {return (itemId?'Modification ':'Ajout ')+id+' · '+name;}

  if(kind==='cabinets') {
    const existing=project.cabinets.find(x=>x.id===itemId);
    initial=existing?{...existing,order:project.cabinets.filter(c=>c.zone===existing.zone).findIndex(c=>c.id===existing.id)+1}:{
      ...common,id:idFor(project,'C'),width:600,height:720,depth:600,zone:'A',shape:'droit',
      material:'mel',make:true,sidesOutside:true,back:false,setback:0,dividers:0,shelves:0,shelfPlay:2,order:project.cabinets.length+1,
    };
    fields=[nameField,select('zone','Position',zones),...cabinetDimensions,count('order','Ordre dans la zone',1),
      select('shape','Type',{droit:'Caisson droit',angle:'Caisson d’angle'}),select('material','Matériau',{mel:'Mélaminé',cp:'Contreplaqué'}),
      checkbox('make','Inclure le corps dans le débit','Le corps d’angle se chiffre avec des pièces libres.'),
      checkbox('sidesOutside','Côtés pleine hauteur','Décochez pour un dessus et un dessous pleine largeur, comme sur les caissons hauts.'),
      checkbox('back','Fond entre les parois'),number('setback','Retrait arrière',{show:v=>Boolean(v.back)}),
      count('dividers','Montants intérieurs'),count('shelves','Nombre total d’étagères'),number('shelfPlay','Jeu total par étagère'),
      stageField,noteField];
    save=v=>onCommit(p=>{
      const {order,...rest}=v;
      const c=rest as Cabinet;
      p.cabinets=p.cabinets.filter(x=>x.id!==c.id);
      const siblings=p.cabinets.flatMap((x,i)=>x.zone===c.zone?[i]:[]);
      const at=siblings[Number(order)-1] ?? (siblings.length?siblings.at(-1)!+1:p.cabinets.length);
      p.cabinets.splice(at,0,c);
    },changeLabel(String(v.name),String(v.id)));
  } else if(kind==='facades') {
    initial=project.facades.find(x=>x.id===itemId)??{...common,id:idFor(project,'P'),cabinetId:'',kind:'porte',
      width:395,height:715,qty:1,autoWidth:false,autoHeight:false,columns:1,rows:1,frame:true,hinges:2,tenon:0,playW:0,playH:0};
    fields=[nameField,select('kind','Type',{porte:'Porte',tiroir:'Façade de tiroir'}),
      select('cabinetId','Caisson lié',{'':'Sans affectation',...cabinetOptions}),count('qty','Quantité',1),
      checkbox('autoWidth','Calculer la largeur depuis le caisson'),
      number('width','Largeur finie',{min:1,show:v=>!v.autoWidth}),
      count('columns','Façades côte à côte',1),
      checkbox('autoHeight','Calculer la hauteur depuis le caisson'),
      number('height','Hauteur finie',{min:1,show:v=>!v.autoHeight}),
      count('rows','Façades superposées',1),
      checkbox('frame','Cadre massif et panneau central','Décochez pour une façade pleine en CP.'),
      number('tenon','Engagement par extrémité',{hint:'0 = engagement standard des règles.',show:v=>Boolean(v.frame)}),
      number('playW','Jeu total du panneau en largeur',{show:v=>Boolean(v.frame)}),
      number('playH','Jeu total du panneau en hauteur',{show:v=>Boolean(v.frame)}),
      {...count('hinges','Charnières par porte'),show:v=>v.kind==='porte'},stageField,noteField];
    save=v=>onCommit(p=>{
      const f=v as Facade;
      const i=p.facades.findIndex(x=>x.id===f.id);
      if(i>=0)p.facades[i]=f;else p.facades.push(f);
    },changeLabel(String(v.name),String(v.id)));
  } else if(kind==='drawers') {
    initial=project.drawers.find(x=>x.id===itemId)??{...common,id:idFor(project,'T'),cabinetId:project.cabinets[0]?.id??'',
      height:100,runner:450,qty:1,clearWidth:0,boxLength:0};
    fields=[nameField,select('cabinetId','Caisson lié',{'':'Choisir un caisson',...cabinetOptions}),
      number('height','Hauteur de caisse',{min:1}),select('runner','Coulisses Blum MOVENTO',{'450':'450 mm','300':'300 mm'}),
      number('clearWidth','Passage utile mesuré',{hint:'0 = largeur du caisson moins les deux côtés.'}),
      number('boxLength','Longueur extérieure mesurée',{hint:'0 = longueur nominale de coulisse moins 10 mm.'}),
      count('qty','Quantité',1),stageField,noteField];
    save=v=>onCommit(p=>{
      const d={...v,runner:Number(v.runner)} as Drawer;
      const i=p.drawers.findIndex(x=>x.id===d.id);
      if(i>=0)p.drawers[i]=d;else p.drawers.push(d);
    },changeLabel(String(v.name),String(v.id)));
  } else if(kind==='stock') {
    initial=project.stock.find(x=>x.id===itemId)??{id:idFor(project,'S'),name:'',material:'cp',length:3000,width:1200,
      thickness:project.rules.facadeE,qty:1,confirmed:true,grain:false,note:''};
    fields=[nameField,{...materialField,options:options({cp:'Contreplaqué',mel:'Mélaminé',troisPlis:'Panneau 3 plis'})},
      number('length','Longueur',{min:1}),number('width','Largeur',{min:1}),number('thickness','Épaisseur',{min:1}),
      count('qty','Quantité disponible',1),checkbox('confirmed','Panneau inventorié et disponible'),
      checkbox('grain','Sens du fil sur la longueur','Empêche une rotation de 90° des pièces sur ce panneau.'),noteField];
    save=v=>onCommit(p=>{
      const s=v as Stock;
      const i=p.stock.findIndex(x=>x.id===s.id);
      if(i>=0)p.stock[i]=s;else p.stock.push(s);
    },changeLabel(String(v.name),String(v.id)));
  } else {
    initial=project.custom.find(x=>x.id===itemId)??{...common,id:idFor(project,'L'),material:'cp',length:600,width:300,
      thickness:project.rules.facadeE,qty:1,grain:false};
    fields=[nameField,materialField,number('length','Longueur brute',{min:1}),number('width','Largeur brute',{min:1}),
      number('thickness','Épaisseur',{min:1}),count('qty','Quantité',1),
      checkbox('grain','Conserver le sens de la longueur dans le calepinage'),stageField,noteField];
    save=v=>onCommit(p=>{
      const part={...v,material:v.material as Material} as Custom;
      const i=p.custom.findIndex(x=>x.id===part.id);
      if(i>=0)p.custom[i]=part;else p.custom.push(part);
    },changeLabel(String(v.name),String(v.id)));
  }
  return <EditForm title={title} initial={initial} fields={fields} close={close} save={save} remove={itemId?()=>remove(kind,itemId):undefined}/>;
}
