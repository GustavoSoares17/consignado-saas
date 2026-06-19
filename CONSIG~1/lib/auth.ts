import { dbGet, dbSet } from './db';
import crypto from 'crypto';

export type Role = 'admin' | 'partner';

export interface User {
  id: string;
  username: string; // normalizado (lowercase)
  salt: string;
  hash: string;
  role: Role;
  queueId?: string; // obrigatório quando role==='partner'
  createdAt: number;
}

export interface PublicUser {
  id: string;
  username: string;
  role: Role;
  queueId?: string;
  createdAt: number;
}

const USERS_KEY = 'gt:users';
const SECRET = process.env.AUTH_SECRET || 'granatech-dev-secret-change-me';
export const SESSION_COOKIE = 'gt_session';

export function toPublic(u: User): PublicUser {
  return { id: u.id, username: u.username, role: u.role, queueId: u.queueId, createdAt: u.createdAt };
}

export async function getUsers(): Promise<User[]> {
  return (await dbGet<User[]>(USERS_KEY)) || [];
}

async function saveUsers(users: User[]): Promise<void> {
  await dbSet(USERS_KEY, users);
}

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

export function verifyPassword(password: string, user: User): boolean {
  const candidate = hashPassword(password, user.salt);
  return crypto.timingSafeEqual(Buffer.from(candidate, 'hex'), Buffer.from(user.hash, 'hex'));
}

export async function createUser(input: { username: string; password: string; role: Role; queueId?: string }): Promise<User> {
  const users = await getUsers();
  const username = input.username.trim().toLowerCase();
  if (!username || !input.password) throw new Error('Usuário e senha são obrigatórios.');
  if (users.find((u) => u.username === username)) throw new Error('Já existe um usuário com esse nome.');
  const salt = crypto.randomBytes(16).toString('hex');
  const user: User = {
    id: `u_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    username,
    salt,
    hash: hashPassword(input.password, salt),
    role: input.role,
    queueId: input.role === 'partner' ? input.queueId : undefined,
    createdAt: Date.now(),
  };
  users.push(user);
  await saveUsers(users);
  return user;
}

export async function deleteUser(id: string): Promise<void> {
  const users = await getUsers();
  const target = users.find((u) => u.id === id);
  if (!target) return;
  const remainingAdmins = users.filter((u) => u.role === 'admin' && u.id !== id);
  if (target.role === 'admin' && remainingAdmins.length === 0) {
    throw new Error('Não é possível remover o último usuário admin.');
  }
  await saveUsers(users.filter((u) => u.id !== id));
}

export async function setPassword(id: string, password: string): Promise<void> {
  const users = await getUsers();
  const user = users.find((u) => u.id === id);
  if (!user) throw new Error('Usuário não encontrado.');
  const salt = crypto.randomBytes(16).toString('hex');
  user.salt = salt;
  user.hash = hashPassword(password, salt);
  await saveUsers(users);
}

export async function findByUsername(username: string): Promise<User | null> {
  const users = await getUsers();
  return users.find((u) => u.username === username.trim().toLowerCase()) || null;
}

// ─── Sessão (cookie assinado, sem dependências externas) ────────────────────
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 dias

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url');
}

export function signSession(user: User): string {
  const payload = base64url(JSON.stringify({ id: user.id, username: user.username, role: user.role, queueId: user.queueId, exp: Date.now() + SESSION_MAX_AGE * 1000 }));
  const sig = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export interface SessionData {
  id: string;
  username: string;
  role: Role;
  queueId?: string;
  exp: number;
}

export function verifySession(token: string | undefined | null): SessionData | null {
  if (!token) return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const expected = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8')) as SessionData;
    if (!data.exp || data.exp < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

export const SESSION_MAX_AGE_SECONDS = SESSION_MAX_AGE;

// Helper para uso dentro de Route Handlers / Server Actions (runtime Node.js).
export async function getSession(): Promise<SessionData | null> {
  const { cookies } = await import('next/headers');
  const token = cookies().get(SESSION_COOKIE)?.value;
  return verifySession(token);
}
