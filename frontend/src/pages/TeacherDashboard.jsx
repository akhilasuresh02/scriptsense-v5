import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    BookOpen, FileText, LogOut,
    AlertCircle, ChevronRight, Send, GraduationCap
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getTeacherSubjects, getTeacherScripts } from '../services/api';

const STATUS_BADGE = {
    UPLOADED: { label: 'Pending', color: 'bg-yellow-900/50 text-yellow-300 border-yellow-700/50' },
    pending: { label: 'Pending', color: 'bg-yellow-900/50 text-yellow-300 border-yellow-700/50' },
    FIRST_DONE: { label: 'Evaluated', color: 'bg-green-900/50 text-green-300 border-green-700/50' },
    SECOND_DONE: { label: 'Finalised', color: 'bg-blue-900/50 text-blue-300 border-blue-700/50' },
    evaluated: { label: 'Evaluated', color: 'bg-green-900/50 text-green-300 border-green-700/50' },
};

export default function TeacherDashboard() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const [subjects, setSubjects] = useState([]);
    const [selectedSubject, setSelectedSubject] = useState(null);
    const [scripts, setScripts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [scriptsLoading, setScriptsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        loadSubjects();
    }, []);

    const loadSubjects = async () => {
        setLoading(true);
        try {
            const data = await getTeacherSubjects(user?.id);
            setSubjects(data.subjects || []);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to load subjects');
        } finally {
            setLoading(false);
        }
    };

    const selectSubject = async (subject) => {
        setSelectedSubject(subject);
        setScriptsLoading(true);
        setScripts([]);
        try {
            const data = await getTeacherScripts(subject.id, user?.id);
            setScripts(data.scripts || []);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to load scripts');
        } finally {
            setScriptsLoading(false);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const badge = (status) => {
        const b = STATUS_BADGE[status] || { label: status, color: 'bg-gray-800 text-gray-300 border-gray-700' };
        return (
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${b.color}`}>
                {b.label}
            </span>
        );
    };

    return (
        <div className="min-h-screen bg-gray-950 text-white">
            {/* Header */}
            <header className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
                        <GraduationCap className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="font-bold text-white">Teacher Dashboard</h1>
                        <p className="text-xs text-gray-400">{user?.name} · First Evaluator</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/external')}
                        className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
                    >
                        External Evaluator View →
                    </button>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 text-sm text-gray-400 hover:text-red-400 transition-colors"
                    >
                        <LogOut className="w-4 h-4" />
                        Logout
                    </button>
                </div>
            </header>

            {error && (
                <div className="mx-6 mt-4 flex items-center gap-2 bg-red-900/40 border border-red-700/50 rounded-lg px-4 py-3 text-red-300 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                    <button onClick={() => setError('')} className="ml-auto text-red-300 hover:text-white">✕</button>
                </div>
            )}

            <div className="max-w-6xl mx-auto px-6 py-8 flex gap-6">
                {/* Subject List */}
                <div className="w-72 flex-shrink-0">
                    <h2 className="font-semibold text-gray-300 text-sm uppercase tracking-wider mb-3">
                        Assigned Subjects
                    </h2>
                    {loading ? (
                        <p className="text-gray-500 text-sm">Loading...</p>
                    ) : subjects.length === 0 ? (
                        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 text-center">
                            <BookOpen className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                            <p className="text-gray-500 text-sm">No subjects assigned yet.</p>
                            <p className="text-gray-600 text-xs mt-1">Contact your custodian.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {subjects.map(s => (
                                <button
                                    key={s.id}
                                    onClick={() => selectSubject(s)}
                                    className={`w-full text-left bg-gray-900 border rounded-xl p-4 transition-all ${selectedSubject?.id === s.id
                                        ? 'border-blue-500 bg-blue-950/30'
                                        : 'border-gray-800 hover:border-gray-600'
                                        }`}
                                >
                                    <p className="font-medium text-white text-sm">{s.name}</p>
                                    <p className="text-xs text-gray-400 mt-0.5">{s.academic_year}</p>
                                    <div className="flex gap-3 mt-2 text-xs text-gray-400">
                                        <span>📄 {s.stats?.total || 0} scripts</span>
                                        <span>✅ {s.stats?.evaluated_by_me || 0} done</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Scripts Panel */}
                <div className="flex-1">
                    {!selectedSubject ? (
                        <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
                            <FileText className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                            <p className="text-gray-500">Select a subject to view scripts</p>
                        </div>
                    ) : (
                        <div className="bg-gray-900 border border-gray-800 rounded-xl">
                            <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
                                <div>
                                    <h3 className="font-semibold text-white">{selectedSubject.name}</h3>
                                    <p className="text-xs text-gray-400">{selectedSubject.academic_year}</p>
                                </div>
                                <span className="text-sm text-gray-400">{scripts.length} scripts</span>
                            </div>

                            {scriptsLoading ? (
                                <div className="p-8 text-center text-gray-500">Loading scripts...</div>
                            ) : scripts.length === 0 ? (
                                <div className="p-8 text-center text-gray-500">No scripts uploaded yet.</div>
                            ) : (
                                <div className="divide-y divide-gray-800">
                                    {scripts.map(script => (
                                        <div key={script.id} className="px-5 py-4 flex items-center justify-between hover:bg-gray-800/30 transition-colors">
                                            <div>
                                                <p className="font-medium text-white text-sm">{script.student_name}</p>
                                                <div className="flex items-center gap-3 mt-1">
                                                    {script.roll_number && (
                                                        <span className="text-xs text-gray-400">Roll: {script.roll_number}</span>
                                                    )}
                                                    {badge(script.status)}
                                                    {script.teacher_marks !== null && script.teacher_marks !== undefined && (
                                                        <span className="text-xs text-blue-300 font-medium">
                                                            Marks: {script.teacher_marks}
                                                        </span>
                                                    )}
                                                    {script.final_marks !== null && script.final_marks !== undefined && (
                                                        <span className="text-xs text-green-300 font-medium">
                                                            Final: {script.final_marks}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            {script.teacher_marks !== null && script.teacher_marks !== undefined ? (
                                                <span className="flex items-center gap-1.5 bg-green-900/40 text-green-300 border border-green-700/50 text-xs px-3 py-1.5 rounded-lg font-medium">
                                                    ✓ Evaluated
                                                </span>
                                            ) : (
                                                <button
                                                    onClick={() => {
                                                        sessionStorage.setItem('evaluateFrom', '/teacher');
                                                        navigate(`/evaluate/${script.id}`);
                                                    }}
                                                    className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 py-1.5 rounded-lg transition-colors"
                                                >
                                                    <Send className="w-3 h-3" />
                                                    Evaluate
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
}
