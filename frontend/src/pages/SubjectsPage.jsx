import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    FolderOpen, Plus, Trash2, Users, FileText, Folder, FilePlus,
    ChevronRight, ChevronDown, Search, Download, Eye,
    GraduationCap, BookOpen, ChevronLeft, AlertCircle, CheckCircle, Clock
} from 'lucide-react';
import {
    getSubjects, createSubject, deleteSubject,
    exportSubjectMarks, getSubject, deleteFile,
    uploadAnswerSheetsBatch, getResults, exportResultsUrl
} from '../services/api';
import FileUploader from '../components/FileUploader';

const SubjectsPage = () => {
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newSubject, setNewSubject] = useState({
        name: '',
        className: '',
        academicYear: ''
    });
    const [selectedSubject, setSelectedSubject] = useState(null);
    const [stats, setStats] = useState({ total_students: 0, evaluated: 0, pending: 0 });
    const [files, setFiles] = useState({ question_papers: [], rubrics: [], answer_sheets: [] });
    const [activeTab, setActiveTab] = useState('answer_sheets');
    const [batchFiles, setBatchFiles] = useState([]);
    const [uploadingBatch, setUploadingBatch] = useState(false);
    const [uploadResults, setUploadResults] = useState(null);
    const [subjectResults, setSubjectResults] = useState([]);
    const [loadingResults, setLoadingResults] = useState(false);
    const [resultsSearch, setResultsSearch] = useState('');
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    // Auto-select subject from URL param (e.g. /subjects?subjectId=3)
    useEffect(() => {
        const subjectId = searchParams.get('subjectId');
        if (subjectId && subjects.length > 0) {
            const found = subjects.find(s => String(s.id) === String(subjectId));
            if (found) {
                handleSubjectClick(found);
            } else {
                // Subject not in list yet – load details directly
                loadSubjectDetails(Number(subjectId));
            }
        }
    }, [subjects, searchParams.get('subjectId')]);

    useEffect(() => {
        loadSubjects();
    }, []);

    useEffect(() => {
        if (selectedSubject && activeTab === 'results') {
            loadSubjectResults(selectedSubject.id);
        }
    }, [activeTab, selectedSubject?.id]);

    const loadSubjects = async () => {
        try {
            setLoading(true);
            const data = await getSubjects();
            setSubjects(data.subjects || []);
            // If we have a selected subject, refresh its details too
            if (selectedSubject) {
                loadSubjectDetails(selectedSubject.id);
            }
        } catch (error) {
            console.error('Failed to load subjects:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadSubjectResults = async (subjectId) => {
        try {
            setLoadingResults(true);
            const data = await getResults(subjectId);
            setSubjectResults(data.results || []);
        } catch (error) {
            console.error('Failed to load results:', error);
        } finally {
            setLoadingResults(false);
        }
    };

    const loadSubjectDetails = async (subjectId) => {
        try {
            const data = await getSubject(subjectId);
            setSelectedSubject(data.subject);
            setFiles({
                question_papers: data.question_papers || [],
                rubrics: data.rubrics || [],
                answer_sheets: data.answer_sheets || []
            });
            setStats(data.stats);
            if (activeTab === 'results') {
                loadSubjectResults(subjectId);
            }
        } catch (error) {
            console.error('Failed to load subject details:', error);
        }
    };

    const handleCreateSubject = async () => {
        if (!newSubject.name.trim()) {
            alert('Subject name is required');
            return;
        }

        try {
            const response = await createSubject(newSubject.name, newSubject.className, newSubject.academicYear);
            setShowCreateModal(false);
            setNewSubject({ name: '', className: '', academicYear: '' });
            await loadSubjects();
            // Automatically open the newly created subject
            if (response.subject) {
                handleSubjectClick(response.subject);
            }
        } catch (error) {
            console.error('Failed to create subject:', error);
            alert('Failed to create subject: ' + (error.response?.data?.error || error.message));
        }
    };

    const handleDeleteSubject = async (subjectId) => {
        if (!confirm('Are you sure you want to delete this subject and all associated files?')) {
            return;
        }

        try {
            await deleteSubject(subjectId);
            if (selectedSubject?.id === subjectId) {
                setSelectedSubject(null);
            }
            loadSubjects();
        } catch (error) {
            console.error('Failed to delete subject:', error);
            alert('Failed to delete subject');
        }
    };

    const handleSubjectClick = (subject) => {
        setSelectedSubject(subject);
        loadSubjectDetails(subject.id);
    };

    const handleDeleteFile = async (fileId, type) => {
        if (!confirm('Are you sure you want to delete this file?')) return;
        try {
            await deleteFile(fileId, type);
            if (selectedSubject) loadSubjectDetails(selectedSubject.id);
        } catch (error) {
            alert('Failed to delete file');
        }
    };

    const handleBatchFileSelect = (e) => {
        const files = Array.from(e.target.files).filter(f => f.type === 'application/pdf');
        setBatchFiles(prev => [...prev, ...files]);
    };

    const handleBatchUpload = async () => {
        if (batchFiles.length === 0) return;
        try {
            setUploadingBatch(true);
            const qpId = files.question_papers[0]?.id;
            const response = await uploadAnswerSheetsBatch(batchFiles, selectedSubject.id, qpId);
            setUploadResults(response);
            setBatchFiles([]);
            loadSubjectDetails(selectedSubject.id);
        } catch (error) {
            alert('Batch upload failed: ' + error.message);
        } finally {
            setUploadingBatch(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-950 text-white p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/custodian')}
                            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
                        >
                            ← Back to Dashboard
                        </button>
                        <div>
                            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Subjects</h1>
                            <p className="text-gray-300">Manage evaluation subjects and classes</p>
                        </div>
                    </div>
                </div>

                {/* Subjects Content Area */}
                {loading && !selectedSubject ? (
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
                        <p className="text-gray-300 mt-4">Loading subjects...</p>
                    </div>
                ) : subjects.length === 0 ? (
                    <div className="bg-white bg-opacity-10 rounded-lg p-12 text-center">
                        <FolderOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-white mb-2">No Subjects Yet</h3>
                        <p className="text-gray-300 mb-6">Create your first subject folder to start organizing evaluations</p>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                        >
                            Create Subject Folder
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col lg:flex-row gap-8">
                        {/* Sidebar: Subjects List */}
                        <div className={`lg:w-1/3 space-y-4 ${selectedSubject ? 'hidden lg:block' : 'block'}`}>
                            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                <FolderOpen className="w-5 h-5 text-blue-400" />
                                Subject Folders
                            </h2>
                            <div className="space-y-3">
                                {subjects.map(subject => (
                                    <div
                                        key={subject.id}
                                        onClick={() => handleSubjectClick(subject)}
                                        className={`p-4 rounded-xl border transition-all cursor-pointer group ${selectedSubject?.id === subject.id
                                            ? 'bg-blue-600/20 border-blue-500 shadow-lg shadow-blue-500/10'
                                            : 'bg-white/5 border-white/10 hover:bg-white/10'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${selectedSubject?.id === subject.id ? 'bg-blue-500 text-white' : 'bg-blue-500/10 text-blue-400'}`}>
                                                    <FolderOpen className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-white group-hover:text-blue-400 transition-colors">{subject.name}</h3>
                                                    <p className="text-xs text-gray-400">{subject.class_name || 'General Class'}</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteSubject(subject.id);
                                                }}
                                                className="p-2 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 rounded-lg transition-all"
                                            >
                                                <Trash2 className="w-4 h-4 text-red-400" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Main Content: Folder Details */}
                        <div className="flex-1 min-w-0">
                            {selectedSubject ? (
                                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                    {/* Subject Title & Actions */}
                                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10">
                                        <button
                                            onClick={() => setSelectedSubject(null)}
                                            className="lg:hidden flex items-center gap-2 text-gray-400 hover:text-white mb-4"
                                        >
                                            <ChevronLeft className="w-4 h-4" />
                                            Back to Folders
                                        </button>
                                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                            <div>
                                                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                                                    {selectedSubject.name}
                                                    <span className="text-sm font-normal px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded border border-blue-500/30">
                                                        {selectedSubject.class_name || 'No Class'}
                                                    </span>
                                                </h1>
                                                <p className="text-gray-400 mt-1">{selectedSubject.academic_year || 'No Academic Year'}</p>
                                                {selectedSubject.first_evaluator_name && (
                                                    <p className="text-sm text-green-400 mt-1">
                                                        👤 Teacher: <span className="font-semibold">{selectedSubject.first_evaluator_name}</span>
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => window.open(exportSubjectMarks(selectedSubject.id), '_blank')}
                                                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-semibold"
                                                >
                                                    <Download className="w-4 h-4" />
                                                    Export Marks
                                                </button>
                                            </div>
                                        </div>

                                        {/* Quick Stats */}
                                        {stats && (
                                            <div className="grid grid-cols-3 gap-4 mt-6">
                                                <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                                                    <p className="text-[10px] uppercase font-bold text-gray-500">Students</p>
                                                    <p className="text-xl font-bold text-white">{stats.total_students}</p>
                                                </div>
                                                <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                                                    <p className="text-[10px] uppercase font-bold text-gray-500">Evaluated</p>
                                                    <p className="text-xl font-bold text-green-400">{stats.evaluated}</p>
                                                </div>
                                                <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                                                    <p className="text-[10px] uppercase font-bold text-gray-500">Pending</p>
                                                    <p className="text-xl font-bold text-amber-400">{stats.pending}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Tabs and Files */}
                                    <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden">
                                        <div className="flex border-b border-white/10">
                                            {[
                                                { id: 'answer_sheets', name: 'Answer Sheets', icon: Users, count: files.answer_sheets.length },
                                                { id: 'question_papers', name: 'Question Papers', icon: FileText, count: files.question_papers.length },
                                                { id: 'rubrics', name: 'Rubrics', icon: BookOpen, count: files.rubrics.length },
                                                { id: 'results', name: 'Results', icon: GraduationCap, count: stats.evaluated }
                                            ].map(tab => (
                                                <button
                                                    key={tab.id}
                                                    onClick={() => setActiveTab(tab.id)}
                                                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-4 text-sm font-semibold transition-all ${activeTab === tab.id
                                                        ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-500/5'
                                                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                                                        }`}
                                                >
                                                    <tab.icon className="w-4 h-4" />
                                                    {tab.name}
                                                    <span className="bg-white/10 px-1.5 py-0.5 rounded text-[10px]">{tab.count}</span>
                                                </button>
                                            ))}
                                        </div>

                                        <div className="p-6">
                                            {activeTab === 'answer_sheets' && (
                                                <div className="space-y-6">
                                                    {/* Batch Upload Section */}
                                                    <div className="p-6 bg-blue-500/5 border-2 border-dashed border-blue-500/20 rounded-xl text-center">
                                                        <FilePlus className="w-10 h-10 text-blue-400 mx-auto mb-2" />
                                                        <h4 className="font-semibold text-white mb-1">Batch Upload Answer Sheets</h4>
                                                        <p className="text-gray-400 text-sm mb-4">Upload multiple PDFs. AI will auto-recognize students.</p>
                                                        <input
                                                            type="file"
                                                            multiple
                                                            accept=".pdf"
                                                            className="hidden"
                                                            id="batch-upload"
                                                            onChange={handleBatchFileSelect}
                                                        />
                                                        <div className="flex justify-center gap-3">
                                                            <label
                                                                htmlFor="batch-upload"
                                                                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg cursor-pointer text-sm font-semibold transition-colors"
                                                            >
                                                                Select Files
                                                            </label>
                                                            {batchFiles.length > 0 && (
                                                                <button
                                                                    onClick={handleBatchUpload}
                                                                    disabled={uploadingBatch}
                                                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors"
                                                                >
                                                                    {uploadingBatch ? 'Uploading...' : `Upload ${batchFiles.length} Files`}
                                                                </button>
                                                            )}
                                                        </div>
                                                        {batchFiles.length > 0 && (
                                                            <div className="mt-4 flex flex-wrap gap-2 justify-center">
                                                                {batchFiles.map((f, i) => (
                                                                    <span key={i} className="text-[10px] bg-gray-800 text-gray-300 px-2 py-1 rounded border border-white/5">
                                                                        {f.name}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Upload Results */}
                                                    {uploadResults && (
                                                        <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                                                            <div className="flex justify-between items-start mb-2">
                                                                <p className="text-sm font-semibold text-green-400">
                                                                    {uploadResults.message}
                                                                </p>
                                                                <button onClick={() => setUploadResults(null)} className="text-gray-500 hover:text-white">
                                                                    <Plus className="w-4 h-4 rotate-45" />
                                                                </button>
                                                            </div>
                                                            <div className="max-h-32 overflow-y-auto space-y-1">
                                                                {uploadResults.results.map((r, i) => (
                                                                    <div key={i} className={`text-[10px] flex items-center gap-2 ${r.status === 'success' ? 'text-gray-300' : 'text-red-400'}`}>
                                                                        {r.status === 'success' ? <CheckCircle className="w-3 h-3 text-green-500" /> : <AlertCircle className="w-3 h-3" />}
                                                                        <span className="font-mono">{r.filename}</span>
                                                                        {r.status === 'success' && <span className="text-blue-400">→ {r.student_name}</span>}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Answer Sheets List */}
                                                    <div className="space-y-3">
                                                        {files.answer_sheets.length === 0 ? (
                                                            <div className="text-center py-12 bg-white/5 rounded-xl border border-white/5">
                                                                <Users className="w-12 h-12 text-gray-500 mx-auto mb-2 opacity-20" />
                                                                <p className="text-gray-500 text-sm">No answer sheets in this folder</p>
                                                            </div>
                                                        ) : (
                                                            files.answer_sheets.map(sheet => (
                                                                <div
                                                                    key={sheet.id}
                                                                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl hover:border-gray-600/50 transition-all group gap-4"
                                                                >
                                                                    <div className="flex items-center gap-4 min-w-0 flex-1">
                                                                        <div className={`shrink-0 p-2 rounded-lg ${sheet.status === 'evaluated' ? 'bg-green-500/10 text-green-400' : 'bg-amber-500/10 text-amber-400'}`}>
                                                                            {sheet.status === 'evaluated' ? <CheckCircle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                                                                        </div>
                                                                        <div className="min-w-0">
                                                                            <h4 className="font-semibold text-white truncate">
                                                                                {sheet.student_name}
                                                                            </h4>
                                                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-gray-400 mt-1">
                                                                                <span className="bg-white/5 px-2 py-0.5 rounded shrink-0">Roll: {sheet.roll_number || 'N/A'}</span>
                                                                                <span className="shrink-0">Uploaded: {new Date(sheet.uploaded_at).toLocaleDateString()}</span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center gap-2 shrink-0 sm:ml-4">
                                                                        <button
                                                                            onClick={() => handleDeleteFile(sheet.id, 'answer')}
                                                                            className="p-2 text-gray-500 hover:text-red-400 transition-all"
                                                                        >
                                                                            <Trash2 className="w-4 h-4" />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ))
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {activeTab === 'question_papers' && (
                                                <div className="space-y-6">
                                                    <FileUploader
                                                        type="question"
                                                        subjectId={selectedSubject.id}
                                                        onUploadSuccess={() => loadSubjectDetails(selectedSubject.id)}
                                                    />
                                                    <div className="space-y-3">
                                                        {files.question_papers.length === 0 ? (
                                                            <p className="text-center text-gray-500 py-8">No question papers uploaded.</p>
                                                        ) : (
                                                            files.question_papers.map(qp => (
                                                                <div key={qp.id} className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl group">
                                                                    <div className="flex items-center gap-4">
                                                                        <div className="p-2 bg-blue-500/10 rounded-lg">
                                                                            <FileText className="w-6 h-6 text-blue-400" />
                                                                        </div>
                                                                        <div>
                                                                            <h4 className="font-semibold text-white">{qp.title}</h4>
                                                                            <p className="text-xs text-gray-400">{qp.total_questions} Questions</p>
                                                                        </div>
                                                                    </div>
                                                                    <button
                                                                        onClick={() => handleDeleteFile(qp.id, 'question')}
                                                                        className="p-2 text-gray-500 hover:text-red-400 transition-all"
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                            ))
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {activeTab === 'rubrics' && (
                                                <div className="space-y-6">
                                                    <FileUploader
                                                        type="rubric"
                                                        subjectId={selectedSubject.id}
                                                        onUploadSuccess={() => loadSubjectDetails(selectedSubject.id)}
                                                    />
                                                    <div className="space-y-3">
                                                        {files.rubrics.length === 0 ? (
                                                            <p className="text-center text-gray-500 py-8">No rubrics in this folder.</p>
                                                        ) : (
                                                            files.rubrics.map(rubric => (
                                                                <div key={rubric.id} className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl group">
                                                                    <div className="flex items-center gap-4">
                                                                        <div className="p-2 bg-purple-500/10 rounded-lg">
                                                                            <BookOpen className="w-6 h-6 text-purple-400" />
                                                                        </div>
                                                                        <div>
                                                                            <h4 className="font-semibold text-white">{rubric.title}</h4>
                                                                            <p className="text-xs text-gray-400">Uploaded: {new Date(rubric.uploaded_at).toLocaleDateString()}</p>
                                                                        </div>
                                                                    </div>
                                                                    <button
                                                                        onClick={() => handleDeleteFile(rubric.id, 'rubric')}
                                                                        className="p-2 text-gray-500 hover:text-red-400 transition-all"
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                            ))
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {activeTab === 'results' && (
                                                <div className="space-y-6">
                                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                        <div className="relative flex-1">
                                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                                            <input
                                                                type="text"
                                                                placeholder="Search students or papers..."
                                                                value={resultsSearch}
                                                                onChange={(e) => setResultsSearch(e.target.value)}
                                                                className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl outline-none focus:border-blue-500 transition-colors text-sm"
                                                            />
                                                        </div>
                                                        <a
                                                            href={exportResultsUrl(selectedSubject.id)}
                                                            download
                                                            className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded-xl text-sm font-bold transition-all border border-green-500/20"
                                                        >
                                                            <Download className="w-4 h-4" />
                                                            Export CSV
                                                        </a>
                                                    </div>

                                                    <div className="glass-strong rounded-xl overflow-hidden border border-white/5">
                                                        <div className="overflow-x-auto">
                                                            <table className="w-full text-left border-collapse">
                                                                <thead>
                                                                    <tr className="bg-white/5 border-b border-white/10 text-gray-400 text-[10px] uppercase tracking-wider">
                                                                        <th className="p-4 font-bold">Student</th>
                                                                        <th className="p-4 font-bold">Score</th>
                                                                        <th className="p-4 font-bold">Percent</th>
                                                                        <th className="p-4 font-bold text-center">Actions</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-white/5">
                                                                    {loadingResults ? (
                                                                        <tr><td colSpan="4" className="p-8 text-center text-gray-500 text-sm">Loading results...</td></tr>
                                                                    ) : subjectResults.length === 0 ? (
                                                                        <tr><td colSpan="4" className="p-8 text-center text-gray-500 text-sm">No results found for this subject.</td></tr>
                                                                    ) : (
                                                                        subjectResults
                                                                            .filter(r =>
                                                                                r.student_name.toLowerCase().includes(resultsSearch.toLowerCase()) ||
                                                                                r.question_paper.toLowerCase().includes(resultsSearch.toLowerCase())
                                                                            )
                                                                            .map(result => (
                                                                                <tr key={result.id} className="hover:bg-white/5 transition-colors">
                                                                                    <td className="p-4">
                                                                                        <p className="font-semibold text-white text-sm">{result.student_name}</p>
                                                                                        <p className="text-[10px] text-gray-500">{result.question_paper}</p>
                                                                                    </td>
                                                                                    <td className="p-4 text-sm font-mono text-blue-400 font-bold">
                                                                                        {result.total_awarded} <span className="text-gray-600 font-normal">/ {result.total_max}</span>
                                                                                    </td>
                                                                                    <td className="p-4">
                                                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${result.percentage >= 70 ? 'bg-green-500/20 text-green-400' :
                                                                                            result.percentage >= 40 ? 'bg-amber-500/20 text-amber-400' :
                                                                                                'bg-red-500/20 text-red-400'
                                                                                            }`}>
                                                                                            {result.percentage}%
                                                                                        </span>
                                                                                    </td>
                                                                                    <td className="p-4 text-center">
                                                                                        <button
                                                                                            onClick={() => navigate(`/evaluate/${result.id}`)}
                                                                                            className="p-2 hover:bg-white/10 rounded-lg text-blue-400 transition-colors"
                                                                                            title="View Marks"
                                                                                        >
                                                                                            <Eye className="w-4 h-4" />
                                                                                        </button>
                                                                                    </td>
                                                                                </tr>
                                                                            ))
                                                                    )}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full py-20 bg-white/5 rounded-3xl border border-white/10 border-dashed">
                                    <div className="p-6 bg-blue-500/10 rounded-full mb-4">
                                        <ChevronRight className="w-12 h-12 text-blue-400 opacity-50" />
                                    </div>
                                    <h2 className="text-2xl font-bold text-white mb-2">Select a Folder</h2>
                                    <p className="text-gray-400 text-center max-w-xs px-4">
                                        Choose a subject folder from the list to view and manage your evaluation documents.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Create Subject Modal */}
                {showCreateModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
                            <h2 className="text-2xl font-bold text-white mb-4">Create New Subject</h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Subject Name *
                                    </label>
                                    <input
                                        type="text"
                                        value={newSubject.name}
                                        onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
                                        className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                                        placeholder="e.g., Physics 101"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Class Name
                                    </label>
                                    <input
                                        type="text"
                                        value={newSubject.className}
                                        onChange={(e) => setNewSubject({ ...newSubject, className: e.target.value })}
                                        className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                                        placeholder="e.g., Class 12A"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Academic Year
                                    </label>
                                    <input
                                        type="text"
                                        value={newSubject.academicYear}
                                        onChange={(e) => setNewSubject({ ...newSubject, academicYear: e.target.value })}
                                        className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                                        placeholder="e.g., 2025-2026"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => setShowCreateModal(false)}
                                    className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCreateSubject}
                                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                                >
                                    Create
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div >
    );
};

export default SubjectsPage;
