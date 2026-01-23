import React, { useEffect, useRef } from 'react';
import 'xterm/css/xterm.css';

interface TerminalProps {
    streamUrl?: string; // WebSocket URL
}

export const WebTerminal: React.FC<TerminalProps> = ({ streamUrl }) => {
    const terminalRef = useRef<HTMLDivElement>(null);
    const xtermRef = useRef<any>(null);

    useEffect(() => {
        if (!terminalRef.current) return;

        let term: any;
        let fitAddon: any;

        // Dynamic import to prevent SSR crash
        const initTerminal = async () => {
            const { Terminal } = await import('xterm');
            const { FitAddon } = await import('xterm-addon-fit');

            term = new Terminal({
                cursorBlink: true,
                theme: {
                    background: '#09090b', // zinc-950
                    foreground: '#f4f4f5', // zinc-100
                },
                fontFamily: 'Menlo, Monaco, "Courier New", monospace',
                fontSize: 13,
                convertEol: true,
            });

            fitAddon = new FitAddon();
            term.loadAddon(fitAddon);

            term.open(terminalRef.current!);
            fitAddon.fit();

            term.writeln('\x1b[1;32mWelcome to Code Review Bot Terminal\x1b[0m');
            term.writeln('Connecting to Sandbox...');

            xtermRef.current = term;

            // Mock stream or real connection
            if (streamUrl) {
                // In a real scenario, connect WebSocket here
                term.writeln(`Connecting to ${streamUrl}...`);
            }
        };

        initTerminal();

        const handleResize = () => fitAddon?.fit();
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            term?.dispose();
        };
    }, [streamUrl]);

    return (
        <div className="h-96 w-full rounded-md border border-border overflow-hidden bg-card p-1">
            <div ref={terminalRef} className="h-full w-full" />
        </div>
    );
};
