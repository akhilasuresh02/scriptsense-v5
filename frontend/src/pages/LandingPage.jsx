import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    FileText, Brain, Users, Shield, ChevronRight, Zap,
    BookOpen, BarChart2, Lock, CheckCircle, Star, ArrowRight,
    PenTool, Image, Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const CORE_CAPABILITIES = [
    {
        icon: PenTool,
        color: 'from-blue-500 to-cyan-400',
        title: 'Handwriting to Text',
        desc: 'Converts handwritten student answers into editable, digital text using Google Gemini OCR — accurately handling diverse handwriting styles.',
        tag: 'OCR Engine',
    },
    {
        icon: Image,
        color: 'from-purple-500 to-pink-400',
        title: 'Diagram Detection',
        desc: 'Automatically identifies and extracts diagrams, figures, and illustrations from scanned answer sheets for separate visual review.',
        tag: 'Vision AI',
    },
    {
        icon: Sparkles,
        color: 'from-amber-400 to-orange-500',
        title: 'AI Evaluation Assistant',
        desc: 'Acts as an intelligent co-evaluator — suggesting marks based on rubrics, highlighting key answer points, and reducing evaluator fatigue.',
        tag: 'Smart Grading',
    },
];

const FEATURES = [
    {
        icon: Brain,
        color: 'text-purple-400',
        bg: 'bg-purple-500/10',
        border: 'border-purple-500/30',
        glow: 'shadow-purple-500/20',
        title: 'AI-Powered Evaluation',
        desc: 'Advanced AI transcribes handwritten answer sheets page-by-page with high accuracy using Google Gemini.',
        detail: 'Upload any handwritten answer sheet and watch as AI converts it into structured, graded text in seconds.',
    },
    {
        icon: FileText,
        color: 'text-blue-400',
        bg: 'bg-blue-500/10',
        border: 'border-blue-500/30',
        glow: 'shadow-blue-500/20',
        title: 'Smart OCR Processing',
        desc: 'Automatic question-number detection and answer extraction from complex handwritten scripts.',
        detail: 'Intelligently parses answer numbers, sub-parts, and multi-page answers into a clean, structured format.',
    },
    {
        icon: Users,
        color: 'text-green-400',
        bg: 'bg-green-500/10',
        border: 'border-green-500/30',
        glow: 'shadow-green-500/20',
        title: 'Dual Evaluation Workflow',
        desc: 'First and second evaluators independently assess each script for fair, unbiased marking.',
        detail: 'Two-tier evaluation ensures accuracy — teachers and external evaluators mark independently before consolidation.',
    },
    {
        icon: Shield,
        color: 'text-yellow-400',
        bg: 'bg-yellow-500/10',
        border: 'border-yellow-500/30',
        glow: 'shadow-yellow-500/20',
        title: 'Role-Based Access',
        desc: 'Custodians, Teachers, and External Evaluators each have a dedicated secure workspace.',
        detail: 'Each role sees only what they need — custodians manage, teachers evaluate, externals verify.',
    },
    {
        icon: BarChart2,
        color: 'text-pink-400',
        bg: 'bg-pink-500/10',
        border: 'border-pink-500/30',
        glow: 'shadow-pink-500/20',
        title: 'Instant Results',
        desc: 'Consolidated marks, evaluator remarks, and CSV export at the click of a button.',
        detail: 'View per-question breakdowns, compare evaluator scores, and export everything to Excel instantly.',
    },
    {
        icon: Sparkles,
        color: 'text-cyan-400',
        bg: 'bg-cyan-500/10',
        border: 'border-cyan-500/30',
        glow: 'shadow-cyan-500/20',
        title: 'AI-Assisted Grading',
        desc: 'Gemini AI suggests marks based on rubrics and highlights key answer points.',
        detail: 'The AI reads transcribed answers against your rubric, suggests scores, and flags important keywords — so evaluators can focus on judgement, not scanning.',
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

/* ── Scroll-reveal hook ─────────────────── */
function useInView(threshold = 0.15) {
    const ref = useRef(null);
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold });
        obs.observe(el);
        return () => obs.disconnect();
    }, [threshold]);
    return [ref, visible];
}

export default function LandingPage() {
    const navigate = useNavigate();
    const { isAuthenticated, role } = useAuth();
    const [activeFeature, setActiveFeature] = useState(0);

    /* auto-rotate features every 4s */
    useEffect(() => {
        const t = setInterval(() => setActiveFeature(i => (i + 1) % FEATURES.length), 4000);
        return () => clearInterval(t);
    }, []);

    // If already logged in, go straight to their dashboard
    useEffect(() => {
        if (isAuthenticated) {
            navigate(role === 'custodian' ? '/custodian' : '/teacher', { replace: true });
        }
    }, [isAuthenticated, role, navigate]);

    const [heroRef, heroVisible] = useInView();
    const [capRef, capVisible] = useInView();
    const [featRef, featVisible] = useInView();
    const [roleRef, roleVisible] = useInView();
    const [ctaRef, ctaVisible] = useInView();

    const af = FEATURES[activeFeature];

    return (
        <div className="min-h-screen bg-gray-950 text-white overflow-x-hidden">

            {/* ── Nav ─────────────────────────────────────── */}
            <nav className="sticky top-0 z-50 border-b border-white/5 bg-gray-950/80 backdrop-blur-md">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center animate-breathe">
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
            <section ref={heroRef} className="relative pt-24 pb-20 px-6 text-center overflow-hidden">
                {/* Floating ambient blobs */}
                <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none animate-glow-drift" />
                <div className="absolute top-20 right-0 w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[100px] pointer-events-none animate-glow-drift-reverse" />
                <div className="absolute bottom-0 left-10 w-[300px] h-[300px] bg-pink-600/8 rounded-full blur-[90px] pointer-events-none animate-glow-drift" />

                <div className={`relative max-w-4xl mx-auto ${heroVisible ? 'animate-fade-in-up' : 'opacity-0'}`}>
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
                        ScriptSense transforms answer-sheet evaluation with AI — converting handwriting
                        to text, detecting diagrams, and providing intelligent grading assistance to
                        help evaluators mark faster and more accurately.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <button
                            onClick={() => navigate('/login')}
                            className="group flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold px-8 py-3.5 rounded-xl transition-all shadow-lg shadow-blue-900/40 hover:shadow-blue-700/40 hover:scale-105"
                        >
                            Get Started
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                        </button>
                        <button
                            onClick={() => navigate('/register')}
                            className="flex items-center gap-2 border border-white/10 hover:border-white/25 text-gray-300 hover:text-white px-8 py-3.5 rounded-xl transition-all hover:scale-105"
                        >
                            Register as Faculty
                        </button>
                    </div>
                </div>
            </section>

            {/* ── Core Capabilities — Animated Steps ─────── */}
            <section ref={capRef} className="py-20 px-6 border-y border-white/5 bg-white/[0.02] relative overflow-hidden">
                {/* floating accent blob */}
                <div className="absolute top-1/2 left-0 -translate-y-1/2 w-[250px] h-[250px] bg-cyan-500/8 rounded-full blur-[80px] pointer-events-none animate-glow-drift" />
                <div className="absolute bottom-0 right-10 w-[200px] h-[200px] bg-purple-500/6 rounded-full blur-[70px] pointer-events-none animate-glow-drift-reverse" />

                <div className="max-w-6xl mx-auto relative z-10">
                    <div className={`text-center mb-16 ${capVisible ? 'animate-fade-in-up' : 'opacity-0'}`}>
                        <h2 className="text-3xl md:text-4xl font-bold mb-3">How It Works</h2>
                        <p className="text-gray-400 max-w-xl mx-auto">Three powerful AI capabilities working together to transform answer-sheet evaluation.</p>
                    </div>

                    {/* Step cards with connectors */}
                    <div className={`relative ${capVisible ? 'animate-fade-in-up delay-200' : 'opacity-0'}`}>


                        {/* ── Cards ── */}
                        <div className="grid md:grid-cols-3 gap-6 relative z-10">
                            {CORE_CAPABILITIES.map((cap, idx) => (
                                <div
                                    key={cap.title}
                                    className={`step-card-${idx + 1} group relative rounded-2xl bg-gray-900/80 border border-white/5 p-7 hover:border-white/15 transition-all duration-500 overflow-hidden`}
                                >
                                    {/* Gradient accent line at top */}
                                    <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${cap.color} opacity-60 group-hover:opacity-100 transition-opacity`} />

                                    <div className="flex items-center justify-between mb-5">
                                        <div className={`step-icon-${idx + 1} w-12 h-12 rounded-xl bg-gradient-to-br ${cap.color} flex items-center justify-center shadow-lg`}>
                                            <cap.icon className="w-6 h-6 text-white" />
                                        </div>
                                        <span className="text-xs font-medium text-gray-600 bg-white/5 rounded-full px-3 py-1">
                                            {cap.tag}
                                        </span>
                                    </div>

                                    <h3 className="text-xl font-bold text-white mb-3">{cap.title}</h3>
                                    <p className="text-sm text-gray-400 leading-relaxed">{cap.desc}</p>

                                    <div className="mt-6 flex items-center gap-2 text-xs text-gray-500">
                                        <span className={`step-num-${idx + 1} w-7 h-7 rounded-full bg-gradient-to-br ${cap.color} flex items-center justify-center text-white font-bold text-[11px] shadow-md`}>
                                            {idx + 1}
                                        </span>
                                        <span>Step {idx + 1} of 3</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Features — Sidebar + Detail ──────────────── */}
            <section ref={featRef} className="py-24 px-6 relative overflow-hidden">
                {/* ambient blobs */}
                <div className="absolute top-20 right-10 w-[350px] h-[350px] bg-indigo-600/8 rounded-full blur-[100px] pointer-events-none animate-glow-drift-reverse" />
                <div className="absolute bottom-20 left-20 w-[250px] h-[250px] bg-emerald-600/6 rounded-full blur-[80px] pointer-events-none animate-glow-drift" />

                <div className="max-w-6xl mx-auto relative z-10">
                    <div className={`text-center mb-14 ${featVisible ? 'animate-fade-in-up' : 'opacity-0'}`}>
                        <h2 className="text-3xl md:text-4xl font-bold mb-3">Everything you need</h2>
                        <p className="text-gray-400 max-w-xl mx-auto">End-to-end answer sheet management with AI at every step.</p>
                    </div>

                    <div className={`flex flex-col lg:flex-row gap-6 ${featVisible ? 'animate-fade-in-up delay-200' : 'opacity-0'}`}>

                        {/* ── Left Sidebar ── */}
                        <div className="lg:w-[340px] shrink-0 flex flex-col gap-2">
                            {FEATURES.map((f, idx) => {
                                const isActive = idx === activeFeature;
                                return (
                                    <button
                                        key={f.title}
                                        onClick={() => setActiveFeature(idx)}
                                        className={`group relative flex items-center gap-3.5 text-left w-full px-4 py-3.5 rounded-xl border transition-all duration-300 ${
                                            isActive
                                                ? `${f.bg} ${f.border} border shadow-lg ${f.glow}`
                                                : 'border-transparent hover:border-white/10 hover:bg-white/[0.02]'
                                        }`}
                                    >
                                        {/* Active indicator bar */}
                                        <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-full transition-all duration-300 ${
                                            isActive ? `h-8 bg-gradient-to-b ${f.border.replace('border-', 'from-').replace('/30', '')} to-transparent opacity-100` : 'h-0 opacity-0'
                                        }`} />

                                        <div className={`w-9 h-9 rounded-lg ${f.bg} flex items-center justify-center shrink-0 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-105'}`}>
                                            <f.icon className={`w-4.5 h-4.5 ${f.color}`} />
                                        </div>

                                        <div className="min-w-0">
                                            <p className={`font-semibold text-sm transition-colors ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'}`}>
                                                {f.title}
                                            </p>
                                            <p className={`text-xs mt-0.5 truncate transition-colors ${isActive ? 'text-gray-400' : 'text-gray-600'}`}>
                                                {f.desc}
                                            </p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        {/* ── Right Detail Panel ── */}
                        <div className="flex-1 min-h-[320px] relative">
                            <div
                                key={activeFeature}
                                className="rounded-2xl border border-white/5 bg-gray-900/60 p-8 md:p-10 h-full flex flex-col justify-center relative overflow-hidden animate-fade-in-up"
                            >
                                {/* shimmer border effect */}
                                <div className="absolute inset-0 rounded-2xl shimmer-border pointer-events-none" />

                                {/* Background gradient blob */}
                                <div className={`absolute -top-10 -right-10 w-[200px] h-[200px] ${af.bg} rounded-full blur-[60px] pointer-events-none animate-breathe`} />

                                <div className="relative z-10">
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className={`w-14 h-14 rounded-2xl ${af.bg} border ${af.border} flex items-center justify-center animate-breathe`}>
                                            <af.icon className={`w-7 h-7 ${af.color}`} />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-bold text-white">{af.title}</h3>
                                            <p className={`text-xs mt-1 ${af.color} font-medium`}>Feature {activeFeature + 1} of {FEATURES.length}</p>
                                        </div>
                                    </div>

                                    <p className="text-gray-300 text-base leading-relaxed mb-4">{af.desc}</p>
                                    <p className="text-gray-500 text-sm leading-relaxed">{af.detail}</p>

                                    {/* Progress dots */}
                                    <div className="flex items-center gap-2 mt-8">
                                        {FEATURES.map((_, i) => (
                                            <button
                                                key={i}
                                                onClick={() => setActiveFeature(i)}
                                                className={`rounded-full transition-all duration-500 ${
                                                    i === activeFeature ? 'w-8 h-2 bg-gradient-to-r from-blue-500 to-purple-500' : 'w-2 h-2 bg-gray-700 hover:bg-gray-500'
                                                }`}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Role Overview ────────────────────────────── */}
            <section ref={roleRef} className="py-24 px-6 bg-white/[0.02] border-y border-white/5 relative overflow-hidden">
                <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-amber-500/5 rounded-full blur-[80px] pointer-events-none animate-glow-drift-reverse" />

                <div className="max-w-6xl mx-auto relative z-10">
                    <div className={`text-center mb-14 ${roleVisible ? 'animate-fade-in-up' : 'opacity-0'}`}>
                        <h2 className="text-3xl md:text-4xl font-bold mb-3">Built for every role</h2>
                        <p className="text-gray-400">A tailored workspace for each participant in the evaluation process.</p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-6">
                        {ROLES.map((r, idx) => (
                            <div
                                key={r.label}
                                className={`group bg-gray-900 rounded-2xl p-6 ring-1 ${r.ring} hover:ring-2 transition-all duration-300 hover:-translate-y-1 ${roleVisible ? `animate-fade-in-up delay-${(idx + 1) * 200}` : 'opacity-0'}`}
                            >
                                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
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
            <section ref={ctaRef} className="py-28 px-6 text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-950/20 to-transparent pointer-events-none" />
                <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-blue-600/8 rounded-full blur-[100px] pointer-events-none animate-glow-drift" />

                <div className={`relative max-w-2xl mx-auto ${ctaVisible ? 'animate-fade-in-up' : 'opacity-0'}`}>
                    <h2 className="text-4xl md:text-5xl font-extrabold mb-4">Ready to streamline evaluation?</h2>
                    <p className="text-gray-400 mb-10 text-lg">Join your institution on ScriptSense today.</p>
                    <button
                        onClick={() => navigate('/login')}
                        className="group inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold px-10 py-4 rounded-xl text-lg transition-all shadow-2xl shadow-blue-900/30 hover:scale-105"
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
