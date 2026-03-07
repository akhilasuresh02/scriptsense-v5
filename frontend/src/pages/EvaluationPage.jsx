import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, Save, Eye, FileText, Sparkles, Users, ChevronDown } from 'lucide-react';
import PDFViewer from '../components/PDFViewer';
import TranscriptionPanel from '../components/TranscriptionPanel';
import GradingPanel from '../components/GradingPanel';
import DocumentModal from '../components/DocumentModal';
import ZoomModal from '../components/ZoomModal';
import { getFiles, getPdfInfo, zoomRegion, getSubjectStudents, prescanAnswerSheet } from '../services/api';
import { useAuth } from '../context/AuthContext';

const EvaluationPage = () => {
    const { answersheetId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [answerSheet, setAnswerSheet] = useState(null);
    const [currentPage, setCurrentPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [selectedRegion, setSelectedRegion] = useState(null);
    const [transcription, setTranscription] = useState(null);
    const [showQuestionPaper, setShowQuestionPaper] = useState(false);
    const [showRubric, setShowRubric] = useState(false);
    const [questionPapers, setQuestionPapers] = useState([]);
    const [rubrics, setRubrics] = useState([]);
    const [activeTab, setActiveTab] = useState('pdf'); // 'pdf', 'transcription', 'grading'
    const [zoomImageUrl, setZoomImageUrl] = useState(null);
    const [subjectStudents, setSubjectStudents] = useState([]);
    const [showStudentList, setShowStudentList] = useState(false);
    const [gradingProgress, setGradingProgress] = useState({ total: 0, graded: 0 });
    const [detectedAnswerNumbers, setDetectedAnswerNumbers] = useState([]);
    const [prescanStatus, setPrescanStatus] = useState('idle'); // idle, scanning, done
    const [prescanPages, setPrescanPages] = useState({}); // { pageNum: scanData }


    // Warn on browser close/refresh if there are unmarked questions
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            const unmarked = gradingProgress.total - gradingProgress.graded;
            if (unmarked > 0) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [gradingProgress]);

    const handleExit = useCallback(() => {
        const unmarked = gradingProgress.total - gradingProgress.graded;
        if (unmarked > 0) {
            const confirmed = window.confirm(
                `⚠️ You have ${unmarked} out of ${gradingProgress.total} question${unmarked !== 1 ? 's' : ''} still unmarked.\n\nAre you sure you want to exit?`
            );
            if (!confirmed) return;
        }
        // Return to teacher dashboard if came from there, otherwise home
        const from = sessionStorage.getItem('evaluateFrom') || '/teacher';
        sessionStorage.removeItem('evaluateFrom');
        navigate(from);
    }, [gradingProgress, navigate]);

    useEffect(() => {
        loadAnswerSheet();
        loadQuestionPapersAndRubrics();
    }, [answersheetId, user?.id]);

    const loadAnswerSheet = async () => {
        try {
            const filesData = await getFiles('answer');
            const sheet = filesData.files.find(f => f.id === parseInt(answersheetId));
            setAnswerSheet(sheet);

            if (sheet?.subject_id) {
                const studentsData = await getSubjectStudents(sheet.subject_id);
                setSubjectStudents(studentsData.students || []);
            }

            const pdfInfo = await getPdfInfo(answersheetId);
            setTotalPages(pdfInfo.page_count);

            // Trigger prescan
            triggerPrescan();
        } catch (error) {
            console.error('Failed to load answer sheet:', error);
        }
    };

    const triggerPrescan = async () => {
        setPrescanStatus('scanning');
        try {
            const result = await prescanAnswerSheet(parseInt(answersheetId));
            if (result.success) {
                // Build page map
                const pageMap = {};
                (result.pages || []).forEach(p => {
                    pageMap[p.page_number] = p;
                });
                setPrescanPages(pageMap);
                setPrescanStatus('done');
            }
        } catch (err) {
            console.error('Prescan failed:', err);
            setPrescanStatus('idle');
        }
    };

    const loadQuestionPapersAndRubrics = async () => {
        try {
            const qpData = await getFiles('question');
            const rubricData = await getFiles('rubric');
            setQuestionPapers(qpData.files || []);
            setRubrics(rubricData.files || []);
        } catch (error) {
            console.error('Failed to load documents:', error);
        }
    };

    const handleRegionSelect = async (region) => {
        setSelectedRegion(region);
        try {
            const result = await zoomRegion(answersheetId, currentPage, region);
            if (result.success) {
                setZoomImageUrl(result.image);
            }
        } catch (error) {
            console.error('Zoom failed:', error);
        }
    };

    const handlePageChange = (direction) => {
        if (direction === 'next' && currentPage < totalPages - 1) {
            setCurrentPage(currentPage + 1);
            setSelectedRegion(null);
            setTranscription(null);
        } else if (direction === 'prev' && currentPage > 0) {
            setCurrentPage(currentPage - 1);
            setSelectedRegion(null);
            setTranscription(null);
        }
    };

    return (
        <div className="min-h-screen p-2 md:p-6 flex flex-col">
            {/* Header */}
            <header className="mb-2 md:mb-6 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2 md:gap-4">
                    <button
                        onClick={handleExit}
                        className="btn btn-ghost p-2 md:p-3"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="relative">
                        <button
                            onClick={() => setShowStudentList(!showStudentList)}
                            className="flex items-center gap-1.5 md:gap-2 hover:bg-white/5 p-1 rounded-lg transition-colors group"
                        >
                            <h1 className="text-lg md:text-2xl font-bold gradient-text truncate max-w-[150px] md:max-w-none">
                                {answerSheet?.student_name || 'Loading...'}
                            </h1>
                            <ChevronDown className={`w-4 h-4 md:w-5 h-5 text-gray-400 group-hover:text-white transition-transform ${showStudentList ? 'rotate-180' : ''}`} />
                        </button>

                        {showStudentList && (
                            <>
                                <div
                                    className="fixed inset-0 z-10"
                                    onClick={() => setShowStudentList(false)}
                                />
                                <div className="absolute top-full left-0 mt-2 w-64 glass shadow-2xl rounded-xl border border-white/10 overflow-hidden z-20 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="p-2 border-b border-white/5 bg-white/5">
                                        <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold px-2">Other Students</p>
                                    </div>
                                    <div className="max-h-64 overflow-y-auto custom-scrollbar">
                                        {subjectStudents.map(student => (
                                            <button
                                                key={student.id}
                                                onClick={() => {
                                                    setShowStudentList(false);
                                                    if (student.id !== parseInt(answersheetId)) {
                                                        navigate(`/evaluate/${student.id}`);
                                                    }
                                                }}
                                                className={`w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-primary-500/20 transition-colors text-left ${student.id === parseInt(answersheetId) ? 'bg-primary-500/10' : ''}`}
                                            >
                                                <div className="min-w-0">
                                                    <p className={`text-sm font-medium truncate ${student.id === parseInt(answersheetId) ? 'text-primary-400' : 'text-gray-200'}`}>
                                                        {student.name}
                                                    </p>
                                                    <p className="text-[10px] text-gray-500">Roll: {student.roll_number || 'N/A'}</p>
                                                </div>
                                                <div className={`w-2 h-2 rounded-full ${student.status === 'evaluated' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]'}`} />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                        <p className="text-[10px] md:text-sm text-gray-400">
                            Page {currentPage + 1} of {totalPages}
                            {prescanStatus === 'scanning' && (
                                <span className="ml-2 text-primary-400 animate-pulse">Pre-scanning...</span>
                            )}
                            {prescanStatus === 'done' && (
                                <span className="ml-2 text-green-400">✓ Pre-scanned</span>
                            )}
                        </p>
                    </div>
                </div>

                <div className="flex gap-1">
                    <button
                        onClick={() => handlePageChange('prev')}
                        disabled={currentPage === 0}
                        className="btn btn-ghost p-2"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => handlePageChange('next')}
                        disabled={currentPage >= totalPages - 1}
                        className="btn btn-ghost p-2"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </header>

            {/* Mobile Tab Switcher */}
            <div className="flex lg:hidden glass mb-4 p-1">
                {[
                    { id: 'pdf', label: 'Script', icon: Eye },
                    { id: 'transcription', label: 'AI Review', icon: Sparkles },
                    { id: 'grading', label: 'Grading', icon: FileText }
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id
                            ? 'bg-primary-500 text-white shadow-lg'
                            : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Main Content - Fixed Layout */}
            <div className="flex-1 flex flex-col lg:flex-row gap-4 md:gap-6 min-h-0 overflow-hidden lg:h-[calc(100vh-180px)]">
                {/* Left Panel - PDF Viewer (Fixed Width) */}
                <div className={`${activeTab === 'pdf' ? 'block' : 'hidden lg:block'} lg:w-[400px] lg:flex-none h-full overflow-hidden`}>
                    <PDFViewer
                        answersheetId={answersheetId}
                        currentPage={currentPage}
                        onPageSelect={setCurrentPage}
                        onRegionSelect={handleRegionSelect}
                    />
                </div>

                {/* Center Panel - Transcription (Flexible) */}
                <div className={`${activeTab === 'transcription' ? 'block' : 'hidden lg:block'} flex-1 min-w-0 h-full overflow-hidden`}>
                    <TranscriptionPanel
                        answersheetId={answersheetId}
                        page={currentPage}
                        region={selectedRegion}
                        onTranscriptionComplete={setTranscription}
                        onAnswerNumbersDetected={setDetectedAnswerNumbers}
                        prescanPageData={prescanPages[currentPage] || null}
                    />
                </div>

                {/* Right Panel - Grading (Fixed Width) */}
                <div className={`${activeTab === 'grading' ? 'block' : 'hidden lg:block'} lg:w-[350px] lg:flex-none h-full overflow-hidden`}>
                    <GradingPanel
                        answersheetId={answersheetId}
                        answerSheet={answerSheet}
                        questionPapers={questionPapers}
                        rubrics={rubrics}
                        onViewQuestionPaper={() => setShowQuestionPaper(true)}
                        onViewRubric={() => setShowRubric(true)}
                        onGradingProgress={setGradingProgress}
                        activeAnswerNumber={detectedAnswerNumbers.length > 0 ? detectedAnswerNumbers[0] : null}
                        evaluatorRole={
                            user?.id === answerSheet?.second_evaluator_id ? 'external' : 'teacher'
                        }
                    />
                </div>
            </div>

            {/* Modals */}
            {showQuestionPaper && questionPapers.length > 0 && (
                <DocumentModal
                    file={questionPapers[0]}
                    onClose={() => setShowQuestionPaper(false)}
                    title="Question Paper"
                />
            )}

            {showRubric && rubrics.length > 0 && (
                <DocumentModal
                    file={rubrics[0]}
                    onClose={() => setShowRubric(false)}
                    title="Evaluation Rubric"
                />
            )}

            {/* Zoom Modal */}
            {zoomImageUrl && (
                <ZoomModal
                    imageUrl={zoomImageUrl}
                    onClose={() => setZoomImageUrl(null)}
                />
            )}
        </div>
    );
};

export default EvaluationPage;
