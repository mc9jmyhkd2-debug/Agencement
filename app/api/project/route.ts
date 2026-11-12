import { env } from 'cloudflare:workers';
import { validateProject } from '../../../lib/kitchen';
import { initialProject } from '../../../lib/seed';

export const dynamic='force-dynamic';
const json=(value:unknown,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store'}});

// The shared workspace is protected by the owner-private Sites access policy.
export async function GET(request:Request) {
  try {
    const db=env.DB!;
    const params=new URL(request.url).searchParams;
    const version=params.get('version');
    if (version!==null) {
      if (!/^\d+$/.test(version)) return json({error:'Version invalide.'},400);
      const row=await db.prepare('SELECT data FROM kitchen_revisions WHERE id = ?').bind(Number(version)).first<{data:string}>();
      return row ? json({data:JSON.parse(row.data),version:Number(version)}) : json({error:'Version introuvable.'},404);
    }
    const latest=await db.prepare('SELECT id,data FROM kitchen_revisions ORDER BY id DESC LIMIT 1').first<{id:number;data:string}>();
    const cursor=Number(params.get('before') || Number.MAX_SAFE_INTEGER);
    const history=await db.prepare('SELECT id,label,created_at FROM kitchen_revisions WHERE id < ? ORDER BY id DESC LIMIT 40').bind(cursor).all();
    return json({data:latest?JSON.parse(latest.data):initialProject,version:latest?.id??0,history:history.results});
  } catch {
    return json({error:'Le projet est momentanément indisponible.'},503);
  }
}

export async function PUT(request:Request) {
  try {
    const origin=request.headers.get('origin');
    if (origin && origin!==new URL(request.url).origin) return json({error:'Origine invalide.'},403);
    const raw=await request.text();
    if (raw.length>1000000) return json({error:'Projet trop volumineux.'},413);
    let body;
    try { body=JSON.parse(raw); } catch { return json({error:'Données illisibles.'},400); }
    const parsed=validateProject(body.data);
    if (parsed.error) return json({error:parsed.error},400);
    if (!Number.isSafeInteger(body.baseVersion) || body.baseVersion<0) return json({error:'Version invalide.'},400);

    const db=env.DB!;
    const now=new Date().toISOString();
    if (body.baseVersion===0) {
      await db.prepare('INSERT OR IGNORE INTO kitchen_revisions (id,data,label,created_at) VALUES (0,?,?,?)')
        .bind(JSON.stringify(initialProject),'Configuration de départ',now).run();
    }
    const label=String(body.label||'Modification du projet').slice(0,200);
    const result=await db.prepare(
      'INSERT INTO kitchen_revisions (data,label,created_at) SELECT ?, ?, ? WHERE (SELECT COALESCE(MAX(id), 0) FROM kitchen_revisions) = ?',
    ).bind(JSON.stringify(parsed.data),label,now,body.baseVersion).run();
    if (!result.meta.changes) {
      return json({error:'Une autre session a enregistré une version plus récente. Téléchargez votre brouillon avant de recharger le projet.'},409);
    }
    const id=result.meta.last_row_id;
    return json({version:id,revision:{id,label,created_at:now}});
  } catch {
    return json({error:'Enregistrement impossible. Vos modifications restent affichées.'},503);
  }
}
