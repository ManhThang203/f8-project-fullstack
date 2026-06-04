// Utility cho Web Crypto API trong E2EE

/**
 * Tạo cặp khóa RSA-OAEP cho User (Public/Private Key)
 */
export async function generateUserKeyPair(): Promise<CryptoKeyPair> {
  return await window.crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]), // 65537
      hash: 'SHA-256',
    },
    true, // extractable (cần true để lưu Private Key vào IndexedDB)
    ['encrypt', 'decrypt'],
  );
}

/** Export key thành chuỗi base64 (SPKI cho public, PKCS8 cho private) */
export async function exportKeyToBase64(key: CryptoKey): Promise<string> {
  const exported = await window.crypto.subtle.exportKey(
    key.type === 'public' ? 'spki' : 'pkcs8',
    key,
  );
  const exportedAsString = String.fromCharCode.apply(null, Array.from(new Uint8Array(exported)));
  return btoa(exportedAsString);
}

/** Import key từ base64 */
export async function importKeyFromBase64(
  base64: string,
  type: 'public' | 'private',
): Promise<CryptoKey> {
  const binaryDerString = atob(base64);
  const binaryDer = new Uint8Array(binaryDerString.length);
  for (let i = 0; i < binaryDerString.length; i++) {
    binaryDer[i] = binaryDerString.charCodeAt(i);
  }

  return await window.crypto.subtle.importKey(
    type === 'public' ? 'spki' : 'pkcs8',
    binaryDer,
    {
      name: 'RSA-OAEP',
      hash: 'SHA-256',
    },
    true,
    type === 'public' ? ['encrypt'] : ['decrypt'],
  );
}

/**
 * Tạo khóa đối xứng AES-GCM cho một Room cụ thể
 */
export async function generateRoomAESKey(): Promise<CryptoKey> {
  return await window.crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    true, // extractable để bọc bằng RSA
    ['encrypt', 'decrypt'],
  );
}

/** Mã hóa khóa AES của Room bằng Public Key của User (để lưu lên Server) */
export async function encryptRoomKeyWithRSA(
  roomKey: CryptoKey,
  userPublicKey: CryptoKey,
): Promise<string> {
  // Export AES key ra raw bytes
  const rawAesKey = await window.crypto.subtle.exportKey('raw', roomKey);
  
  // Mã hóa bằng RSA
  const encrypted = await window.crypto.subtle.encrypt(
    { name: 'RSA-OAEP' },
    userPublicKey,
    rawAesKey,
  );

  return btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(encrypted))));
}

/** Giải mã khóa AES của Room bằng Private Key của User (lấy từ IndexedDB) */
export async function decryptRoomKeyWithRSA(
  encryptedRoomKeyBase64: string,
  userPrivateKey: CryptoKey,
): Promise<CryptoKey> {
  const encryptedBytes = Uint8Array.from(atob(encryptedRoomKeyBase64), (c) => c.charCodeAt(0));
  
  const rawAesKey = await window.crypto.subtle.decrypt(
    { name: 'RSA-OAEP' },
    userPrivateKey,
    encryptedBytes,
  );

  return await window.crypto.subtle.importKey(
    'raw',
    rawAesKey,
    { name: 'AES-GCM' },
    true,
    ['encrypt', 'decrypt'],
  );
}

/**
 * Mã hóa payload tin nhắn (đã serialize JSON) bằng khóa AES của Room
 * Định dạng: base64(iv) + ":" + base64(ciphertext)
 */
export async function encryptPayloadWithAES(
  payloadStr: string,
  roomKey: CryptoKey,
): Promise<string> {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encodedPayload = new TextEncoder().encode(payloadStr);

  const ciphertext = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    roomKey,
    encodedPayload,
  );

  const ivBase64 = btoa(String.fromCharCode.apply(null, Array.from(iv)));
  const cipherBase64 = btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(ciphertext))));

  return `${ivBase64}:${cipherBase64}`;
}

/** Giải mã payload tin nhắn bằng khóa AES của Room */
export async function decryptPayloadWithAES(
  encryptedString: string,
  roomKey: CryptoKey,
): Promise<string> {
  const [ivBase64, cipherBase64] = encryptedString.split(':');
  if (!ivBase64 || !cipherBase64) throw new Error('Định dạng mã hóa không hợp lệ');

  const iv = Uint8Array.from(atob(ivBase64), (c) => c.charCodeAt(0));
  const ciphertext = Uint8Array.from(atob(cipherBase64), (c) => c.charCodeAt(0));

  const decryptedBytes = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    roomKey,
    ciphertext,
  );

  return new TextDecoder().decode(decryptedBytes);
}

/** Mã hóa ArrayBuffer (dùng cho Media) */
export async function encryptBufferWithAES(
  buffer: ArrayBuffer,
  roomKey: CryptoKey,
): Promise<{ iv: string; ciphertext: ArrayBuffer }> {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    roomKey,
    buffer,
  );
  const ivBase64 = btoa(String.fromCharCode.apply(null, Array.from(iv)));
  return { iv: ivBase64, ciphertext };
}

/** Giải mã ArrayBuffer (dùng cho Media) */
export async function decryptBufferWithAES(
  ciphertext: ArrayBuffer,
  ivBase64: string,
  roomKey: CryptoKey,
): Promise<ArrayBuffer> {
  const iv = Uint8Array.from(atob(ivBase64), (c) => c.charCodeAt(0));
  return await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    roomKey,
    ciphertext,
  );
}
