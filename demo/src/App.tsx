import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { parseBSML, transform } from 'bsml-renderer';
import type { BSMLReactFlowData } from 'bsml-renderer/transformer/types.js';
import { BSMLCanvas } from 'bsml-renderer/react/components/BSMLCanvas.js';
import { DEFAULT_BSML } from './defaultCode.js';

const MIN_EDITOR_WIDTH_PERCENT = 20;
const MAX_EDITOR_WIDTH_PERCENT = 80;

export default function App() {
    const [code, setCode] = useState<string>(DEFAULT_BSML);
    const [graphData, setGraphData] = useState<BSMLReactFlowData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [editorWidthPercent, setEditorWidthPercent] = useState<number>(50);
    const [isResizing, setIsResizing] = useState<boolean>(false);

    // Track whether we've produced at least one valid graph
    const lastGoodData = useRef<BSMLReactFlowData | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        try {
            const ast = parseBSML(code);
            const data = transform(ast);
            lastGoodData.current = data;
            setGraphData(data);
            setError(null);
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e);
            setError(message);
            // Keep the previous valid graph on screen
        }
    }, [code]);

    const displayData = graphData ?? lastGoodData.current;
    const handleDividerPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
        event.preventDefault();
        setIsResizing(true);
        event.currentTarget.setPointerCapture(event.pointerId);
    };

    const handleDividerPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
        if (!isResizing || !containerRef.current) {
            return;
        }

        const rect = containerRef.current.getBoundingClientRect();
        const nextPercent = ((event.clientX - rect.left) / rect.width) * 100;
        const clampedPercent = Math.max(
            MIN_EDITOR_WIDTH_PERCENT,
            Math.min(MAX_EDITOR_WIDTH_PERCENT, nextPercent),
        );
        setEditorWidthPercent(clampedPercent);
    };

    const handleDividerPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
        if (isResizing) {
            event.currentTarget.releasePointerCapture(event.pointerId);
            setIsResizing(false);
        }
    };

    return (
        <div className={`app-container${isResizing ? ' is-resizing' : ''}`} ref={containerRef}>
            {/* ── Left Pane: Editor ─────────────────────────────── */}
            <div className="pane pane-editor" style={{ width: `${editorWidthPercent}%` }}>
                <Editor
                    defaultLanguage="plaintext"
                    defaultValue={DEFAULT_BSML}
                    onChange={(value) => setCode(value ?? '')}
                    theme="vs-dark"
                    options={{
                        fontSize: 13,
                        minimap: { enabled: false },
                        lineNumbers: 'on',
                        wordWrap: 'on',
                        scrollBeyondLastLine: false,
                        padding: { top: 12 },
                    }}
                />
            </div>

            <div
                className="pane-divider"
                role="separator"
                aria-label="Resize panes"
                aria-orientation="vertical"
                onPointerDown={handleDividerPointerDown}
                onPointerMove={handleDividerPointerMove}
                onPointerUp={handleDividerPointerUp}
                onPointerCancel={handleDividerPointerUp}
            />

            {/* ── Right Pane: Canvas ───────────────────────────── */}
            <div className="pane pane-canvas">
                {displayData ? (
                    <BSMLCanvas data={displayData} />
                ) : (
                    <div className="canvas-placeholder">
                        Type some BSML on the left to see the graph here.
                    </div>
                )}
            </div>

            {/* ── Error Banner ─────────────────────────────────── */}
            {error && (
                <div className="error-banner">
                    <span className="error-banner-icon">⚠</span>
                    <pre className="error-banner-text">{error}</pre>
                    <button
                        className="error-banner-dismiss"
                        onClick={() => setError(null)}
                        aria-label="Dismiss error"
                    >
                        ✕
                    </button>
                </div>
            )}
        </div>
    );
}
