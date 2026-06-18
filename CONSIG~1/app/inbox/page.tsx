'use client';
import { useState, useEffect, useRef } from 'react';
import { sendMessageAction } from '@/app/actions';

interface Message { id:string; from:string; to:string; body:string; timestamp:number; direction:'inbound'|'outbound'; status:string; contactName?:string; }
interface Contact { phone:string; name:string; lastMessage:Message|null; unreadCount:number; }

const C = {
  bg: '#f0f4f8', bg2: '#ffffff', sidebar: '#0f2167', sidebarActive: '#1a3a8f',
  accent: '#1d4ed8', accent2: '#1e40af', text: '#1e293b', text2: '#64748b',
  text3: '#94a3b8', border: '#e2e8f0', green: '#10b981', red: '#ef4444',
  amber: '#f59e0b', sky: '#0ea5e9', purple: '#8b5cf6',
};

const Icon = ({ d, size=16 }: { d:string|React.ReactNode, size?:number }) => (
  typeof d === 'string'
    ? <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{__html: d}} />
    : <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{d}</svg>
);

const SCREENS = [
  { id:'dashboard', label:'Dashboard', icon:'<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>' },
  { id:'inbox',     label:'Atendimento', icon:'<path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>' },
  { id:'leads',     label:'Leads', icon:'<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>' },
  { id:'dispatches',label:'Disparos', icon:'<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22,2 15,22 11,13 2,9"/>' },
  { id:'settings',  label:'Configurações', icon:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>' },
];

const fmt = (ts:number) => new Date(ts).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});

export default function InboxPage() {
  const [screen, setScreen] = useState('dashboard');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selected, setSelected] = useState<string|null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fn = () => fetch('/api/messages').then(r=>r.json()).then(d=>setContacts(d.contacts||[]));
    fn(); const id = setInterval(fn, 3000); return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!selected) return;
    const fn = () => fetch(`/api/messages?phone=${selected}`).then(r=>r.json()).then(d=>setMessages(d.messages||[]));
    fn(); const id = setInterval(fn, 2000); return () => clearInterval(id);
  }, [selected]);

  useEffect(() => { bottomRef.current?.scrollIntoView({behavior:'smooth'}); }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !selected || sending) return;
    setSending(true); const text = input.trim(); setInput('');
    try { await sendMessageAction(selected, text); } catch(e){console.error(e);} finally { setSending(false); }
  };

  const selContact = contacts.find(c=>c.phone===selected);
  const unreadTotal = contacts.reduce((a,c)=>a+c.unreadCount,0);

  return (
    <div style={{display:'flex',height:'100vh',background:C.bg,fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",overflow:'hidden'}}>
      {/* ── SIDEBAR ── */}
      <div style={{width:58,background:C.sidebar,display:'flex',flexDirection:'column',alignItems:'center',padding:'12px 0',gap:2,flexShrink:0}}>
        {/* Logo */}
        <div style={{width:38,height:38,background:'linear-gradient(135deg,#3b82f6,#1d4ed8)',borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:14,boxShadow:'0 4px 12px rgba(59,130,246,.4)'}}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke="#fff" strokeWidth="2" strokeLinecap="round"/><polyline points="9,22 9,12 15,12 15,22" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></svg>
        </div>
        {SCREENS.map(s => (
          <div key={s.id} title={s.label} onClick={()=>setScreen(s.id)} style={{
            width:42,height:42,borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',
            color: screen===s.id ? '#fff' : 'rgba(255,255,255,0.45)',
            background: screen===s.id ? 'rgba(255,255,255,0.15)' : 'transparent',
            borderLeft: screen===s.id ? '3px solid #60a5fa' : '3px solid transparent',
            transition:'.15s', position:'relative',
          }}>
            <Icon d={s.icon} size={18} />
            {s.id==='inbox' && unreadTotal>0 && (
              <span style={{position:'absolute',top:4,right:4,background:C.red,color:'#fff',borderRadius:'50%',width:14,height:14,fontSize:8,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center'}}>{unreadTotal}</span>
            )}
          </div>
        ))}
        {/* Bottom avatar */}
        <div style={{marginTop:'auto',width:32,height:32,borderRadius:'50%',background:'rgba(255,255,255,0.15)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:'#fff'}}>GT</div>
      </div>

      {/* ── MAIN ── */}
      <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
        {/* Topbar */}
        <div style={{height:44,background:'#fff',borderBottom:`1px solid ${C.border}`,display:'flex',alignItems:'center',padding:'0 16px',gap:8,flexShrink:0}}>
          <span style={{fontSize:13,fontWeight:700,color:C.accent}}>GRANATECH</span>
          <span style={{background:'#dbeafe',color:C.accent,fontSize:9,padding:'2px 8px',borderRadius:20,fontWeight:700}}>CLT CONSIGNADO</span>
          <span style={{fontSize:10,color:C.text3,marginLeft:8}}>
            {SCREENS.find(s=>s.id===screen)?.label}
          </span>
          <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:8}}>
            <span style={{fontSize:10,color:C.text3}}>admin@granatech.com.br</span>
            <div style={{width:28,height:28,borderRadius:'50%',background:C.accent,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,color:'#fff'}}>GT</div>
          </div>
        </div>

        {/* ── DASHBOARD ── */}
        {screen==='dashboard' && (
          <div style={{flex:1,overflowY:'auto',padding:16}}>
            <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:8,marginBottom:14}}>
              {[
                {label:'Total Leads',val:'1.248',sub:'+32 hoje',c:C.accent},
                {label:'Leads Ativos',val:'892',sub:'71% total',c:C.green},
                {label:'Pendentes',val:'147',sub:'12 novas',c:C.amber},
                {label:'Conversas Hoje',val:'48',sub:'+8 vs ontem',c:C.sky},
                {label:'Msgs Enviadas',val:'214',sub:'hoje',c:C.purple},
                {label:'Taxa Resposta',val:'38%',sub:'+3% vs ontem',c:C.green},
              ].map(k=>(
                <div key={k.label} style={{background:'#fff',border:`1px solid ${C.border}`,borderRadius:10,padding:'12px 14px',borderTop:`3px solid ${k.c}`}}>
                  <div style={{fontSize:9,color:C.text3,textTransform:'uppercase',fontWeight:700,letterSpacing:.5}}>{k.label}</div>
                  <div style={{fontSize:24,fontWeight:800,color:C.text,margin:'4px 0 2px'}}>{k.val}</div>
                  <div style={{fontSize:9,color:k.c,fontWeight:600}}>{k.sub}</div>
                </div>
              ))}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              {/* Taxa por etapa */}
              <div style={{background:'#fff',border:`1px solid ${C.border}`,borderRadius:10,padding:14}}>
                <div style={{fontSize:11,fontWeight:700,color:C.text2,marginBottom:12}}>Taxa de Resposta por Etapa</div>
                {[['Simulação','52%',C.accent,52],['Dados Pessoais','41%',C.sky,41],['Dados Bancários','35%',C.green,35],['Biometria','28%',C.amber,28],['Formalização','22%',C.red,22]].map(([l,v,c,w])=>(
                  <div key={String(l)} style={{display:'flex',gap:8,alignItems:'center',marginBottom:8}}>
                    <span style={{width:110,fontSize:10,color:C.text2,flexShrink:0}}>{l}</span>
                    <div style={{flex:1,background:'#f1f5f9',borderRadius:3,height:7}}>
                      <div style={{width:`${w}%`,background:String(c),height:'100%',borderRadius:3}}/>
                    </div>
                    <span style={{fontSize:10,color:C.text2,width:30,textAlign:'right'}}>{v}</span>
                  </div>
                ))}
              </div>
              {/* Performance atendentes */}
              <div style={{background:'#fff',border:`1px solid ${C.border}`,borderRadius:10,padding:14}}>
                <div style={{fontSize:11,fontWeight:700,color:C.text2,marginBottom:12}}>Performance por Atendente / Bot</div>
                {[
                  {init:'AI',name:'Bot IA',conv:'312',taxa:'71%',w:71,c:'linear-gradient(90deg,#7c3aed,#6366f1)'},
                  {init:'A',name:'Ana Lima',conv:'89',taxa:'62%',w:62,c:C.green},
                  {init:'C',name:'Carlos M.',conv:'74',taxa:'55%',w:55,c:C.sky},
                ].map(p=>(
                  <div key={p.name} style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
                    <div style={{width:30,height:30,borderRadius:8,background:C.accent,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,color:'#fff',flexShrink:0}}>{p.init}</div>
                    <div style={{flex:1}}>
                      <div style={{display:'flex',justifyContent:'space-between',fontSize:10,marginBottom:3}}>
                        <span style={{fontWeight:600,color:C.text}}>{p.name}</span>
                        <span style={{color:C.green}}>{p.conv} conv · {p.taxa}</span>
                      </div>
                      <div style={{height:4,background:'#f1f5f9',borderRadius:2}}>
                        <div style={{width:`${p.w}%`,background:p.c,height:'100%',borderRadius:2}}/>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── INBOX ── */}
        {screen==='inbox' && (
          <div style={{flex:1,display:'flex',overflow:'hidden'}}>
            {/* Contact list */}
            <div style={{width:300,background:'#fff',borderRight:`1px solid ${C.border}`,display:'flex',flexDirection:'column',flexShrink:0}}>
              <div style={{padding:'10px 12px',borderBottom:`1px solid ${C.border}`}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
                  <span style={{fontSize:13,fontWeight:700,color:C.text}}>Conversas</span>
                  {unreadTotal>0 && <span style={{background:C.red,color:'#fff',borderRadius:20,padding:'2px 8px',fontSize:10,fontWeight:700}}>{unreadTotal} novas</span>}
                </div>
                <div style={{background:'#f8fafc',border:`1px solid ${C.border}`,borderRadius:8,padding:'6px 10px',display:'flex',alignItems:'center',gap:6}}>
                  <span style={{color:C.text3,fontSize:12}}>🔍</span>
                  <span style={{fontSize:12,color:C.text3}}>Buscar conversa...</span>
                </div>
              </div>
              <div style={{flex:1,overflowY:'auto'}}>
                {contacts.length===0 ? (
                  <div style={{padding:32,textAlign:'center',color:C.text3}}>
                    <div style={{fontSize:40,marginBottom:12}}>💬</div>
                    <p style={{fontSize:13,fontWeight:600,color:C.text2}}>Aguardando mensagens</p>
                    <p style={{fontSize:11,marginTop:6,lineHeight:1.5}}>Configure as credenciais Meta<br/>no Vercel para começar</p>
                  </div>
                ) : contacts.map(c=>(
                  <div key={c.phone} onClick={()=>{setSelected(c.phone);setScreen('inbox');}} style={{
                    display:'flex',alignItems:'center',padding:'10px 12px',cursor:'pointer',
                    background:selected===c.phone?'#eff6ff':'#fff',
                    borderBottom:`1px solid ${C.border}`,
                    borderLeft:selected===c.phone?`3px solid ${C.accent}`:'3px solid transparent',
                  }}>
                    <div style={{width:40,height:40,borderRadius:'50%',background:C.accent,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:700,fontSize:15,flexShrink:0}}>
                      {(c.name||c.phone).charAt(0).toUpperCase()}
                    </div>
                    <div style={{flex:1,marginLeft:10,overflow:'hidden'}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                        <span style={{fontWeight:600,fontSize:13,color:C.text}}>{c.name||c.phone}</span>
                        {c.lastMessage && <span style={{fontSize:10,color:C.text3}}>{fmt(c.lastMessage.timestamp)}</span>}
                      </div>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:2}}>
                        <span style={{fontSize:11,color:C.text3,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:190}}>
                          {c.lastMessage?.direction==='outbound'&&<span style={{color:C.sky}}>✓ </span>}
                          {c.lastMessage?.body||''}
                        </span>
                        {c.unreadCount>0 && <span style={{background:C.accent,color:'#fff',borderRadius:12,fontSize:10,fontWeight:700,padding:'1px 6px',flexShrink:0}}>{c.unreadCount}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Chat area */}
            {!selected ? (
              <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:C.bg,color:C.text3}}>
                <div style={{fontSize:56,marginBottom:16}}>💬</div>
                <h2 style={{fontSize:18,fontWeight:600,color:C.text2,marginBottom:8}}>GranaTech Inbox</h2>
                <p style={{fontSize:13}}>Selecione uma conversa para começar</p>
              </div>
            ) : (
              <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
                {/* Chat header */}
                <div style={{padding:'10px 16px',background:'#fff',borderBottom:`1px solid ${C.border}`,display:'flex',alignItems:'center',gap:10,flexShrink:0}}>
                  <div style={{width:36,height:36,borderRadius:'50%',background:C.accent,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:700,fontSize:14}}>
                    {(selContact?.name||selected).charAt(0).toUpperCase()}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700,fontSize:14,color:C.text}}>{selContact?.name||selected}</div>
                    <div style={{fontSize:11,color:C.text3}}>+{selected}</div>
                  </div>
                  <div style={{display:'flex',gap:6}}>
                    <button style={{background:'#f8fafc',border:`1px solid ${C.border}`,borderRadius:7,padding:'5px 10px',fontSize:10,fontWeight:600,color:C.text2,cursor:'pointer'}}>Template</button>
                    <button style={{background:'#f0fdf4',border:`1px solid #bbf7d0`,borderRadius:7,padding:'5px 10px',fontSize:10,fontWeight:600,color:C.green,cursor:'pointer'}}>✓ Resolver</button>
                  </div>
                </div>
                {/* Messages */}
                <div style={{flex:1,overflowY:'auto',padding:'12px 16px',background:'#f8fafc'}}>
                  {messages.map(msg=>{
                    const isOut = msg.direction==='outbound';
                    return (
                      <div key={msg.id} style={{display:'flex',justifyContent:isOut?'flex-end':'flex-start',marginBottom:4}}>
                        <div style={{maxWidth:'65%',padding:'8px 12px',borderRadius:isOut?'12px 2px 12px 12px':'2px 12px 12px 12px',background:isOut?'#dbeafe':'#fff',boxShadow:'0 1px 3px rgba(0,0,0,.08)'}}>
                          <p style={{fontSize:13,color:C.text,lineHeight:1.5,margin:0}}>{msg.body}</p>
                          <div style={{display:'flex',justifyContent:'flex-end',alignItems:'center',gap:3,marginTop:3}}>
                            <span style={{fontSize:10,color:C.text3}}>{fmt(msg.timestamp)}</span>
                            {isOut && <span style={{fontSize:10,color:msg.status==='read'?C.sky:C.text3}}>{msg.status==='read'||msg.status==='delivered'?'✓✓':'✓'}</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={bottomRef}/>
                </div>
                {/* Input */}
                <div style={{padding:'10px 12px',background:'#fff',borderTop:`1px solid ${C.border}`,display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
                  <div style={{flex:1,background:'#f8fafc',border:`1px solid ${C.border}`,borderRadius:22,padding:'8px 14px',display:'flex',alignItems:'center'}}>
                    <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&handleSend()} placeholder="Digite uma mensagem..." style={{flex:1,border:'none',outline:'none',fontSize:13,color:C.text,background:'transparent'}}/>
                  </div>
                  <button onClick={handleSend} disabled={sending||!input.trim()} style={{width:40,height:40,borderRadius:'50%',background:input.trim()&&!sending?C.accent:'#cbd5e1',border:'none',cursor:input.trim()&&!sending?'pointer':'default',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:16,transition:'background .2s'}}>
                    {sending?'…':'➤'}
                  </button>
                </div>
              </div>
            )}

            {/* Lead panel */}
            {selected && (
              <div style={{width:190,background:'#fff',borderLeft:`1px solid ${C.border}`,overflowY:'auto',flexShrink:0}}>
                <div style={{padding:'8px 12px',borderBottom:`1px solid ${C.border}`,fontSize:9,fontWeight:700,color:C.text3,textTransform:'uppercase',letterSpacing:.8}}>Painel do Lead</div>
                {[['Nome',selContact?.name||selected],['Telefone',`+${selected}`],['Status','Em atendimento'],['Janela 24h','Ativa']].map(([l,v])=>(
                  <div key={String(l)} style={{padding:'7px 12px',borderBottom:`1px solid #f8fafc`}}>
                    <div style={{fontSize:9,color:C.text3,fontWeight:700,textTransform:'uppercase',letterSpacing:.3}}>{l}</div>
                    <div style={{fontSize:11,color:C.text,marginTop:2}}>{v}</div>
                  </div>
                ))}
                <div style={{padding:'8px 12px',borderBottom:`1px solid ${C.border}`,fontSize:9,fontWeight:700,color:C.text3,textTransform:'uppercase',letterSpacing:.8,marginTop:4}}>Ações Rápidas</div>
                {['Mover de Fila','Alterar Etiqueta','Atribuir Agente'].map(a=>(
                  <button key={a} style={{width:'100%',background:'#f8fafc',border:'none',borderBottom:`1px solid ${C.border}`,padding:'8px 12px',fontSize:10,color:C.text2,cursor:'pointer',textAlign:'left'}}>{a}</button>
                ))}
                <button style={{width:'100%',background:'none',border:'none',borderBottom:`1px solid ${C.border}`,padding:'8px 12px',fontSize:10,color:C.green,cursor:'pointer',textAlign:'left',fontWeight:600}}>✓ Marcar Resolvido</button>
              </div>
            )}
          </div>
        )}

        {/* ── LEADS ── */}
        {screen==='leads' && (
          <div style={{flex:1,overflowY:'auto',padding:16}}>
            <div style={{display:'flex',gap:8,marginBottom:12,alignItems:'center'}}>
              <div style={{background:'#f8fafc',border:`1px solid ${C.border}`,borderRadius:8,padding:'7px 12px',fontSize:12,color:C.text3,flex:1}}>🔍 Buscar por nome, CPF ou telefone...</div>
              <button style={{background:C.accent,color:'#fff',border:'none',borderRadius:8,padding:'8px 14px',fontSize:11,fontWeight:600,cursor:'pointer'}}>+ Novo Lead</button>
            </div>
            <div style={{background:'#fff',border:`1px solid ${C.border}`,borderRadius:10,overflow:'hidden'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                <thead>
                  <tr style={{background:'#f8fafc'}}>
                    {['Nome','CPF','Telefone','Fila','Status','Última Resposta','Ações'].map(h=>(
                      <th key={h} style={{padding:'10px 12px',textAlign:'left',fontSize:10,textTransform:'uppercase',letterSpacing:.5,color:C.text3,fontWeight:700,borderBottom:`1px solid ${C.border}`}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['João Carlos Silva','***.456.789-**','11 98765-4321','Biometria','Aberto','há 3 min'],
                    ['Maria Fernanda T.','***.123.456-**','21 97654-3210','Simulação','Pendente','há 1h'],
                    ['Roberto Alves M.','***.789.012-**','31 96543-2109','Dados Pessoais','Aberto','há 15 min'],
                    ['Ana Paula Costa','***.345.678-**','41 95432-1098','Formalização','Fechado','ontem'],
                    ['Carlos Eduardo S.','***.901.234-**','51 94321-0987','Dados Bancários','Aberto','há 30 min'],
                  ].map((r,i)=>(
                    <tr key={i} style={{borderBottom:`1px solid #f8fafc`}}>
                      <td style={{padding:'10px 12px',fontWeight:600,color:C.text}}>{r[0]}</td>
                      <td style={{padding:'10px 12px',color:C.text2,fontFamily:'monospace',fontSize:11}}>{r[1]}</td>
                      <td style={{padding:'10px 12px',color:C.text2}}>{r[2]}</td>
                      <td style={{padding:'10px 12px'}}><span style={{background:'#eff6ff',color:C.accent,borderRadius:4,padding:'2px 8px',fontSize:10,fontWeight:600}}>{r[3]}</span></td>
                      <td style={{padding:'10px 12px'}}><span style={{background:r[4]==='Aberto'?'#f0fdf4':r[4]==='Pendente'?'#fffbeb':'#f8fafc',color:r[4]==='Aberto'?C.green:r[4]==='Pendente'?C.amber:C.text3,borderRadius:4,padding:'2px 8px',fontSize:10,fontWeight:600}}>{r[4]}</span></td>
                      <td style={{padding:'10px 12px',color:C.text3,fontSize:11}}>{r[5]}</td>
                      <td style={{padding:'10px 12px'}}><button style={{background:'#eff6ff',border:'none',borderRadius:6,padding:'4px 8px',fontSize:10,color:C.accent,cursor:'pointer'}}>Ver</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── DISPAROS ── */}
        {screen==='dispatches' && (
          <div style={{flex:1,overflowY:'auto',padding:16}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <div style={{background:'#fff',border:`1px solid ${C.border}`,borderRadius:10,padding:16}}>
                <h3 style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:14}}>Novo Disparo</h3>
                {[['Lead','select',['Joao Carlos Silva – 11 98765-4321','Maria Fernanda – 21 97654-3210']],['Template','select',['Recuperacao_Biometria_v1','Followup_Simulacao_v2','Retomada_Geral_v1']]].map(([l,t,opts])=>(
                  <div key={String(l)} style={{marginBottom:12}}>
                    <label style={{display:'block',fontSize:10,color:C.text3,fontWeight:700,marginBottom:4,textTransform:'uppercase',letterSpacing:.5}}>{l}</label>
                    <select style={{width:'100%',background:'#f8fafc',border:`1px solid ${C.border}`,borderRadius:7,padding:'8px 10px',fontSize:12,color:C.text,outline:'none'}}>
                      <option value="">Selecione...</option>
                      {(opts as string[]).map(o=><option key={o}>{o}</option>)}
                    </select>
                  </div>
                ))}
                <button style={{width:'100%',background:C.accent,color:'#fff',border:'none',borderRadius:8,padding:'10px',fontSize:12,fontWeight:600,cursor:'pointer'}}>Enviar Agora</button>
              </div>
              <div style={{background:'#fff',border:`1px solid ${C.border}`,borderRadius:10,padding:16}}>
                <h3 style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:14}}>Histórico de Disparos</h3>
                {[
                  {tmpl:'Recuperacao_Biometria_v1',n:67,h:'hoje 14:10',ok:52},
                  {tmpl:'Followup_Simulacao_v2',n:312,h:'ontem 09:30',ok:118},
                  {tmpl:'Retomada_Geral_v1',n:98,h:'2 dias atrás',ok:31},
                ].map(d=>(
                  <div key={d.tmpl} style={{background:'#f8fafc',border:`1px solid ${C.border}`,borderRadius:8,padding:'10px 12px',marginBottom:8}}>
                    <div style={{fontSize:12,fontWeight:600,color:C.text}}>{d.tmpl}</div>
                    <div style={{display:'flex',gap:12,marginTop:4,fontSize:11,color:C.text3}}>
                      <span>📤 {d.n} enviados</span>
                      <span style={{color:C.green}}>✓ {d.ok} respostas</span>
                      <span style={{marginLeft:'auto'}}>{d.h}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── CONFIGURAÇÕES ── */}
        {screen==='settings' && (
          <div style={{flex:1,overflowY:'auto',padding:16}}>
            <div style={{maxWidth:600}}>
              <div style={{background:'#fff',border:`1px solid ${C.border}`,borderRadius:10,padding:18,marginBottom:12}}>
                <h3 style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:14}}>Meta WhatsApp Cloud API</h3>
                {[['META_ACCESS_TOKEN','Token de Acesso','password'],['META_PHONE_NUMBER_ID','Phone Number ID','text'],['META_WABA_ID','WABA ID','text'],['META_VERIFY_TOKEN','Verify Token','text'],['OPENAI_API_KEY','OpenAI API Key (opcional)','password']].map(([k,l,t])=>(
                  <div key={String(k)} style={{marginBottom:12}}>
                    <label style={{display:'block',fontSize:10,color:C.text3,fontWeight:700,marginBottom:4,textTransform:'uppercase',letterSpacing:.5}}>{l}</label>
                    <input type={String(t)} placeholder={`Configure em Vercel → Environment Variables`} style={{width:'100%',background:'#f8fafc',border:`1px solid ${C.border}`,borderRadius:7,padding:'8px 10px',fontSize:12,color:C.text,outline:'none',boxSizing:'border-box'}}/>
                  </div>
                ))}
                <p style={{fontSize:11,color:C.text3,marginBottom:12}}>Configure estas variáveis no painel do Vercel em <strong>Environment Variables</strong>.</p>
                <button style={{background:C.accent,color:'#fff',border:'none',borderRadius:8,padding:'8px 16px',fontSize:12,fontWeight:600,cursor:'pointer'}}>Salvar</button>
              </div>
              <div style={{background:'#fff',border:`1px solid ${C.border}`,borderRadius:10,padding:18}}>
                <h3 style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:14}}>Webhook</h3>
                <div style={{marginBottom:10}}>
                  <label style={{display:'block',fontSize:10,color:C.text3,fontWeight:700,marginBottom:4,textTransform:'uppercase',letterSpacing:.5}}>URL do Webhook</label>
                  <div style={{background:'#f8fafc',border:`1px solid ${C.border}`,borderRadius:7,padding:'8px 12px',fontSize:12,fontFamily:'monospace',color:C.accent}}>https://consignado-saas.vercel.app/api/webhook/meta</div>
                </div>
                <div style={{background:'#fffbeb',border:'1px solid #fde68a',borderRadius:8,padding:'10px 12px',fontSize:11,color:'#92400e',marginTop:8}}>
                  ⚠️ Registre esta URL no Meta for Developers → WhatsApp → Configuração → Webhook. Assine os eventos: <strong>messages</strong> e <strong>message_status_updates</strong>.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
