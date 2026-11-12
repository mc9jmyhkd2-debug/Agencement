'use client';
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { X, ChevronDown, Pencil, Plus, Info } from 'lucide-react';
import { stages, type Stage } from '../lib/kitchen';

export function StageSelect({value,change,label}:{value:Stage;change:(value:Stage)=>void;label:string}) {
  return <label className={'stage stage-'+stages.indexOf(value)} title={label}>
    <i/>
    <select value={value} aria-label={label} onChange={e=>change(e.target.value as Stage)}>
      {stages.map(s=><option key={s}>{s}</option>)}
    </select>
    <ChevronDown size={12} aria-hidden="true"/>
  </label>;
}
export function EditButton({onClick,label='Modifier'}:{onClick:()=>void;label?:string}) {
  return <button type="button" className="icon-button" onClick={onClick} title={label} aria-label={label}><Pencil size={15}/></button>;
}
export function PlusButton({onClick,children}:{onClick:()=>void;children:ReactNode}) {
  return <button type="button" className="button primary" onClick={onClick}><Plus size={17}/>{children}</button>;
}
export function CardTitle({title,description,action}:{title:string;description?:string;action?:ReactNode}) {
  return <div className="card-head"><div><h2>{title}</h2>{description&&<p>{description}</p>}</div>{action}</div>;
}
export function Blank({children}:{children:ReactNode}) { return <div className="empty">{children}</div>; }
export function Note({children}:{children:ReactNode}) { return <div className="note"><Info size={17}/><div>{children}</div></div>; }

export function Modal({title,children,close,wide=false}:{title:string;children:ReactNode;close:()=>void;wide?:boolean}) {
  const ref=useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog=ref.current;
    dialog?.showModal();
    return () => {if (dialog?.open) dialog.close();};
  },[]);
  return <dialog ref={ref} className={'dialog'+(wide?' wide':'')} onCancel={e=>{e.preventDefault();close();}}>
    <div className="dialog-head"><h2>{title}</h2><button type="button" className="icon-button" aria-label="Fermer" onClick={close}><X size={20}/></button></div>
    {children}
  </dialog>;
}
export type Values = Record<string,string|number|boolean>;
export type Field = {key:string;label:string;type?:'number'|'select'|'textarea'|'checkbox'|'text';options?:{value:string;label:string}[];hint?:string;min?:number;step?:string;unit?:string;section?:string;show?: (v:Values)=>boolean};
export function EditForm({title,initial,fields,save,close,remove}:{title:string;initial:Values;fields:Field[];save:(v:Values)=>string|undefined;close:()=>void;remove?:()=>void}) {
  const [values,set]=useState<Values>(initial);
  const [error,setError]=useState('');
  function submit(event:FormEvent) {
    event.preventDefault();
    const normalized={...values};
    for(const f of fields) {
      if(f.type==='number') normalized[f.key]=Number(String(values[f.key]).replace(',','.'));
    }
    const result=save(normalized);
    if(result) setError(result);
  }
  return <Modal title={title} close={close} wide>
    <form onSubmit={submit}>
      <div className="form-grid">
        {fields.filter(f=>!f.show||f.show(values)).map(f=>{
          const change=(v:string|boolean)=>set(old=>({...old,[f.key]:v}));
          return <div className={'form-field'+(f.type==='textarea'||f.type==='checkbox'?' full':'')} key={f.key}>
            {f.section&&<div className="form-section">{f.section}</div>}
            {f.type==='checkbox'?<label className="check-field"><input type="checkbox" checked={Boolean(values[f.key])} onChange={e=>change(e.target.checked)}/><span>{f.label}</span></label>:
              <label><span>{f.label}</span>
                {f.type==='select'?<select value={String(values[f.key])} onChange={e=>change(e.target.value)}>{f.options?.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select>:
                  f.type==='textarea'?<textarea rows={3} value={String(values[f.key]??'')} onChange={e=>change(e.target.value)} maxLength={1600}/>:
                    <div className="input-wrap"><input type={f.type==='number'?'number':'text'} inputMode={f.type==='number'?'decimal':undefined}
                      min={f.type==='number'?f.min??0:undefined} step={f.step??'any'} required
                      value={String(values[f.key]??'')} onChange={e=>change(e.target.value)} maxLength={120}/>
                      {f.unit&&<small>{f.unit}</small>}</div>}
              </label>}
            {f.hint&&<p>{f.hint}</p>}
          </div>;
        })}
      </div>
      {error&&<p className="form-error" role="alert">{error}</p>}
      <div className="dialog-actions">
        {remove&&<button type="button" className="button danger" onClick={remove}>Supprimer</button>}
        <span className="spacer"/><button type="button" className="button" onClick={close}>Annuler</button><button className="button primary" type="submit">Enregistrer</button>
      </div>
    </form>
  </Modal>;
}
