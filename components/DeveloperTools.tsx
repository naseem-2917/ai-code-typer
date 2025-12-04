import React, { useState } from "react";
import { generateErrorPracticeSnippet } from "../services/geminiService";

export const DeveloperTools = () => {
    const [logs, setLogs] = useState<string[]>([]);
    const [open, setOpen] = useState(false);

    if (import.meta.env.VITE_DEVTOOLS_ENABLED !== "true") return null;

    const runTest = (stats: any) => {
        generateErrorPracticeSnippet(stats).then((snippet) => {
            setLogs((prev) => [
                ...prev,
                JSON.stringify({ stats, snippet }, null, 2)
            ]);
        });
    };

    return (
        <div
            style={{
                position: "fixed",
                top: 0,
                right: 0,
                width: open ? "400px" : "0px",
                height: "100vh",
                background: "#111",
                color: "white",
                overflow: "auto",
                transition: "0.3s",
                padding: open ? "10px" : "0",
                zIndex: 999999,
            }}
        >
            <button
                style={{
                    position: "absolute",
                    left: "-90px",
                    top: "20px",
                    padding: "6px 12px",
                    background: "black",
                    color: "white",
                    borderRadius: "4px",
                }}
                onClick={() => setOpen(!open)}
            >
                DevTools
            </button>

            {open && (
                <>
                    <h2 className="text-lg font-bold mb-3">Developer Testing Panel</h2>

                    <button
                        className="bg-blue-600 p-2 rounded mb-2 w-full"
                        onClick={() =>
                            runTest({
                                a: { errors: 10, attempts: 20 },
                                b: { errors: 5, attempts: 10 },
                                c: { errors: 2, attempts: 50 },
                            })
                        }
                    >
                        Test: Mixed Errors
                    </button>

                    <button
                        className="bg-blue-600 p-2 rounded mb-2 w-full"
                        onClick={() =>
                            runTest({
                                a: { errors: 5, attempts: 6 },
                                b: { errors: 4, attempts: 5 },
                                c: { errors: 3, attempts: 4 },
                                d: { errors: 2, attempts: 3 },
                                e: { errors: 1, attempts: 2 },
                            })
                        }
                    >
                        Test: Only Top 5 Keys
                    </button>

                    <button
                        className="bg-blue-600 p-2 rounded mb-2 w-full"
                        onClick={() =>
                            runTest({
                                a: { errors: 20, attempts: 30 },
                                b: { errors: 15, attempts: 20 },
                                c: { errors: 10, attempts: 15 },
                                d: { errors: 5, attempts: 10 },
                                e: { errors: 3, attempts: 5 },
                                f: { errors: 1, attempts: 2 },
                                g: { errors: 1, attempts: 2 },
                            })
                        }
                    >
                        Test: Overflow Keys (Many Keys)
                    </button>

                    <h3 className="mt-4 mb-2 font-semibold text-yellow-300">
                        OUTPUT LOGS
                    </h3>

                    <pre
                        style={{
                            background: "#222",
                            padding: "10px",
                            borderRadius: "4px",
                            whiteSpace: "pre-wrap",
                            fontSize: "12px",
                        }}
                    >
                        {logs.join("\n\n")}
                    </pre>
                </>
            )}
        </div>
    );
};
