import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { parseBSML, transform } from 'bsml-renderer';
import type { BSMLReactFlowData } from 'bsml-renderer/transformer/types.js';
import { BSMLCanvas } from 'bsml-renderer/react/components/BSMLCanvas.js';
import { DEFAULT_BSML } from './defaultCode.js';

export default function App() {
    const [code, setCode] = useState<string>(DEFAULT_BSML);
    const [graphData, setGraphData] = useState<BSMLReactFlowData | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Track whether we've produced at least one valid graph
    const lastGoodData = useRef<BSMLReactFlowData | null>(null);

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

    return (
        <div className="app-container">
            {/* ── Left Pane: Editor ─────────────────────────────── */}
            <div className="pane pane-editor">
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
