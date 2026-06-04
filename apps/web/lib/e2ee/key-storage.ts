import { get, set, del } from 'idb-keyval';
import { exportKeyToBase64, importKeyFromBase64, generateUserKeyPair } from './crypto-utils';

const PRIVATE_KEY_STORAGE_KEY = 'e2ee_private_key';
const PUBLIC_KEY_STORAGE_KEY = 'e2ee_public_key';

/** Lưu Private Key vào IndexedDB (chỉ trình duyệt này mới đọc được) */
export async function storePrivateKey(privateKey: CryptoKey): Promise<void> {
  const base64 = await exportKeyToBase64(privateKey);
  await set(PRIVATE_KEY_STORAGE_KEY, base64);
}

/** Lấy Private Key từ IndexedDB */
export async function getPrivateKey(): Promise<CryptoKey | null> {
  const base64 = await get<string>(PRIVATE_KEY_STORAGE_KEY);
  if (!base64) return null;
  return await importKeyFromBase64(base64, 'private');
}

/** Xóa Private Key (khi đăng xuất) */
export async function clearPrivateKey(): Promise<void> {
  await del(PRIVATE_KEY_STORAGE_KEY);
  await del(PUBLIC_KEY_STORAGE_KEY);
}

/** 
 * Khởi tạo khóa cho User:
 * Nếu đã có trong IndexedDB thì trả về.
 * Nếu chưa có thì tạo mới, lưu Private Key vào IDB và trả về cả cặp.
 * (Public Key sẽ được gửi lên Server sau đó).
 */
export async function initializeUserKeys(): Promise<{ publicKey: CryptoKey; privateKey: CryptoKey }> {
  const existingPrivateKeyBase64 = await get<string>(PRIVATE_KEY_STORAGE_KEY);
  const existingPublicKeyBase64 = await get<string>(PUBLIC_KEY_STORAGE_KEY);

  if (existingPrivateKeyBase64 && existingPublicKeyBase64) {
    const privateKey = await importKeyFromBase64(existingPrivateKeyBase64, 'private');
    const publicKey = await importKeyFromBase64(existingPublicKeyBase64, 'public');
    return { publicKey, privateKey };
  }

  // Nếu chưa có, tạo cặp khóa mới
  const keyPair = await generateUserKeyPair();
  
  // Lưu vào IndexedDB để dùng sau này
  const privateBase64 = await exportKeyToBase64(keyPair.privateKey);
  const publicBase64 = await exportKeyToBase64(keyPair.publicKey);
  
  await set(PRIVATE_KEY_STORAGE_KEY, privateBase64);
  await set(PUBLIC_KEY_STORAGE_KEY, publicBase64);

  return keyPair;
}

/** Cache AES keys in memory to avoid repeated RSA decryption per message */
const roomKeyCache = new Map<string, CryptoKey>();

export function getCachedRoomKey(roomId: string): CryptoKey | undefined {
  return roomKeyCache.get(roomId);
}

export function setCachedRoomKey(roomId: string, key: CryptoKey) {
  roomKeyCache.set(roomId, key);
}

export function clearRoomKeyCache() {
  roomKeyCache.clear();
}
