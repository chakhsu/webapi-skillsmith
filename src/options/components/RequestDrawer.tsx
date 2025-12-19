import { X, Trash2, ChevronRight, ChevronDown, Copy, Check } from 'lucide-react';
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

function SectionWithCopy({ title, content, children }: { title: string, content: string, children: React.ReactNode }) {
    const { t } = useTranslation('options');
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="border rounded-md overflow-hidden mb-2 last:mb-0">
            <div className="bg-muted/50 px-3 py-1.5 border-b flex justify-between items-center h-8">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">{title}</span>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 hover:bg-background hover:text-foreground text-muted-foreground"
                    onClick={handleCopy}
                    title={t('workbench.copy') || 'Copy'}
                >
                    {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                </Button>
            </div>
            {children}
        </div>
    );
}

export default function RequestDrawer({ record, onClose, onDelete, isOpen }: Props) {
    const { t } = useTranslation('options');

    const formatBody = (body: unknown): string => {
        if (body == null) return '';
        if (typeof body === 'string') {
            const trimmed = body.trim();
            try {
                if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
                    return JSON.stringify(JSON.parse(trimmed), null, 2);
                }
            } catch {
                return trimmed;
            }
            return trimmed;
        }
        if (typeof body === 'object') {
            try {
                return JSON.stringify(body, null, 2);
            } catch {
                return String(body);
            }
        }
        return String(body);
    };

    if (!isOpen || !record) return null;

    const hasRequestBody = record.requestBody !== undefined && record.requestBody !== null;
    const hasResponseBody = record.responseBody !== undefined && record.responseBody !== null;

    return (
        <div className="fixed inset-0 z-[100] flex justify-end !m-0">
            {/* Backdrop */}
            <div
                className="absolute inset-0"
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
                                <SectionWithCopy title="Headers" content={JSON.stringify(record.requestHeaders, null, 2)}>
                                    <div className="p-3 text-xs font-mono whitespace-pre-wrap overflow-x-auto max-h-60 overflow-y-auto bg-card">
                                        {JSON.stringify(record.requestHeaders, null, 2)}
                                    </div>
                                </SectionWithCopy>
                            )}
                            {hasRequestBody && (
                                <SectionWithCopy title="Body" content={formatBody(record.requestBody)}>
                                    <div className="p-3 text-xs font-mono whitespace-pre-wrap overflow-x-auto bg-card">
                                        {formatBody(record.requestBody)}
                                    </div>
                                </SectionWithCopy>
                            )}
                            {!hasRequestBody && (!record.requestHeaders || Object.keys(record.requestHeaders).length === 0) && (
                                <div className="text-xs text-muted-foreground italic pl-2">No request details available.</div>
                            )}
                        </CollapsibleSection>

                        {/* Response */}
                        <CollapsibleSection title="Response">
                            {record.responseHeaders && Object.keys(record.responseHeaders).length > 0 && (
                                <SectionWithCopy title="Headers" content={JSON.stringify(record.responseHeaders, null, 2)}>
                                    <div className="p-3 text-xs font-mono whitespace-pre-wrap overflow-x-auto max-h-60 overflow-y-auto bg-card">
                                        {JSON.stringify(record.responseHeaders, null, 2)}
                                    </div>
                                </SectionWithCopy>
                            )}
                            {hasResponseBody && (
                                <SectionWithCopy title="Body" content={formatBody(record.responseBody)}>
                                    <div className="p-3 text-xs font-mono whitespace-pre-wrap overflow-x-auto bg-card">
                                        {formatBody(record.responseBody)}
                                    </div>
                                </SectionWithCopy>
                            )}
                            {!hasResponseBody && (!record.responseHeaders || Object.keys(record.responseHeaders).length === 0) && (
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
