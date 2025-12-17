import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export default function Popup() {
    const { t } = useTranslation('popup');
    const [description, setDescription] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [recordCount, setRecordCount] = useState(0);
    const [loading, setLoading] = useState(true);

    const checkStatus = async () => {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs.length === 0 || !tabs[0].id) return;
        const tabId = tabs[0].id;

        chrome.runtime.sendMessage({ type: 'GET_STATUS', tabId }, (response) => {
            setLoading(false);
            if (chrome.runtime.lastError) {
                return;
            }
            if (response && response.recording) {
                setIsRecording(true);
                setRecordCount(response.count);
                if (!isRecording) setDescription(response.description);
            } else {
                setIsRecording(false);
            }
        });
    };

    useEffect(() => {
        checkStatus();
        const interval = setInterval(checkStatus, 1000);
        return () => clearInterval(interval);
    }, []);

    const handleStart = async () => {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs.length === 0 || !tabs[0].id) return;
        const tabId = tabs[0].id;

        chrome.runtime.sendMessage({ type: 'START_RECORDING', tabId, description }, (res) => {
            if (res && res.success) {
                setIsRecording(true);
                setRecordCount(0);
            } else {
                console.error(res?.error);
            }
        });
    };

    const handleStop = async () => {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs.length === 0 || !tabs[0].id) return;
        const tabId = tabs[0].id;

        chrome.runtime.sendMessage({ type: 'STOP_RECORDING', tabId }, () => {
            setIsRecording(false);
            setDescription('');
        });
    };

    const openDashboard = () => {
        chrome.runtime.openOptionsPage();
    };

    if (loading) return <div className="p-4 w-64 flex justify-center">{t('loading')}</div>;

    return (
        <div className="p-3 w-80 space-y-3">
            <div className="flex items-center gap-2">
                <img src="/skillsmith-logo.svg" alt="Web API SkillSmith" className="w-5 h-5" />
                <h1 className="text-lg font-medium">{t('title')}</h1>
                <span className="text-xs text-muted-foreground">v{chrome.runtime.getManifest().version}</span>
            </div>

            {!isRecording ? (
                <div className="space-y-3">
                    <Textarea
                        placeholder={t('description_placeholder')}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="min-h-[72px] text-xs resize-none"
                    />
                    <div className="grid grid-cols-2 gap-2">
                        <Button onClick={handleStart} className="w-full h-9">
                            {t('start')}
                        </Button>
                        <Button variant="outline" onClick={openDashboard} className="w-full h-9">
                            {t('open_dashboard')}
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="space-y-3">
                    <div className="p-3 bg-secondary rounded-md">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-xs font-semibold uppercase text-muted-foreground">{t('recording')}</p>
                                <p className="text-sm font-medium truncate max-w-[180px]" title={description}>{description || t('no_description')}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xl font-bold leading-none">{recordCount}</p>
                                <p className="text-[10px] text-muted-foreground">{t('requests_suffix')}</p>
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <Button variant="destructive" onClick={handleStop} className="w-full h-9">
                            {t('stop')}
                        </Button>
                        <Button variant="ghost" onClick={openDashboard} className="w-full h-9">
                            {t('open_dashboard')}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
