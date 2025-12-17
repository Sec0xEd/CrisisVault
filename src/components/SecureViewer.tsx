import { useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAuthStore } from '../store/authStore';
import { Dashboard } from './Dashboard';
import { validateSearchInput } from '../utils/security';
import { FileText, Menu, X, Search, LayoutGrid, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';

const PRIORITY_COLORS: Record<string, string> = {
    critical: 'text-red-500',
    high: 'text-orange-500',
    normal: 'text-slate-400',
    low: 'text-slate-500',
};

export function SecureViewer() {
    const { decryptedFiles } = useAuthStore();
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isSidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);
    const [searchRaw, setSearchRaw] = useState('');

    const search = useMemo(() => validateSearchInput(searchRaw), [searchRaw]);
    const selectedFile = useMemo(
        () => decryptedFiles.find(f => f.id === selectedId),
        [decryptedFiles, selectedId]
    );

    const filteredFiles = useMemo(() => {
        if (!search) return decryptedFiles;
        const searchLower = search.toLowerCase();
        return decryptedFiles.filter(f =>
            f.title.toLowerCase().includes(searchLower) ||
            f.tags?.some(t => t.toLowerCase().includes(searchLower))
        );
    }, [decryptedFiles, search]);

    const handleFileSelect = (id: string) => {
        setSelectedId(id);
        if (window.innerWidth < 1024) setSidebarOpen(false);
    };

    const handleDashboardClick = () => {
        setSelectedId(null);
        if (window.innerWidth < 1024) setSidebarOpen(false);
    };

    return (
        <div className="flex h-screen bg-slate-900 overflow-hidden">
            <div
                className={clsx(
                    "fixed inset-0 z-20 bg-black/50 lg:hidden transition-opacity",
                    isSidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
                onClick={() => setSidebarOpen(false)}
                aria-hidden="true"
            />

            <aside
                className={clsx(
                    "fixed lg:static inset-y-0 left-0 z-30 w-72 bg-slate-800 border-r border-slate-700 transform transition-transform duration-200 ease-in-out flex flex-col",
                    isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
                )}
            >
                <div className="p-4 border-b border-slate-700 flex items-center justify-between">
                    <button
                        onClick={handleDashboardClick}
                        className="text-xl font-bold text-white flex items-center hover:text-blue-400 transition-colors"
                    >
                        <span className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse" aria-hidden="true" />
                        CRISIS VAULT
                    </button>
                    <button
                        onClick={() => setSidebarOpen(false)}
                        className="lg:hidden text-slate-400 hover:text-white"
                        aria-label="Close sidebar"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="p-4">
                    <button
                        onClick={handleDashboardClick}
                        className={clsx(
                            "w-full flex items-center px-3 py-2 text-sm font-medium rounded-md mb-4 transition-colors",
                            selectedId === null
                                ? "bg-blue-600 text-white"
                                : "bg-slate-700 text-slate-200 hover:bg-slate-600"
                        )}
                    >
                        <LayoutGrid className="mr-3 h-4 w-4" />
                        Dashboard
                    </button>

                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" aria-hidden="true" />
                        <input
                            type="text"
                            placeholder="Filter playbooks..."
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:ring-1 focus:ring-blue-500 font-mono"
                            value={searchRaw}
                            onChange={(e) => setSearchRaw(e.target.value)}
                            maxLength={100}
                            autoComplete="off"
                            autoCorrect="off"
                            spellCheck={false}
                        />
                    </div>
                </div>

                <nav className="flex-1 overflow-y-auto px-2 pb-4 space-y-1" role="navigation">
                    {filteredFiles.map((file) => (
                        <button
                            key={file.id}
                            onClick={() => handleFileSelect(file.id)}
                            className={clsx(
                                "w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                                selectedId === file.id
                                    ? "bg-blue-600 text-white shadow-sm"
                                    : "text-slate-300 hover:bg-slate-700 hover:text-white"
                            )}
                        >
                            <FileText
                                className={clsx(
                                    "mr-3 h-4 w-4 flex-shrink-0",
                                    PRIORITY_COLORS[file.priority || 'normal']
                                )}
                            />
                            <div className="flex-1 text-left overflow-hidden">
                                <span className="truncate block">{file.title}</span>
                                {file.tags && file.tags.length > 0 && (
                                    <span className="text-xs text-slate-500 block truncate">
                                        {file.tags.join(', ')}
                                    </span>
                                )}
                            </div>
                        </button>
                    ))}
                    {filteredFiles.length === 0 && (
                        <div className="text-slate-500 text-sm px-3 py-2">
                            No matching playbooks
                        </div>
                    )}
                </nav>
            </aside>

            <main className="flex-1 flex flex-col min-w-0 bg-slate-900">
                <header className="flex items-center justify-between p-4 border-b border-slate-800 lg:hidden">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="text-slate-400 hover:text-white"
                        aria-label="Open sidebar"
                    >
                        <Menu className="h-6 w-6" />
                    </button>
                    <span className="font-semibold text-white">CrisisVault</span>
                    <div className="w-6" aria-hidden="true" />
                </header>

                <div className="flex-1 overflow-y-auto p-4 lg:p-8">
                    {selectedFile ? (
                        <article className="max-w-4xl mx-auto prose prose-invert prose-blue lg:prose-lg bg-slate-800/50 p-8 rounded-2xl border border-slate-700 shadow-2xl">
                            <h1 className="mb-8 pb-4 border-b border-slate-700">{selectedFile.title}</h1>
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                    a: ({ href, children }) => (
                                        <a
                                            href={href}
                                            rel="noopener noreferrer nofollow"
                                            className="text-blue-400 hover:text-blue-300"
                                        >
                                            {children}
                                        </a>
                                    ),
                                    script: () => null,
                                    iframe: () => null,
                                }}
                            >
                                {selectedFile.content}
                            </ReactMarkdown>
                        </article>
                    ) : (
                        <Dashboard onSelect={handleFileSelect} />
                    )}
                </div>
            </main>
        </div>
    );
}
