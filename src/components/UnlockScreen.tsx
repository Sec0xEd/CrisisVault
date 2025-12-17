import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../store/authStore';
import { globalRateLimiter } from '../utils/security';
import { Shield, Lock, AlertTriangle, Clock } from 'lucide-react';

export function UnlockScreen() {
    const [passphrase, setPassphrase] = useState('');
    const { unlock, isDecrypting, error, errorMessage, lockoutRemainingMs, updateLockoutTime } = useAuthStore();
    const [displayLockout, setDisplayLockout] = useState(0);

    useEffect(() => {
        if (lockoutRemainingMs > 0) {
            setDisplayLockout(lockoutRemainingMs);
            const interval = setInterval(() => {
                const remaining = globalRateLimiter.getRemainingLockoutMs();
                setDisplayLockout(remaining);
                if (remaining <= 0) {
                    clearInterval(interval);
                    updateLockoutTime();
                }
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [lockoutRemainingMs, updateLockoutTime]);

    const handleSubmit = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        if (!passphrase || isDecrypting || displayLockout > 0) return;

        const passphraseValue = passphrase;
        setPassphrase('');
        unlock(passphraseValue);
    }, [passphrase, isDecrypting, displayLockout, unlock]);

    const isLocked = displayLockout > 0;
    const lockoutSeconds = Math.ceil(displayLockout / 1000);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 px-4">
            <div className="w-full max-w-md space-y-8 animate-fade-in">
                <div className="text-center">
                    <div className="mx-auto h-20 w-20 bg-slate-800 rounded-full flex items-center justify-center mb-6 ring-4 ring-slate-800 ring-offset-4 ring-offset-slate-900">
                        <Shield className="h-10 w-10 text-blue-500" />
                    </div>
                    <h1 className="text-4xl font-extrabold text-white tracking-tight">
                        CrisisVault
                    </h1>
                    <p className="mt-2 text-slate-400">
                        Secure Out-of-Band Response
                    </p>
                </div>

                <div className="bg-slate-800/50 backdrop-blur-lg rounded-2xl p-8 shadow-xl border border-slate-700">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label htmlFor="passphrase" className="block text-sm font-medium text-slate-300">
                                Encryption Passphrase
                            </label>
                            <div className="mt-2 relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-slate-500" />
                                </div>
                                <input
                                    id="passphrase"
                                    name="passphrase"
                                    type="password"
                                    autoComplete="off"
                                    autoCorrect="off"
                                    autoCapitalize="off"
                                    spellCheck={false}
                                    required
                                    disabled={isDecrypting || isLocked}
                                    className="block w-full pl-10 pr-3 py-3 border border-slate-600 rounded-lg leading-5 bg-slate-900/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    placeholder="Enter vault password"
                                    value={passphrase}
                                    onChange={(e) => setPassphrase(e.target.value)}
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="rounded-md bg-red-900/30 p-4 border border-red-500/50 flex items-center">
                                <AlertTriangle className="h-5 w-5 text-red-500 mr-3 flex-shrink-0" />
                                <p className="text-sm text-red-200">{errorMessage}</p>
                            </div>
                        )}

                        {isLocked && (
                            <div className="rounded-md bg-amber-900/30 p-4 border border-amber-500/50 flex items-center">
                                <Clock className="h-5 w-5 text-amber-500 mr-3 flex-shrink-0" />
                                <p className="text-sm text-amber-200">
                                    Locked for {lockoutSeconds}s
                                </p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isDecrypting || isLocked || !passphrase}
                            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {isDecrypting ? 'Decrypting...' : isLocked ? `Wait ${lockoutSeconds}s` : 'Unlock Vault'}
                        </button>
                    </form>
                </div>

                <div className="text-center text-xs text-slate-600 font-mono">
                    AES-256-GCM / PBKDF2-600k / Zero-Knowledge
                </div>
            </div>
        </div>
    );
}
