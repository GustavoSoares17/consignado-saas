/**
 * Camada de persistência — Upstash Redis (via Vercel Marketplace ou conta direta).
 *
 * Aceita as duas convenções de nome de variável de ambiente:
 *  - UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN  (integração "Upstash for Redis")
 *  - KV_REST_API_URL / KV_REST_API_TOKEN                (nome legado do antigo Vercel KV)
 *
 * Se nenhuma estiver configurada, cai para um fallback em memória (não durável,
 * útil apenas para `next dev` local) para nunca quebrar o build.
 */
import { Redis } from '@upstash/redis';

const URL = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

export const hasRedis = Boolean(URL && TOKEN);

export const redis: Redis | null = hasRedis ? new Redis({ url: URL!, token: TOKEN! }) : null;

// ─── Fallback em memória (apenas dev local sem Redis configurado) ────────────
const mem = new Map<string, any>();

export async function dbGet<T>(key: string): Promise<T | null> {
  if (redis) return (await redis.get<T>(key)) ?? null;
  return mem.has(key) ? (mem.get(key) as T) : null;
}

export async function dbSet<T>(key: string, value: T): Promise<void> {
  if (redis) { await redis.set(key, value); return; }
  mem.set(key, value);
}

export async function dbPush(key: string, value: any, maxLen = 500): Promise<void> {
  if (redis) {
    await redis.rpush(key, JSON.stringify(value));
    await redis.ltrim(key, -maxLen, -1);
    return;
  }
  const arr: any[] = mem.get(key) || [];
  arr.push(value);
  if (arr.length > maxLen) arr.splice(0, arr.length - maxLen);
  mem.set(key, arr);
}

export async function dbList<T>(key: string): Promise<T[]> {
  if (redis) {
    const items = await redis.lrange<string>(key, 0, -1);
    return items.map((i) => (typeof i === 'string' ? JSON.parse(i) : i)) as T[];
  }
  return (mem.get(key) as T[]) || [];
}

export async function dbAddToSet(key: string, value: string): Promise<void> {
  if (redis) { await redis.sadd(key, value); return; }
  const s: Set<string> = mem.get(key) || new Set<string>();
  s.add(value);
  mem.set(key, s);
}

export async function dbSetMembers(key: string): Promise<string[]> {
  if (redis) return await redis.smembers(key);
  const s: Set<string> = mem.get(key) || new Set<string>();
  return Array.from(s);
}
