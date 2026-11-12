import { type Material, type Piece, type Project, getPieces, round } from './kitchen';

type Rectangle = {x:number;y:number;w:number;h:number};
export type Placement = Rectangle & {piece:Piece;number:number;turned:boolean};
export type Sheet = {
  id:string;name:string;material:Material;thickness:number;length:number;width:number;
  placed:Placement[];free:Rectangle[];purchase:boolean;grain:boolean;
};
type Unit = {piece:Piece;number:number};
function area(box:Rectangle) { return box.w*box.h; }
export function sheetAreaUsed(sheet:Sheet) { return sheet.placed.reduce((sum,r) => sum+area(r),0); }
export function reusableOffcuts(sheet:Sheet) {
  return sheet.free.filter(f => Math.min(f.w,f.h)>=50).sort((a,b) => area(b)-area(a));
}

export function nest(project:Project, remaining:boolean) {
  const r = project.rules;
  const selected = getPieces(project).filter(x => !remaining || x.stage === 'À concevoir');
  const timber = selected.filter(x => x.material==='massif');
  const boards = selected.filter(x => x.material!=='massif');
  const units:Unit[] = boards.flatMap(piece => Array.from({length:piece.qty},(_,index) => ({piece,number:index+1})));
  function makeSheet(id:string,name:string,material:Material,thickness:number,length:number,width:number,purchase:boolean,grain:boolean):Sheet {
    return {id,name,material,thickness,length,width,purchase,grain,placed:[],
      free:[{x:r.trim,y:r.trim,w:length-2*r.trim,h:width-2*r.trim}]};
  }
  function pack(order:Unit[], preferVertical:boolean) {
    const sheets:Sheet[] = [];
    const missing:Unit[] = [];
    for (const s of project.stock.filter(s => s.confirmed && s.material!=='massif')) {
      for (let i=1;i<=s.qty;i++) {
        sheets.push(makeSheet(s.id+'-'+i,s.name+(s.qty>1?' · '+i:''),s.material,s.thickness,s.length,s.width,false,s.grain));
      }
    }
    let purchaseCount=0;
    for (const unit of order) {
      const p = unit.piece;
      function find(available:Sheet[]) {
        let best: {sheet:Sheet;slot:number;w:number;h:number;turned:boolean;score:number} | undefined;
        for (const sheet of available) {
          if (sheet.material !== p.material || sheet.thickness !== p.thickness) continue;
          for (const [slot,rect] of sheet.free.entries()) {
            for (const turned of p.grain || sheet.grain ? [false] : [false,true]) {
              const w=turned?p.width:p.length, h=turned?p.length:p.width;
              if (w>rect.w+1e-7 || h>rect.h+1e-7) continue;
              const score = area(rect)-w*h;
              if (!best || score<best.score) best={sheet,slot,w,h,turned,score};
            }
          }
        }
        return best;
      }
      let fit = find(sheets.filter(s => !s.purchase)) ?? find(sheets.filter(s => s.purchase));
      if (!fit) {
        const len=p.material==='mel'?r.melLength:r.cpLength;
        const wid=p.material==='mel'?r.melWidth:r.cpWidth;
        const next=makeSheet('achat-'+(purchaseCount+1),'Panneau à prévoir '+(purchaseCount+1),p.material,p.thickness,len,wid,true,false);
        fit=find([next]);
        if (fit) { sheets.push(next); purchaseCount++; }
      }
      if (!fit) { missing.push(unit);continue; }
      const {sheet,slot,w,h,turned} = fit;
      const free=sheet.free.splice(slot,1)[0];
      sheet.placed.push({piece:p,number:unit.number,x:free.x,y:free.y,w,h,turned});
      const right=round(free.w-w-r.kerf);
      const below=round(free.h-h-r.kerf);
      const vertical = preferVertical ? free.w-w >= free.h-h : free.w-w > free.h-h;
      if (right>0) sheet.free.push({x:round(free.x+w+r.kerf),y:free.y,w:right,h:vertical?free.h:h});
      if (below>0) sheet.free.push({x:free.x,y:round(free.y+h+r.kerf),w:vertical?w:free.w,h:below});
    }
    return {sheets:sheets.filter(s => s.placed.length),spares:sheets.filter(s => !s.purchase && !s.placed.length),missing,purchaseCount};
  }
  const orderings = [
    [...units].sort((a,b) => b.piece.length*b.piece.width-a.piece.length*a.piece.width),
    [...units].sort((a,b) => Math.max(b.piece.length,b.piece.width)-Math.max(a.piece.length,a.piece.width)),
    [...units].sort((a,b) => Math.min(b.piece.length,b.piece.width)-Math.min(a.piece.length,a.piece.width)),
  ];
  const plans = orderings.map((order,i) => pack(order,i===1));
  plans.sort((a,b) => a.missing.length-b.missing.length || a.purchaseCount-b.purchaseCount || a.sheets.length-b.sheets.length);
  return {...plans[0],timber,selected};
}

export function materialTotals(pieces:Piece[]) {
  const groups=new Map<string,{material:Material;thickness:number;area:number;volume:number;count:number;linear:number}>();
  for (const p of pieces) {
    const key=p.material+'-'+p.thickness+(p.material==='massif'?'-'+p.width:'');
    const item=groups.get(key)??{material:p.material,thickness:p.thickness,area:0,volume:0,count:0,linear:0};
    item.area+=p.length*p.width*p.qty;
    item.volume+=p.length*p.width*p.thickness*p.qty;
    item.count+=p.qty;
    item.linear+=p.length*p.qty;
    groups.set(key,item);
  }
  return [...groups].map(([key,value]) => ({key,...value,section:key.split('-')[2]}));
}
