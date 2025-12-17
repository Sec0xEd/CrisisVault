import { useEffect } from 'react';
import { useAuthStore } from './store/authStore';
import { UnlockScreen } from './components/UnlockScreen';
import { SecureViewer } from './components/SecureViewer';
import { setupPanicKeyHandler, setupInactivityHandler, setupVisibilityHandler, SECURITY_CONFIG } from './utils/security';
import { LogOut, ShieldOff } from 'lucide-react';

function App() {
    const { isUnlocked, wipe } = useAuthStore();

    useEffect(() => {
        if (!isUnlocked) return;

        const cleanupPanic = setupPanicKeyHandler(wipe);
        const cleanupInactivity = setupInactivityHandler(wipe, SECURITY_CONFIG.SESSION_TIMEOUT_MS);
        const cleanupVisibility = setupVisibilityHandler(wipe);

        return () => {
            cleanupPanic();
            cleanupInactivity();
            cleanupVisibility();
        };
    }, [isUnlocked, wipe]);

    useEffect(() => {
        const handleBeforeUnload = () => {
            wipe();
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [wipe]);

    if (!isUnlocked) {
        return <UnlockScreen />;
    }

    return (
        <>
            <SecureViewer />
            <button
                onClick={wipe}
                className="fixed bottom-6 right-6 z-50 bg-red-600 hover:bg-red-700 text-white font-bold p-4 rounded-full shadow-lg border-2 border-red-400/50 transition-all hover:scale-105 active:scale-95 flex items-center gap-2 group focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-slate-900"
                title="Emergency Lock (Ctrl+Shift+L)"
                aria-label="Emergency vault lock"
            >
                <ShieldOff className="h-6 w-6" />
                <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 ease-in-out whitespace-nowrap font-mono text-sm">
                    LOCK
                </span>
            </button>
            <div className="fixed bottom-6 left-6 z-50 text-xs text-slate-600 font-mono select-none pointer-events-none">
                Ctrl+Shift+L
            </div>
        </>
    );
}

export default App;
