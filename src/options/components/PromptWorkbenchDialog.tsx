import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Play, Copy, Check, Settings2, Sparkles, Loader2, History as HistoryIcon, Trash2, Eye, RotateCcw, FileText, Eraser, BotMessageSquare, Braces } from 'lucide-react';
import { LLMService } from '@/lib/llm';
import type { LLMConfig, LLMProviderType } from '@/lib/llm';
import { db } from '@/lib/db';
import type { DbHttpRecord, DbGeneratedPrompt } from '@/lib/db';

const STORAGE_KEY_LLM_CONFIG = 'skillsmith_llm_config';

const DEFAULT_META_PROMPT_TEMPLATE = `You are an expert AI Agent architect.
I have a list of recorded HTTP requests from {{context_type}}.

Context: {{context_name}}
Included Sessions:
{{session_info}}

My Goal: {{goal}}

Here is the trace data (JSON):
{{data}}

Please generate the System Prompt or Tool Definitions now.
START OF GENERATED PROMPT:`;

export interface WorkbenchContext {
    type: 'single' | 'domain';
    name: string; // Domain name or Session description
    sessions: { id: string; description: string; startTime: number }[];
    records: DbHttpRecord[];
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    context: WorkbenchContext;
}

export default function PromptWorkbench({ isOpen, onClose, context }: Props) {
    const { t } = useTranslation('options');
    const [config, setConfig] = useState<LLMConfig>({
        provider: 'openai',
        apiKey: '',
        baseUrl: '',
        modelName: '',
        metaPromptTemplate: DEFAULT_META_PROMPT_TEMPLATE
    });
    const [activeTab, setActiveTab] = useState<'model' | 'template' | 'history'>('model');
    const [requirements, setRequirements] = useState('');
    const [generatedPrompt, setGeneratedPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [testStatus, setTestStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [testError, setTestError] = useState<string | null>(null);
    const [showSettings, setShowSettings] = useState(true);
    const [history, setHistory] = useState<DbGeneratedPrompt[]>([]);
    const [showPreview, setShowPreview] = useState(false);

    const getContextData = () => {
        return context.records.map(r => ({
            sessionId: r.sessionId, // Include sessionId to link back to session info
            url: r.url,
            method: r.method,
            reqBody: r.requestBody,
            resBody: r.responseBody, // careful with size
            status: r.responseStatus
        }));
    };

    const constructMetaPrompt = () => {
        // Prepare context
        const contextData = getContextData();

        // Format Session Info
        const sessionInfo = context.sessions.map(s =>
            `- Session: ${s.description || 'No Description'} (Time: ${new Date(s.startTime).toLocaleString()})`
        ).join('\n');

        // Meta Prompt Construction
        const template = config.metaPromptTemplate || DEFAULT_META_PROMPT_TEMPLATE;
        return template
            .replace('{{context_type}}', context.type === 'domain' ? 'multiple user sessions' : 'a user session')
            .replace('{{context_name}}', context.name)
            .replace('{{session_info}}', sessionInfo)
            .replace('{{goal}}', requirements || t('workbench.meta_prompt_goal_default'))
            .replace('{{data}}', JSON.stringify(contextData, null, 2).slice(0, 50000) + (JSON.stringify(contextData).length > 50000 ? '\n// Truncated...' : ''));
    };

    const loadHistory = async () => {
        try {
            const items = await db.generatedPrompts.orderBy('createdAt').reverse().toArray();
            setHistory(items);
        } catch (e) {
            console.error("Failed to load history", e);
        }
    };

    useEffect(() => {
        if (isOpen && activeTab === 'history') {
            loadHistory();
        }
    }, [isOpen, activeTab]);

    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY_LLM_CONFIG);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setConfig({
                    ...parsed,
                    metaPromptTemplate: parsed.metaPromptTemplate || DEFAULT_META_PROMPT_TEMPLATE
                });
            } catch (e) {
                console.error("Failed to parse saved config", e);
            }
        }
    }, []);

    const saveConfig = (newConfig: LLMConfig) => {
        setConfig(newConfig);
        localStorage.setItem(STORAGE_KEY_LLM_CONFIG, JSON.stringify(newConfig));
    };

    const handleTestConnection = async () => {
        setIsTesting(true);
        setTestStatus('idle');
        try {
            const llm = new LLMService(config);
            const result = await llm.testConnection();
            if (result.success) {
                setTestStatus('success');
                setTestError(null);
            } else {
                setTestStatus('error');
                setTestError(result.error || 'Unknown error');
            }
        } catch (e: unknown) {
            setTestStatus('error');
            setTestError(e instanceof Error ? e.message : String(e));
        } finally {
            setIsTesting(false);
        }
    };

    const handleGenerate = async () => {
        setIsGenerating(true);
        try {
            const llm = new LLMService(config);

            const metaPrompt = constructMetaPrompt();

            const result = await llm.generate(metaPrompt, t('workbench.meta_prompt_role'));
            setGeneratedPrompt(result);

            // Auto-save to history
            try {
                await db.generatedPrompts.add({
                    createdAt: Date.now(),
                    promptContent: result,
                    metaPrompt: metaPrompt,
                    contextName: context.name,
                    modelName: config.modelName || 'gpt-4o'
                });
                // Refresh history if we are on that tab (though we switch view usually)
                if (activeTab === 'history') loadHistory();
            } catch (e) {
                console.error("Failed to save prompt history", e);
            }

            setShowSettings(false); // Auto hide settings on success
        } catch (e) {
            console.error(e);
            alert("Generation failed. Check console for details.");
        } finally {
            setIsGenerating(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in duration-200 !m-0">
            <div className="w-full max-w-5xl h-[90vh] bg-background border rounded-xl shadow-2xl flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-primary/10 rounded-md">
                            <Sparkles className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-sm font-semibold leading-none">{t('workbench.title')}</h2>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{context.name}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Connection Status Indicator */}
                        {testStatus === 'success' && (
                            <span className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-500/10 text-green-600 text-[10px] font-medium border border-green-500/20">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                {t('workbench.connected')}
                            </span>
                        )}
                        {testStatus === 'error' && (
                            <span className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-500/10 text-red-600 text-[10px] font-medium border border-red-500/20" title={testError || ''}>
                                <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                {t('workbench.failed')}
                            </span>
                        )}

                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* Left Panel: Settings & Input */}
                    <div className="w-[400px] border-r flex flex-col bg-muted/10">
                        <div className="p-4 pt-2 pb-2 border-b">
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full justify-between text-xs"
                                onClick={() => setShowSettings(!showSettings)}
                            >
                                <span className="flex items-center gap-2"><Settings2 className="h-4 w-4" /> {t('workbench.settings')}</span>
                                {showSettings ? t('workbench.hide') : t('workbench.show')}
                            </Button>
                        </div>

                        {showSettings && (
                            <div className="flex flex-col border-b bg-muted/30">
                                <div className="flex gap-4 px-4 pt-3 border-b">
                                    <button
                                        className={`text-xs font-medium pb-2 border-b-2 transition-colors ${activeTab === 'model' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                                        onClick={() => setActiveTab('model')}
                                    >
                                        <div className="flex items-center gap-1">
                                            <BotMessageSquare className="h-3 w-3" />
                                            {t('workbench.model_settings')}
                                        </div>
                                    </button>
                                    <button
                                        className={`text-xs font-medium pb-2 border-b-2 transition-colors ${activeTab === 'template' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                                        onClick={() => setActiveTab('template')}
                                    >
                                        <div className="flex items-center gap-1">
                                            <FileText className="h-3 w-3" />
                                            {t('workbench.template')}
                                        </div>
                                    </button>
                                    <button
                                        className={`text-xs font-medium pb-2 border-b-2 transition-colors ${activeTab === 'history' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                                        onClick={() => setActiveTab('history')}
                                    >
                                        <div className="flex items-center gap-1">
                                            <HistoryIcon className="h-3 w-3" />
                                            {t('workbench.history')}
                                        </div>
                                    </button>
                                </div>

                                {activeTab === 'history' ? (
                                    <div className="overflow-y-auto p-4 space-y-3 h-[400px]">
                                        {history.length === 0 ? (
                                            <div className="text-center py-8 text-muted-foreground text-xs">
                                                {t('workbench.history_empty')}
                                            </div>
                                        ) : (
                                            history.map(item => (
                                                <div key={item.id} className="p-3 bg-background border rounded-lg hover:shadow-sm transition-shadow group">
                                                    <div className="flex items-start justify-between mb-2">
                                                        <div>
                                                            <div className="text-[10px] font-medium text-primary mb-0.5">{new Date(item.createdAt).toLocaleString()}</div>
                                                            <div className="text-xs font-semibold truncate max-w-[200px]" title={item.contextName}>{item.contextName}</div>
                                                        </div>
                                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                                                onClick={() => {
                                                                    setGeneratedPrompt(item.promptContent);
                                                                    setShowSettings(false);
                                                                }}
                                                                title={t('workbench.view')}
                                                            >
                                                                <Eye className="h-3.5 w-3.5" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-6 w-6 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                                onClick={async (e) => {
                                                                    e.stopPropagation();
                                                                    if (confirm('Delete this history item?')) {
                                                                        await db.generatedPrompts.delete(item.id!);
                                                                        loadHistory();
                                                                    }
                                                                }}
                                                                title={t('workbench.delete')}
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                                        <span className="bg-muted px-1.5 py-0.5 rounded text-xs">{item.modelName}</span>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                ) : activeTab === 'model' ? (
                                    <div className="p-4 pt-2 space-y-4">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{t('workbench.provider')}</label>
                                                <select
                                                    className="flex h-8 w-full items-center justify-between rounded-md border border-input bg-background px-2 py-1 text-xs shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1"
                                                    value={config.provider}
                                                    onChange={(e) => saveConfig({ ...config, provider: e.target.value as LLMProviderType })}
                                                >
                                                    <option value="openai">OpenAI</option>
                                                    <option value="custom">Custom (Any OpenAI Compatible)</option>
                                                </select>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{t('workbench.model_name')}</label>
                                                <Input
                                                    className="h-8 text-xs bg-background"
                                                    value={config.modelName || ''}
                                                    onChange={(e) => saveConfig({ ...config, modelName: e.target.value })}
                                                    placeholder="gpt-4o"
                                                />
                                            </div>
                                            <div className="space-y-1.5 col-span-2">
                                                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{t('workbench.endpoint_url')}</label>
                                                <Input
                                                    className="h-8 text-xs bg-background font-mono"
                                                    value={config.baseUrl || ''}
                                                    onChange={(e) => saveConfig({ ...config, baseUrl: e.target.value })}
                                                    placeholder="https://api.openai.com/v1/chat/completions"
                                                />
                                            </div>
                                            {config.provider === 'custom' && (
                                                <div className="space-y-1.5 col-span-2">
                                                    <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{t('workbench.auth_type')}</label>
                                                    <select
                                                        className="flex h-8 w-full items-center justify-between rounded-md border border-input bg-background px-2 py-1 text-xs shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1"
                                                        value={config.authType || 'api-key'}
                                                        onChange={(e) => saveConfig({ ...config, authType: e.target.value as 'bearer' | 'api-key' })}
                                                    >
                                                        <option value="api-key">API Key (api-key Header)</option>
                                                        <option value="bearer">Bearer Token (Authorization Header)</option>
                                                    </select>
                                                </div>
                                            )}
                                            <div className="space-y-1.5 col-span-2">
                                                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{t('workbench.api_key')}</label>
                                                <Input
                                                    type="password"
                                                    className="h-8 text-xs bg-background font-mono"
                                                    value={config.apiKey || ''}
                                                    onChange={(e) => saveConfig({ ...config, apiKey: e.target.value })}
                                                    placeholder="sk-..."
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{t('workbench.max_tokens')}</label>
                                                <Input
                                                    type="number"
                                                    className="h-8 text-xs bg-background font-mono"
                                                    value={config.maxTokens ?? ''}
                                                    onChange={(e) => saveConfig({ ...config, maxTokens: e.target.value ? Number(e.target.value) : undefined })}
                                                    placeholder="e.g. 4096"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{t('workbench.temperature')}</label>
                                                <Input
                                                    type="number"
                                                    step="0.1"
                                                    className="h-8 text-xs bg-background font-mono"
                                                    value={config.temperature ?? ''}
                                                    onChange={(e) => saveConfig({ ...config, temperature: e.target.value ? Number(e.target.value) : undefined })}
                                                    placeholder="e.g. 0.7"
                                                />
                                            </div>
                                        </div>

                                        <div className='grid grid-cols-2 gap-3'>
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                className="w-full h-7 text-xs"
                                                onClick={handleTestConnection}
                                                disabled={isTesting}
                                            >
                                                {isTesting ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Check className="h-3 w-3 mr-2" />}
                                                {t('workbench.test_connection')}
                                            </Button>
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                className="w-full h-7 text-xs"
                                                onClick={() => {
                                                    if (confirm(t('workbench.reset_settings') + '?')) {
                                                        saveConfig({
                                                            provider: 'openai',
                                                            apiKey: '',
                                                            baseUrl: '',
                                                            modelName: '',
                                                            metaPromptTemplate: DEFAULT_META_PROMPT_TEMPLATE
                                                        });
                                                    }
                                                }}
                                            >
                                                <RotateCcw className="h-3 w-3 mr-2" />
                                                {t('workbench.reset_settings')}
                                            </Button>
                                        </div>
                                        {testError && (
                                            <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/20 rounded-md">
                                                <p className="text-[10px] font-mono text-red-600 dark:text-red-400 break-all whitespace-pre-wrap">
                                                    {testError}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="p-4 pt-2 space-y-3">
                                        <div className="space-y-1.5">
                                            <div className="flex items-center justify-between">
                                                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Template Content</label>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-5 text-[10px] px-2"
                                                    onClick={() => saveConfig({ ...config, metaPromptTemplate: DEFAULT_META_PROMPT_TEMPLATE })}
                                                >
                                                    {t('workbench.reset_default')}
                                                </Button>
                                            </div>
                                            <textarea
                                                className="w-full h-[300px] rounded-md border border-input bg-background px-3 py-2 text-xs font-mono shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                                                value={config.metaPromptTemplate}
                                                onChange={(e) => saveConfig({ ...config, metaPromptTemplate: e.target.value })}
                                                spellCheck={false}
                                            />
                                            <p className="text-[10px] text-muted-foreground">
                                                Available variables: <code className="bg-muted px-1 rounded">{'{{context_type}}'}</code>, <code className="bg-muted px-1 rounded">{'{{context_name}}'}</code>, <code className="bg-muted px-1 rounded">{'{{session_info}}'}</code>, <code className="bg-muted px-1 rounded">{'{{goal}}'}</code>, <code className="bg-muted px-1 rounded">{'{{data}}'}</code>
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex-1 p-4 flex flex-col gap-3 min-h-0">
                            <div className="space-y-1.5 flex-1 flex flex-col min-h-0">
                                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{t('workbench.requirements')}</label>
                                <textarea
                                    className="flex-1 w-full rounded-md border border-input bg-background px-3 py-2 text-xs shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                                    placeholder={t('workbench.requirements_placeholder')}
                                    value={requirements}
                                    onChange={(e) => setRequirements(e.target.value)}
                                />
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="shrink-0"
                                    onClick={() => setShowPreview(true)}
                                    title={t('workbench.preview_data') || 'Preview Data'}
                                >
                                    <Braces className="h-4 w-4" />
                                </Button>
                                <Button className="flex-1 shrink-0" onClick={handleGenerate} disabled={isGenerating}>
                                    {isGenerating ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            {t('workbench.generating')}
                                        </>
                                    ) : (
                                        <>
                                            <Play className="mr-2 h-4 w-4" />
                                            {t('workbench.generate')}
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Right Panel: Output */}
                    <div className="flex-1 flex flex-col bg-muted/10 border-l">
                        <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/20">
                            <label className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">{t('workbench.output')}</label>
                            <div className="flex items-center gap-2">
                                <Button variant="ghost" size="sm" className="h-6 text-xs hover:bg-accent hover:text-accent-foreground" onClick={() => navigator.clipboard.writeText(generatedPrompt)}>
                                    <Copy className="h-3 w-3 mr-1.5" /> {t('workbench.copy')}
                                </Button>
                                <Button variant="ghost" size="sm" className="h-6 text-xs hover:bg-accent hover:text-accent-foreground" onClick={() => setGeneratedPrompt('')}>
                                    <Eraser className="h-3 w-3 mr-1.5" /> {t('workbench.reset_output')}
                                </Button>
                            </div>
                        </div>
                        <div className="flex-1 relative">
                            <textarea
                                className="absolute inset-0 w-full h-full p-4 bg-zinc-50 dark:bg-zinc-950 text-xs font-mono resize-none focus:outline-none text-zinc-800 dark:text-zinc-200"
                                value={generatedPrompt}
                                onChange={(e) => setGeneratedPrompt(e.target.value)}
                                spellCheck={false}
                                placeholder={t('workbench.output_placeholder')}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {showPreview && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-4xl h-[80vh] bg-background border rounded-xl shadow-2xl flex flex-col overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
                            <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-sm">{t('workbench.llm_request_preview')}</h3>
                                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                                    {t('workbench.char_count', { count: constructMetaPrompt().length })}
                                </span>
                            </div>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowPreview(false)}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="flex-1 overflow-auto p-4">
                            <pre className="text-xs font-mono whitespace-pre-wrap break-all">
                                {constructMetaPrompt()}
                            </pre>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
}
