import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Trash2, Globe, Clock, Calendar, Activity, ChevronRight, Sparkles } from 'lucide-react';
import PromptWorkbenchDialog from './PromptWorkbenchDialog';
import type { WorkbenchContext } from './PromptWorkbenchDialog';
import { useState } from 'react';

interface Props {
    onSelect: (id: string) => void;
}

export default function SessionList({ onSelect }: Props) {
    const { t } = useTranslation('options');

    const sessions = useLiveQuery(() => db.sessions.orderBy('startTime').reverse().toArray());

    // Workbench state
    const [isWorkbenchOpen, setIsWorkbenchOpen] = useState(false);
    const [workbenchContext, setWorkbenchContext] = useState<WorkbenchContext | null>(null);
    const [isLoadingDomain, setIsLoadingDomain] = useState<string | null>(null);

    const handleDomainPrompt = async (domain: string, sessionList: typeof sessions) => {
        if (!sessionList) return;
        setIsLoadingDomain(domain);
        try {
            const sessionIds = sessionList.map(s => s.id);
            // Fetch all records for these sessions
            const records = await db.records.where('sessionId').anyOf(sessionIds).toArray();

            setWorkbenchContext({
                type: 'domain',
                name: `Domain: ${domain}`,
                sessions: sessionList.map(s => ({ id: s.id, description: s.description, startTime: s.startTime })),
                records: records
            });
            setIsWorkbenchOpen(true);
        } catch (e) {
            console.error("Failed to load records for domain", e);
        } finally {
            setIsLoadingDomain(null);
        }
    };

    if (!sessions) {
        return (
            <div className="flex flex-col items-center justify-center p-20 space-y-4 opacity-50">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <p className="text-sm text-muted-foreground">{t('loading')}</p>
            </div>
        );
    }

    if (sessions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-20 space-y-4 border-2 border-dashed rounded-lg bg-card/50">
                <Activity className="h-12 w-12 text-muted-foreground/20" />
                <p className="text-lg font-medium text-muted-foreground">{t('no_sessions')}</p>
            </div>
        );
    }

    // Group by domain
    const grouped = sessions.reduce((acc, session) => {
        const domain = session.domain || 'Unknown';
        if (!acc[domain]) acc[domain] = [];
        acc[domain].push(session);
        return acc;
    }, {} as Record<string, typeof sessions>);

    const deleteSession = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!confirm(t('confirm_delete'))) return;
        await db.sessions.delete(id);
        await db.records.where('sessionId').equals(id).delete();
    };

    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });
    };

    const getDuration = (start: number, end?: number) => {
        if (!end) return null;
        return ((end - start) / 1000).toFixed(1) + t('seconds_suffix');
    };

    return (
        <div className="space-y-8">
            {Object.entries(grouped).map(([domain, list]) => (
                <div key={domain} className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2">
                            <Globe className="w-4 h-4 text-primary" />
                            <h2 className="text-base font-semibold tracking-tight">{domain}</h2>
                            <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                                {list.length}
                            </span>
                        </div>
                        <Button
                            variant="secondary"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => handleDomainPrompt(domain, list)}
                            disabled={isLoadingDomain === domain}
                        >
                            {isLoadingDomain === domain ? (
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary mr-2"></div>
                            ) : (
                                <Sparkles className="w-3 h-3 mr-2 text-primary" />
                            )}
                            Generate Prompt
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {list.map(session => (
                            <div
                                key={session.id}
                                onClick={() => onSelect(session.id)}
                                className="group relative bg-card hover:bg-accent/50 border rounded-xl p-4 transition-all duration-200 hover:shadow-md cursor-pointer flex flex-col gap-3"
                            >
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1 overflow-hidden">
                                        <h3 className="font-medium text-sm truncate pr-8" title={session.description}>
                                            {session.description || <span className="italic text-muted-foreground">{t('no_description')}</span>}
                                        </h3>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <Calendar className="w-3 h-3" />
                                            <span>{formatDate(session.startTime)}</span>
                                        </div>
                                    </div>

                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="absolute top-2 right-2 h-7 w-7 text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all duration-200"
                                        onClick={(e) => deleteSession(e, session.id)}
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                </div>

                                <div className="mt-auto pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-1.5" title={t('http_reqs', { count: session.recordCount })}>
                                            <Activity className="w-3.5 h-3.5 text-primary/70" />
                                            <span>{session.recordCount}</span>
                                        </div>
                                        {session.endTime && (
                                            <div className="flex items-center gap-1.5" title={t('duration_label')}>
                                                <Clock className="w-3.5 h-3.5 text-primary/70" />
                                                <span>{getDuration(session.startTime, session.endTime)}</span>
                                            </div>
                                        )}
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary transition-colors" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}

            {workbenchContext && (
                <PromptWorkbenchDialog
                    isOpen={isWorkbenchOpen}
                    onClose={() => setIsWorkbenchOpen(false)}
                    context={workbenchContext}
                />
            )}
        </div>
    );
}
