'use client';

import { useState, useEffect, useRef } from 'react';
import { sendMessageAction } from '@/app/actions';

interface Message {
  id: string;
  from: string;
  to: string;
  body: string;
  timestamp: number;
  direction: 'inbound' | 'outbound';
  status: string;
  contactName?: string;
}

interface Contact {
  phone: string;
  name: string;
  lastMessage: Message | null;
  unreadCount: number;
}

export default function InboxPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetch_ = () =>
      fetch('/api/messages').then(r => r.json()).then(d => setContacts(d.contacts || []));
    fetch_();
    const id = setInterval(fetch_, 3000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!selected) return;
    const fetch_ = () =>
      fetch(`/api/messages?phone=${selected}`).then(r => r.json()).then(d => setMessages(d.messages || []));
    fetch_();
    const id = setInterval(fetch_, 2000);
    return () => clearInterval(id);
  }, [selected]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !selected || sending) return;
    setSending(true);
    const text = input.trim();
    setInput('');
    try {
      await sendMessageAction(selected, text);
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  const selectedContact = contacts.find(c => c.phone === selected);

  const fmt = (ts: number) =>
    new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const S: Record<string, React.CSSProperties> = {
    root: { display: 'flex', height: '100vh', background: '#f0f2f5' },
    sidebar: { width: 360, background: '#fff', borderRight: '1px solid #e9edef', display: 'flex', flexDirection: 'column', flexShrink: 0 },
    sideHeader: { background: '#00a884', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    searchBox: { padding: '8px 10px', background: '#f0f2f5' },
    searchInner: { background: '#fff', borderRadius: 8, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8 },
    contactList: { flex: 1, overflowY: 'auto' as const },
    emptyState: { padding: 32, textAlign: 'center' as const, color: '#8696a0' },
    chatWrap: { flex: 1, display: 'flex', flexDirection: 'column' },
    chatHeader: { background: '#f0f2f5', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid #e9edef' },
    messages: { flex: 1, overflowY: 'auto' as const, padding: '12px 8%', background: '#efeae2' },
    inputRow: { background: '#f0f2f5', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 },
    inputWrap: { flex: 1, background: '#fff', borderRadius: 24, padding: '10px 16px', display: 'flex', alignItems: 'center' },
    input: { flex: 1, border: 'none', outline: 'none', fontSize: 15, color: '#111b21', background: 'transparent' },
    noConvo: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f0f2f5', color: '#8696a0' },
  };

  return (
    <div style={S.root}>
      <div style={S.sidebar}>
        <div style={S.sideHeader}>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 17 }}>GranaTech Inbox</span>
          <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11 }}>CLT Consignado</span>
        </div>
        <div style={S.searchBox}>
          <div style={S.searchInner}>
            <span style={{ color: '#8696a0', fontSize: 13 }}>🔍 Buscar conversa</span>
          </div>
        </div>
        <div style={S.contactList}>
          {contacts.length === 0 ? (
            <div style={S.emptyState}>
              <div style={{ fontSize: 52, marginBottom: 12 }}>💬</div>
              <p style={{ fontSize: 14, fontWeight: 500 }}>Aguardando mensagens…</p>
              <p style={{ fontSize: 12, marginTop: 6, lineHeight: 1.5 }}>
                Configure as credenciais Meta no Vercel<br />para começar a receber mensagens
              </p>
            </div>
          ) : contacts.map(c => (
            <div
              key={c.phone}
              onClick={() => setSelected(c.phone)}
              style={{
                display: 'flex', alignItems: 'center', padding: '12px 16px', cursor: 'pointer',
                background: selected === c.phone ? '#f0f2f5' : '#fff',
                borderBottom: '1px solid #f0f2f5',
              }}
            >
              <div style={{
                width: 48, height: 48, borderRadius: '50%', background: '#00a884',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 700, fontSize: 19, flexShrink: 0,
              }}>
                {(c.name || c.phone).charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, marginLeft: 12, overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, fontSize: 15, color: '#111b21' }}>{c.name || c.phone}</span>
                  {c.lastMessage && <span style={{ fontSize: 11, color: '#8696a0' }}>{fmt(c.lastMessage.timestamp)}</span>}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                  <span style={{ fontSize: 13, color: '#8696a0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 210 }}>
                    {c.lastMessage?.direction === 'outbound' && <span style={{ color: '#53bdeb' }}>✓ </span>}
                    {c.lastMessage?.body || ''}
                  </span>
                  {c.unreadCount > 0 && (
                    <span style={{ background: '#25d366', color: '#fff', borderRadius: 12, fontSize: 11, fontWeight: 700, padding: '2px 7px' }}>
                      {c.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {!selected ? (
        <div style={S.noConvo}>
          <div style={{ fontSize: 64, marginBottom: 20 }}>💬</div>
          <h2 style={{ fontSize: 20, fontWeight: 500, color: '#41525d', marginBottom: 8 }}>GranaTech Inbox</h2>
          <p style={{ fontSize: 14 }}>Selecione uma conversa para começar</p>
        </div>
      ) : (
        <div style={S.chatWrap}>
          <div style={S.chatHeader}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%', background: '#00a884',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 700, fontSize: 16,
            }}>
              {(selectedContact?.name || selected).charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15, color: '#111b21' }}>
                {selectedContact?.name || selected}
              </div>
              <div style={{ fontSize: 12, color: '#8696a0' }}>+{selected}</div>
            </div>
          </div>
          <div style={S.messages}>
            {messages.map(msg => {
              const isOut = msg.direction === 'outbound';
              return (
                <div key={msg.id} style={{ display: 'flex', justifyContent: isOut ? 'flex-end' : 'flex-start', marginBottom: 3 }}>
                  <div style={{
                    maxWidth: '65%', padding: '7px 12px 8px',
                    borderRadius: isOut ? '8px 0 8px 8px' : '0 8px 8px 8px',
                    background: isOut ? '#d9fdd3' : '#fff',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                  }}>
                    <p style={{ fontSize: 14, color: '#111b21', lineHeight: 1.5, margin: 0 }}>{msg.body}</p>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 4, marginTop: 2 }}>
                      <span style={{ fontSize: 11, color: '#8696a0' }}>{fmt(msg.timestamp)}</span>
                      {isOut && (
                        <span style={{ fontSize: 11, color: msg.status === 'read' ? '#53bdeb' : '#8696a0' }}>
                          {msg.status === 'read' || msg.status === 'delivered' ? '✓✓' : '✓'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
          <div style={S.inputRow}>
            <div style={S.inputWrap}>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder="Digite uma mensagem"
                style={S.input}
              />
            </div>
            <button
              onClick={handleSend}
              disabled={sending || !input.trim()}
              style={{
                width: 44, height: 44, borderRadius: '50%',
                background: input.trim() && !sending ? '#00a884' : '#b2c5be',
                border: 'none', cursor: input.trim() && !sending ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, color: '#fff', transition: 'background 0.2s',
              }}
            >
              {sending ? '…' : '➤'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
             }
