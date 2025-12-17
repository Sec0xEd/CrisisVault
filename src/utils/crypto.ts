const CRYPTO_CONFIG = Object.freeze({
    ALGORITHM: 'AES-GCM',
    KEY_LENGTH: 256,
    IV_LENGTH: 12,
    SALT_LENGTH: 16,
    TAG_LENGTH: 128,
    KDF_ALGORITHM: 'PBKDF2',
    HASH_ALGORITHM: 'SHA-256',
    ITERATIONS: 600000,
} as const);

type CryptoConfig = typeof CRYPTO_CONFIG;

async function importPasswordKey(passphrase: string): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = encoder.encode(passphrase);
    return crypto.subtle.importKey(
        'raw',
        keyMaterial,
        CRYPTO_CONFIG.KDF_ALGORITHM,
        false,
        ['deriveKey']
    );
}

export async function deriveKey(passphrase: string, saltHex: string): Promise<CryptoKey> {
    const passwordKey = await importPasswordKey(passphrase);
    const salt = hexToBuffer(saltHex);

    return crypto.subtle.deriveKey(
        {
            name: CRYPTO_CONFIG.KDF_ALGORITHM,
            salt,
            iterations: CRYPTO_CONFIG.ITERATIONS,
            hash: CRYPTO_CONFIG.HASH_ALGORITHM,
        },
        passwordKey,
        {
            name: CRYPTO_CONFIG.ALGORITHM,
            length: CRYPTO_CONFIG.KEY_LENGTH,
        },
        false,
        ['decrypt', 'encrypt']
    );
}

export async function deriveHmacKey(passphrase: string, saltHex: string): Promise<CryptoKey> {
    const passwordKey = await importPasswordKey(passphrase);
    const salt = hexToBuffer(saltHex);
    const hmacSalt = new Uint8Array(salt.length);
    for (let i = 0; i < salt.length; i++) {
        hmacSalt[i] = salt[i] ^ 0x5c;
    }

    return crypto.subtle.deriveKey(
        {
            name: CRYPTO_CONFIG.KDF_ALGORITHM,
            salt: hmacSalt,
            iterations: CRYPTO_CONFIG.ITERATIONS,
            hash: CRYPTO_CONFIG.HASH_ALGORITHM,
        },
        passwordKey,
        {
            name: 'HMAC',
            hash: CRYPTO_CONFIG.HASH_ALGORITHM,
            length: CRYPTO_CONFIG.KEY_LENGTH,
        },
        false,
        ['sign', 'verify']
    );
}

export async function verifyHmac(
    hmacKey: CryptoKey,
    data: string,
    expectedHmacHex: string
): Promise<boolean> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const expectedHmac = hexToBuffer(expectedHmacHex);

    const signature = await crypto.subtle.sign('HMAC', hmacKey, dataBuffer);
    const signatureArray = new Uint8Array(signature);

    if (signatureArray.length !== expectedHmac.length) {
        return false;
    }

    let result = 0;
    for (let i = 0; i < signatureArray.length; i++) {
        result |= signatureArray[i] ^ expectedHmac[i];
    }
    return result === 0;
}

export async function decryptData(
    key: CryptoKey,
    ivHex: string,
    encryptedBase64: string
): Promise<string> {
    const iv = hexToBuffer(ivHex);
    const encryptedData = base64ToBuffer(encryptedBase64);

    const decryptedBuffer = await crypto.subtle.decrypt(
        {
            name: CRYPTO_CONFIG.ALGORITHM,
            iv,
            tagLength: CRYPTO_CONFIG.TAG_LENGTH,
        },
        key,
        encryptedData
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
}

function hexToBuffer(hex: string): Uint8Array {
    if (!/^[0-9a-fA-F]*$/.test(hex) || hex.length % 2 !== 0) {
        throw new Error('Invalid hex string');
    }
    const length = hex.length / 2;
    const buffer = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
        buffer[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
    }
    return buffer;
}

function base64ToBuffer(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const length = binaryString.length;
    const buffer = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
        buffer[i] = binaryString.charCodeAt(i);
    }
    return buffer;
}

export function secureWipeString(str: string): void {
    if (typeof str === 'string' && str.length > 0) {
        const arr = str.split('');
        for (let i = 0; i < arr.length; i++) {
            arr[i] = '\0';
        }
    }
}

export function secureWipeBuffer(buffer: Uint8Array): void {
    if (buffer && buffer.length > 0) {
        crypto.getRandomValues(buffer);
        buffer.fill(0);
    }
}

export { CRYPTO_CONFIG };
