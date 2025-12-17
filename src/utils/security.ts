const SECURITY_CONFIG = Object.freeze({
    MAX_UNLOCK_ATTEMPTS: 5,
    LOCKOUT_BASE_MS: 15000,
    LOCKOUT_MULTIPLIER: 2,
    MAX_LOCKOUT_MS: 300000,
    SESSION_TIMEOUT_MS: 15 * 60 * 1000,
    PANIC_KEY: 'L',
    PANIC_MODIFIERS: { ctrl: true, shift: true },
} as const);

interface RateLimitState {
    attempts: number;
    lockedUntil: number;
    lastAttempt: number;
}

class RateLimiter {
    private state: RateLimitState = {
        attempts: 0,
        lockedUntil: 0,
        lastAttempt: 0,
    };

    isLocked(): boolean {
        return Date.now() < this.state.lockedUntil;
    }

    getRemainingLockoutMs(): number {
        const remaining = this.state.lockedUntil - Date.now();
        return remaining > 0 ? remaining : 0;
    }

    getAttempts(): number {
        return this.state.attempts;
    }

    recordAttempt(): void {
        this.state.attempts++;
        this.state.lastAttempt = Date.now();

        if (this.state.attempts >= SECURITY_CONFIG.MAX_UNLOCK_ATTEMPTS) {
            const lockoutDuration = Math.min(
                SECURITY_CONFIG.LOCKOUT_BASE_MS *
                Math.pow(SECURITY_CONFIG.LOCKOUT_MULTIPLIER, this.state.attempts - SECURITY_CONFIG.MAX_UNLOCK_ATTEMPTS),
                SECURITY_CONFIG.MAX_LOCKOUT_MS
            );
            this.state.lockedUntil = Date.now() + lockoutDuration;
        }
    }

    reset(): void {
        this.state.attempts = 0;
        this.state.lockedUntil = 0;
        this.state.lastAttempt = 0;
    }
}

const globalRateLimiter = new RateLimiter();

function sanitizeText(input: string): string {
    if (typeof input !== 'string') {
        return '';
    }
    return input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
}

function validateSearchInput(input: string): string {
    if (typeof input !== 'string') {
        return '';
    }
    return input.slice(0, 100).replace(/[^\w\s\-_.]/g, '');
}

function secureCompare(a: string, b: string): boolean {
    if (typeof a !== 'string' || typeof b !== 'string') {
        return false;
    }
    if (a.length !== b.length) {
        return false;
    }
    let result = 0;
    for (let i = 0; i < a.length; i++) {
        result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
}

function createWipeHandler(wipeCallback: () => void): () => void {
    return () => {
        try {
            wipeCallback();
        } catch {
            window.location.reload();
        }
    };
}

function setupPanicKeyHandler(wipeCallback: () => void): () => void {
    const handler = (event: KeyboardEvent) => {
        if (
            event.key.toUpperCase() === SECURITY_CONFIG.PANIC_KEY &&
            event.ctrlKey === SECURITY_CONFIG.PANIC_MODIFIERS.ctrl &&
            event.shiftKey === SECURITY_CONFIG.PANIC_MODIFIERS.shift
        ) {
            event.preventDefault();
            event.stopPropagation();
            wipeCallback();
        }
    };

    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
}

function setupVisibilityHandler(wipeCallback: () => void): () => void {
    const handler = () => {
        if (document.visibilityState === 'hidden') {
            sessionStorage.setItem('cv_hidden_at', Date.now().toString());
        }
    };

    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
}

function setupInactivityHandler(
    wipeCallback: () => void,
    timeoutMs: number = SECURITY_CONFIG.SESSION_TIMEOUT_MS
): () => void {
    let timeout: number;
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'];

    const resetTimer = () => {
        window.clearTimeout(timeout);
        timeout = window.setTimeout(wipeCallback, timeoutMs);
    };

    events.forEach(event => window.addEventListener(event, resetTimer, { passive: true }));
    resetTimer();

    return () => {
        window.clearTimeout(timeout);
        events.forEach(event => window.removeEventListener(event, resetTimer));
    };
}

export {
    SECURITY_CONFIG,
    RateLimiter,
    globalRateLimiter,
    sanitizeText,
    validateSearchInput,
    secureCompare,
    createWipeHandler,
    setupPanicKeyHandler,
    setupVisibilityHandler,
    setupInactivityHandler,
};
