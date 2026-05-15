import axios from 'axios';
import { ElMessage } from 'element-plus';
import { getToken, getRefreshToken, setToken, clearTokens } from '@/utils/auth';
import { ErrorCode } from '@/api/errorCode';

const BASE_URL = import.meta.env.VITE_API_URL;
const HYBRID_ENABLED = import.meta.env.VITE_ENCRYPTION_HYBRID === 'true';

const ALGORITHM = 'AES-GCM';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

interface SessionCrypto {
  aesKey: CryptoKey;
  iv: Uint8Array;
}

let cachedPublicKey: JsonWebKey | null = null;
let sessionCrypto: SessionCrypto | null = null;
let sessionId: string = '';

function generateSessionId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

async function fetchPublicKey(): Promise<JsonWebKey> {
  if (cachedPublicKey) return cachedPublicKey;
  const res = await axios.get(`${BASE_URL}/common/public-key`);
  const pem = res.data?.data?.publicKey || res.data?.publicKey;
  if (!pem) throw new Error('未获取到服务器公钥');
  const der = pemToDer(pem);
  cachedPublicKey = (await crypto.subtle.importKey(
    'spki',
    der,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['encrypt']
  )) as JsonWebKey;
  return cachedPublicKey;
}

function pemToDer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN (PUBLIC|RSA PUBLIC) KEY-----/, '')
    .replace(/-----END (PUBLIC|RSA PUBLIC) KEY-----/, '')
    .replace(/\s/g, '');
  const binary = atob(b64);
  const buf = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) buf[i] = binary.charCodeAt(i);
  return buf.buffer;
}

async function generateAesKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: ALGORITHM, length: 256 }, true, ['encrypt', 'decrypt']);
}

function arrayBufferToBase64(buffer: ArrayBuffer | ArrayBufferLike): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i] || 0);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i) || 0;
  }
  return bytes.buffer as ArrayBuffer;
}

async function rsaEncrypt(plaintext: string, publicKey: JsonWebKey): Promise<string> {
  const encoded = new TextEncoder().encode(plaintext);
  const encrypted = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, publicKey as any, encoded);
  return arrayBufferToBase64(encrypted);
}

async function aesEncrypt(
  plaintext: string,
  key: CryptoKey,
  iv: Uint8Array
): Promise<{ ciphertext: string; authTag: string }> {
  const encoded = new TextEncoder().encode(plaintext);
  const encrypted = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv: iv as BufferSource },
    key,
    encoded
  );
  const full = new Uint8Array(encrypted);
  const ciphertext = full.slice(0, -AUTH_TAG_LENGTH);
  const authTag = full.slice(-AUTH_TAG_LENGTH);
  return {
    ciphertext: btoa(String.fromCharCode(...Array.from(ciphertext))),
    authTag: btoa(String.fromCharCode(...Array.from(authTag)))
  };
}

async function aesDecrypt(
  ciphertext: string,
  key: CryptoKey,
  iv: Uint8Array,
  authTag: string
): Promise<string> {
  const ctBytes = new Uint8Array(base64ToArrayBuffer(ciphertext));
  const tagBytes = new Uint8Array(base64ToArrayBuffer(authTag));
  const combined = new Uint8Array(ctBytes.length + tagBytes.length);
  combined.set(ctBytes, 0);
  combined.set(tagBytes, ctBytes.length);
  const decrypted = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv: iv as BufferSource },
    key,
    combined.buffer as ArrayBuffer
  );
  return new TextDecoder().decode(decrypted);
}

async function ensureSession(): Promise<void> {
  if (sessionCrypto) return;
  sessionId = generateSessionId();
  const publicKey = await fetchPublicKey();
  const aesKey = await generateAesKey();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  const exportedAes = await crypto.subtle.exportKey('raw', aesKey);
  const aesKeyBase64 = arrayBufferToBase64(exportedAes);
  const ivBase64 = arrayBufferToBase64(iv.buffer);

  const encrypted = await rsaEncrypt(
    JSON.stringify({ key: aesKeyBase64, iv: ivBase64 }),
    publicKey
  );

  sessionStorage.setItem('rsaEncryptedAes', encrypted);
  sessionCrypto = { aesKey, iv };
}

const service = axios.create({
  baseURL: BASE_URL,
  timeout: 5000
});

service.interceptors.request.use(
  async (config) => {
    if (config.url?.startsWith('/mock')) {
      config.baseURL = '';
    }

    const token = getToken();
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    if (HYBRID_ENABLED) {
      await ensureSession();
      config.headers['x-session-id'] = sessionId;

      if (config.method !== 'get' && config.method !== 'head') {
        const data = config.data || config.params;
        if (data && Object.keys(data).length > 0) {
          const encryptedAes = sessionStorage.getItem('rsaEncryptedAes');
          if (!encryptedAes) {
            return config;
          }
          const { ciphertext, authTag } = await aesEncrypt(
            JSON.stringify(data),
            sessionCrypto!.aesKey,
            sessionCrypto!.iv
          );
          config.data = {
            _encrypted: true,
            key: encryptedAes,
            data: ciphertext,
            iv: arrayBufferToBase64(sessionCrypto!.iv.buffer as ArrayBuffer),
            authTag
          };
          delete config.params;
        }
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

let isRefreshing = false;
let requests: any[] = [];

service.interceptors.response.use(
  async (response) => {
    let res = response.data;

    if (HYBRID_ENABLED && res._encrypted && res.data && res.iv && res.authTag) {
      if (!sessionCrypto) {
        ElMessage.error('加密会话已失效，请刷新页面');
        return Promise.reject(new Error('加密会话已失效'));
      }
      try {
        const decrypted = await aesDecrypt(
          res.data,
          sessionCrypto.aesKey,
          new Uint8Array(base64ToArrayBuffer(res.iv)),
          res.authTag
        );
        res = JSON.parse(decrypted);
      } catch (e) {
        console.error('[Encryption] Decrypt response error:', e);
        ElMessage.error('数据解密失败');
        return Promise.reject(new Error('数据解密失败'));
      }
    }

    if (res.status !== 200) {
      ElMessage.error(res.msg || 'Error');
      return Promise.reject(new Error(res.msg || 'Error'));
    } else {
      if (res.code !== undefined && res.code !== ErrorCode.SUCCESS) {
        if (res.code === ErrorCode.TOKEN_EXPIRED || res.code === ErrorCode.INVALID_TOKEN) {
        }
        ElMessage.error(res.msg || 'Error');
        return Promise.reject(new Error(res.msg || 'Error'));
      }
      return res.data;
    }
  },
  async (error) => {
    console.error('err' + error);
    const originalRequest = error.config;

    if (error.response && error.response.status === 503) {
      const res = error.response.data;
      const isMaintenancePage = window.location.hash.includes('/maintenance');
      // Fix: when backend returns 503 using raw res.status(503).json(...), the structure is exactly the JSON we sent.
      // So res.msg is available. If it's missing, fallback to a default string to trigger the condition.
      const msg = res?.msg || '系统维护中';
      console.log('[Request] 503 received, msg:', msg, 'isMaintenancePage:', isMaintenancePage);
      if (msg.includes('维护') && !isMaintenancePage) {
        sessionStorage.setItem('maintenanceMessage', msg);
        ElMessage.warning(msg);
        console.log('[Request] Redirecting to maintenance page');
        window.location.href = window.location.origin + window.location.pathname + '#/maintenance';
      }
      return Promise.reject(error);
    }

    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      const refreshToken = getRefreshToken();
      if (refreshToken) {
        if (!isRefreshing) {
          isRefreshing = true;
          originalRequest._retry = true;
          try {
            const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
            if (data.status === 200) {
              const { accessToken } = data.data;
              setToken(accessToken);
              service.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
              requests.forEach((cb) => cb(accessToken));
              requests = [];
              return service(originalRequest);
            } else {
              throw new Error('Refresh failed');
            }
          } catch (refreshError) {
            clearTokens();
            window.location.href = '/#/login';
            return Promise.reject(refreshError);
          } finally {
            isRefreshing = false;
          }
        } else {
          return new Promise((resolve) => {
            requests.push((token: string) => {
              originalRequest.headers['Authorization'] = `Bearer ${token}`;
              resolve(service(originalRequest));
            });
          });
        }
      } else {
        ElMessage.error('登录过期，请重新登录');
        clearTokens();
        window.location.href = '/#/login';
      }
    } else {
      ElMessage.error(error.message);
    }
    return Promise.reject(error);
  }
);

export default service;
