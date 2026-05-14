import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 16;
const KEY_LENGTH = 32;
const PBKDF2_ITERATIONS = 100000;
const RSA_KEY_SIZE = 2048;

export function deriveKey(password: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha256');
}

export function encrypt(plaintext: string, password: string): string {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = deriveKey(password, salt);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH
  });

  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  const authTag = cipher.getAuthTag();

  const result = Buffer.concat([salt, iv, authTag, Buffer.from(encrypted, 'base64')]);
  return result.toString('base64');
}

export function decrypt(ciphertext: string, password: string): string {
  const buffer = Buffer.from(ciphertext, 'base64');

  const salt = buffer.subarray(0, SALT_LENGTH);
  const iv = buffer.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const authTag = buffer.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = buffer.subarray(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);

  const key = deriveKey(password, salt);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH
  });
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString('utf8');
}

export function encryptObject(obj: Record<string, any>, password: string): string {
  const json = JSON.stringify(obj);
  return encrypt(json, password);
}

export function decryptObject<T = any>(ciphertext: string, password: string): T {
  const json = decrypt(ciphertext, password);
  return JSON.parse(json) as T;
}

export function generateRandomKey(length: number = 32): string {
  return crypto.randomBytes(length).toString('base64');
}

export function generateRsaKeyPair(): { publicKey: string; privateKey: string } {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: RSA_KEY_SIZE,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  return { publicKey, privateKey };
}

export function rsaEncrypt(plaintext: string, publicKey: string): string {
  const buffer = Buffer.from(plaintext, 'utf8');
  const encrypted = crypto.publicEncrypt(
    { key: publicKey, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' },
    buffer
  );
  return encrypted.toString('base64');
}

export function rsaDecrypt(ciphertext: string, privateKey: string): string {
  const buffer = Buffer.from(ciphertext, 'base64');
  const decrypted = crypto.privateDecrypt(
    { key: privateKey, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' },
    buffer
  );
  return decrypted.toString('utf8');
}

export function encryptAes(plaintext: string, aesKey: Buffer, iv: Buffer): { ciphertext: string; authTag: Buffer } {
  const cipher = crypto.createCipheriv(ALGORITHM, aesKey, iv, {
    authTagLength: AUTH_TAG_LENGTH
  });
  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  return { ciphertext: encrypted, authTag: cipher.getAuthTag() };
}

export function decryptAes(ciphertext: string, aesKey: Buffer, iv: Buffer, authTag: Buffer): string {
  const decipher = crypto.createDecipheriv(ALGORITHM, aesKey, iv, {
    authTagLength: AUTH_TAG_LENGTH
  });
  decipher.setAuthTag(authTag);
  const encryptedBuffer = Buffer.from(ciphertext, 'base64');
  let decrypted = decipher.update(encryptedBuffer);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString('utf8');
}

let cachedKeys: { publicKey: string; privateKey: string } | null = null;

export function loadOrCreateRsaKeys(keysDir: string): { publicKey: string; privateKey: string } {
  if (cachedKeys) {
    return cachedKeys;
  }
  const publicKeyPath = path.join(keysDir, 'public.pem');
  const privateKeyPath = path.join(keysDir, 'private.pem');

  if (fs.existsSync(publicKeyPath) && fs.existsSync(privateKeyPath)) {
    cachedKeys = {
      publicKey: fs.readFileSync(publicKeyPath, 'utf8'),
      privateKey: fs.readFileSync(privateKeyPath, 'utf8')
    };
    return cachedKeys;
  }

  fs.mkdirSync(keysDir, { recursive: true });
  const { publicKey, privateKey } = generateRsaKeyPair();
  fs.writeFileSync(publicKeyPath, publicKey);
  fs.writeFileSync(privateKeyPath, privateKey);
  cachedKeys = { publicKey, privateKey };
  console.log('[Crypto] RSA key pair generated and saved.');
  return cachedKeys;
}

export function getPublicKey(): string {
  const keysDir = path.resolve(process.cwd(), 'keys');
  return loadOrCreateRsaKeys(keysDir).publicKey;
}

export function getPrivateKey(): string {
  const keysDir = path.resolve(process.cwd(), 'keys');
  return loadOrCreateRsaKeys(keysDir).privateKey;
}

interface SessionAesKeys {
  aesKey: string;
  iv: string;
}

const sessionAesKeys: Map<string, SessionAesKeys> = new Map();

export function setSessionAesKey(sessionId: string, aesKey: string, iv: string): void {
  sessionAesKeys.set(sessionId, { aesKey, iv });
}

export function getSessionAesKey(sessionId: string): SessionAesKeys | undefined {
  return sessionAesKeys.get(sessionId);
}

export function clearSessionAesKey(sessionId: string): void {
  sessionAesKeys.delete(sessionId);
}

export function buildHybridEncryptedPayload(body: any, sessionId: string): { ciphertext: string; authTag: string; iv: string } | null {
  const session = getSessionAesKey(sessionId);
  if (!session) {
    return null;
  }
  const aesKeyBuffer = Buffer.from(session.aesKey, 'base64');
  const ivBuffer = Buffer.from(session.iv, 'base64');
  const plaintext = JSON.stringify(body);
  const { ciphertext, authTag } = encryptAes(plaintext, aesKeyBuffer, ivBuffer);
  return {
    ciphertext,
    authTag: authTag.toString('base64'),
    iv: session.iv
  };
}

export function parseHybridEncryptedRequest(body: any, sessionId: string): any {
  if (!body || !body._encrypted || !body.key || !body.data || !body.iv || !body.authTag) {
    return null;
  }

  let aesKey: string;
  let iv: string;

  const privateKey = getPrivateKey();
  const decrypted = rsaDecrypt(body.key, privateKey);
  const parsed = JSON.parse(decrypted);
  aesKey = parsed.key;
  iv = parsed.iv;
  setSessionAesKey(sessionId, aesKey, iv);

  const aesKeyBuffer = Buffer.from(aesKey, 'base64');
  const ivBuffer = Buffer.from(iv, 'base64');
  const authTagBuffer = Buffer.from(body.authTag, 'base64');
  const decryptedData = decryptAes(body.data, aesKeyBuffer, ivBuffer, authTagBuffer);
  return JSON.parse(decryptedData);
}

export function encryptHybridResponse(body: any, sessionId: string): { data: string; iv: string; authTag: string } | null {
  const session = getSessionAesKey(sessionId);
  if (!session) {
    return null;
  }
  const aesKeyBuffer = Buffer.from(session.aesKey, 'base64');
  const ivBuffer = Buffer.from(session.iv, 'base64');
  const plaintext = JSON.stringify(body);
  const { ciphertext, authTag } = encryptAes(plaintext, aesKeyBuffer, ivBuffer);
  return {
    data: ciphertext,
    authTag: authTag.toString('base64'),
    iv: session.iv
  };
}
