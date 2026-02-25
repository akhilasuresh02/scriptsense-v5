import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import HomePage from './pages/HomePage';
import LandingPage from './pages/LandingPage';
import EvaluationPage from './pages/EvaluationPage';
import SubjectsPage from './pages/SubjectsPage';
import ResultsPage from './pages/ResultsPage';

// NEW: Auth pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import SetupPage from './pages/SetupPage';

// NEW: Role-based dashboards
import CustodianDashboard from './pages/CustodianDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import ExternalDashboard from './pages/ExternalDashboard';

// NEW: Auth guard
import ProtectedRoute from './components/ProtectedRoute';

/** Smart landing: unauthenticated → landing page, authenticated → role dashboard */
function RootRedirect() {
    const { isAuthenticated, role, loading } = useAuth();
    if (loading) return null; // wait for localStorage restore
    if (!isAuthenticated) return <Navigate to="/landing" replace />;
    if (role === 'custodian') return <Navigate to="/custodian" replace />;
    return <Navigate to="/teacher" replace />;
}

function UnauthorizedPage() {
    return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white text-center p-8">
            <div>
                <h1 className="text-4xl font-bold mb-3">403</h1>
                <p className="text-gray-400 mb-6">You don't have permission to access this page.</p>
                <a href="/login" className="text-blue-400 hover:text-blue-300">← Back to Login</a>
            </div>
        </div>
    );
}

function App() {
    return (
        <div className="min-h-screen">
            <Routes>
                {/* ── Public routes ───────────────────────────────────── */}
                <Route path="/" element={<RootRedirect />} />
                <Route path="/landing" element={<LandingPage />} />
                <Route path="/home" element={<HomePage />} />
                <Route path="/subjects" element={<SubjectsPage />} />
                <Route path="/results" element={<ResultsPage />} />
                <Route path="/evaluate/:answersheetId" element={<EvaluationPage />} />

                {/* ── Auth routes (NEW) ────────────────────────────────── */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/setup" element={<SetupPage />} />
                <Route path="/unauthorized" element={<UnauthorizedPage />} />

                {/* ── Role-based dashboards (NEW, protected) ───────────── */}
                <Route
                    path="/custodian"
                    element={
                        <ProtectedRoute requiredRole="custodian">
                            <CustodianDashboard />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/teacher"
                    element={
                        <ProtectedRoute>
                            <TeacherDashboard />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/external"
                    element={
                        <ProtectedRoute>
                            <ExternalDashboard />
                        </ProtectedRoute>
                    }
                />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </div>
    );
}

export default App;

