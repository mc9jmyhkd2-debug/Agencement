import type { Cabinet, Drawer, Facade, Project, Stock } from './kitchen';

const cabinet = (id:string,name:string,width:number,zone:Cabinet['zone'],patch:Partial<Cabinet>={}):Cabinet => ({
  id,name,width,zone,height:720,depth:600,shape:'droit',material:'mel',make:false,
  sidesOutside:true,back:false,setback:0,dividers:0,shelves:0,shelfPlay:2,stage:'À concevoir',note:'',...patch,
});
const facade = (id:string,name:string,cabinetId:string,width:number,height:number,patch:Partial<Facade>={}):Facade => ({
  id,name,cabinetId,width,height,qty:1,kind:'porte',autoWidth:false,autoHeight:false,columns:1,rows:1,
  frame:true,hinges:2,tenon:0,playW:0,playH:0,stage:'À concevoir',note:'',...patch,
});
const drawer = (id:string,name:string,cabinetId:string,height:number,patch:Partial<Drawer>={}):Drawer => ({
  id,name,cabinetId,height,runner:450,qty:1,clearWidth:0,boxLength:0,stage:'À concevoir',note:'',...patch,
});
const stock = (id:string,name:string,material:Stock['material'],length:number,width:number,thickness:number,qty:number,note:string):Stock => ({
  id,name,material,length,width,thickness,qty,note,confirmed:false,grain:false,
});
const upper = [1,2,3].map(n => cabinet('H0'+n,'Caisson haut '+n,1200,'hauts',{
  height:700,depth:300,material:'cp',make:true,sidesOutside:false,back:true,setback:60,
  dividers:1,shelves:2,shelfPlay:1.5,note:'Fond CP 15 entre les parois. Retrait arrière de 60 mm pour LED et suspensions.',
}));
const lowerDoorNote = 'Débit atelier du 28/10 : 400 × 520 mm maximum hors tout. Contrôler le jeu réel sous le tiroir.';
const solidFront = {kind:'tiroir',autoWidth:true,frame:false,hinges:0,note:'CP plein et prise de main CMT 855.605.11.'} as const;
const highDoors = upper.flatMap((c,n) => [1,2].map(side => facade('PH'+(n+1)+side,
  'Porte haute '+(n+1)+(side===1 ? ' gauche' : ' droite'),c.id,596,695,
  { autoWidth:true,autoHeight:true,columns:2,tenon:11,playW:6,playH:0,
    note:'Plan du 07/11. Cotes provisoires à vérifier après mise à niveau des caissons.' },
)));
export const initialProject:Project = {
  name:'Cuisine sous escalier',runA:2000,runB:2600,worktopH:920,sinkH:940,worktopD:600,
  roomNote:'Implantation de principe à ajuster sur place. Repères du chantier : côté poêle 1 930 mm, jusqu’à la prise micro-ondes 2 220 mm, distance mur–escalier 2 600 mm. Plan en frêne et crédence marbre. Zone évier : profondeur 820 mm, angle mesuré à confirmer.',
  rules:{cabinetE:16,facadeE:15,frameE:19,frameW:55,gap:2.5,centerGap:3,engagement:9.5,
    drawerE:15,floorE:15,grooveDepth:5,sideRebate:5,jointDepth:5,floorPlay:0,
    grooveVerified:false,frameVerified:false,kerf:3.2,trim:5,
    cpLength:3000,cpWidth:1200,melLength:2500,melWidth:1250},
  cabinets:[
    cabinet('C01','Caisson bas 80',800,'A',{note:'Corps existant, deux portes. Vérifier les dimensions réelles.'}),
    cabinet('C02','Caisson d’angle',1000,'A',{shape:'angle',note:'Passage 550, profondeur utile 400, hauteur utile 450, zone cachée 350 mm. Corps spécial.'}),
    cabinet('C03','Couverts gauche',400,'B',{shelves:1,note:lowerDoorNote}),
    cabinet('C04','Couverts droit',400,'B',{shelves:1,note:lowerDoorNote}),
    cabinet('C05','Casserolier gauche',600,'B'),
    cabinet('C06','Casserolier droit',600,'B'),
    cabinet('C07','Tiroirs à l’anglaise',600,'reserve',{note:'Affectation à confirmer.'}),
    cabinet('C08','Rangement peu profond',600,'reserve',{depth:350,note:'Coulisses MOVENTO 300 mm. Position à confirmer.'}),
    cabinet('C09','Tiroirs de 80',800,'reserve',{note:'Deux tiroirs de 80 prévus dans la correction de débit. Affectation à confirmer.'}),
    ...upper,
  ],
  facades:[
    facade('P01','P40-H évier gauche','C01',396,716),facade('P02','P40-H évier droite','C01',396,716),
    facade('P03','P60-H angle','C02',596,716,{note:'Vérifier la ferrure de l’angle.'}),
    facade('P04','P40-B sous couverts gauche','C03',400,520,{note:lowerDoorNote}),
    facade('P05','P40-B sous couverts droite','C04',400,520,{note:lowerDoorNote}),
    facade('P06','P60-H anglaise','C07',596,716),facade('P07','P60-H en attente','',596,716),
    facade('P08','P40-H en attente','',396,716),
    facade('F01','Façade couverts gauche','C03',395,195,{...solidFront,note:'Hauteur provisoire après abaissement du tiroir.'}),
    facade('F02','Façade couverts droite','C04',395,195,{...solidFront,note:'Hauteur provisoire après abaissement du tiroir.'}),
    ...['C05','C06','C09'].flatMap((c,i)=>[1,2].map(n => facade('F'+(3+i*2+n-1).toString().padStart(2,'0'),
      'Façade tiroir '+c+' · '+n,c,c==='C09'?795:595,356.25,{...solidFront,autoHeight:true,rows:2}))),
    ...highDoors,
  ],
  drawers:[
    drawer('T01','Tiroir couverts gauche','C03',100,{note:'Hauteur de caisse à mesurer après abaissement.'}),
    drawer('T02','Tiroir couverts droit','C04',100,{note:'Hauteur de caisse à mesurer après abaissement.'}),
    ...['C05','C06'].flatMap((c,i)=>[1,2].map(n => drawer('T0'+(3+i*2+n-1),'Grand tiroir '+c+' · '+n,c,250))),
    drawer('T07','Tiroir intérieur bas','C07',200,{note:'Mesurer le passage entre la porte ouverte et les charnières.'}),
    drawer('T08','Tiroir intérieur haut','C07',200,{note:'Mesurer le passage entre la porte ouverte et les charnières.'}),
    drawer('T09','Tiroir peu profond bas','C08',200,{runner:300}),
    drawer('T10','Tiroir peu profond haut','C08',200,{runner:300}),
    drawer('T11','Grand tiroir 80 bas','C09',250),
    drawer('T12','Grand tiroir 80 haut','C09',250),
  ],
  stock:[
    stock('S01','Grands panneaux CP','cp',3000,1200,15,2,'Ancien stock. Quantité restante à inventorier.'),
    stock('S02','Bandes de CP','cp',3000,327,15,2,'Anciennes chutes. Remesurer la largeur et confirmer la quantité.'),
    stock('S03','Panneau 3 plis','troisPlis',3000,1250,19,1,'Stock historique à vérifier.'),
  ],
  custom:[],partStages:{},
};
