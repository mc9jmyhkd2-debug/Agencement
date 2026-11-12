import { z } from 'zod';

export const stages = ['À concevoir', 'Débité', 'Usiné', 'Assemblé', 'Terminé'] as const;
export type Stage = typeof stages[number];
const stage = z.enum(stages);
const id = z.string().min(1).max(50);
const title = z.string().trim().min(1).max(120);
const note = z.string().max(1600);
const positive = z.number().positive().max(20000);
const measure = z.number().min(0).max(20000);
const quantity = z.number().int().min(1).max(50);
const material = z.enum(['cp', 'mel', 'massif', 'troisPlis']);
const basic = { id, name: title, note, stage };
const cabinetSchema = z.object({
  ...basic, width: positive, height: positive, depth: positive,
  zone: z.enum(['A','B','hauts','reserve']), shape: z.enum(['droit','angle']),
  material: z.enum(['mel','cp']), make: z.boolean(), sidesOutside: z.boolean(),
  back: z.boolean(), setback: measure, dividers: z.number().int().min(0).max(5),
  shelves: z.number().int().min(0).max(20), shelfPlay: measure,
});
const facadeSchema = z.object({
  ...basic, cabinetId: z.string().max(50), kind: z.enum(['porte','tiroir']),
  width: positive, height: positive, qty: quantity, autoWidth: z.boolean(), autoHeight: z.boolean(),
  columns: z.number().int().min(1).max(10), rows: z.number().int().min(1).max(10),
  frame: z.boolean(), hinges: z.number().int().min(0).max(10),
  tenon: measure, playW: measure, playH: measure,
});
const drawerSchema = z.object({
  ...basic, cabinetId: id, height: positive, runner: z.union([z.literal(300),z.literal(450)]),
  qty: quantity, clearWidth: measure, boxLength: measure,
});
const stockSchema = z.object({
  id, name: title, note, material, length: positive, width: positive, thickness: positive,
  qty: quantity, confirmed: z.boolean(), grain: z.boolean(),
});
const customSchema = z.object({
  ...basic, material, length: positive, width: positive, thickness: positive,
  qty: quantity, grain: z.boolean(),
});
const rulesSchema = z.object({
  cabinetE: positive.max(40), facadeE: positive.max(40), frameE: positive.max(40),
  frameW: positive.max(200), gap: measure.max(20), centerGap: measure.max(20),
  engagement: measure.max(35), drawerE: positive.max(16), floorE: positive.max(40),
  grooveDepth: measure.max(15), sideRebate: measure.max(15), jointDepth: measure.max(15),
  floorPlay: measure.max(10), grooveVerified: z.boolean(), frameVerified: z.boolean(),
  kerf: measure.max(20), trim: measure.max(100),
  cpLength: positive, cpWidth: positive, melLength: positive, melWidth: positive,
});
const projectSchema = z.object({
  name: title, runA: positive, runB: positive, worktopH: positive, sinkH: positive, worktopD: positive,
  roomNote: note, rules: rulesSchema, cabinets: z.array(cabinetSchema).max(100),
  facades: z.array(facadeSchema).max(150), drawers: z.array(drawerSchema).max(150),
  stock: z.array(stockSchema).max(100), custom: z.array(customSchema).max(100),
  partStages: z.record(stage),
});
export type Project = z.infer<typeof projectSchema>;
export type Cabinet = z.infer<typeof cabinetSchema>;
export type Facade = z.infer<typeof facadeSchema>;
export type Drawer = z.infer<typeof drawerSchema>;
export type Stock = z.infer<typeof stockSchema>;
export type Custom = z.infer<typeof customSchema>;
export type Material = z.infer<typeof material>;
export type Rules = z.infer<typeof rulesSchema>;
export type Category = 'Caissons' | 'Façades' | 'Tiroirs' | 'Pièces libres';
export type Piece = {
  id: string; name: string; owner: string; category: Category; material: Material;
  length: number; width: number; thickness: number; qty: number;
  stage: Stage; note: string; grain: boolean;
};

export const materials: Record<Material, string> = {
  cp: 'Contreplaqué', mel: 'Mélaminé', massif: 'Bois massif', troisPlis: 'Panneau 3 plis',
};
export const zones: Record<Cabinet['zone'],string> = {
  A: 'Linéaire A', B: 'Retour B', hauts: 'Meubles hauts', reserve: 'À positionner',
};
export const round = (n:number) => Math.round(n * 100) / 100;
export const mm = (n:number) => n.toLocaleString('fr-FR', { maximumFractionDigits: 2 });
export const size = (...numbers:number[]) => numbers.map(mm).join(' × ');
export const sqm = (area:number) => (area / 1e6).toLocaleString('fr-FR', {maximumFractionDigits:2}) + ' m²';
export const pieceCount = (parts:Piece[]) => parts.reduce((sum,p) => sum+p.qty,0);

export function facadeDims(project: Project, facade: Facade) {
  const cabinet = project.cabinets.find(c => c.id === facade.cabinetId);
  const {gap,centerGap} = project.rules;
  const width = facade.autoWidth && cabinet
    ? (cabinet.width - 2 * gap - (facade.columns - 1) * centerGap) / facade.columns : facade.width;
  const height = facade.autoHeight && cabinet
    ? (cabinet.height - 2 * gap - (facade.rows - 1) * gap) / facade.rows : facade.height;
  return { width:round(width), height:round(height) };
}

export function drawerDims(project: Project, drawer: Drawer) {
  const cabinet = project.cabinets.find(c => c.id === drawer.cabinetId);
  if (!cabinet) return null;
  const r = project.rules;
  const cabinetE = cabinet.material === 'cp' ? r.facadeE : r.cabinetE;
  const opening = drawer.clearWidth || cabinet.width - 2 * cabinetE;
  const insideW = opening - 42;
  const boxL = drawer.boxLength || drawer.runner - 10;
  const insideL = boxL - 2 * r.drawerE;
  return {
    opening, insideW, insideL, boxL, outsideW: insideW + 2 * r.drawerE,
    ends: insideW + 2 * r.jointDepth,
    floorW: insideW + 2 * r.sideRebate - r.floorPlay,
    floorL: insideL + 2 * r.grooveDepth - r.floorPlay,
    grooveHeight: r.drawerE / 2,
    availableDepth: cabinet.depth - (cabinet.back ? cabinet.setback + cabinetE : 0),
  };
}

export function getPieces(project: Project): Piece[] {
  const r = project.rules;
  const result: Piece[] = [];
  function add(owner: {id:string;stage:Stage}, suffix:string, category:Category, name:string,
    material:Material, thickness:number, length:number, width:number, qty:number, note = '', grain = false) {
    const id = owner.id + '-' + suffix;
    result.push({id, owner:owner.id, category, name, material, thickness, length:round(length),
      width:round(width), qty, note, grain, stage:project.partStages[id] ?? owner.stage});
  }

  for (const c of project.cabinets) {
    if (!c.make || c.shape === 'angle') continue;
    const e = c.material === 'cp' ? r.facadeE : r.cabinetE;
    const insideW = c.width - 2 * e;
    const insideH = c.height - 2 * e;
    const insideD = c.depth - (c.back ? c.setback + e : 0);
    add(c,'c','Caissons','Côté',c.material,e,c.sidesOutside ? c.height : insideH,c.depth,2);
    add(c,'t','Caissons','Dessus / dessous',c.material,e,c.sidesOutside ? insideW : c.width,c.depth,2);
    if (c.dividers) add(c,'m','Caissons','Montant intérieur',c.material,e,insideH,insideD,c.dividers);
    if (c.shelves) {
      const shelfW = (insideW - c.dividers * e) / (c.dividers + 1) - c.shelfPlay;
      add(c,'e','Caissons','Étagère',c.material,e,shelfW,insideD,c.shelves);
    }
    if (c.back) add(c,'f','Caissons','Fond entre parois',c.material,e,insideW,insideH,1,
      'Retrait arrière ' + mm(c.setback) + ' mm. Collage, Lamello et vis.');
  }
  for (const f of project.facades) {
    const {width,height} = facadeDims(project,f);
    if (!f.frame) {
      add(f,'f','Façades','Façade pleine','cp',r.facadeE,height,width,f.qty,
        f.kind === 'tiroir' ? 'Prise de main CMT 855.605.11' : '');
      continue;
    }
    const tenon = f.tenon || r.engagement;
    const railLength = width - 2 * r.frameW + 2 * tenon;
    add(f,'m','Façades','Montant de cadre','massif',r.frameE,height,r.frameW,2*f.qty,'Fil dans la longueur',true);
    add(f,'t','Façades','Traverse brute','massif',r.frameE,railLength,r.frameW,2*f.qty,
      'Épaules après usinage ' + mm(width - 2 * r.frameW) + ' mm',true);
    add(f,'p','Façades','Panneau central','cp',r.facadeE,height-2*r.frameW+2*tenon-f.playH,
      railLength-f.playW,f.qty,'Amincir les rives pour le profil');
  }
  for (const d of project.drawers) {
    const dims = drawerDims(project,d);
    if (!dims) continue;
    add(d,'c','Tiroirs','Côté de tiroir','cp',r.drawerE,dims.boxL,d.height,2*d.qty,'Feuillure d’appui du fond');
    add(d,'a','Tiroirs','Avant / arrière','cp',r.drawerE,dims.ends,d.height,2*d.qty,'Emboîtements latéraux inclus');
    add(d,'f','Tiroirs','Fond de tiroir','cp',r.floorE,dims.floorL,dims.floorW,d.qty,
      'Languettes avant / arrière. Appui dans les feuillures des côtés.');
  }
  for (const x of project.custom) {
    add(x,'p','Pièces libres',x.name,x.material,x.thickness,x.length,x.width,x.qty,x.note,x.grain);
  }
  return result;
}

export function hardware(project:Project) {
  const doors = project.facades.filter(f => f.kind === 'porte');
  const hinges = doors.reduce((sum,f) => sum + f.qty * f.hinges,0);
  const runners = ([450,300] as const).map(length => ({
    name:'Blum MOVENTO ' + length + ' mm',
    qty:project.drawers.filter(d => d.runner===length).reduce((sum,d) => sum+d.qty,0),
    unit:'paires', note:'BLUMOTION. Vérifier la référence selon la charge.',
  }));
  return [
    ...runners,
    { name:'Accouplements MOVENTO G + D', qty:project.drawers.reduce((sum,d) => sum+d.qty,0), unit:'jeux', note:'1 jeu par tiroir' },
    { name:'Charnières CLIP top 110°', qty:hinges, unit:'pièces', note:'Nombre par porte réglable. Vérifier la ferrure de l’angle.' },
    { name:'Embases CLIP', qty:hinges, unit:'pièces', note:'Hauteur selon le recouvrement et la référence de charnière.' },
    { name:'Suspensions pour meubles hauts', qty:project.cabinets.filter(c => c.zone==='hauts').length*2, unit:'pièces', note:'Base de calcul de 2 suspensions par caisson haut.' },
  ];
}

export function validateProject(input:unknown): {data:Project;error?:never} | {error:string;data?:never} {
  const parsed = projectSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {error:'Valeur invalide ('+first.path.join(' · ')+'). Vérifier les champs et les quantités.'};
  }
  const p = parsed.data, r = p.rules;
  const allIds = [...p.cabinets,...p.facades,...p.drawers,...p.stock,...p.custom].map(x => x.id);
  if (new Set(allIds).size !== allIds.length) return {error:'Deux éléments portent le même repère.'};
  if (p.drawers.some(d => !p.cabinets.some(c => c.id===d.cabinetId))) return {error:'Chaque tiroir doit être lié à un caisson.'};
  if (p.facades.some(f => (f.cabinetId || f.autoWidth || f.autoHeight) && !p.cabinets.some(c => c.id===f.cabinetId))) {
    return {error:'Sélectionner le caisson lié aux dimensions de la façade.'};
  }
  if ([r.grooveDepth,r.sideRebate,r.jointDepth].some(x => x >= r.drawerE)) {
    return {error:'La profondeur d’usinage doit être inférieure à l’épaisseur du côté.'};
  }
  if (r.floorE < r.drawerE / 2) return {error:'Le fond doit permettre d’usiner la languette à mi-épaisseur des côtés.'};
  if (p.facades.some(f => {
    if (!f.frame) return false;
    const d = facadeDims(p,f);
    return Math.min(d.width,d.height)<=2*r.frameW;
  })) return {error:'Le cadre est trop large pour une façade.'};
  if (p.cabinets.some(c => {
    const e = c.material==='cp'?r.facadeE:r.cabinetE;
    return c.make&&c.shape==='droit'&&(c.width<=2*e||c.height<=2*e||(c.back&&c.depth<=c.setback+e));
  })) return {error:'Vérifier l’épaisseur des parois ou le retrait du fond du caisson.'};
  if (getPieces(p).some(x => x.length <= 0 || x.width <= 0)) return {error:'Une dimension de débit devient nulle ou négative.'};
  if (p.drawers.some(d => { const g=drawerDims(p,d);return g && (g.insideL <= 0 || g.insideW <= 0); })) {
    return {error:'Le tiroir ne rentre pas dans le caisson lié.'};
  }
  return {data:p};
}

export function warnings(p:Project):string[] {
  const list: string[] = [];
  if (!p.rules.grooveVerified) list.push('Mesurer les profondeurs de rainure et de feuillure sur une chute avant de débiter les fonds.');
  if (!p.rules.frameVerified) list.push('Vérifier les emboîtements CMT sur une chute (9,5 mm pour les portes basses et 11 mm pour les portes hautes dans les plans de départ).');
  if (p.stock.some(s => !s.confirmed)) list.push('Les panneaux à vérifier sont exclus du stock utilisable.');
  if (p.cabinets.some(c => c.shape==='angle')) list.push('Pour les pièces non rectangulaires du caisson d’angle, ajouter les rectangles bruts via « Pièce libre ».');
  const a = p.cabinets.filter(c => c.zone==='A');
  const b = p.cabinets.filter(c => c.zone==='B');
  const usedA = a.reduce((sum,c) => sum+c.width,0);
  const usedB = (b.length ? a.at(-1)?.depth ?? 0 : 0) + b.reduce((sum,c) => sum+c.width,0);
  if (usedA > p.runA) list.push('Linéaire A : dépassement de '+mm(usedA-p.runA)+' mm.');
  if (usedB > p.runB) list.push('Retour B : dépassement de '+mm(usedB-p.runB)+' mm.');
  for (const d of p.drawers) {
    const g = drawerDims(p,d);
    if (g && g.availableDepth < d.runner+3) list.push(d.id+' : vérifier la profondeur pour MOVENTO '+d.runner+' mm.');
  }
  return list;
}
