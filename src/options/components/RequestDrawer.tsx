import { X, Trash2, ChevronRight, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import type { DbHttpRecord } from '@/lib/db';
import { useState } from 'react';

interface Props {
    record: DbHttpRecord | null;
    onClose: () => void;
    onDelete: (id: string) => void;
    isOpen: boolean;
}

function CollapsibleSection({ title, children, defaultOpen = true }: { title: string, children: React.ReactNode, defaultOpen?: boolean }) {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    return (
        <div className="space-y-2">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 hover:text-foreground transition-colors w-full text-left"
            >
                {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                {title}
            </button>
            {isOpen && (
                <div className="animate-in fade-in zoom-in-95 duration-200">
                    {children}
                </div>
            )}
        </div>
    );
}

export default function RequestDrawer({ record, onClose, onDelete, isOpen }: Props) {
    const { t } = useTranslation('options');

    const formatBody = (body: any) => {
        try {
            if (typeof body === 'string' && (body.trim().startsWith('{') || body.trim().startsWith('['))) {
                return JSON.stringify(JSON.parse(body), null, 2);
            }
            return typeof body === 'object' ? JSON.stringify(body, null, 2) : body;
        } catch {
            return body;
        }
    };

    if (!isOpen || !record) return null;

    return (
        <div className="fixed inset-0 z-[100] flex justify-end !m-0">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-background/80 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Drawer Panel */}
            <div className="relative w-full max-w-2xl h-full bg-background border-l shadow-lg animate-in slide-in-from-right duration-300 flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-2 border-b h-14 shrink-0">
                    <div className="flex items-center gap-2">
                        <h2 className="text-sm font-semibold">{t('details')}</h2>
                        <div className="h-4 w-[1px] bg-border mx-1" />
                        <span className={`text-xs font-mono font-medium ${record.responseStatus && record.responseStatus >= 400 ? 'text-destructive' : 'text-green-600'}`}>
                            {record.method} {record.responseStatus || 'PENDING'}
                        </span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => onDelete(record.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                            <Trash2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 text-muted-foreground">
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-0">
                    <div className="space-y-6 p-4">
                        {/* General Info */}
                        <CollapsibleSection title="General">
                            <div className="bg-muted/30 rounded border p-3 text-xs grid gap-3">
                                <div className="grid grid-cols-[60px_1fr] gap-2">
                                    <span className="text-muted-foreground font-medium">URL</span>
                                    <span className="font-mono break-all select-all leading-relaxed">{record.url}</span>
                                </div>
                                <div className="grid grid-cols-[60px_1fr] gap-2">
                                    <span className="text-muted-foreground font-medium">Time</span>
                                    <span>{new Date(record.timestamp).toLocaleString()}</span>
                                </div>
                            </div>
                        </CollapsibleSection>

                        {/* Request */}
                        <CollapsibleSection title="Request">
                            {record.requestHeaders && Object.keys(record.requestHeaders).length > 0 && (
                                <div className="border rounded-md overflow-hidden mb-2">
                                    <div className="bg-muted/50 px-3 py-1.5 border-b text-[10px] font-bold text-muted-foreground uppercase">Headers</div>
                                    <div className="p-3 text-xs font-mono whitespace-pre-wrap overflow-x-auto max-h-60 overflow-y-auto bg-card">
                                        {JSON.stringify(record.requestHeaders, null, 2)}
                                    </div>
                                </div>
                            )}
                            {record.requestBody && (
                                <div className="border rounded-md overflow-hidden">
                                    <div className="bg-muted/50 px-3 py-1.5 border-b text-[10px] font-bold text-muted-foreground uppercase">Body</div>
                                    <div className="p-3 text-xs font-mono whitespace-pre-wrap overflow-x-auto bg-card">
                                        {formatBody(record.requestBody)}
                                    </div>
                                </div>
                            )}
                            {!record.requestBody && (!record.requestHeaders || Object.keys(record.requestHeaders).length === 0) && (
                                <div className="text-xs text-muted-foreground italic pl-2">No request details available.</div>
                            )}
                        </CollapsibleSection>

                        {/* Response */}
                        <CollapsibleSection title="Response">
                            {record.responseHeaders && Object.keys(record.responseHeaders).length > 0 && (
                                <div className="border rounded-md overflow-hidden mb-2">
                                    <div className="bg-muted/50 px-3 py-1.5 border-b text-[10px] font-bold text-muted-foreground uppercase">Headers</div>
                                    <div className="p-3 text-xs font-mono whitespace-pre-wrap overflow-x-auto max-h-60 overflow-y-auto bg-card">
                                        {JSON.stringify(record.responseHeaders, null, 2)}
                                    </div>
                                </div>
                            )}
                            {record.responseBody && (
                                <div className="border rounded-md overflow-hidden">
                                    <div className="bg-muted/50 px-3 py-1.5 border-b text-[10px] font-bold text-muted-foreground uppercase">Body</div>
                                    <div className="p-3 text-xs font-mono whitespace-pre-wrap overflow-x-auto bg-card">
                                        {formatBody(record.responseBody)}
                                    </div>
                                </div>
                            )}
                            {!record.responseBody && (!record.responseHeaders || Object.keys(record.responseHeaders).length === 0) && (
                                <div className="text-xs text-muted-foreground italic pl-2">No response details available.</div>
                            )}
                        </CollapsibleSection>

                        {/* Bottom Padding */}
                        <div className="h-10"></div>
                    </div>
                </div>
            </div>
        </div>
    );
}
