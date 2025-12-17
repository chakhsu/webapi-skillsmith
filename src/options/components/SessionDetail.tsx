import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import type { DbHttpRecord } from '@/lib/db';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Download, Trash2, ArrowLeft, Sparkles } from 'lucide-react';
import RequestDrawer from './RequestDrawer';
import PromptWorkbenchDialog from './PromptWorkbenchDialog';

interface Props {
    sessionId: string;
    onBack: () => void;
}

export default function SessionDetail({ sessionId, onBack }: Props) {
    const { t } = useTranslation('options');
    const session = useLiveQuery(() => db.sessions.get(sessionId), [sessionId]);
    const records = useLiveQuery(() => db.records.where('sessionId').equals(sessionId).toArray(), [sessionId]);

    const [selectedRecord, setSelectedRecord] = useState<DbHttpRecord | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [isWorkbenchOpen, setIsWorkbenchOpen] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    if (!session || !records) return <div className="p-10 text-center">{t('loading')}</div>;

    const handleSelectAll = () => {
        if (selectedIds.size === records.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(records.map(r => r.id)));
        }
    };

    const handleSelectOne = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const handleDeleteSelected = async () => {
        if (!session || selectedIds.size === 0) return;

        if (!confirm(t('confirm_delete_selected', { count: selectedIds.size }))) return;

        await db.records.bulkDelete(Array.from(selectedIds));
        await db.sessions.update(session.id, {
            recordCount: Math.max(0, session.recordCount - selectedIds.size)
        });

        setSelectedIds(new Set());
    };

    const handleExport = () => {
        const lines = records.map(r => JSON.stringify({
            description: session.description,
            url: r.url,
            method: r.method,
            req: { headers: r.requestHeaders, body: r.requestBody },
            res: { status: r.responseStatus, headers: r.responseHeaders, body: r.responseBody },
            ts: r.timestamp
        }));
        const blob = new Blob([lines.join('\n')], { type: 'application/jsonl' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `session-${session.id}.jsonl`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleRowClick = (record: DbHttpRecord) => {
        setSelectedRecord(record);
        setIsDrawerOpen(true);
    };

    const handleDeleteRecord = async (id: string) => {
        if (!session) return;

        // Optimistically close drawer if it's the deleted record or just always close
        setIsDrawerOpen(false);

        // Delete record
        await db.records.delete(id);

        // Update session count
        await db.sessions.update(session.id, {
            recordCount: Math.max(0, session.recordCount - 1)
        });
    };

    const handleDeleteClick = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        handleDeleteRecord(id);
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center border-b pb-4">
                <div>
                    <h2 className="text-xl font-bold tracking-tight">{session.description}</h2>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span className="bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded font-medium">{session.domain}</span>
                        <span>•</span>
                        <span>{new Date(session.startTime).toLocaleString()}</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {selectedIds.size > 0 && (
                        <Button variant="destructive" size="sm" className="h-7 text-xs" onClick={handleDeleteSelected}>
                            <Trash2 className="w-3 h-3 mr-2" />
                            {t('delete_selected', { count: selectedIds.size })}
                        </Button>
                    )}
                    <Button variant="secondary" size="sm" className="h-7 text-xs" onClick={onBack}>
                        <ArrowLeft className="w-3 h-3 mr-2" />
                        {t('back')}
                    </Button>
                    <Button variant="secondary" size="sm" className="h-7 text-xs" onClick={handleExport}>
                        <Download className="w-3 h-3 mr-2" />
                        {t('export_jsonl')}
                    </Button>
                    <Button
                        variant="secondary"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setIsWorkbenchOpen(true)}
                    >
                        <Sparkles className="w-3 h-3 mr-2 text-primary" />
                        Generate Prompt
                    </Button>
                </div>
            </div>

            <div className="border rounded-md overflow-hidden">
                <table className="w-full text-xs">
                    <thead className="bg-muted/50 border-b">
                        <tr>
                            <th className="h-8 px-3 text-left align-middle w-8">
                                <input
                                    type="checkbox"
                                    className="translate-y-[2px]"
                                    checked={records.length > 0 && selectedIds.size === records.length}
                                    onChange={handleSelectAll}
                                />
                            </th>
                            <th className="h-8 px-3 text-left align-middle font-medium text-muted-foreground w-20">{t('table_headers.method')}</th>
                            <th className="h-8 px-3 text-left align-middle font-medium text-muted-foreground">{t('table_headers.url')}</th>
                            <th className="h-8 px-3 text-left align-middle font-medium text-muted-foreground w-24">{t('table_headers.status')}</th>
                            <th className="h-8 px-3 text-left align-middle font-medium text-muted-foreground w-32">{t('table_headers.time')}</th>
                            <th className="h-8 px-3 text-left align-middle font-medium text-muted-foreground w-10"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {records.map(r => (
                            <tr
                                key={r.id}
                                className="border-b transition-colors hover:bg-muted/50 cursor-pointer data-[state=selected]:bg-muted group"
                                onClick={() => handleRowClick(r)}
                            >
                                <td className="p-2 px-3 align-middle" onClick={(e) => e.stopPropagation()}>
                                    <input
                                        type="checkbox"
                                        className="translate-y-[2px]"
                                        checked={selectedIds.has(r.id)}
                                        onChange={() => handleSelectOne(r.id)}
                                    />
                                </td>
                                <td className="p-2 px-3 align-middle font-medium">{r.method}</td>
                                <td className="p-2 px-3 align-middle max-w-[400px] truncate font-mono text-[11px]" title={r.url}>{r.url}</td>
                                <td className="p-2 px-3 align-middle">
                                    <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold transition-colors ${r.responseStatus && r.responseStatus < 400 ? 'border-transparent bg-green-500/10 text-green-700 dark:text-green-400' : 'border-transparent bg-red-500/10 text-red-700 dark:text-red-400'}`}>
                                        {r.responseStatus || t('status_pending')}
                                    </span>
                                </td>
                                <td className="p-2 px-3 align-middle text-muted-foreground">{new Date(r.timestamp).toLocaleTimeString()}</td>
                                <td className="p-2 px-3 align-middle">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                                        onClick={(e) => handleDeleteClick(e, r.id)}
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="text-sm text-center text-muted-foreground">
                {t('showing_records', { count: records.length })}
            </div>

            <RequestDrawer
                record={selectedRecord}
                isOpen={isDrawerOpen}
                onDelete={handleDeleteRecord}
                onClose={() => setIsDrawerOpen(false)}
            />

            {session && records && (
                <PromptWorkbenchDialog
                    isOpen={isWorkbenchOpen}
                    onClose={() => setIsWorkbenchOpen(false)}
                    context={{
                        type: 'single',
                        name: session.description || 'Session',
                        sessions: [{ id: session.id, description: session.description, startTime: session.startTime }],
                        records: records
                    }}
                />
            )}
        </div>
    );
}
