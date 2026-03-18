import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, FileImage, Loader, CheckCircle, FileText, ClipboardList } from 'lucide-react';
import { autoScanPage, getMatchedContent, analyzeBlooms } from '../services/api';


const TranscriptionPanel = ({ answersheetId, page, onTranscriptionComplete, onAnswerNumbersDetected, prescanPageData }) => {
    const [transcription, setTranscription] = useState('');
    const [questions, setQuestions] = useState([]);
    const [diagrams, setDiagrams] = useState([]);
    const [matchedContent, setMatchedContent] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [detectedAnswerNums, setDetectedAnswerNums] = useState([]);
    const panelRef = useRef(null);

    // Blooms Taxonomy State
    const [selection, setSelection] = useState(null); // { text, x, y }
    const [bloomsResult, setBloomsResult] = useState(null);
    const [analyzing, setAnalyzing] = useState(false);


    useEffect(() => {
        if (answersheetId && page !== undefined) {
            performAutoScan();
        }
    }, [answersheetId, page]);

    useEffect(() => {
        if (answersheetId) {
            loadMatchedContent();
        }
    }, [answersheetId]);

    // Use selectionchange for device-independent tracking
    useEffect(() => {
        const handleSelectionChange = () => {
            const selectionObj = window.getSelection();
            const text = selectionObj.toString().trim();
            const contentNode = document.getElementById('transcription-content');

            if (text.length > 5 && contentNode && contentNode.contains(selectionObj.anchorNode)) {
                // Determine precision coordinates for the desktop floating button
                let x = 0, y = 0;
                try {
                    const range = selectionObj.getRangeAt(0);
                    const rect = range.getBoundingClientRect();
                    const panelRect = panelRef.current.getBoundingClientRect();
                    x = rect.left + (rect.width / 2) - panelRect.left;
                    y = rect.top - panelRect.top;
                } catch (e) {
                    // Fallback if range fails
                }

                setSelection({
                    text: text,
                    x: x || 0,
                    y: y || 0
                });
            } else {
                setSelection(null);
            }
        };

        document.addEventListener('selectionchange', handleSelectionChange);
        return () => {
            document.removeEventListener('selectionchange', handleSelectionChange);
        };
    }, []);

    const loadMatchedContent = async () => {
        try {
            const result = await getMatchedContent(answersheetId);
            if (result.success && result.matches) {
                // Create a map of question_number => match data
                const matchMap = {};
                result.matches.forEach(match => {
                    matchMap[match.question_number] = match;
                });
                setMatchedContent(matchMap);
            }
        } catch (err) {
            console.error('Failed to load matched content:', err);
        }
    };


    const performAutoScan = async () => {
        setLoading(true);
        setError(null);
        setTranscription('');
        setQuestions([]);
        setDiagrams([]);

        // Use prescan data if available (instant load)
        if (prescanPageData) {
            const transcriptionText = prescanPageData.transcription || '';
            setTranscription(transcriptionText);
            setQuestions(prescanPageData.questions || []);
            setDiagrams(prescanPageData.diagrams || []);
            onTranscriptionComplete?.(transcriptionText);

            let ansNums = prescanPageData.answer_numbers || [];
            
            // Regex fallback if Gemini missed JSON structure
            const regex = /\bans(?:wer)?\s*[-_.]?\s*(\d+)\s*[:.\-)]?/gi;
            let match;
            const regexNums = [];
            while ((match = regex.exec(transcriptionText)) !== null) {
                regexNums.push(parseInt(match[1]));
            }
            if (regexNums.length > 0) {
                ansNums = [...new Set([...ansNums, ...regexNums])].sort((a, b) => a - b);
            }

            setDetectedAnswerNums(ansNums);
            onAnswerNumbersDetected?.(ansNums);
            setLoading(false);
            return;
        }

        // Fallback: call API (will also cache for next time)
        try {
            const result = await autoScanPage(answersheetId, page);

            if (result.success) {
                const transcriptionText = result.transcription || '';
                setTranscription(transcriptionText);
                setQuestions(result.questions || []);
                setDiagrams(result.diagrams || []);
                onTranscriptionComplete?.(transcriptionText);

                let ansNums = result.answer_numbers || [];

                const regex = /\bans(?:wer)?\s*[-_.]?\s*(\d+)\s*[:.\-)]?/gi;
                let match;
                const regexNums = [];
                while ((match = regex.exec(transcriptionText)) !== null) {
                    regexNums.push(parseInt(match[1]));
                }
                if (regexNums.length > 0) {
                    ansNums = [...new Set([...ansNums, ...regexNums])].sort((a, b) => a - b);
                }

                setDetectedAnswerNums(ansNums);
                onAnswerNumbersDetected?.(ansNums);
            } else {
                setError('Failed to scan page automatically');
                setDetectedAnswerNums([]);
                onAnswerNumbersDetected?.([]);
            }
        } catch (err) {
            setError(err.message || 'An error occurred during automatic scanning');
            setDetectedAnswerNums([]);
            onAnswerNumbersDetected?.([]);
        } finally {
            setLoading(false);
        }
    };

    const handleAnalyzeBlooms = async () => {
        if (!selection) return;
        setAnalyzing(true);
        try {
            const result = await analyzeBlooms(selection.text);
            if (result.success) {
                setBloomsResult(result.analysis);
                setSelection(null); // Hide button
                // Clear selection
                window.getSelection().removeAllRanges();
            }
        } catch (err) {
            console.error(err);
            alert('Failed to analyze text');
        } finally {
            setAnalyzing(false);
        }
    };

    return (
        <div ref={panelRef} className="glass-strong h-full rounded-xl overflow-hidden flex flex-col relative">
            {/* Header */}
            <div className="p-4 border-b border-white border-opacity-10 flex justify-between items-center shrink-0 h-16">
                <h3 className="font-semibold flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary-400" />
                    Automatic AI Review
                </h3>
                <div className="flex items-center gap-2">
                    {detectedAnswerNums.length > 0 && (
                        <div className="flex items-center gap-1">
                            {detectedAnswerNums.map(num => (
                                <span key={num} className="text-[10px] font-bold bg-accent-500/20 text-accent-300 px-1.5 py-0.5 rounded-full border border-accent-500/30">
                                    Ans {num}
                                </span>
                            ))}
                        </div>
                    )}
                    {loading && <div className="text-xs text-primary-400 animate-pulse bg-primary-500/10 px-2 py-1 rounded-full border border-primary-500/20">Scanning...</div>}
                    {!loading && transcription && <div className="text-xs text-green-400 flex items-center gap-1 bg-green-500/10 px-2 py-1 rounded-full border border-green-500/20"><CheckCircle className="w-3 h-3" /> Complete</div>}
                </div>
            </div>

            {/* Content */}
            <div id="transcription-content" className="flex-1 overflow-auto p-4 md:p-6">
                {loading && (
                    <div className="flex flex-col items-center justify-center h-full">
                        <Loader className="w-12 h-12 text-primary-400 animate-spin mb-4" />
                        <p className="text-gray-400">Scanning page...</p>
                        <p className="text-xs text-gray-500 mt-2">Extracting handwriting and diagrams</p>
                    </div>
                )}

                {error && (
                    <div className="bg-red-500 bg-opacity-10 border border-red-500 rounded-lg p-4">
                        <p className="text-red-400">{error}</p>
                        <button
                            onClick={performAutoScan}
                            className="mt-2 text-xs text-red-300 underline hover:text-red-200"
                        >
                            Try Again
                        </button>
                    </div>
                )}

                {!loading && !error && (
                    <div className="space-y-6">
                        {/* Question Blocks */}
                        {questions.length > 0 ? (
                            <div className="space-y-4">
                                <h4 className="font-semibold text-base md:text-lg text-primary-400 flex items-center gap-2">
                                    <FileImage className="w-4 h-4 text-gray-400" />
                                    Identified Questions
                                </h4>
                                {questions.map((q, idx) => (
                                    <div key={idx} className="bg-white bg-opacity-5 rounded-lg border border-white border-opacity-10 overflow-hidden">
                                        <div className="bg-white bg-opacity-5 px-3 py-2 border-b border-white border-opacity-5 flex justify-between items-center">
                                            <span className="font-bold text-accent-400">Question {q.id}</span>
                                        </div>
                                        <div className="p-3 md:p-4 text-sm md:text-base select-text touch-auto" style={{ WebkitTouchCallout: 'default' }}>
                                            <p className="whitespace-pre-wrap leading-relaxed select-text">{q.content}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            /* Fallback to Full Text */
                            transcription && (
                                <div>
                                    <h4 className="font-semibold text-base md:text-lg mb-2 md:mb-3 text-primary-400 flex items-center gap-2">
                                        <FileImage className="w-4 h-4 text-gray-400" />
                                        Transcribed Text
                                    </h4>
                                    <div className="bg-white bg-opacity-5 rounded-lg p-3 md:p-4 border border-white border-opacity-10 text-sm md:text-base select-text touch-auto" style={{ WebkitTouchCallout: 'default' }}>
                                        <p className="whitespace-pre-wrap leading-relaxed select-text">{transcription}</p>
                                    </div>
                                </div>
                            )
                        )}

                        {/* Diagrams Gallery */}
                        {diagrams.length > 0 && (
                            <div className="space-y-4 mt-6">
                                <h4 className="font-semibold text-lg mb-3 flex items-center gap-2 text-accent-400">
                                    <Sparkles className="w-5 h-5" />
                                    Diagrams Detected ({diagrams.length})
                                </h4>
                                <div className="grid grid-cols-1 gap-4">
                                    {diagrams.map((diag, idx) => (
                                        <div key={idx} className="bg-white bg-opacity-5 rounded-lg p-3 border border-white border-opacity-10">
                                            <p className="text-xs text-gray-400 mb-2 italic">"{diag.description}"</p>
                                            {/* Note: Diagram images are not yet fully implemented in backend response, using placeholder if missing */}
                                            {diag.image ? (
                                                <img
                                                    src={diag.image}
                                                    alt={`Diagram ${idx + 1}`}
                                                    className="rounded-lg border border-white border-opacity-20 w-full"
                                                />
                                            ) : (
                                                <div className="h-32 bg-black/20 rounded flex items-center justify-center text-xs text-gray-500">
                                                    Image not available
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {!loading && !error && !transcription && (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <Sparkles className="w-16 h-16 text-gray-500 mb-4" />
                        <h4 className="text-xl font-semibold mb-2">Ready to Scan</h4>
                        <p className="text-gray-400">
                            Automatic scanning will begin when you navigate to a page
                        </p>
                    </div>
                )}
            </div>

            {/* Floating Analyze Button caused by selection */}
            {/* Bloom's Taxonomy Floating Action / Mobile Bar */}
            {selection && (
                <>
                    {/* Desktop Floating Button */}
                    <div
                        style={{
                            position: 'absolute',
                            top: selection.y - 45,
                            left: selection.x,
                            transform: 'translateX(-50%)',
                            zIndex: 50
                        }}
                        className="hidden md:flex gap-2"
                    >
                        <button
                            onClick={handleAnalyzeBlooms}
                            disabled={analyzing}
                            className="bg-primary-600 text-white px-3 py-1.5 rounded-full shadow-lg text-xs font-bold flex items-center gap-2 hover:bg-primary-500 transition-colors animate-in fade-in zoom-in duration-200 border border-white/20"
                        >
                            <Sparkles className="w-3 h-3" />
                            {analyzing ? (
                                <Loader className="w-3 h-3 animate-spin" />
                            ) : "Analyze Bloom's"}
                        </button>
                    </div>

                    {/* Mobile Fixed Bar */}
                    <div className="md:hidden fixed bottom-4 left-4 right-4 z-[100] animate-in slide-in-from-bottom-4 duration-300">
                        <div className="glass-strong p-3 rounded-2xl border border-primary-500/30 shadow-2xl flex items-center justify-between gap-4">
                            <div className="flex-1 min-w-0">
                                <p className="text-[10px] uppercase tracking-wider text-primary-400 font-bold mb-0.5">Selection Active</p>
                                <p className="text-xs text-gray-300 truncate">"{selection.text}"</p>
                            </div>
                            <button
                                onClick={handleAnalyzeBlooms}
                                disabled={analyzing}
                                className="bg-primary-500 hover:bg-primary-600 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm font-bold whitespace-nowrap"
                            >
                                {analyzing ? (
                                    <Loader className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Sparkles className="w-4 h-4" />
                                )}
                                Analyze
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* Bloom's Result Modal */}
            {bloomsResult && (
                <div className="absolute inset-0 z-40 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-[#0f1729] border border-white/10 rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
                        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
                            <h3 className="font-bold flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-purple-400" />
                                Bloom's Taxonomy Analysis
                            </h3>
                            <button onClick={() => setBloomsResult(null)} className="text-gray-400 hover:text-white">✕</button>
                        </div>
                        <div className="p-6 space-y-4">
                            {Object.entries(bloomsResult).map(([level, score]) => (
                                <div key={level}>
                                    <div className="flex justify-between text-xs mb-1 uppercase tracking-wider font-semibold text-gray-400">
                                        <span>{level}</span>
                                        <span className={score > 50 ? 'text-green-400' : 'text-gray-300'}>{score}%</span>
                                    </div>
                                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                                            style={{ width: `${score}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-4 bg-white/5 text-center">
                            <button onClick={() => setBloomsResult(null)} className="btn btn-ghost text-sm w-full">Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TranscriptionPanel;
