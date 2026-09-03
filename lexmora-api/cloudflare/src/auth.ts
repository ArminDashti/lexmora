import bcrypt from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'
import type { Env, UserRow } from './types'

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

function secretKey(env: Env) {
  return new TextEncoder().encode(env.JWT_SECRET)
}

export async function createToken(env: Env, user: Pick<UserRow, 'id' | 'username'>): Promise<string> {
  return new SignJWT({ user_id: user.id, username: user.username })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secretKey(env))
}

export type JwtClaims = {
  user_id: string
  username: string
}

export async function validateToken(env: Env, token: string): Promise<JwtClaims> {
  const { payload } = await jwtVerify(token, secretKey(env))
  const user_id = String(payload.user_id ?? '')
  const username = String(payload.username ?? '')
  if (!user_id || !username) throw new Error('invalid token')
  return { user_id, username }
}

export async function ensureDefaultUser(env: Env): Promise<void> {
  const count = await env.DB.prepare('SELECT COUNT(*) AS c FROM users').first<{ c: number }>()
  if ((count?.c ?? 0) > 0) return

  const username = env.DEFAULT_USERNAME || 'armin'
  const password = env.DEFAULT_PASSWORD || 'dopadopa123'
  const id = crypto.randomUUID()
  const password_hash = await hashPassword(password)
  await env.DB.prepare(
    'INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)',
  )
    .bind(id, username, password_hash)
    .run()
}
