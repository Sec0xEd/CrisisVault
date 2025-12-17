import { useAuthStore, DecryptedFile } from '../store/authStore';
import { AlertCircle, ShieldAlert, FileText, ArrowRight, Clock } from 'lucide-react';
import clsx from 'clsx';

interface DashboardProps {
    onSelect: (id: string) => void;
}

export function Dashboard({ onSelect }: DashboardProps) {
    const { decryptedFiles } = useAuthStore();

    const criticalFiles = decryptedFiles.filter(f => f.priority === 'critical');
    const highFiles = decryptedFiles.filter(f => f.priority === 'high');
    const normalFiles = decryptedFiles.filter(f => f.priority === 'normal' || !f.priority);

    const allTags = Array.from(
        new Set(decryptedFiles.flatMap(f => f.tags || []))
    ).slice(0, 10);

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8">
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-xl flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">
                        System Status: <span className="text-green-500">MONITORING</span>
                    </h1>
                    <p className="text-slate-400 mt-1">CrisisVault Secure Environment Active</p>
                </div>
                <div className="flex items-center space-x-2 bg-slate-900 px-4 py-2 rounded-lg border border-slate-700">
                    <ShieldAlert className="text-blue-500 h-5 w-5" />
                    <span className="text-slate-200 font-mono text-sm">STANDBY</span>
                </div>
            </div>

            {criticalFiles.length > 0 && (
                <section>
                    <h2 className="text-xl font-semibold text-red-500 mb-4 flex items-center">
                        <AlertCircle className="mr-2 h-5 w-5" />
                        CRITICAL RESPONSE - IMMEDIATE ACTION
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {criticalFiles.map((file: DecryptedFile) => (
                            <button
                                key={file.id}
                                onClick={() => onSelect(file.id)}
                                className="bg-red-900/20 hover:bg-red-900/30 border border-red-900/50 hover:border-red-500 text-left p-4 rounded-xl transition-all group focus:outline-none focus:ring-2 focus:ring-red-500"
                            >
                                <h3 className="text-lg font-bold text-red-100 group-hover:text-white">
                                    {file.title}
                                </h3>
                                <p className="text-red-300/60 text-sm mt-1">Initiate playbook</p>
                            </button>
                        ))}
                    </div>
                </section>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    {highFiles.length > 0 && (
                        <section>
                            <h2 className="text-xl font-semibold text-white mb-4">High Priority</h2>
                            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                                {highFiles.map((file: DecryptedFile) => (
                                    <button
                                        key={file.id}
                                        onClick={() => onSelect(file.id)}
                                        className="w-full text-left p-4 border-b border-slate-700 last:border-b-0 hover:bg-slate-700/50 transition-colors flex items-center justify-between group focus:outline-none focus:bg-slate-700/50"
                                    >
                                        <div className="flex items-center">
                                            <FileText className="text-orange-400 mr-3 h-5 w-5" />
                                            <span className="text-slate-200 font-medium group-hover:text-white">
                                                {file.title}
                                            </span>
                                        </div>
                                        <ArrowRight className="text-slate-600 group-hover:text-white h-4 w-4" />
                                    </button>
                                ))}
                            </div>
                        </section>
                    )}

                    {normalFiles.length > 0 && (
                        <section>
                            <h2 className="text-xl font-semibold text-white mb-4">All Playbooks</h2>
                            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                                {normalFiles.map((file: DecryptedFile) => (
                                    <button
                                        key={file.id}
                                        onClick={() => onSelect(file.id)}
                                        className="w-full text-left p-4 border-b border-slate-700 last:border-b-0 hover:bg-slate-700/50 transition-colors flex items-center justify-between group focus:outline-none focus:bg-slate-700/50"
                                    >
                                        <div className="flex items-center">
                                            <FileText className="text-slate-400 mr-3 h-5 w-5" />
                                            <span className="text-slate-200 font-medium group-hover:text-white">
                                                {file.title}
                                            </span>
                                        </div>
                                        <ArrowRight className="text-slate-600 group-hover:text-white h-4 w-4" />
                                    </button>
                                ))}
                            </div>
                        </section>
                    )}
                </div>

                <aside className="space-y-6">
                    <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
                        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center">
                            <Clock className="h-4 w-4 mr-2" />
                            Session Info
                        </h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-slate-400">Documents</span>
                                <span className="text-white font-mono">{decryptedFiles.length}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400">Auto-lock</span>
                                <span className="text-white font-mono">15 min</span>
                            </div>
                        </div>
                    </div>

                    {allTags.length > 0 && (
                        <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
                            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
                                Categories
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {allTags.map(tag => (
                                    <span
                                        key={tag}
                                        className="px-2 py-1 bg-slate-700 text-slate-300 text-xs rounded-md border border-slate-600"
                                    >
                                        #{tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </aside>
            </div>
        </div>
    );
}
