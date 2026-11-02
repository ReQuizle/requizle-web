import React, {useState, useEffect, useRef, useCallback} from 'react';
import {ChevronLeft, ChevronRight, PanelLeft, PanelRight, Menu, X} from 'lucide-react';
import {motion, AnimatePresence} from 'framer-motion';
import {clsx} from 'clsx';
import {Logo} from './Logo';
import {AnimatedBackground} from './AnimatedBackground';
import {useQuizStore} from '../store/useQuizStore';
import {getFocusableElements, keepFocusInside} from './modalA11y';

interface LayoutProps {
    leftSidebar: React.ReactNode;
    center: React.ReactNode;
    rightSidebar: React.ReactNode;
}

// Below Tailwind's lg breakpoint the sidebars become drawers over the study view
const isMobileWidth = () => window.innerWidth < 1024;

export const Layout: React.FC<LayoutProps> = ({leftSidebar, center, rightSidebar}) => {
    const animatedBackground = useQuizStore((s) => s.settings.animatedBackground);

    const [leftSidebarVisible, setLeftSidebarVisible] = useState(() => !isMobileWidth());
    const [rightSidebarVisible, setRightSidebarVisible] = useState(() => !isMobileWidth());
    const [isMobile, setIsMobile] = useState(isMobileWidth);
    const prevIsMobileRef = useRef(isMobileWidth());
    const leftSidebarRef = useRef<HTMLDivElement>(null);
    const rightSidebarRef = useRef<HTMLDivElement>(null);
    const mobileDrawerOpen = isMobile && (leftSidebarVisible || rightSidebarVisible);

    const closeSidebars = useCallback(() => {
        if (isMobile) {
            setLeftSidebarVisible(false);
            setRightSidebarVisible(false);
        }
    }, [isMobile]);

    useEffect(() => {
        const handleResize = () => {
            const mobile = isMobileWidth();
            const wasMobile = prevIsMobileRef.current;

            if (mobile !== wasMobile) {
                prevIsMobileRef.current = mobile;
                setIsMobile(mobile);
                setLeftSidebarVisible(!mobile);
                setRightSidebarVisible(!mobile);
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // The open drawer on mobile acts as a dialog: it takes focus, keeps Tab inside, and closes on Escape
    useEffect(() => {
        if (!mobileDrawerOpen) return;
        const activeSidebar = leftSidebarVisible ? leftSidebarRef.current : rightSidebarRef.current;
        if (!activeSidebar) return;
        // The sidebar's content loads on first open, so the drawer itself takes focus if nothing else can
        (getFocusableElements(activeSidebar)[0] ?? activeSidebar).focus();

        // Listening on window lets a dialog or menu opened from the drawer handle the key first
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.defaultPrevented) return;
            if (e.key === 'Escape') {
                closeSidebars();
            } else if (e.key === 'Tab') {
                keepFocusInside(e, activeSidebar);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [mobileDrawerOpen, leftSidebarVisible, rightSidebarVisible, closeSidebars]);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col overflow-hidden relative">
            {animatedBackground && <AnimatedBackground />}

            <header className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between px-4 py-3">
                    <button
                        type="button"
                        onClick={() => {
                            setRightSidebarVisible(false);
                            setLeftSidebarVisible(!leftSidebarVisible);
                        }}
                        className={leftSidebarVisible ? 'btn-icon-active' : 'btn-icon'}
                        aria-label={leftSidebarVisible ? 'Close subjects panel' : 'Open subjects panel'}
                    >
                        {leftSidebarVisible ? <X size={20} /> : <Menu size={20} />}
                    </button>

                    <div className="flex items-center gap-2">
                        <Logo size={28} />
                        <h1 className="text-lg font-semibold bg-gradient-to-r from-indigo-600 to-indigo-400 bg-clip-text text-transparent">
                            ReQuizle
                        </h1>
                    </div>

                    <button
                        type="button"
                        onClick={() => {
                            setLeftSidebarVisible(false);
                            setRightSidebarVisible(!rightSidebarVisible);
                        }}
                        className={rightSidebarVisible ? 'btn-icon-active' : 'btn-icon'}
                        aria-label={rightSidebarVisible ? 'Close tools panel' : 'Open tools panel'}
                    >
                        {rightSidebarVisible ? <X size={20} /> : <PanelRight size={20} />}
                    </button>
                </div>
            </header>

            <AnimatePresence>
                {mobileDrawerOpen && (
                    <motion.div
                        initial={{opacity: 0}}
                        animate={{opacity: 1}}
                        exit={{opacity: 0}}
                        transition={{duration: 0.2}}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-20 lg:hidden"
                        onClick={closeSidebars}
                    />
                )}
            </AnimatePresence>

            <div className="flex flex-1 lg:flex-row pt-14 lg:pt-0 relative">
                <AnimatePresence initial={false}>
                    {leftSidebarVisible && (
                        <motion.div
                            ref={leftSidebarRef}
                            initial={isMobile ? {x: '-100%'} : {width: 0, opacity: 0}}
                            animate={isMobile ? {x: 0} : {width: 320, opacity: 1}}
                            exit={isMobile ? {x: '-100%'} : {width: 0, opacity: 0}}
                            transition={{duration: 0.3, ease: 'easeInOut'}}
                            role={isMobile ? 'dialog' : 'complementary'}
                            aria-modal={isMobile ? 'true' : undefined}
                            tabIndex={isMobile ? -1 : undefined}
                            aria-label="Subjects panel"
                            className={clsx(
                                'bg-white dark:bg-slate-900 lg:bg-white/85 lg:dark:bg-slate-900/85 backdrop-blur-md border-r border-slate-200 dark:border-slate-700 shrink-0 overflow-hidden',
                                'fixed lg:relative z-[35]',
                                'top-14 lg:top-0 left-0',
                                'w-[85vw] max-w-[320px] lg:w-auto',
                                'h-[calc(100vh-3.5rem)] lg:h-screen'
                            )}
                        >
                            <div className="w-full lg:w-80 h-full overflow-y-auto">{leftSidebar}</div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <main
                    className="flex-1 relative z-0 lg:z-10 flex flex-col min-h-[calc(100vh-3.5rem)] lg:min-h-screen lg:h-screen overflow-hidden"
                    inert={mobileDrawerOpen}
                >
                    {center}
                </main>

                <AnimatePresence initial={false}>
                    {rightSidebarVisible && (
                        <motion.div
                            ref={rightSidebarRef}
                            initial={isMobile ? {x: '100%'} : {width: 0, opacity: 0}}
                            animate={isMobile ? {x: 0} : {width: 320, opacity: 1}}
                            exit={isMobile ? {x: '100%'} : {width: 0, opacity: 0}}
                            transition={{duration: 0.3, ease: 'easeInOut'}}
                            role={isMobile ? 'dialog' : 'complementary'}
                            aria-modal={isMobile ? 'true' : undefined}
                            tabIndex={isMobile ? -1 : undefined}
                            aria-label="Tools panel"
                            className={clsx(
                                'bg-white dark:bg-slate-900 lg:bg-white/85 lg:dark:bg-slate-900/85 backdrop-blur-md border-l border-slate-200 dark:border-slate-700 shrink-0 overflow-hidden',
                                'fixed lg:relative z-[35]',
                                'top-14 lg:top-0 right-0',
                                'w-[85vw] max-w-[320px] lg:w-auto',
                                'h-[calc(100vh-3.5rem)] lg:h-screen'
                            )}
                        >
                            <div className="w-full lg:w-80 h-full overflow-y-auto">{rightSidebar}</div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <button
                type="button"
                onClick={() => setLeftSidebarVisible(!leftSidebarVisible)}
                className={clsx(
                    'hidden lg:flex fixed z-30 transition-all duration-300 shadow-lg',
                    leftSidebarVisible
                        ? 'top-1/2 -translate-y-1/2 left-80 rounded-r-lg bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border-y border-r border-slate-300 dark:border-slate-600 hover:bg-white dark:hover:bg-slate-800'
                        : 'top-1/2 -translate-y-1/2 left-0 rounded-r-lg bg-indigo-600 text-on-accent hover:bg-indigo-700 border border-indigo-700 shadow-xl'
                )}
                aria-label={leftSidebarVisible ? 'Hide subjects panel' : 'Show subjects panel'}
            >
                <div className="p-2">{leftSidebarVisible ? <ChevronLeft size={18} /> : <PanelLeft size={18} />}</div>
            </button>

            <button
                type="button"
                onClick={() => setRightSidebarVisible(!rightSidebarVisible)}
                className={clsx(
                    'hidden lg:flex fixed z-30 transition-all duration-300 shadow-lg',
                    rightSidebarVisible
                        ? 'top-1/2 -translate-y-1/2 right-80 rounded-l-lg bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border-y border-l border-slate-300 dark:border-slate-600 hover:bg-white dark:hover:bg-slate-800'
                        : 'top-1/2 -translate-y-1/2 right-0 rounded-l-lg bg-indigo-600 text-on-accent hover:bg-indigo-700 border border-indigo-700 shadow-xl'
                )}
                aria-label={rightSidebarVisible ? 'Hide tools panel' : 'Show tools panel'}
            >
                <div className="p-2">{rightSidebarVisible ? <ChevronRight size={18} /> : <PanelRight size={18} />}</div>
            </button>
        </div>
    );
};
