'use client';
import React, { useState, useEffect, useRef } from 'react';
import { sendMessageAction } from '@/app/actions';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Message { id:string; from:string; to:string; body:string; timestamp:number; direction:'inbound'|'outbound'; status:string; }
interface Contact { phone:string; name:string; lastMessage:Message|null; unreadCount:number; }
interface Lead { id:string; name:string; phone:string; cpf:string; status:LeadStatus; queue:string; notes:string; createdAt:number; }
type LeadStatus = 'Novo'|'Em Contato'|'Simulação'|'Dados Bancários'|'Fechado'|'Perdido';
interface Queue { id:string; name:string; color:string; }
interface AIRule { id:string; trigger:string; response:string; }
interface AIConfig { botName:string; greeting:string; personality:string; active:boolean; rules:AIRule[]; }

// ─── Theme ────────────────────────────────────────────────────────────────────
const C = {
  bg:'#f0f4f8', bg2:'#ffffff', sidebar:'#0f2167', sidebarActive:'#1a3a8f',
  accent:'#1d4ed8', text:'#1e293b', text2:'#64748b', text3:'#94a3b8',
  border:'#e2e8f0', green:'#10b981', red:'#ef4444', amber:'#f59e0b',
};
const STATUSES:LeadStatus[] = ['Novo','Em Contato','Simulação','Dados Bancários','Fechado','Perdido'];
const SBG:Record<LeadStatus,string> = {'Novo':'#dbeafe','Em Contato':'#fef3c7','Simulação':'#ede9fe','Dados Bancários':'#dcfce7','Fechado':'#d1fae5','Perdido':'#fee2e2'};
const SFG:Record<LeadStatus,string> = {'Novo':'#1e40af','Em Contato':'#92400e','Simulação':'#6d28d9','Dados Bancários':'#065f46','Fechado':'#047857','Perdido':'#b91c1c'};
// ─── Ícones (SVG line-icons, monocromáticos) ─────────────────────────────────
function IconBase({children,size=18}:{children:React.ReactNode;size?:number}) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">{children}</svg>;
}
function IconDashboard({size}:{size?:number}){return <IconBase size={size}><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></IconBase>;}
function IconChat({size}:{size?:number}){return <IconBase size={size}><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></IconBase>;}
function IconUsers({size}:{size?:number}){return <IconBase size={size}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></IconBase>;}
function IconLayers({size}:{size?:number}){return <IconBase size={size}><path d="M12 2 2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></IconBase>;}
function IconBot({size}:{size?:number}){return <IconBase size={size}><rect x="4" y="8" width="16" height="12" rx="2"/><circle cx="9" cy="14" r="1.3" fill="currentColor" stroke="none"/><circle cx="15" cy="14" r="1.3" fill="currentColor" stroke="none"/><path d="M12 8V4"/><circle cx="12" cy="3" r="1.2"/><path d="M2 14h2"/><path d="M20 14h2"/></IconBase>;}
function IconSend({size}:{size?:number}){return <IconBase size={size}><path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4 20-7z"/></IconBase>;}
function IconSettings({size}:{size?:number}){return <IconBase size={size}><circle cx="12" cy="12" r="3"/><path d="M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.64-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61z"/></IconBase>;}

const NAV = [
  {id:'dashboard',label:'Dashboard',Icon:IconDashboard},
  {id:'inbox',label:'Atendimento',Icon:IconChat},
  {id:'leads',label:'Leads',Icon:IconUsers},
  {id:'queues',label:'Filas',Icon:IconLayers},
  {id:'ai',label:'Treinar IA',Icon:IconBot},
  {id:'dispatches',label:'Disparos',Icon:IconSend},
  {id:'settings',label:'Configurações',Icon:IconSettings},
];
const DEF_QUEUES:Queue[] = [{id:'q1',name:'FGTS',color:'#10b981'},{id:'q2',name:'CLT',color:'#1d4ed8'},{id:'q3',name:'Refinanciamento',color:'#8b5cf6'}];
const DEF_AI:AIConfig = {botName:'Assistente',greeting:'Olá! Como posso te ajudar?',personality:'Profissional e cordial.',active:false,rules:[]};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2)+Date.now().toString(36);
const fmtT = (ts:number) => new Date(ts).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
const fmtD = (ts:number) => new Date(ts).toLocaleDateString('pt-BR');

// ─── Mini components ──────────────────────────────────────────────────────────
function Btn({label,onClick,color,full,small,variant}:{label:string;onClick:()=>void;color?:string;full?:boolean;small?:boolean;variant?:'ghost'}) {
  const ghost = variant==='ghost';
  return <button onClick={onClick} style={{width:full?'100%':undefined,background:ghost?'transparent':color||C.accent,color:ghost?C.text2:'#fff',border:ghost?`1px solid ${C.border}`:'none',borderRadius:7,padding:small?'5px 12px':'8px 16px',fontSize:small?11:12,fontWeight:600,cursor:'pointer'}}>{label}</button>;
}
function Field({label,hint,children}:{label:string;hint?:string;children:React.ReactNode}) {
  return <div style={{marginBottom:12}}><label style={{display:'block',fontSize:10,color:C.text3,fontWeight:700,marginBottom:2,textTransform:'uppercase',letterSpacing:.5}}>{label}</label>{hint&&<div style={{fontSize:10,color:C.text3,marginBottom:3}}>{hint}</div>}{children}</div>;
}
function TextInput({value,onChange,placeholder,type,mono}:{value:string;onChange:(v:string)=>void;placeholder?:string;type?:string;mono?:boolean}) {
  return <input type={type||'text'} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={{width:'100%',background:'#f8fafc',border:`1px solid ${C.border}`,borderRadius:7,padding:'8px 10px',fontSize:12,color:C.text,outline:'none',boxSizing:'border-box' as const,fontFamily:mono?'monospace':undefined}}/>;
}
function SelectInput({value,onChange,options}:{value:string;onChange:(v:string)=>void;options:{value:string;label:string}[]}) {
  return <select value={value} onChange={e=>onChange(e.target.value)} style={{width:'100%',background:'#f8fafc',border:`1px solid ${C.border}`,borderRadius:7,padding:'8px 10px',fontSize:12,color:C.text,outline:'none'}}>{options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select>;
}
function Modal({title,onClose,children}:{title:string;onClose:()=>void;children:React.ReactNode}) {
  return (
    <div style={{position:'fixed' as const,inset:0,background:'rgba(0,0,0,.45)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}}>
      <div style={{background:'#fff',borderRadius:12,padding:24,width:440,maxHeight:'85vh',overflowY:'auto' as const,boxShadow:'0 20px 60px rgba(0,0,0,.3)'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
          <h3 style={{margin:0,fontSize:14,fontWeight:700,color:C.text}}>{title}</h3>
          <button onClick={onClose} style={{background:'none',border:'none',fontSize:20,cursor:'pointer',color:C.text3,lineHeight:1}}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}
function Card({children,style}:{children:React.ReactNode;style?:React.CSSProperties}) {
  return <div style={{background:'#fff',border:`1px solid ${C.border}`,borderRadius:10,padding:16,...style}}>{children}</div>;
}
function SectionTitle({label}:{label:string}) {
  return <h3 style={{margin:'0 0 14px',fontSize:13,fontWeight:700,color:C.text}}>{label}</h3>;
}
function Empty({icon,text,action,onAction}:{icon:string;text:string;action?:string;onAction?:()=>void}) {
  return (
    <div style={{textAlign:'center' as const,padding:48,color:C.text3}}>
      <div style={{fontSize:40,marginBottom:8}}>{icon}</div>
      <div style={{fontSize:13,marginBottom:action?12:0}}>{text}</div>
      {action&&onAction&&<Btn label={action} onClick={onAction}/>}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function InboxPage() {
  const [screen,setScreen] = useState('dashboard');
  const [contacts,setContacts] = useState<Contact[]>([]);
  const [selected,setSelected] = useState<string|null>(null);
  const [messages,setMessages] = useState<Message[]>([]);
  const [input,setInput] = useState('');
  const [sending,setSending] = useState(false);
  const [leads,setLeads] = useState<Lead[]>([]);
  const [leadForm,setLeadForm] = useState<Partial<Lead>|null>(null);
  const [leadSearch,setLeadSearch] = useState('');
  const [leadFilter,setLeadFilter] = useState('Todos');
  const [queues,setQueues] = useState<Queue[]>(DEF_QUEUES);
  const [queueForm,setQueueForm] = useState<Partial<Queue>|null>(null);
  const [ai,setAi] = useState<AIConfig>(DEF_AI);
  const [aiRuleForm,setAiRuleForm] = useState<Partial<AIRule>|null>(null);
  const [dispPhone,setDispPhone] = useState('');
  const [dispMsg,setDispMsg] = useState('');
  const [dispatching,setDispatching] = useState(false);
  const [dispResult,setDispResult] = useState<string|null>(null);
  const [inboxSearch,setInboxSearch] = useState('');
  const [sbOpen,setSbOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Carrega do servidor (persistido em Redis) — localStorage fica só como cache
  // instantâneo pra evitar tela vazia no primeiro render.
  const [hydrated,setHydrated] = useState(false);
  useEffect(()=>{
    try {
      const l=localStorage.getItem('gt_leads'); if(l) setLeads(JSON.parse(l));
      const q=localStorage.getItem('gt_queues'); if(q) setQueues(JSON.parse(q));
      const a=localStorage.getItem('gt_ai'); if(a) setAi(JSON.parse(a));
    } catch {}
    (async()=>{
      try {
        const [lr,qr,ar] = await Promise.all([
          fetch('/api/leads').then(r=>r.json()),
          fetch('/api/queues').then(r=>r.json()),
          fetch('/api/ai').then(r=>r.json()),
        ]);
        if (lr?.leads) setLeads(lr.leads);
        if (qr?.queues) setQueues(qr.queues);
        if (ar && ar.botName) setAi(ar);
      } catch {} finally { setHydrated(true); }
    })();
  },[]);

  // Persiste no servidor (Redis) sempre que mudar — localStorage continua
  // como cache local, mas a fonte de verdade pro webhook é o servidor.
  useEffect(()=>{ try{localStorage.setItem('gt_leads',JSON.stringify(leads));}catch{}; if(hydrated) fetch('/api/leads',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({leads})}).catch(()=>{}); },[leads,hydrated]);
  useEffect(()=>{ try{localStorage.setItem('gt_queues',JSON.stringify(queues));}catch{}; if(hydrated) fetch('/api/queues',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({queues})}).catch(()=>{}); },[queues,hydrated]);
  useEffect(()=>{ try{localStorage.setItem('gt_ai',JSON.stringify(ai));}catch{}; if(hydrated) fetch('/api/ai',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(ai)}).catch(()=>{}); },[ai,hydrated]);

  // Poll contacts
  useEffect(()=>{
    const fn=()=>fetch('/api/messages').then(r=>r.json()).then(d=>setContacts(d.contacts||[])).catch(()=>{});
    fn(); const id=setInterval(fn,3000); return ()=>clearInterval(id);
  },[]);

  // Load messages for selected contact
  useEffect(()=>{
    if(!selected) return;
    fetch(`/api/messages?phone=${selected}`).then(r=>r.json()).then(d=>setMessages(d.messages||[])).catch(()=>{});
  },[selected,contacts]);

  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:'smooth'}); },[messages]);

  const sendMsg = async()=>{
    if(!input.trim()||!selected||sending) return;
    setSending(true);
    try { await sendMessageAction(selected,input.trim()); setInput(''); } finally { setSending(false); }
  };

  const saveLead=(data:Partial<Lead>)=>{
    if(data.id) setLeads(p=>p.map(l=>l.id===data.id?{...l,...data}:l));
    else setLeads(p=>[{id:uid(),name:data.name||'',phone:data.phone||'',cpf:data.cpf||'',status:(data.status||'Novo') as LeadStatus,queue:data.queue||'',notes:data.notes||'',createdAt:Date.now()},...p]);
    setLeadForm(null);
  };

  const saveQueue=(data:Partial<Queue>)=>{
    if(data.id) setQueues(p=>p.map(q=>q.id===data.id?{...q,...data}:q));
    else setQueues(p=>[...p,{id:uid(),name:data.name||'Nova Fila',color:data.color||'#1d4ed8'}]);
    setQueueForm(null);
  };

  const saveAiRule=(data:Partial<AIRule>)=>{
    if(data.id) setAi(p=>({...p,rules:p.rules.map(r=>r.id===data.id?{...r,...data}:r)}));
    else setAi(p=>({...p,rules:[...p.rules,{id:uid(),trigger:data.trigger||'',response:data.response||''}]}));
    setAiRuleForm(null);
  };

  const sendDispatch=async()=>{
    if(!dispPhone.trim()||!dispMsg.trim()) return;
    setDispatching(true); setDispResult(null);
    try {
      const r=await sendMessageAction(dispPhone.trim(),dispMsg.trim());
      setDispResult(r.ok?'✅ Mensagem enviada com sucesso!':'❌ Erro ao enviar.');
      if(r.ok){setDispPhone('');setDispMsg('');}
    } catch { setDispResult('❌ Erro ao conectar. Verifique as chaves de API no Vercel.'); }
    finally { setDispatching(false); }
  };

  const filteredLeads=leads.filter(l=>{
    const ms=!leadSearch||l.name.toLowerCase().includes(leadSearch.toLowerCase())||l.phone.includes(leadSearch);
    const mf=leadFilter==='Todos'||l.status===leadFilter;
    return ms&&mf;
  });
  const filteredContacts=contacts.filter(c=>!inboxSearch||c.name?.toLowerCase().includes(inboxSearch.toLowerCase())||c.phone.includes(inboxSearch));
  const selContact=contacts.find(c=>c.phone===selected);
  const linkedLead=selected?leads.find(l=>l.phone===selected):null;
  const queueName=(qid:string)=>queues.find(q=>q.id===qid)?.name||'—';
  const queueColor=(qid:string)=>queues.find(q=>q.id===qid)?.color||C.text3;

  return (
    <div style={{display:'flex',height:'100vh',background:C.bg,fontFamily:"'Inter',system-ui,sans-serif",fontSize:13}}>

      {/* ── Sidebar ── */}
      <style>{`
        .gt-side{width:64px;background:#ffffff;border-right:1px solid ${C.border};display:flex;flex-direction:column;flex-shrink:0;transition:width .18s ease;overflow:hidden;position:relative;z-index:50;}
        .gt-side.open{width:228px;box-shadow:2px 0 14px rgba(15,23,42,.08);}
        .gt-side-label{opacity:0;white-space:nowrap;transition:opacity .12s ease;font-size:12.5px;font-weight:600;}
        .gt-side.open .gt-side-label{opacity:1;}
        .gt-side-row{display:flex;align-items:center;width:100%;height:42px;border:none;background:transparent;cursor:pointer;position:relative;padding:0;text-align:left;}
        .gt-side-row:hover{background:#f8fafc;}
        .gt-side-row.active{background:#eff6ff;}
        .gt-side-row.active .gt-side-bar{opacity:1;}
        .gt-side-bar{position:absolute;left:0;top:7px;bottom:7px;width:3px;border-radius:0 3px 3px 0;background:${C.accent};opacity:0;}
        .gt-side-ic{width:64px;height:42px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
      `}</style>
      <div className={`gt-side${sbOpen?' open':''}`} onMouseEnter={()=>setSbOpen(true)} onMouseLeave={()=>setSbOpen(false)}>
        <div style={{height:56,display:'flex',alignItems:'center',flexShrink:0,borderBottom:`1px solid ${C.border}`}}>
          <div style={{width:64,height:56,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <div style={{width:30,height:30,borderRadius:8,background:'#0f172a',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <span style={{color:'#fff',fontSize:14,fontWeight:800}}>G</span>
            </div>
          </div>
          <span className="gt-side-label" style={{color:C.text,fontWeight:800,fontSize:13}}>GranaTech</span>
        </div>
        <div style={{flex:1,overflowY:'auto' as const,paddingTop:6}}>
          {NAV.map(n=>{
            const active=screen===n.id;
            return (
              <button key={n.id} onClick={()=>setScreen(n.id)} title={n.label} className={`gt-side-row${active?' active':''}`}>
                <span className="gt-side-bar"/>
                <span className="gt-side-ic" style={{color:active?C.accent:C.text2}}><n.Icon size={18}/></span>
                <span className="gt-side-label" style={{color:active?C.accent:C.text}}>{n.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Main ── */}
      <div style={{flex:1,display:'flex',flexDirection:'column' as const,overflow:'hidden'}}>

        {/* Header */}
        <div style={{background:'#fff',borderBottom:`1px solid ${C.border}`,padding:'0 18px',height:50,display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <span style={{fontSize:14,fontWeight:700,color:C.text}}>{NAV.find(n=>n.id===screen)?.label}</span>
            {screen==='inbox'&&<span style={{fontSize:11,color:C.text3,background:'#f1f5f9',borderRadius:10,padding:'1px 7px'}}>{contacts.length}</span>}
            {screen==='leads'&&<span style={{fontSize:11,color:C.text3,background:'#f1f5f9',borderRadius:10,padding:'1px 7px'}}>{leads.length}</span>}
          </div>
          <div>
            {screen==='leads'&&<Btn label="+ Novo Lead" onClick={()=>setLeadForm({})} small/>}
            {screen==='queues'&&<Btn label="+ Nova Fila" onClick={()=>setQueueForm({})} small/>}
            {screen==='ai'&&<Btn label="+ Nova Regra" onClick={()=>setAiRuleForm({})} small/>}
          </div>
        </div>

        {/* ── DASHBOARD ── */}
        {screen==='dashboard'&&(
          <div style={{flex:1,overflowY:'auto' as const,padding:16}}>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:16}}>
              {[
                {label:'Total Leads',val:leads.length,color:C.accent,icon:'👥'},
                {label:'Leads Novos',val:leads.filter(l=>l.status==='Novo').length,color:C.amber,icon:'🆕'},
                {label:'Em Atendimento',val:contacts.length,color:C.green,icon:'💬'},
                {label:'Fechados',val:leads.filter(l=>l.status==='Fechado').length,color:'#8b5cf6',icon:'✅'},
              ].map(k=>(
                <Card key={k.label}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                    <div>
                      <div style={{fontSize:10,color:C.text3,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:.5,marginBottom:4}}>{k.label}</div>
                      <div style={{fontSize:30,fontWeight:800,color:k.color,lineHeight:1}}>{k.val}</div>
                    </div>
                    <span style={{fontSize:22}}>{k.icon}</span>
                  </div>
                </Card>
              ))}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <Card>
                <SectionTitle label="Leads por Status"/>
                {leads.length===0&&<p style={{fontSize:12,color:C.text3,margin:0}}>Nenhum lead cadastrado ainda.</p>}
                {STATUSES.map(s=>{
                  const n=leads.filter(l=>l.status===s).length;
                  return (
                    <div key={s} style={{marginBottom:7}}>
                      <div style={{display:'flex',justifyContent:'space-between',fontSize:11,color:C.text2,marginBottom:2}}><span>{s}</span><span style={{fontWeight:600}}>{n}</span></div>
                      <div style={{height:5,background:'#f1f5f9',borderRadius:3}}><div style={{height:'100%',width:leads.length?`${Math.round(n/leads.length*100)}%`:'0%',background:SFG[s],borderRadius:3}}/></div>
                    </div>
                  );
                })}
              </Card>
              <Card>
                <SectionTitle label="Leads por Fila"/>
                {queues.length===0&&<p style={{fontSize:12,color:C.text3,margin:0}}>Nenhuma fila configurada.</p>}
                {queues.map(q=>(
                  <div key={q.id} style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                    <div style={{width:8,height:8,borderRadius:'50%',background:q.color,flexShrink:0}}/>
                    <span style={{flex:1,fontSize:12,color:C.text}}>{q.name}</span>
                    <span style={{fontSize:12,fontWeight:600,color:C.text2}}>{leads.filter(l=>l.queue===q.id).length}</span>
                  </div>
                ))}
              </Card>
            </div>
          </div>
        )}

        {/* ── INBOX ── */}
        {screen==='inbox'&&(
          <div style={{flex:1,display:'flex',overflow:'hidden'}}>
            {/* Contact list */}
            <div style={{width:270,borderRight:`1px solid ${C.border}`,background:'#fff',display:'flex',flexDirection:'column' as const,flexShrink:0}}>
              <div style={{padding:'8px 10px',borderBottom:`1px solid ${C.border}`}}>
                <input value={inboxSearch} onChange={e=>setInboxSearch(e.target.value)} placeholder="Buscar contato..." style={{width:'100%',background:'#f8fafc',border:`1px solid ${C.border}`,borderRadius:7,padding:'6px 10px',fontSize:12,outline:'none',boxSizing:'border-box' as const}}/>
              </div>
              <div style={{flex:1,overflowY:'auto' as const}}>
                {contacts.length===0&&(
                  <Empty icon="💬" text={`Nenhuma conversa ainda.\nConfigure as chaves de API\npara receber mensagens.`}/>
                )}
                {filteredContacts.map(c=>(
                  <div key={c.phone} onClick={()=>setSelected(c.phone)} style={{padding:'9px 10px',cursor:'pointer',borderBottom:`1px solid ${C.border}`,background:selected===c.phone?'#eff6ff':'#fff',display:'flex',gap:8,alignItems:'center'}}>
                    <div style={{width:36,height:36,borderRadius:'50%',background:C.accent,color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,flexShrink:0}}>
                      {(c.name||c.phone).charAt(0).toUpperCase()}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:12,fontWeight:600,color:C.text,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{c.name||c.phone}</div>
                      <div style={{fontSize:11,color:C.text3,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{c.lastMessage?.body||'...'}</div>
                    </div>
                    {c.unreadCount>0&&<div style={{minWidth:18,height:18,borderRadius:9,background:C.green,color:'#fff',fontSize:10,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',padding:'0 3px'}}>{c.unreadCount}</div>}
                  </div>
                ))}
              </div>
            </div>
            {/* Chat */}
            <div style={{flex:1,display:'flex',flexDirection:'column' as const}}>
              {!selected?(
                <div style={{flex:1,display:'flex',flexDirection:'column' as const,alignItems:'center',justifyContent:'center',color:C.text3}}>
                  <div style={{fontSize:44,marginBottom:10}}>💬</div>
                  <div style={{fontSize:12}}>Selecione uma conversa</div>
                </div>
              ):(
                <>
                  <div style={{padding:'8px 14px',background:'#fff',borderBottom:`1px solid ${C.border}`,display:'flex',alignItems:'center',gap:10}}>
                    <div style={{width:32,height:32,borderRadius:'50%',background:C.accent,color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700}}>
                      {(selContact?.name||selected).charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{fontSize:12,fontWeight:600,color:C.text}}>{selContact?.name||selected}</div>
                      <div style={{fontSize:10,color:C.text3}}>{selected}</div>
                    </div>
                  </div>
                  <div style={{flex:1,overflowY:'auto' as const,padding:14,display:'flex',flexDirection:'column' as const,gap:6}}>
                    {messages.length===0&&<div style={{textAlign:'center' as const,color:C.text3,fontSize:12,marginTop:20}}>Sem mensagens nesta conversa.</div>}
                    {messages.map(m=>(
                      <div key={m.id} style={{display:'flex',justifyContent:m.direction==='outbound'?'flex-end':'flex-start'}}>
                        <div style={{maxWidth:'68%',background:m.direction==='outbound'?C.accent:'#fff',color:m.direction==='outbound'?'#fff':C.text,padding:'7px 11px',borderRadius:m.direction==='outbound'?'12px 12px 2px 12px':'12px 12px 12px 2px',fontSize:12,boxShadow:'0 1px 3px rgba(0,0,0,.08)'}}>
                          <div>{m.body}</div>
                          <div style={{fontSize:9,marginTop:2,opacity:.65,textAlign:'right' as const}}>{fmtT(m.timestamp)}</div>
                        </div>
                      </div>
                    ))}
                    <div ref={bottomRef}/>
                  </div>
                  <div style={{padding:'8px 14px',background:'#fff',borderTop:`1px solid ${C.border}`,display:'flex',gap:8}}>
                    <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendMsg()} placeholder="Digite uma mensagem..." style={{flex:1,background:'#f8fafc',border:`1px solid ${C.border}`,borderRadius:8,padding:'7px 11px',fontSize:12,outline:'none'}}/>
                    <button onClick={sendMsg} disabled={sending||!input.trim()} style={{background:C.accent,color:'#fff',border:'none',borderRadius:8,padding:'7px 14px',fontSize:12,fontWeight:600,cursor:'pointer',opacity:!input.trim()?0.4:1}}>Enviar</button>
                  </div>
                </>
              )}
            </div>
            {/* Lead panel */}
            {selected&&(
              <div style={{width:210,borderLeft:`1px solid ${C.border}`,background:'#fff',padding:12,overflowY:'auto' as const,flexShrink:0}}>
                <div style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:'uppercase' as const,letterSpacing:.5,marginBottom:8}}>Lead Vinculado</div>
                {linkedLead?(
                  <div style={{background:'#f8fafc',border:`1px solid ${C.border}`,borderRadius:8,padding:10}}>
                    <div style={{fontSize:12,fontWeight:600,color:C.text,marginBottom:3}}>{linkedLead.name}</div>
                    <span style={{background:SBG[linkedLead.status],color:SFG[linkedLead.status],borderRadius:4,padding:'2px 6px',fontSize:10,fontWeight:600}}>{linkedLead.status}</span>
                    {linkedLead.queue&&<div style={{marginTop:4,fontSize:11,color:C.text2}}>📋 {queueName(linkedLead.queue)}</div>}
                    {linkedLead.notes&&<div style={{marginTop:4,fontSize:11,color:C.text3}}>{linkedLead.notes}</div>}
                    <button onClick={()=>{setLeadForm(linkedLead);setScreen('leads');}} style={{marginTop:8,width:'100%',background:'#eff6ff',color:C.accent,border:'none',borderRadius:6,padding:'5px',fontSize:10,cursor:'pointer',fontWeight:600}}>Editar Lead</button>
                  </div>
                ):(
                  <div>
                    <p style={{fontSize:11,color:C.text3,marginBottom:8}}>Nenhum lead com este número.</p>
                    <button onClick={()=>{setLeadForm({phone:selected});setScreen('leads');}} style={{width:'100%',background:'#eff6ff',color:C.accent,border:`1px dashed ${C.accent}`,borderRadius:6,padding:'6px',fontSize:11,cursor:'pointer',fontWeight:600}}>+ Criar Lead</button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── LEADS ── */}
        {screen==='leads'&&(
          <div style={{flex:1,overflowY:'auto' as const,padding:14}}>
            <div style={{display:'flex',gap:8,marginBottom:12,flexWrap:'wrap' as const,alignItems:'center'}}>
              <input value={leadSearch} onChange={e=>setLeadSearch(e.target.value)} placeholder="Buscar por nome ou telefone..." style={{background:'#fff',border:`1px solid ${C.border}`,borderRadius:7,padding:'7px 12px',fontSize:12,outline:'none',minWidth:220}}/>
              {['Todos',...STATUSES].map(s=>(
                <button key={s} onClick={()=>setLeadFilter(s)} style={{background:leadFilter===s?C.accent:'#fff',color:leadFilter===s?'#fff':C.text2,border:`1px solid ${leadFilter===s?C.accent:C.border}`,borderRadius:6,padding:'5px 10px',fontSize:11,cursor:'pointer',fontWeight:600}}>{s}</button>
              ))}
            </div>
            {filteredLeads.length===0?(
              <Empty icon="👥" text={leads.length===0?'Nenhum lead cadastrado ainda.':'Nenhum lead com este filtro.'} action={leads.length===0?'+ Cadastrar primeiro lead':undefined} onAction={()=>setLeadForm({})}/>
            ):(
              <div style={{background:'#fff',border:`1px solid ${C.border}`,borderRadius:10,overflow:'hidden'}}>
                <table style={{width:'100%',borderCollapse:'collapse' as const}}>
                  <thead>
                    <tr style={{background:'#f8fafc'}}>
                      {['Nome','Telefone','CPF','Fila','Status','Cadastro','Ações'].map(h=>(
                        <th key={h} style={{padding:'9px 12px',textAlign:'left' as const,fontSize:10,color:C.text3,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:.5}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLeads.map(l=>(
                      <tr key={l.id} style={{borderTop:`1px solid #f8fafc`}}>
                        <td style={{padding:'9px 12px',fontWeight:600,color:C.text}}>{l.name}</td>
                        <td style={{padding:'9px 12px',color:C.text2,fontFamily:'monospace',fontSize:11}}>{l.phone}</td>
                        <td style={{padding:'9px 12px',color:C.text2,fontFamily:'monospace',fontSize:11}}>{l.cpf||'—'}</td>
                        <td style={{padding:'9px 12px'}}>
                          {l.queue?(
                            <span style={{display:'inline-flex',alignItems:'center',gap:4,fontSize:11}}>
                              <span style={{width:7,height:7,borderRadius:'50%',background:queueColor(l.queue),display:'inline-block'}}/>
                              {queueName(l.queue)}
                            </span>
                          ):<span style={{color:C.text3,fontSize:11}}>—</span>}
                        </td>
                        <td style={{padding:'9px 12px'}}>
                          <span style={{background:SBG[l.status],color:SFG[l.status],borderRadius:4,padding:'2px 7px',fontSize:10,fontWeight:600}}>{l.status}</span>
                        </td>
                        <td style={{padding:'9px 12px',color:C.text3,fontSize:11}}>{fmtD(l.createdAt)}</td>
                        <td style={{padding:'9px 12px',display:'flex',gap:4}}>
                          <button onClick={()=>setLeadForm(l)} style={{background:'#eff6ff',color:C.accent,border:'none',borderRadius:5,padding:'3px 8px',fontSize:10,cursor:'pointer',fontWeight:600}}>Editar</button>
                          <button onClick={()=>{if(confirm('Excluir este lead?'))setLeads(p=>p.filter(x=>x.id!==l.id));}} style={{background:'#fef2f2',color:C.red,border:'none',borderRadius:5,padding:'3px 8px',fontSize:10,cursor:'pointer',fontWeight:600}}>Excluir</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── FILAS ── */}
        {screen==='queues'&&(
          <div style={{flex:1,overflowY:'auto' as const,padding:14}}>
            {queues.length===0&&<Empty icon="🗂️" text="Nenhuma fila configurada." action="+ Criar primeira fila" onAction={()=>setQueueForm({})}/>}
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))',gap:12}}>
              {queues.map(q=>(
                <Card key={q.id}>
                  <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
                    <div style={{width:30,height:30,borderRadius:8,background:q.color,flexShrink:0}}/>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,fontWeight:700,color:C.text}}>{q.name}</div>
                      <div style={{fontSize:11,color:C.text3}}>{leads.filter(l=>l.queue===q.id).length} leads</div>
                    </div>
                  </div>
                  <div style={{display:'flex',gap:6}}>
                    <button onClick={()=>setQueueForm(q)} style={{flex:1,background:'#eff6ff',color:C.accent,border:`1px solid ${C.accent}`,borderRadius:6,padding:'5px',fontSize:11,cursor:'pointer',fontWeight:600}}>Renomear / Editar</button>
                    <button onClick={()=>{if(confirm(`Excluir fila "${q.name}"?`))setQueues(p=>p.filter(x=>x.id!==q.id));}} style={{background:'#fef2f2',color:C.red,border:'none',borderRadius:6,padding:'5px 10px',fontSize:11,cursor:'pointer',fontWeight:600}}>✕</button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* ── TREINAR IA ── */}
        {screen==='ai'&&(
          <div style={{flex:1,overflowY:'auto' as const,padding:14,display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,alignContent:'start' as const}}>
            <Card>
              <SectionTitle label="Configuração do Bot"/>
              <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',marginBottom:14}}>
                <input type="checkbox" checked={ai.active} onChange={e=>setAi(p=>({...p,active:e.target.checked}))} style={{width:14,height:14}}/>
                <span style={{fontSize:12,fontWeight:600,color:ai.active?C.green:C.text3}}>{ai.active?'✅ Bot ativo — respondendo automaticamente':'⏸ Bot inativo'}</span>
              </label>
              <Field label="Nome do Bot">
                <TextInput value={ai.botName} onChange={v=>setAi(p=>({...p,botName:v}))} placeholder="Ex: Assistente GranaTech"/>
              </Field>
              <Field label="Mensagem de Saudação" hint="Enviada quando um novo contato inicia conversa">
                <TextInput value={ai.greeting} onChange={v=>setAi(p=>({...p,greeting:v}))} placeholder="Olá! Como posso te ajudar?"/>
              </Field>
              <Field label="Personalidade / Tom" hint="Descreva como o bot deve se comunicar">
                <TextInput value={ai.personality} onChange={v=>setAi(p=>({...p,personality:v}))} placeholder="Ex: Profissional, cordial, foco em crédito consignado"/>
              </Field>
              <Btn label="Salvar Configuração" full onClick={()=>{ try{localStorage.setItem('gt_ai',JSON.stringify(ai));alert('Configuração salva!');}catch{} }}/>
            </Card>
            <Card>
              <SectionTitle label="Regras de Resposta Automática"/>
              <p style={{fontSize:11,color:C.text3,marginBottom:10}}>Defina gatilhos (palavras/frases) e as respostas que o bot enviará automaticamente.</p>
              {ai.rules.length===0&&<p style={{fontSize:12,color:C.text3,marginBottom:10}}>Nenhuma regra cadastrada.</p>}
              {ai.rules.map(r=>(
                <div key={r.id} style={{background:'#f8fafc',border:`1px solid ${C.border}`,borderRadius:8,padding:10,marginBottom:8}}>
                  <div style={{fontSize:12,fontWeight:600,color:C.text,marginBottom:3}}>🔍 {r.trigger}</div>
                  <div style={{fontSize:11,color:C.text2,marginBottom:6,lineHeight:1.4}}>💬 {r.response}</div>
                  <div style={{display:'flex',gap:4}}>
                    <button onClick={()=>setAiRuleForm(r)} style={{background:'#eff6ff',color:C.accent,border:'none',borderRadius:4,padding:'3px 8px',fontSize:10,cursor:'pointer',fontWeight:600}}>Editar</button>
                    <button onClick={()=>setAi(p=>({...p,rules:p.rules.filter(x=>x.id!==r.id)}))} style={{background:'#fef2f2',color:C.red,border:'none',borderRadius:4,padding:'3px 8px',fontSize:10,cursor:'pointer',fontWeight:600}}>Excluir</button>
                  </div>
                </div>
              ))}
              <button onClick={()=>setAiRuleForm({})} style={{width:'100%',background:'#eff6ff',color:C.accent,border:`1px dashed ${C.accent}`,borderRadius:7,padding:8,fontSize:12,fontWeight:600,cursor:'pointer',marginTop:4}}>+ Adicionar Regra</button>
            </Card>
          </div>
        )}

        {/* ── DISPAROS ── */}
        {screen==='dispatches'&&(
          <div style={{flex:1,overflowY:'auto' as const,padding:14,display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,alignContent:'start' as const}}>
            <Card>
              <SectionTitle label="Enviar Mensagem WhatsApp"/>
              <Field label="Telefone (com DDI, sem espaços)" hint="Ex: 5511999999999">
                <TextInput value={dispPhone} onChange={setDispPhone} placeholder="5511999999999" mono/>
              </Field>
              <Field label="Mensagem">
                <textarea value={dispMsg} onChange={e=>setDispMsg(e.target.value)} placeholder="Digite a mensagem..." rows={5}
                  style={{width:'100%',background:'#f8fafc',border:`1px solid ${C.border}`,borderRadius:7,padding:'8px 10px',fontSize:12,color:C.text,outline:'none',resize:'vertical' as const,boxSizing:'border-box' as const}}/>
              </Field>
              {dispResult&&<div style={{marginBottom:10,padding:'8px 12px',background:dispResult.startsWith('✅')?'#f0fdf4':'#fef2f2',borderRadius:7,fontSize:12,color:dispResult.startsWith('✅')?C.green:C.red}}>{dispResult}</div>}
              <Btn label={dispatching?'Enviando...':'Enviar Mensagem'} full onClick={sendDispatch}/>
            </Card>
            <Card>
              <SectionTitle label="Selecionar Lead"/>
              <p style={{fontSize:11,color:C.text3,marginBottom:10}}>Clique em um lead para preencher o telefone automaticamente:</p>
              <div style={{maxHeight:340,overflowY:'auto' as const}}>
                {leads.length===0&&<p style={{fontSize:12,color:C.text3}}>Nenhum lead cadastrado.</p>}
                {leads.filter(l=>l.status!=='Fechado'&&l.status!=='Perdido').map(l=>(
                  <div key={l.id} onClick={()=>setDispPhone(l.phone)}
                    style={{padding:'8px 10px',background:dispPhone===l.phone?'#eff6ff':'#f8fafc',border:`1px solid ${dispPhone===l.phone?C.accent:C.border}`,borderRadius:7,marginBottom:6,cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <div>
                      <div style={{fontSize:12,fontWeight:600,color:C.text}}>{l.name}</div>
                      <div style={{fontSize:11,color:C.text3,fontFamily:'monospace'}}>{l.phone}</div>
                    </div>
                    <span style={{background:SBG[l.status],color:SFG[l.status],borderRadius:4,padding:'2px 6px',fontSize:10,fontWeight:600}}>{l.status}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* ── CONFIGURAÇÕES ── */}
        {screen==='settings'&&(
          <div style={{flex:1,overflowY:'auto' as const,padding:14}}>
            <div style={{maxWidth:560}}>
              <Card style={{marginBottom:12}}>
                <SectionTitle label="Meta WhatsApp Cloud API"/>
                <div style={{background:'#fffbeb',border:'1px solid #fde68a',borderRadius:8,padding:'10px 12px',fontSize:11,color:'#92400e',marginBottom:14}}>
                  ⚠️ Configure no Vercel em <strong>Settings → Environment Variables</strong>. Após adicionar, clique em <strong>Redeploy</strong>.
                </div>
                {[
                  ['META_ACCESS_TOKEN','Token de Acesso','Gerado em Meta for Developers → WhatsApp → API Setup → Temporary access token'],
                  ['META_PHONE_NUMBER_ID','Phone Number ID','ID do número em Meta for Developers → WhatsApp → API Setup'],
                  ['META_WABA_ID','WABA ID','WhatsApp Business Account ID — na mesma página'],
                  ['META_VERIFY_TOKEN','Verify Token','Qualquer string secreta que você escolher, ex: granatech2024'],
                ].map(([k,l,h])=>(
                  <Field key={k} label={l} hint={h}>
                    <div style={{background:'#f1f5f9',border:`1px solid ${C.border}`,borderRadius:6,padding:'7px 10px',fontSize:11,fontFamily:'monospace',color:C.accent,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                      <span>{k}</span>
                      <button onClick={()=>{navigator.clipboard?.writeText(k);}} style={{background:'none',border:'none',cursor:'pointer',fontSize:11,color:C.text3}}>📋</button>
                    </div>
                  </Field>
                ))}
              </Card>
              <Card>
                <SectionTitle label="URL do Webhook"/>
                <div style={{background:'#f8fafc',border:`1px solid ${C.border}`,borderRadius:7,padding:'9px 12px',fontSize:12,fontFamily:'monospace',color:C.accent,display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                  <span style={{wordBreak:'break-all' as const}}>https://consignado-saas.vercel.app/api/webhook/meta</span>
                  <button onClick={()=>{ navigator.clipboard?.writeText('https://consignado-saas.vercel.app/api/webhook/meta'); alert('URL copiada!'); }} style={{background:'none',border:'none',cursor:'pointer',fontSize:14,color:C.text3,flexShrink:0,marginLeft:8}}>📋</button>
                </div>
                <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:8,padding:'10px 12px',fontSize:11,color:'#065f46'}}>
                  📋 Registre esta URL em <strong>Meta for Developers → WhatsApp → Configuration → Webhook</strong>. Assine os eventos: <strong>messages</strong> e <strong>message_status_updates</strong>.
                </div>
              </Card>
            </div>
          </div>
        )}

      </div>

      {/* ── MODALS ── */}
      {leadForm&&(
        <Modal title={leadForm.id?'Editar Lead':'Novo Lead'} onClose={()=>setLeadForm(null)}>
          <Field label="Nome completo *"><TextInput value={leadForm.name||''} onChange={v=>setLeadForm(p=>({...p,name:v}))} placeholder="João Carlos Silva"/></Field>
          <Field label="Telefone * (com DDI, sem espaços)" hint="Ex: 5511999999999"><TextInput value={leadForm.phone||''} onChange={v=>setLeadForm(p=>({...p,phone:v}))} placeholder="5511999999999" mono/></Field>
          <Field label="CPF"><TextInput value={leadForm.cpf||''} onChange={v=>setLeadForm(p=>({...p,cpf:v}))} placeholder="000.000.000-00"/></Field>
          <Field label="Fila">
            <SelectInput value={leadForm.queue||''} onChange={v=>setLeadForm(p=>({...p,queue:v}))}
              options={[{value:'',label:'Selecione a fila...'},...queues.map(q=>({value:q.id,label:q.name}))]}/>
          </Field>
          <Field label="Status">
            <SelectInput value={leadForm.status||'Novo'} onChange={v=>setLeadForm(p=>({...p,status:v as LeadStatus}))}
              options={STATUSES.map(s=>({value:s,label:s}))}/>
          </Field>
          <Field label="Observações">
            <textarea value={leadForm.notes||''} onChange={e=>setLeadForm(p=>({...p,notes:e.target.value}))} rows={3} placeholder="Anotações sobre o lead..."
              style={{width:'100%',background:'#f8fafc',border:`1px solid ${C.border}`,borderRadius:7,padding:'8px 10px',fontSize:12,color:C.text,outline:'none',resize:'vertical' as const,boxSizing:'border-box' as const}}/>
          </Field>
          <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
            <Btn label="Cancelar" onClick={()=>setLeadForm(null)} variant="ghost"/>
            <Btn label={leadForm.id?'Salvar':'Cadastrar'} onClick={()=>{
              if(!leadForm.name?.trim()||!leadForm.phone?.trim()){alert('Nome e telefone são obrigatórios.');return;}
              saveLead(leadForm);
            }}/>
          </div>
        </Modal>
      )}

      {queueForm&&(
        <Modal title={queueForm.id?'Editar Fila':'Nova Fila'} onClose={()=>setQueueForm(null)}>
          <Field label="Nome da fila *"><TextInput value={queueForm.name||''} onChange={v=>setQueueForm(p=>({...p,name:v}))} placeholder="Ex: FGTS, CLT, Refinanciamento"/></Field>
          <Field label="Cor da fila">
            <input type="color" value={queueForm.color||'#1d4ed8'} onChange={e=>setQueueForm(p=>({...p,color:e.target.value}))}
              style={{width:'100%',height:38,border:`1px solid ${C.border}`,borderRadius:7,cursor:'pointer',padding:2}}/>
          </Field>
          <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
            <Btn label="Cancelar" onClick={()=>setQueueForm(null)} variant="ghost"/>
            <Btn label={queueForm.id?'Salvar':'Criar Fila'} onClick={()=>{
              if(!queueForm.name?.trim()){alert('Nome é obrigatório.');return;}
              saveQueue(queueForm);
            }}/>
          </div>
        </Modal>
      )}

      {aiRuleForm&&(
        <Modal title={aiRuleForm.id?'Editar Regra de IA':'Nova Regra de IA'} onClose={()=>setAiRuleForm(null)}>
          <Field label="Gatilho *" hint="Palavra ou frase que ativa esta resposta">
            <TextInput value={aiRuleForm.trigger||''} onChange={v=>setAiRuleForm(p=>({...p,trigger:v}))} placeholder="Ex: simulação, quero simular, quanto consigo"/>
          </Field>
          <Field label="Resposta automática *" hint="O bot enviará esta mensagem quando detectar o gatilho">
            <textarea value={aiRuleForm.response||''} onChange={e=>setAiRuleForm(p=>({...p,response:e.target.value}))} rows={5} placeholder="Digite a resposta que o bot enviará..."
              style={{width:'100%',background:'#f8fafc',border:`1px solid ${C.border}`,borderRadius:7,padding:'8px 10px',fontSize:12,color:C.text,outline:'none',resize:'vertical' as const,boxSizing:'border-box' as const}}/>
          </Field>
          <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
            <Btn label="Cancelar" onClick={()=>setAiRuleForm(null)} variant="ghost"/>
            <Btn label={aiRuleForm.id?'Salvar':'Adicionar Regra'} onClick={()=>{
              if(!aiRuleForm.trigger?.trim()||!aiRuleForm.response?.trim()){alert('Gatilho e resposta são obrigatórios.');return;}
              saveAiRule(aiRuleForm);
            }}/>
          </div>
        </Modal>
      )}

    </div>
  );
}
