import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    FileText, Brain, Users, Shield, ChevronRight, Zap,
    BookOpen, BarChart2, Lock, CheckCircle, Star, ArrowRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const FEATURES = [
    {
        icon: Brain,
        color: 'text-purple-400',
        bg: 'bg-purple-500/10 border-purple-500/20',
        title: 'AI-Powered Evaluation',
        desc: 'Advanced AI transcribes handwritten answer sheets page-by-page with high accuracy.',
    },
    {
        icon: FileText,
        color: 'text-blue-400',
        bg: 'bg-blue-500/10 border-blue-500/20',
        title: 'Smart OCR Processing',
        desc: 'Automatic question-number detection and answer extraction from complex handwritten scripts.',
    },
    {
        icon: Users,
        color: 'text-green-400',
        bg: 'bg-green-500/10 border-green-500/20',
        title: 'Dual Evaluation Workflow',
        desc: 'First and second evaluators independently assess each script for fair, unbiased marking.',
    },
    {
        icon: Shield,
        color: 'text-yellow-400',
        bg: 'bg-yellow-500/10 border-yellow-500/20',
        title: 'Role-Based Access',
        desc: 'Custodians, Teachers, and External Evaluators each have a dedicated secure workspace.',
    },
    {
        icon: BarChart2,
        color: 'text-pink-400',
        bg: 'bg-pink-500/10 border-pink-500/20',
        title: 'Instant Results',
        desc: 'Consolidated marks, evaluator remarks, and CSV export at the click of a button.',
    },
    {
        icon: Lock,
        color: 'text-cyan-400',
        bg: 'bg-cyan-500/10 border-cyan-500/20',
        title: 'Secure & Private',
        desc: 'JWT-based authentication with session auto-expiry keeps your data protected.',
    },
];

const ROLES = [
    {
        icon: Shield,
        label: 'Custodian',
        color: 'text-purple-400',
        ring: 'ring-purple-500/40',
        points: ['Create & manage subjects', 'Upload answer scripts & papers', 'Assign evaluators by department'],
    },
    {
        icon: BookOpen,
        label: 'Teacher (1st Evaluator)',
        color: 'text-blue-400',
        ring: 'ring-blue-500/40',
        points: ['View allocated subjects', 'Evaluate assigned scripts', 'Submit marks & remarks'],
    },
    {
        icon: Star,
        label: 'External Evaluator',
        color: 'text-amber-400',
        ring: 'ring-amber-500/40',
        points: ['Second-pass evaluation', 'Compare with teacher marks', 'Independent assessment'],
    },
];

function AnimatedCounter({ target, suffix = '' }) {
    const [count, setCount] = useState(0);
    useEffect(() => {
        let start = 0;
        const step = Math.ceil(target / 60);
        const timer = setInterval(() => {
            start += step;
            if (start >= target) { setCount(target); clearInterval(timer); }
            else setCount(start);
        }, 20);
        return () => clearInterval(timer);
    }, [target]);
    return <span>{count}{suffix}</span>;
}

export default function LandingPage() {
    const navigate = useNavigate();
    const { isAuthenticated, role } = useAuth();

    // If already logged in, go straight to their dashboard
    useEffect(() => {
        if (isAuthenticated) {
            navigate(role === 'custodian' ? '/custodian' : '/teacher', { replace: true });
        }
    }, [isAuthenticated, role, navigate]);

    return (
        <div className="min-h-screen bg-gray-950 text-white overflow-x-hidden">

            {/* ── Nav ─────────────────────────────────────── */}
            <nav className="sticky top-0 z-50 border-b border-white/5 bg-gray-950/80 backdrop-blur-md">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                            <Zap className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-lg font-bold tracking-tight">ScriptSense</span>
                    </div>
                    <button
                        onClick={() => navigate('/login')}
                        className="flex items-center gap-1.5 text-sm font-medium text-gray-300 hover:text-white transition-colors"
                    >
                        Sign In <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </nav>

            {/* ── Hero ────────────────────────────────────── */}
            <section className="relative pt-24 pb-32 px-6 text-center overflow-hidden">
                {/* Background glow blobs */}
                <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
                <div className="absolute top-20 right-0 w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />

                <div className="relative max-w-4xl mx-auto">
                    <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 text-xs text-gray-400 mb-8">
                        <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                        AI-Powered Handwriting Recognition
                    </div>

                    <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-tight">
                        Evaluate Answer Scripts{' '}
                        <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                            Intelligently
                        </span>
                    </h1>

                    <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
                        ScriptSense automates the entire answer-sheet evaluation pipeline — from
                        handwritten OCR to dual-evaluator marking — saving hours of manual effort.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <button
                            onClick={() => navigate('/login')}
                            className="group flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold px-8 py-3.5 rounded-xl transition-all shadow-lg shadow-blue-900/40 hover:shadow-blue-700/40"
                        >
                            Get Started
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                        </button>
                        <button
                            onClick={() => navigate('/register')}
                            className="flex items-center gap-2 border border-white/10 hover:border-white/25 text-gray-300 hover:text-white px-8 py-3.5 rounded-xl transition-all"
                        >
                            Register as Faculty
                        </button>
                    </div>
                </div>
            </section>

            {/* ── Stats ───────────────────────────────────── */}
            <section className="border-y border-white/5 bg-white/[0.02] py-10 px-6">
                <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                    {[
                        { label: 'Pages Processed', value: 10000, suffix: '+' },
                        { label: 'Accuracy Rate', value: 97, suffix: '%' },
                        { label: 'Roles Supported', value: 3, suffix: '' },
                        { label: 'Evaluations Done', value: 500, suffix: '+' },
                    ].map(stat => (
                        <div key={stat.label}>
                            <p className="text-3xl font-bold text-white mb-1">
                                {stat.isText ? stat.value : <AnimatedCounter target={stat.value} suffix={stat.suffix} />}
                            </p>
                            <p className="text-xs text-gray-500 uppercase tracking-widest">{stat.label}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── Features ────────────────────────────────── */}
            <section className="py-24 px-6">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-14">
                        <h2 className="text-3xl md:text-4xl font-bold mb-3">Everything you need</h2>
                        <p className="text-gray-400 max-w-xl mx-auto">End-to-end answer sheet management with AI at every step.</p>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {FEATURES.map(f => (
                            <div
                                key={f.title}
                                className={`rounded-2xl border p-6 bg-gray-900/60 hover:bg-gray-900 transition-colors ${f.bg}`}
                            >
                                <div className={`w-10 h-10 rounded-xl ${f.bg} border flex items-center justify-center mb-4`}>
                                    <f.icon className={`w-5 h-5 ${f.color}`} />
                                </div>
                                <h3 className="font-semibold text-white mb-2">{f.title}</h3>
                                <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Role Overview ────────────────────────────── */}
            <section className="py-24 px-6 bg-white/[0.02] border-y border-white/5">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-14">
                        <h2 className="text-3xl md:text-4xl font-bold mb-3">Built for every role</h2>
                        <p className="text-gray-400">A tailored workspace for each participant in the evaluation process.</p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-6">
                        {ROLES.map(r => (
                            <div
                                key={r.label}
                                className={`bg-gray-900 rounded-2xl p-6 ring-1 ${r.ring} hover:ring-2 transition-all`}
                            >
                                <div className={`w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mb-5`}>
                                    <r.icon className={`w-5 h-5 ${r.color}`} />
                                </div>
                                <h3 className={`font-bold text-lg mb-4 ${r.color}`}>{r.label}</h3>
                                <ul className="space-y-2.5">
                                    {r.points.map(p => (
                                        <li key={p} className="flex items-start gap-2 text-sm text-gray-400">
                                            <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                                            {p}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── CTA ─────────────────────────────────────── */}
            <section className="py-28 px-6 text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-950/20 to-transparent pointer-events-none" />
                <div className="relative max-w-2xl mx-auto">
                    <h2 className="text-4xl md:text-5xl font-extrabold mb-4">Ready to streamline evaluation?</h2>
                    <p className="text-gray-400 mb-10 text-lg">Join your institution on ScriptSense today.</p>
                    <button
                        onClick={() => navigate('/login')}
                        className="group inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold px-10 py-4 rounded-xl text-lg transition-all shadow-2xl shadow-blue-900/30"
                    >
                        Get Started — it's free
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                </div>
            </section>

            {/* ── Footer ──────────────────────────────────── */}
            <footer className="border-t border-white/5 py-8 px-6 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                    <div className="w-5 h-5 bg-gradient-to-br from-blue-500 to-purple-600 rounded flex items-center justify-center">
                        <Zap className="w-3 h-3 text-white" />
                    </div>
                    <span className="font-semibold text-sm">ScriptSense</span>
                </div>
                <p className="text-xs text-gray-600">AI-Powered Answer Sheet Evaluation</p>
            </footer>
        </div>
    );
}
