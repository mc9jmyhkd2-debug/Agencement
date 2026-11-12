'use client';
import { useId } from 'react';
import type { Cabinet, Facade, Project } from '../lib/kitchen';
import { facadeDims, mm, size } from '../lib/kitchen';
import type { Sheet } from '../lib/nesting';

type LayoutProps = {project:Project; active:string; select:(id:string)=>void; elevation:boolean; zoom:number};
export function KitchenPlan({project,active,select,elevation,zoom}:LayoutProps) {
  const marker=useId();
  const a=project.cabinets.filter(c => c.zone==='A');
  const b=project.cabinets.filter(c => c.zone==='B');
  const highs=project.cabinets.filter(c => c.zone==='hauts');
  const totalA=a.reduce((sum,c) => sum+c.width,0);
  const startB=b.length?(a.at(-1)?.depth??0):0;
  const totalB=startB+b.reduce((sum,c) => sum+c.width,0);
  const totalHigh=highs.reduce((sum,c) => sum+c.width,0);
  const largestDepth=Math.max(project.worktopD,...a.map(c => c.depth));
  const scale=elevation
    ? Math.min(550/Math.max(totalHigh,1),145/Math.max(...highs.map(c=>c.height),1))
    : Math.min(475/Math.max(project.runA,totalA,1),320/Math.max(totalB,project.runB,largestDepth,1));
  const shownW=(elevation?totalHigh:Math.max(totalA,project.runA))*scale;
  const startX=(760-shownW)/2 - (elevation?0:16);
  const startY=elevation?157:65;
  const endX=startX+totalA*scale;
  const nodes:{c:Cabinet;x:number;y:number;w:number;h:number;vertical?:boolean}[]=[];
  let cursor=0;
  if(elevation) {
    const maxH=Math.max(...highs.map(c=>c.height),1);
    for(const c of highs) {
      nodes.push({c,x:startX+cursor*scale,y:startY+(maxH-c.height)*scale,w:c.width*scale,h:c.height*scale});
      cursor+=c.width;
    }
  } else {
    for(const c of a) {
      nodes.push({c,x:startX+cursor*scale,y:startY,w:c.width*scale,h:c.depth*scale});
      cursor+=c.width;
    }
    cursor=startB;
    for(const c of b) {
      nodes.push({c,x:(a.length?endX:startX+c.depth*scale)-c.depth*scale,y:startY+cursor*scale,w:c.depth*scale,h:c.width*scale,vertical:true});
      cursor+=c.width;
    }
  }
  function horizontal(x:number,y:number,width:number,label:string) {
    return <g className="dimension">
      <path d={'M'+x+' '+(y-8)+'v16 M'+(x+width)+' '+(y-8)+'v16'} />
      <line x1={x+2} y1={y} x2={x+width-2} y2={y} markerStart={'url(#'+marker+')'} markerEnd={'url(#'+marker+')'}/>
      <text x={x+width/2} y={y-10} textAnchor="middle">{label}</text>
    </g>;
  }
  return <svg className="kitchen-svg" viewBox="0 0 760 440" role="group" aria-label={elevation?'Élévation des caissons hauts':'Plan interactif de la cuisine en L'}>
    <defs>
      <marker id={marker} markerWidth="5" markerHeight="5" refX="2.5" refY="2.5" orient="auto-start-reverse"><path d="M0 0L5 2.5 0 5Z" fill="#788276"/></marker>
      <pattern id={marker+'angle'} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#a89a7f" strokeWidth="1.5"/></pattern>
    </defs>
    <g transform={'translate(380 220) scale('+zoom+') translate(-380 -220)'}>
      {elevation ? horizontal(startX,128,shownW,size(totalHigh)+' mm · meubles hauts') : <>
        <path d={'M'+(startX-10)+' '+(startY-7)+'H'+(Math.max(endX,startX+shownW)+7)} stroke="#a5a99c" strokeWidth="4" />
        {b.length>0 && <path d={'M'+(endX+7)+' '+(startY-7)+'v'+(Math.max(totalB,project.runB)*scale+14)} stroke="#a5a99c" strokeWidth="4"/>}
        {horizontal(startX,37,project.runA*scale,size(project.runA)+' mm · A')}
        {b.length>0 && <g transform={'translate('+(endX+45)+' '+startY+') rotate(90)'}>{horizontal(0,0,project.runB*scale,size(project.runB)+' mm · B')}</g>}
        <text x="37" y="406" className="plan-caption">SCHÉMA D’IMPLANTATION</text>
        <text x="37" y="422" className="plan-caption small">Cotes indicatives · mm</text>
      </>}
      {nodes.map(({c,x,y,w,h,vertical}) => {
        const isActive=c.id===active;
        return <g key={c.id} tabIndex={0} role="button" aria-label={c.id+' '+c.name} aria-pressed={isActive}
          className={'plan-node'+(isActive?' selected':'')} onClick={() => select(c.id)}
          onKeyDown={event => {if(event.key==='Enter'||event.key===' '){event.preventDefault();select(c.id);}}}>
          <rect className="cab-box" x={x} y={y} width={w} height={h} rx="3" />
          {c.shape==='angle'&&w>20&&h>16&&<rect x={x+w*.63} y={y+3} width={w*.34} height={h-6} fill={'url(#'+marker+'angle)'} opacity=".62" pointerEvents="none"/>}
          {elevation && <path d={'M'+(x+w/2)+' '+(y+2)+'V'+(y+h-2)} className="cab-line"/>}
          <path d={vertical?'M'+(x+6)+' '+(y+4)+'v'+Math.max(h-8,1):'M'+(x+4)+' '+(y+h-6)+'h'+Math.max(w-8,1)} className="cab-line"/>
          {w>32&&h>25&&<>
            <text x={x+w/2} y={y+h/2-2} textAnchor="middle" className="cab-id">{c.id}</text>
            {h>35&&<text x={x+w/2} y={y+h/2+13} textAnchor="middle" className="cab-dim">{mm(c.width)}</text>}
          </>}
          <title>{c.name+' · '+size(c.width,c.height,c.depth)+' mm'}</title>
        </g>;
      })}
      {!nodes.length&&<text x="380" y="220" textAnchor="middle" className="plan-caption">Aucun caisson placé sur cette vue</text>}
    </g>
  </svg>;
}

export function CabinetSketch({cabinet}:{cabinet:Cabinet}) {
  const w=104,h=75,dx=25,dy=18;
  return <svg viewBox="0 0 200 125" aria-hidden="true" className="cabinet-sketch">
    <path d={'M40 36l'+dx+' -'+dy+'h'+w+'l-'+dx+' '+dy+'z'} fill="#ded4bc" stroke="#6c725e"/>
    <path d={'M'+(40+w)+' 36l'+dx+' -'+dy+'v'+h+'l-'+dx+' '+dy+'z'} fill="#cbbd9e" stroke="#6c725e"/>
    <rect x="40" y="36" width={w} height={h} fill="#f0e8d7" stroke="#6c725e"/>
    <rect x="45" y="41" width={w-10} height={h-10} fill="#e0e5d7" stroke="#858e76"/>
    {cabinet.dividers>0&&<line x1="92" x2="92" y1="41" y2="106" stroke="#858e76"/>}
    {cabinet.shelves>0&&<path d="M45 75h94" stroke="#858e76"/>}
    <path d="M40 116h104M32 36v75" fill="none" stroke="#9c9b85" strokeDasharray="3 3"/>
  </svg>;
}
export function FacadeSketch({project,facade}:{project:Project;facade:Facade}) {
  const dim=facadeDims(project,facade);
  const scale=Math.min(146/dim.width,96/dim.height);
  const w=dim.width*scale,h=dim.height*scale;
  const x=(190-w)/2,y=(120-h)/2;
  const f=project.rules.frameW*scale;
  return <svg viewBox="0 0 190 120" role="img" aria-label={size(dim.width,dim.height)+' mm, '+(facade.frame?'cadre et panneau':'panneau plein')}>
    <rect x={x} y={y} width={w} height={h} rx="2" fill="#d8bd95" stroke="#8c795d"/>
    {facade.frame&&w>2*f&&h>2*f?<rect x={x+f} y={y+f} width={w-2*f} height={h-2*f} rx="1" fill="#ece2cc" stroke="#a18968"/>:
      <path d={'M'+(x+w*.34)+' '+(y+Math.min(h*.2,8))+'h'+(w*.32)} stroke="#7f6d52" strokeWidth="2.5" strokeLinecap="round"/>}
  </svg>;
}
export function DrawerSketch() {
  return <svg viewBox="0 0 330 160" role="img" aria-label="Schéma d’un tiroir. Le fond s’engage dans les rainures avant et arrière et repose dans les feuillures des côtés.">
    <path d="M56 102 130 58h152l-73 44z" fill="#d8e0d1" stroke="#6c7c69"/>
    <path d="M56 102 130 58V23L56 67z" fill="#e4d5b9" stroke="#8e8067"/>
    <path d="M130 58V23h152v35z" fill="#efe5d2" stroke="#8e8067"/>
    <path d="M209 102 282 58V23L209 67z" fill="#d6c5a4" stroke="#8e8067"/>
    <path d="M56 102h153V67H56z" fill="#efdfc4" stroke="#8e8067" opacity=".86"/>
    <path d="M60 94h145M135 51h142" stroke="#4d6e54" strokeWidth="2" strokeDasharray="5 3"/>
    <path d="M205 94l32 27h58" stroke="#526958" fill="none"/>
    <text x="294" y="138" textAnchor="end" fontSize="12" fill="#526958">Rainure avant</text>
    <path d="M135 51l-34 -19H28" stroke="#526958" fill="none"/>
    <text x="25" y="23" fontSize="12" fill="#526958">Rainure arrière</text>
  </svg>;
}

const tones:Record<string,string>={'Façades':'#edddbc','Caissons':'#cbd9c8','Tiroirs':'#d8e0cb','Pièces libres':'#d9d5e9'};
export function SheetSketch({sheet}:{sheet:Sheet}) {
  const sc=Math.min(780/sheet.length,335/sheet.width);
  const w=sheet.length*sc,h=sheet.width*sc;
  return <svg viewBox={'0 0 '+(w+26)+' '+(h+26)} role="img" aria-label={sheet.name+', '+sheet.placed.length+' pièces placées'} className="sheet-svg">
    <rect x="13" y="13" width={w} height={h} fill="#f2f0e7" stroke="#8a9383" strokeWidth="1"/>
    {sheet.free.map((f,i) => <rect key={i} x={13+f.x*sc} y={13+f.y*sc} width={f.w*sc} height={f.h*sc} fill="#fbfaf5" stroke="#afb1a0" strokeWidth=".6" strokeDasharray="3 3"/>)}
    {sheet.placed.map(p => <g key={p.piece.id+'-'+p.number}>
      <rect x={13+p.x*sc} y={13+p.y*sc} width={p.w*sc} height={p.h*sc} fill={tones[p.piece.category]} stroke="#72816f" strokeWidth=".75"/>
      {p.w*sc>37&&p.h*sc>15&&<text x={13+(p.x+p.w/2)*sc} y={17+(p.y+p.h/2)*sc} textAnchor="middle" fontSize={p.w*sc>65?10:8} fill="#314333">{p.piece.id}{p.piece.qty>1?'/'+p.number:''}</text>}
      <title>{p.piece.id+' · '+p.piece.name+' · '+size(p.piece.length,p.piece.width)+' mm'+(p.turned?' · tourné à 90°':'')}</title>
    </g>)}
  </svg>;
}
