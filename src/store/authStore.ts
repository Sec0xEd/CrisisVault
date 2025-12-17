import { create } from 'zustand';
import { deriveKey, deriveHmacKey, decryptData, verifyHmac, secureWipeBuffer } from '../utils/crypto';
import { globalRateLimiter } from '../utils/security';
import vaultDataRaw from '../data/vault.json';

interface VaultFile {
    id: string;
    title: string;
    priority?: string;
    tags?: string[];
    iv: string;
    data: string;
}

interface VaultManifest {
    salt: string;
    hmac?: string;
    generatedAt: string;
    files: VaultFile[];
}

const vaultData = vaultDataRaw as VaultManifest;

export interface DecryptedFile {
    id: string;
    title: string;
    priority?: string;
    tags?: string[];
    content: string;
}

type AuthError =
    | 'INVALID_PASSPHRASE'
    | 'RATE_LIMITED'
    | 'INTEGRITY_FAILURE'
    | 'VAULT_EMPTY'
    | null;

interface AuthState {
    isUnlocked: boolean;
    masterKey: CryptoKey | null;
    decryptedFiles: DecryptedFile[];
    error: AuthError;
    errorMessage: string;
    isDecrypting: boolean;
    lockoutRemainingMs: number;

    unlock: (passphrase: string) => Promise<void>;
    wipe: () => void;
    updateLockoutTime: () => void;
}

function getErrorMessage(error: AuthError): string {
    switch (error) {
        case 'INVALID_PASSPHRASE':
            return 'Access denied';
        case 'RATE_LIMITED':
            return 'Too many attempts. Please wait.';
        case 'INTEGRITY_FAILURE':
            return 'Vault integrity check failed';
        case 'VAULT_EMPTY':
            return 'No vault data available';
        default:
            return '';
    }
}

async function verifyVaultIntegrity(passphrase: string): Promise<boolean> {
    if (!vaultData.hmac) {
        return true;
    }

    const hmacKey = await deriveHmacKey(passphrase, vaultData.salt);
    const dataToVerify = JSON.stringify(vaultData.files);
    return verifyHmac(hmacKey, dataToVerify, vaultData.hmac);
}

export const useAuthStore = create<AuthState>((set, get) => ({
    isUnlocked: false,
    masterKey: null,
    decryptedFiles: [],
    error: null,
    errorMessage: '',
    isDecrypting: false,
    lockoutRemainingMs: 0,

    updateLockoutTime: () => {
        set({ lockoutRemainingMs: globalRateLimiter.getRemainingLockoutMs() });
    },

    unlock: async (passphrase: string) => {
        if (globalRateLimiter.isLocked()) {
            set({
                error: 'RATE_LIMITED',
                errorMessage: getErrorMessage('RATE_LIMITED'),
                lockoutRemainingMs: globalRateLimiter.getRemainingLockoutMs()
            });
            return;
        }

        set({ isDecrypting: true, error: null, errorMessage: '' });

        try {
            const saltHex = vaultData.salt;
            if (!saltHex || !vaultData.files || vaultData.files.length === 0) {
                set({
                    error: 'VAULT_EMPTY',
                    errorMessage: getErrorMessage('VAULT_EMPTY'),
                    isDecrypting: false
                });
                return;
            }

            const integrityValid = await verifyVaultIntegrity(passphrase);
            if (!integrityValid) {
                globalRateLimiter.recordAttempt();
                set({
                    error: 'INTEGRITY_FAILURE',
                    errorMessage: getErrorMessage('INTEGRITY_FAILURE'),
                    isDecrypting: false,
                    lockoutRemainingMs: globalRateLimiter.getRemainingLockoutMs()
                });
                return;
            }

            const key = await deriveKey(passphrase, saltHex);
            const decrypted: DecryptedFile[] = [];

            for (const file of vaultData.files) {
                const content = await decryptData(key, file.iv, file.data);
                decrypted.push({
                    id: file.id,
                    title: file.title,
                    priority: file.priority,
                    tags: file.tags,
                    content
                });
            }

            globalRateLimiter.reset();

            set({
                isUnlocked: true,
                masterKey: key,
                decryptedFiles: decrypted,
                isDecrypting: false,
                error: null,
                errorMessage: ''
            });

        } catch {
            globalRateLimiter.recordAttempt();
            set({
                error: 'INVALID_PASSPHRASE',
                errorMessage: getErrorMessage('INVALID_PASSPHRASE'),
                isDecrypting: false,
                masterKey: null,
                lockoutRemainingMs: globalRateLimiter.getRemainingLockoutMs()
            });
        }
    },

    wipe: () => {
        const state = get();

        if (state.decryptedFiles.length > 0) {
            for (const file of state.decryptedFiles) {
                const contentBytes = new TextEncoder().encode(file.content);
                secureWipeBuffer(contentBytes);
                (file as { content: string }).content = '';
            }
        }

        set({
            isUnlocked: false,
            masterKey: null,
            decryptedFiles: [],
            error: null,
            errorMessage: '',
            isDecrypting: false
        });

        if (typeof window !== 'undefined' && window.gc) {
            try {
                window.gc();
            } catch {
                // GC not available
            }
        }
    }
}));

declare global {
    interface Window {
        gc?: () => void;
    }
}
