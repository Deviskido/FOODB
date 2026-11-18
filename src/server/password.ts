import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
const prefix = '$foodb$scrypt$';
const derive = (password: string, salt: string) => new Promise<Buffer>((resolve, reject) => scrypt(password, salt, 64, {
  N: 16384,
  r: 8,
  p: 1
}, (error, key) => error ? reject(error) : resolve(key)));
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const key = await derive(password, salt);
  return prefix + salt + '$' + key.toString('hex');
}
export async function verifyPassword(password: string, stored: string) {
  if (!stored.startsWith(prefix)) return typeof Bun !== 'undefined' ? Bun.password.verify(password, stored) : false;
  const [salt, digest] = stored.slice(prefix.length).split('$');
  if (!/^[a-f0-9]{32}$/.test(salt ?? '') || !/^[a-f0-9]{128}$/.test(digest ?? '')) return false;
  return timingSafeEqual(await derive(password, salt), Buffer.from(digest, 'hex'));
}
