import React, { useState, useEffect, useRef } from 'react';
import { FileText, BookOpen, ChevronLeft, ChevronRight, Save, TrendingUp, CheckCircle, Plus, Loader, Search, AlertCircle } from 'lucide-react';
import { saveMarks, getMarks, getTotalMarks, saveReport, getQuestionContents, getRubricContents, scanAllPages } from '../services/api';

const GradingPanel = ({ answersheetId, answerSheet, questionPapers, rubrics, onViewQuestionPaper, onViewRubric, onGradingProgress, evaluatorRole = 'teacher', activeAnswerNumber }) => {
    const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
    const [marksAwarded, setMarksAwarded] = useState('');
    const [maxMarks, setMaxMarks] = useState('');
    const [allMarks, setAllMarks] = useState([]);
    const [totalScore, setTotalScore] = useState(null);
    const [saving, setSaving] = useState(false);

    // Question/Rubric content
    const [questionContents, setQuestionContents] = useState([]);
    const [rubricContents, setRubricContents] = useState([]);
    const [detectedQuestions, setDetectedQuestions] = useState([]); // merged list of question numbers
    const [scanning, setScanning] = useState(false);
    const [scanStatus, setScanStatus] = useState('');

    // Existing state
    const [activeQuestionPaper, setActiveQuestionPaper] = useState(null);
    const [activeRubric, setActiveRubric] = useState(null);
    const [remarks, setRemarks] = useState('');
    const [evaluationComplete, setEvaluationComplete] = useState(false);
    const [submittingReport, setSubmittingReport] = useState(false);
    const autoScannedRef = useRef(false);

    // Auto-select correct QP and rubric based on subject
    useEffect(() => {
        if (questionPapers.length > 0 && !activeQuestionPaper) {
            const matchedQP = questionPapers.find(qp => qp.subject_id === answerSheet?.subject_id);
            setActiveQuestionPaper(matchedQP || questionPapers[0]);
        }
    }, [questionPapers, answerSheet]);

    useEffect(() => {
        if (rubrics.length > 0 && !activeRubric) {
            const matchedRubric = rubrics.find(r => r.subject_id === answerSheet?.subject_id);
            setActiveRubric(matchedRubric || rubrics[0]);
        }
    }, [rubrics, answerSheet]);

    // Load question/rubric content when selections change
    useEffect(() => {
        if (activeQuestionPaper) {
            loadQuestionContents(activeQuestionPaper.id);
        }
    }, [activeQuestionPaper]);

    useEffect(() => {
        if (activeRubric) {
            loadRubricContents(activeRubric.id);
        }
    }, [activeRubric]);

    // Auto-scan rubric if content is missing or incomplete
    useEffect(() => {
        if (autoScannedRef.current || scanning) return;
        if (!activeQuestionPaper && !activeRubric) return;

        // Wait for initial DB load to complete, then check
        const timer = setTimeout(() => {
            const needsRubricScan = activeRubric && rubricContents.length === 0;
            const needsQPScan = activeQuestionPaper && questionContents.length === 0;
            if (needsRubricScan || needsQPScan) {
                console.log('🔄 Auto-scanning: rubric/QP content missing, triggering scan...');
                autoScannedRef.current = true;
                handleScanAll();
            }
        }, 1500);

        return () => clearTimeout(timer);
    }, [activeQuestionPaper, activeRubric, questionContents.length, rubricContents.length, scanning]);

    // Build merged question list whenever contents change
    useEffect(() => {
        const qNums = new Set();
        questionContents.forEach(q => qNums.add(q.question_number));
        rubricContents.forEach(r => qNums.add(r.question_number));

        // Sort by natural order: try numeric first, then string
        const sorted = [...qNums].sort((a, b) => {
            const numA = parseFloat(String(a).replace(/[^0-9.]/g, ''));
            const numB = parseFloat(String(b).replace(/[^0-9.]/g, ''));
            if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
            return String(a).localeCompare(String(b));
        });

        setDetectedQuestions(sorted);

        // Report progress to parent
        if (onGradingProgress) {
            const gradedNums = new Set(allMarks.map(m => String(m.question_number)));
            const graded = sorted.filter(q => {
                const numOnly = String(q).replace(/[^0-9]/g, '');
                return gradedNums.has(String(q)) || gradedNums.has(numOnly);
            }).length;
            onGradingProgress({ total: sorted.length, graded });
        }
    }, [questionContents, rubricContents, allMarks]);

    // Load marks
    useEffect(() => {
        loadMarks();
        loadTotal();
    }, [answersheetId, evaluatorRole]);

    // Update marks input when question changes
    useEffect(() => {
        if (detectedQuestions.length === 0) return;
        const qNum = detectedQuestions[currentQuestionIdx];
        if (!qNum) return;

        // Find saved marks for this question number (try exact match, then numeric)
        const questionMarks = allMarks.find(m => String(m.question_number) === String(qNum))
            || allMarks.find(m => String(m.question_number) === String(qNum).replace(/[^0-9]/g, ''));

        if (questionMarks) {
            setMarksAwarded(questionMarks.marks_awarded.toString());
            setMaxMarks(questionMarks.max_marks.toString());
        } else {
            setMarksAwarded('');
            // Auto-fill max marks from rubric
            const rubric = rubricContents.find(r => r.question_number === qNum);
            if (rubric?.max_marks) {
                setMaxMarks(rubric.max_marks.toString());
            } else {
                setMaxMarks('');
            }
        }
    }, [currentQuestionIdx, detectedQuestions, allMarks, rubricContents]);

    // Auto-navigate when activeAnswerNumber changes (page turn detected new answer)
    useEffect(() => {
        if (activeAnswerNumber == null || detectedQuestions.length === 0) return;

        const ansStr = String(activeAnswerNumber);
        // Find matching question index
        const idx = detectedQuestions.findIndex(q => {
            const numOnly = String(q).replace(/[^0-9]/g, '');
            return String(q) === ansStr || numOnly === ansStr;
        });

        if (idx !== -1 && idx !== currentQuestionIdx) {
            setCurrentQuestionIdx(idx);
        }
    }, [activeAnswerNumber, detectedQuestions]);

    const loadQuestionContents = async (qpId) => {
        try {
            const result = await getQuestionContents(qpId);
            if (result.success) {
                setQuestionContents(result.questions || []);
            }
        } catch (err) {
            console.error('Failed to load question contents:', err);
        }
    };

    const loadRubricContents = async (rubricId) => {
        try {
            const result = await getRubricContents(rubricId);
            if (result.success) {
                setRubricContents(result.rubrics || []);
            }
        } catch (err) {
            console.error('Failed to load rubric contents:', err);
        }
    };

    const handleScanAll = async () => {
        setScanning(true);
        setScanStatus('Scanning question paper...');
        try {
            if (activeQuestionPaper) {
                const qpResult = await scanAllPages('question_paper', activeQuestionPaper.id);
                if (qpResult.success) {
                    setQuestionContents(qpResult.items || []);
                }
            }

            if (activeRubric) {
                setScanStatus('Scanning rubric...');
                const rubricResult = await scanAllPages('rubric', activeRubric.id);
                if (rubricResult.success) {
                    setRubricContents(rubricResult.items || []);
                }
            }

            setScanStatus('');
        } catch (err) {
            console.error('Scan failed:', err);
            setScanStatus('Scan failed. Try again.');
        } finally {
            setScanStatus(''); // ensure label clears
            setScanning(false);
        }
    };

    const loadMarks = async () => {
        try {
            const data = await getMarks(answersheetId, evaluatorRole);
            setAllMarks(data.marks || []);
        } catch (error) {
            console.error('Failed to load marks:', error);
        }
    };

    const loadTotal = async () => {
        try {
            const data = await getTotalMarks(answersheetId, evaluatorRole);
            setTotalScore(data);
        } catch (error) {
            console.error('Failed to load total:', error);
        }
    };

    const handleSaveMarks = async () => {
        if (!marksAwarded || !maxMarks) {
            alert('Please enter both awarded marks and max marks');
            return;
        }

        const qNum = detectedQuestions[currentQuestionIdx] || (currentQuestionIdx + 1);
        // Convert question number to integer for storage if possible
        const qNumInt = parseInt(String(qNum).replace(/[^0-9]/g, '')) || (currentQuestionIdx + 1);

        setSaving(true);
        try {
            await saveMarks(
                answersheetId,
                activeQuestionPaper?.id,
                qNumInt,
                parseFloat(marksAwarded),
                parseFloat(maxMarks),
                evaluatorRole
            );

            await loadMarks();
            await loadTotal();

            // Auto-advance
            if (currentQuestionIdx < detectedQuestions.length - 1) {
                handleQuestionNav('next');
            }
        } catch (error) {
            console.error('Failed to save marks:', error);
            alert('Failed to save marks');
        } finally {
            setSaving(false);
        }
    };

    const handleQuestionNav = (direction) => {
        if (direction === 'next' && currentQuestionIdx < detectedQuestions.length - 1) {
            setCurrentQuestionIdx(prev => prev + 1);
        } else if (direction === 'prev' && currentQuestionIdx > 0) {
            setCurrentQuestionIdx(prev => prev - 1);
        }
        setEvaluationComplete(false);
    };

    const handleAddQuestion = () => {
        // Add a manual question number beyond detected ones
        const nextNum = detectedQuestions.length > 0
            ? String(parseInt(String(detectedQuestions[detectedQuestions.length - 1]).replace(/[^0-9]/g, '') || '0') + 1)
            : '1';
        setDetectedQuestions(prev => [...prev, nextNum]);
        setCurrentQuestionIdx(detectedQuestions.length); // go to the newly added one
        setMarksAwarded('');
        setMaxMarks('');
        setEvaluationComplete(false);
    };

    const handleFinalize = async () => {
        setSubmittingReport(true);
        try {
            await saveReport(answersheetId, remarks, evaluatorRole);
            alert('Evaluation Report Saved Successfully!');
            setEvaluationComplete(true);
        } catch (error) {
            console.error('Failed to save report', error);
            alert('Failed to save report');
        } finally {
            setSubmittingReport(false);
        }
    };

    // Current question data 
    const currentQNum = detectedQuestions[currentQuestionIdx] || '';
    const currentQNumStr = String(currentQNum);

    // Normalize matching for robust question/rubric display
    const currentQuestionText = questionContents.find(q => {
        const qNumStr = String(q.question_number || '');
        const qNumOnly = qNumStr.replace(/[^0-9]/g, '');
        const currentQNumOnly = currentQNumStr.replace(/[^0-9]/g, '');
        return qNumStr === currentQNumStr || (qNumOnly && qNumOnly === currentQNumOnly);
    })?.question_text;

    const currentRubric = rubricContents.find(r => {
        const rNumStr = String(r.question_number || '');
        const rNumOnly = rNumStr.replace(/[^0-9]/g, '');
        const currentQNumOnly = currentQNumStr.replace(/[^0-9]/g, '');
        return rNumStr === currentQNumStr || (rNumOnly && rNumOnly === currentQNumOnly);
    });

    const totalQuestions = detectedQuestions.length || 1;

    if (evaluationComplete) {
        return (
            <div className="glass-strong h-full rounded-xl overflow-hidden flex flex-col p-6">
                <div className="flex items-center gap-2 mb-4 md:mb-6 border-b border-white border-opacity-10 pb-4">
                    <CheckCircle className="w-5 h-5 md:w-6 md:h-6 text-green-400" />
                    <h2 className="text-lg md:text-xl font-bold">Evaluation Summary</h2>
                </div>

                <div className="flex-1 overflow-auto space-y-6">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white border-opacity-10 text-gray-400">
                                <th className="p-2">Q. No</th>
                                <th className="p-2 text-right">Marks</th>
                                <th className="p-2 text-right">Max</th>
                            </tr>
                        </thead>
                        <tbody>
                            {allMarks.sort((a, b) => a.question_number - b.question_number).map(mark => (
                                <tr key={mark.id} className="border-b border-white border-opacity-5">
                                    <td className="p-2 font-mono">{mark.question_number}</td>
                                    <td className="p-2 text-right font-bold text-accent-300">{mark.marks_awarded}</td>
                                    <td className="p-2 text-right text-gray-400">{mark.max_marks}</td>
                                </tr>
                            ))}
                            <tr className="border-t-2 border-white border-opacity-20 text-lg font-bold bg-white bg-opacity-5">
                                <td className="p-3">TOTAL</td>
                                <td className="p-3 text-right text-accent-400">{totalScore?.total_awarded}</td>
                                <td className="p-3 text-right">{totalScore?.total_max}</td>
                            </tr>
                        </tbody>
                    </table>

                    <div>
                        <label className="text-sm text-gray-400 mb-2 block">Evaluator Remarks</label>
                        <textarea
                            value={remarks}
                            onChange={(e) => setRemarks(e.target.value)}
                            placeholder="Enter overall remarks for the student..."
                            className="w-full h-32 px-4 py-3 bg-white bg-opacity-10 rounded-lg border border-white border-opacity-20 focus:border-primary-500 outline-none resize-none"
                        />
                    </div>
                </div>

                <div className="mt-6 pt-4 border-t border-white border-opacity-10 flex flex-col sm:flex-row gap-3">
                    <button
                        onClick={() => setEvaluationComplete(false)}
                        className="flex-1 btn btn-ghost py-2 md:py-3"
                    >
                        Back to Grading
                    </button>
                    <button
                        onClick={handleFinalize}
                        disabled={submittingReport}
                        className="flex-1 btn btn-primary flex items-center justify-center gap-2"
                    >
                        <Save className="w-4 h-4" />
                        {submittingReport ? 'Saving Report...' : 'Finalize & Save'}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="glass-strong h-full rounded-xl overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-white border-opacity-10 space-y-3">
                <div className="flex justify-between items-center">
                    <h3 className="font-semibold flex items-center gap-2">
                        Grading Panel
                        <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold ${evaluatorRole === 'teacher' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}>
                            {evaluatorRole}
                        </span>
                    </h3>
                    <button
                        onClick={() => setEvaluationComplete(true)}
                        className="text-xs btn btn-ghost px-2 py-1 text-accent-300"
                    >
                        View Marks Card
                    </button>
                </div>

                {/* selectors */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <select
                        className="bg-black bg-opacity-30 border border-white border-opacity-10 rounded px-2 py-2 text-xs outline-none"
                        value={activeQuestionPaper?.id || ''}
                        onChange={(e) => setActiveQuestionPaper(questionPapers.find(qp => qp.id === parseInt(e.target.value)))}
                    >
                        {questionPapers.map(qp => (
                            <option key={qp.id} value={qp.id}>{qp.title}</option>
                        ))}
                    </select>
                    <select
                        className="bg-black bg-opacity-30 border border-white border-opacity-10 rounded px-2 py-2 text-xs outline-none"
                        value={activeRubric?.id || ''}
                        onChange={(e) => setActiveRubric(rubrics.find(r => r.id === parseInt(e.target.value)))}
                    >
                        {rubrics.map(r => (
                            <option key={r.id} value={r.id}>{r.title}</option>
                        ))}
                    </select>
                </div>

                {/* Scan Button */}
                {detectedQuestions.length === 0 && !scanning && (
                    <button
                        onClick={handleScanAll}
                        disabled={!activeQuestionPaper && !activeRubric}
                        className="w-full btn btn-primary flex items-center justify-center gap-2 text-sm py-2"
                    >
                        <Search className="w-4 h-4" />
                        Scan Questions & Rubric
                    </button>
                )}
                {scanning && (
                    <div className="flex items-center gap-2 text-xs text-primary-400 animate-pulse bg-primary-500/10 px-3 py-2 rounded-lg border border-primary-500/20">
                        <Loader className="w-3 h-3 animate-spin" />
                        {scanStatus || 'Scanning...'}
                    </div>
                )}
                {detectedQuestions.length > 0 && !scanning && (
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase tracking-wider text-gray-500">
                            {detectedQuestions.length} questions detected
                        </span>
                        <button
                            onClick={handleScanAll}
                            className="text-[10px] text-primary-400 hover:text-primary-300 underline"
                        >
                            Re-scan
                        </button>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-4 md:p-6 space-y-4">
                {/* View Documents */}
                <div className="grid grid-cols-2 gap-2">
                    <button
                        onClick={() => onViewQuestionPaper(activeQuestionPaper)}
                        disabled={!activeQuestionPaper}
                        className="btn btn-ghost flex items-center justify-center gap-1 text-xs py-2"
                    >
                        <FileText className="w-3.5 h-3.5" />
                        View QP
                    </button>
                    <button
                        onClick={() => onViewRubric(activeRubric)}
                        disabled={!activeRubric}
                        className="btn btn-ghost flex items-center justify-center gap-1 text-xs py-2"
                    >
                        <BookOpen className="w-3.5 h-3.5" />
                        View Rubric
                    </button>
                </div>

                <div className="border-t border-white border-opacity-10 pt-4">
                    {/* Question Navigation */}
                    <div className="mb-4">
                        <label className="text-sm text-gray-400 mb-2 block">Question</label>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => handleQuestionNav('prev')}
                                disabled={currentQuestionIdx === 0}
                                className="p-2 hover:bg-white hover:bg-opacity-10 rounded disabled:opacity-30"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>

                            <div className="flex-1 text-center">
                                <span className="text-3xl font-bold gradient-text">
                                    {currentQNum || (currentQuestionIdx + 1)}
                                </span>
                                <span className="text-xs text-gray-400 block">
                                    {currentQuestionIdx + 1} of {totalQuestions}
                                </span>
                            </div>

                            <button
                                onClick={() => handleQuestionNav('next')}
                                disabled={currentQuestionIdx >= detectedQuestions.length - 1}
                                className="p-2 hover:bg-white hover:bg-opacity-10 rounded disabled:opacity-30"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>

                            <button
                                onClick={handleAddQuestion}
                                title="Add Question Manually"
                                className="p-2 hover:bg-white hover:bg-opacity-10 rounded text-accent-400"
                            >
                                <Plus className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Question Text Display */}
                    {currentQuestionText && (
                        <div className="mb-4 bg-white bg-opacity-5 rounded-lg border border-white border-opacity-10 overflow-hidden">
                            <div className="bg-primary-500/10 px-3 py-1.5 border-b border-white border-opacity-5 flex items-center gap-1.5">
                                <FileText className="w-3 h-3 text-primary-400" />
                                <span className="text-[10px] uppercase tracking-wider font-bold text-primary-400">Question</span>
                            </div>
                            <div className="p-3 text-sm leading-relaxed whitespace-pre-wrap max-h-32 overflow-auto custom-scrollbar">
                                {currentQuestionText}
                            </div>
                        </div>
                    )}




                    {/* No content hint */}
                    {!currentQuestionText && !currentRubric && detectedQuestions.length === 0 && !scanning && (
                        <div className="mb-4 bg-white bg-opacity-5 rounded-lg border border-white border-opacity-10 p-4 text-center">
                            <AlertCircle className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                            <p className="text-xs text-gray-400">
                                Scan the question paper and rubric to auto-detect questions and evaluation criteria.
                            </p>
                        </div>
                    )}

                    {/* Marks Input */}
                    <div className="space-y-3">
                        <div>
                            <label className="text-sm text-gray-400 mb-1 block">Marks Awarded</label>
                            <input
                                type="number"
                                step="0.5"
                                inputMode="decimal"
                                value={marksAwarded}
                                onChange={(e) => setMarksAwarded(e.target.value)}
                                placeholder="0"
                                className="w-full px-4 py-3 bg-white bg-opacity-10 rounded-lg border border-white border-opacity-20 focus:border-primary-500 outline-none text-xl font-semibold"
                            />
                        </div>

                        <div>
                            <label className="text-sm text-gray-400 mb-1 block">Max Marks</label>
                            <input
                                type="number"
                                step="0.5"
                                inputMode="decimal"
                                value={maxMarks}
                                onChange={(e) => setMaxMarks(e.target.value)}
                                placeholder="0"
                                className="w-full px-4 py-3 bg-white bg-opacity-10 rounded-lg border border-white border-opacity-20 focus:border-primary-500 outline-none text-xl font-semibold"
                            />
                        </div>

                        <button
                            onClick={handleSaveMarks}
                            disabled={saving || !marksAwarded || !maxMarks}
                            className="w-full btn btn-primary flex items-center justify-center gap-2 py-3.5 md:py-3 text-base md:text-sm font-bold"
                        >
                            <Save className="w-5 h-5" />
                            {saving ? 'Saving...' : 'Save Marks'}
                        </button>
                    </div>
                </div>

                {/* Total Score */}
                {totalScore && (
                    <div className="border-t border-white border-opacity-10 pt-4">
                        <div className="glass p-4 rounded-lg">
                            <div className="flex items-center gap-2 mb-3">
                                <TrendingUp className="w-5 h-5 text-accent-400" />
                                <h4 className="font-semibold">Total Score</h4>
                            </div>
                            <div className="text-center">
                                <div className="text-4xl font-bold gradient-text mb-2">
                                    {totalScore.total_awarded.toFixed(1)} / {totalScore.total_max.toFixed(1)}
                                </div>
                                <div className="text-xl text-gray-400">
                                    {totalScore.percentage.toFixed(1)}%
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GradingPanel;
