import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Moon, Sun, Laptop, Languages, Check } from 'lucide-react';
import SessionList from './components/SessionList';
import SessionDetail from './components/SessionDetail';
import { storage } from '@/lib/storage';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"

type View = 'list' | 'detail';

export default function Options() {
    const { t, i18n } = useTranslation('options');
    const [view, setView] = useState<View>('list');
    const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
    const [theme, setTheme] = useState('system');

    useEffect(() => {
        storage.getSettings().then(s => {
            setTheme(s.theme);
        });
    }, []);

    const handleSelectSession = (id: string) => {
        setSelectedSessionId(id);
        setView('detail');
    };

    const handleBack = () => {
        setSelectedSessionId(null);
        setView('list');
    };

    const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
        setTheme(newTheme);
        storage.setSettings({ theme: newTheme });
    };

    const handleLangChange = (lang: string) => {
        storage.setSettings({ locale: lang as 'en' | 'zh' });
        i18n.changeLanguage(lang);
    };

    const ThemeIcon = theme === 'light' ? Sun : (theme === 'dark' ? Moon : Laptop);

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col">
            <header className="border-b px-4 py-3 flex items-center justify-between sticky top-0 bg-background/95 backdrop-blur z-10 transition-colors">
                <div className="flex items-center gap-2">
                    <img src="/skillsmith-logo.svg" alt="Web API SkillSmith" className="w-6 h-6" />
                    <h1 className="text-lg font-medium tracking-tight">{t('title')}</h1>
                </div>
                <div className="flex items-center gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                <Languages className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>{t('language_title', { defaultValue: 'Language' })}</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleLangChange('en')}>
                                <span className="flex items-center justify-between w-full">
                                    English
                                    {i18n.language === 'en' && <Check className="h-4 w-4 ml-2" />}
                                </span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleLangChange('zh')}>
                                <span className="flex items-center justify-between w-full">
                                    中文 (Chinese)
                                    {i18n.language === 'zh' && <Check className="h-4 w-4 ml-2" />}
                                </span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                <ThemeIcon className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>{t('appearance_title', { defaultValue: 'Theme' })}</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleThemeChange('light')}>
                                <span className="flex items-center gap-2 w-full">
                                    <Sun className="h-4 w-4" />
                                    {t('themes.light')}
                                    {theme === 'light' && <Check className="h-4 w-4 ml-auto" />}
                                </span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleThemeChange('dark')}>
                                <span className="flex items-center gap-2 w-full">
                                    <Moon className="h-4 w-4" />
                                    {t('themes.dark')}
                                    {theme === 'dark' && <Check className="h-4 w-4 ml-auto" />}
                                </span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleThemeChange('system')}>
                                <span className="flex items-center gap-2 w-full">
                                    <Laptop className="h-4 w-4" />
                                    {t('themes.system')}
                                    {theme === 'system' && <Check className="h-4 w-4 ml-auto" />}
                                </span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Back button moved to SessionDetail */}
                </div>
            </header>

            <main className="flex-1 p-4 container mx-auto max-w-4xl animate-in fade-in duration-500">
                {view === 'list' && <SessionList onSelect={handleSelectSession} />}
                {view === 'detail' && selectedSessionId && (
                    <SessionDetail sessionId={selectedSessionId} onBack={handleBack} />
                )}
            </main>
        </div>
    );
}
