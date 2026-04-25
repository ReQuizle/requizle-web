import React, {useState, useEffect, useRef, useCallback} from 'react';
import {ChevronLeft, ChevronRight, PanelLeft, PanelRight, Menu, X} from 'lucide-react';
import {motion, AnimatePresence} from 'framer-motion';
import {clsx} from 'clsx';
import {Logo} from './Logo';
import {useQuizStore} from '../store/useQuizStore';

interface LayoutProps {
    leftSidebar: React.ReactNode;
    center: React.ReactNode;
    rightSidebar: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({leftSidebar, center, rightSidebar}) => {
    // Initialize based on current viewport
    const getInitialMobile = () => typeof window !== 'undefined' && window.innerWidth < 1024;
    const animatedBackground = useQuizStore(s => s.settings.animatedBackground);

    const [leftSidebarVisible, setLeftSidebarVisible] = useState(() => !getInitialMobile());
    const [rightSidebarVisible, setRightSidebarVisible] = useState(() => !getInitialMobile());
    const [isMobile, setIsMobile] = useState(getInitialMobile);
    const prevIsMobileRef = useRef(getInitialMobile());
    const leftSidebarRef = useRef<HTMLElement>(null);
    const rightSidebarRef = useRef<HTMLElement>(null);
    const mainContentRef = useRef<HTMLElement>(null);
    const mobileDrawerOpen = isMobile && (leftSidebarVisible || rightSidebarVisible);

    const closeSidebars = useCallback(() => {
        if (isMobile) {
            setLeftSidebarVisible(false);
            setRightSidebarVisible(false);
        }
    }, [isMobile]);

    // Handle viewport changes
    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 1024;
            const wasMobile = prevIsMobileRef.current;

            // Only update sidebar visibility when crossing the breakpoint
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

    useEffect(() => {
        if (!mobileDrawerOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                closeSidebars();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [mobileDrawerOpen, closeSidebars]);

    useEffect(() => {
        if (!mobileDrawerOpen) return;
        const activeSidebar = leftSidebarVisible ? leftSidebarRef.current : rightSidebarRef.current;
        if (!activeSidebar) return;
        const focusable = activeSidebar.querySelector<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        focusable?.focus();
    }, [mobileDrawerOpen, leftSidebarVisible, rightSidebarVisible]);

    useEffect(() => {
        const main = mainContentRef.current;
        if (!main) return;
        if (mobileDrawerOpen) {
            main.setAttribute('inert', '');
        } else {
            main.removeAttribute('inert');
        }
        return () => {
            main.removeAttribute('inert');
        };
    }, [mobileDrawerOpen]);

    useEffect(() => {
        if (!mobileDrawerOpen) return;
        const activeSidebar = leftSidebarVisible ? leftSidebarRef.current : rightSidebarRef.current;
        if (!activeSidebar) return;

        const getFocusable = () =>
            Array.from(
                activeSidebar.querySelectorAll<HTMLElement>(
                    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
                )
            );

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key !== 'Tab') return;
            const focusable = getFocusable();
            if (focusable.length === 0) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            const active = document.activeElement as HTMLElement | null;
            if (e.shiftKey && active === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && active === last) {
                e.preventDefault();
                first.focus();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [mobileDrawerOpen, leftSidebarVisible, rightSidebarVisible]);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col overflow-hidden relative">
            {animatedBackground && (
                <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden>
                    <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob dark:opacity-30"></div>
                    <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000 dark:opacity-30"></div>
                    <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000 dark:opacity-30"></div>
                </div>
            )}

            {/* Mobile Header Bar */}
            <header className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between px-4 py-3">
                    <button
                        onClick={() => {
                            setRightSidebarVisible(false);
                            setLeftSidebarVisible(!leftSidebarVisible);
                        }}
                        className={leftSidebarVisible ? "btn-icon-active" : "btn-icon"}
                        aria-label={leftSidebarVisible ? "Close subjects menu" : "Open subjects menu"}
                    >
                        {leftSidebarVisible ? <X size={20} /> : <Menu size={20} />}
                    </button>

                    <div className="flex items-center gap-2">
                        <Logo size={28} />
                        <span className="text-lg font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                            ReQuizle
                        </span>
                    </div>

                    <button
                        onClick={() => {
                            setLeftSidebarVisible(false);
                            setRightSidebarVisible(!rightSidebarVisible);
                        }}
                        className={rightSidebarVisible ? "btn-icon-active" : "btn-icon"}
                        aria-label={rightSidebarVisible ? "Close tools panel" : "Open tools panel"}
                    >
                        <PanelRight size={20} />
                    </button>
                </div>
            </header>

            {/* Mobile Backdrop Overlay */}
            <AnimatePresence>
                {isMobile && (leftSidebarVisible || rightSidebarVisible) && (
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

            {/* Main Layout Container */}
            <div className="flex flex-1 lg:flex-row pt-14 lg:pt-0">
                {/* Left Sidebar */}
                <AnimatePresence>
                    {leftSidebarVisible && (
                        <motion.aside
                            ref={leftSidebarRef}
                            initial={isMobile ? {x: '-100%'} : {x: -320, opacity: 0}}
                            animate={isMobile ? {x: 0} : {x: 0, opacity: 1}}
                            exit={isMobile ? {x: '-100%'} : {x: -320, opacity: 0}}
                            transition={{duration: 0.3, ease: 'easeInOut'}}
                            role={isMobile ? 'dialog' : undefined}
                            aria-modal={isMobile ? 'true' : undefined}
                            aria-label={isMobile ? 'Subjects panel' : undefined}
                            className={clsx(
                                "bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-r border-slate-200 dark:border-slate-700 flex-shrink-0 overflow-y-auto",
                                // Mobile: fixed overlay drawer
                                "fixed lg:relative z-30",
                                "top-14 lg:top-0 left-0",
                                "w-[85vw] max-w-[320px] lg:w-80",
                                "h-[calc(100vh-3.5rem)] lg:h-screen"
                            )}
                        >
                            {leftSidebar}
                        </motion.aside>
                    )}
                </AnimatePresence>

                {/* Center Area */}
                <main
                    ref={mainContentRef}
                    className="flex-1 relative z-10 flex flex-col min-h-[calc(100vh-3.5rem)] lg:min-h-screen lg:h-screen overflow-hidden"
                    aria-hidden={mobileDrawerOpen}
                >
                    {center}
                </main>

                {/* Right Sidebar */}
                <AnimatePresence>
                    {rightSidebarVisible && (
                        <motion.aside
                            ref={rightSidebarRef}
                            initial={isMobile ? {x: '100%'} : {x: 320, opacity: 0}}
                            animate={isMobile ? {x: 0} : {x: 0, opacity: 1}}
                            exit={isMobile ? {x: '100%'} : {x: 320, opacity: 0}}
                            transition={{duration: 0.3, ease: 'easeInOut'}}
                            role={isMobile ? 'dialog' : undefined}
                            aria-modal={isMobile ? 'true' : undefined}
                            aria-label={isMobile ? 'Tools panel' : undefined}
                            className={clsx(
                                "bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-l border-slate-200 dark:border-slate-700 flex-shrink-0 overflow-y-auto",
                                // Mobile: fixed overlay drawer
                                "fixed lg:relative z-30",
                                "top-14 lg:top-0 right-0",
                                "w-[85vw] max-w-[320px] lg:w-80",
                                "h-[calc(100vh-3.5rem)] lg:h-screen"
                            )}
                        >
                            {rightSidebar}
                        </motion.aside>
                    )}
                </AnimatePresence>
            </div>

            {/* Desktop Toggle Buttons - Hidden on Mobile */}
            {/* Left Sidebar Toggle */}
            <button
                onClick={() => setLeftSidebarVisible(!leftSidebarVisible)}
                className={clsx(
                    "hidden lg:flex fixed z-30 transition-all duration-300 shadow-lg",
                    leftSidebarVisible
                        ? "top-1/2 -translate-y-1/2 left-80 rounded-r-lg bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border-y border-r border-slate-300 dark:border-slate-600 hover:bg-white dark:hover:bg-slate-800"
                        : "top-1/2 -translate-y-1/2 left-0 rounded-r-lg bg-indigo-600 text-white hover:bg-indigo-700 border border-indigo-700 shadow-xl"
                )}
                aria-label={leftSidebarVisible ? "Hide left sidebar" : "Show left sidebar"}
            >
                <div className="p-2">
                    {leftSidebarVisible ? (
                        <ChevronLeft size={18} />
                    ) : (
                        <PanelLeft size={18} />
                    )}
                </div>
            </button>

            {/* Right Sidebar Toggle */}
            <button
                onClick={() => setRightSidebarVisible(!rightSidebarVisible)}
                className={clsx(
                    "hidden lg:flex fixed z-30 transition-all duration-300 shadow-lg",
                    rightSidebarVisible
                        ? "top-1/2 -translate-y-1/2 right-80 rounded-l-lg bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border-y border-l border-slate-300 dark:border-slate-600 hover:bg-white dark:hover:bg-slate-800"
                        : "top-1/2 -translate-y-1/2 right-0 rounded-l-lg bg-indigo-600 text-white hover:bg-indigo-700 border border-indigo-700 shadow-xl"
                )}
                aria-label={rightSidebarVisible ? "Hide right sidebar" : "Show right sidebar"}
            >
                <div className="p-2">
                    {rightSidebarVisible ? (
                        <ChevronRight size={18} />
                    ) : (
                        <PanelRight size={18} />
                    )}
                </div>
            </button>
        </div>
    );
};
