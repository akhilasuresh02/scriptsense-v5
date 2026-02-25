import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

/**
 * AuthContext – provides user authentication state across the app.
 *
 * Stores JWT token in localStorage and exposes:
 *   - user: { id, name, email, role }
 *   - token: JWT string
 *   - login(userData, token): store credentials
 *   - logout(): clear credentials
 *   - isAuthenticated: boolean
 *
 * Auto-logout: if the user is idle for IDLE_TIMEOUT_MS (30 min),
 * they are automatically logged out and redirected to /login.
 */

const AuthContext = createContext(null);

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(true);
    const idleTimerRef = useRef(null);
    const isAuthenticatedRef = useRef(false);

    // Keep ref in sync so the event listener always sees the latest value
    // without needing to be re-registered on every auth state change
    useEffect(() => {
        isAuthenticatedRef.current = !!(token && user);
    }, [token, user]);

    const doLogout = useCallback(() => {
        setUser(null);
        setToken(null);
        localStorage.removeItem('scriptsense_token');
        localStorage.removeItem('scriptsense_user');
        // Hard-redirect so the router picks up /login cleanly
        window.location.href = '/login';
    }, []);

    /** Reset (or start) the idle countdown */
    const resetIdleTimer = useCallback(() => {
        if (!isAuthenticatedRef.current) return;
        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = setTimeout(doLogout, IDLE_TIMEOUT_MS);
    }, [doLogout]);

    // Register activity listeners once on mount
    useEffect(() => {
        const handler = () => resetIdleTimer();
        ACTIVITY_EVENTS.forEach(evt => window.addEventListener(evt, handler, { passive: true }));
        return () => {
            ACTIVITY_EVENTS.forEach(evt => window.removeEventListener(evt, handler));
            clearTimeout(idleTimerRef.current);
        };
    }, [resetIdleTimer]);

    // Restore session from localStorage on mount
    useEffect(() => {
        const storedToken = localStorage.getItem('scriptsense_token');
        const storedUser = localStorage.getItem('scriptsense_user');
        if (storedToken && storedUser) {
            try {
                setToken(storedToken);
                setUser(JSON.parse(storedUser));
            } catch {
                localStorage.removeItem('scriptsense_token');
                localStorage.removeItem('scriptsense_user');
            }
        }
        setLoading(false);
    }, []);

    // Start the idle timer whenever user becomes authenticated
    useEffect(() => {
        if (token && user) {
            resetIdleTimer();
        } else {
            clearTimeout(idleTimerRef.current);
        }
    }, [token, user, resetIdleTimer]);

    const login = (userData, jwtToken) => {
        setUser(userData);
        setToken(jwtToken);
        localStorage.setItem('scriptsense_token', jwtToken);
        localStorage.setItem('scriptsense_user', JSON.stringify(userData));
    };

    const logout = () => {
        clearTimeout(idleTimerRef.current);
        setUser(null);
        setToken(null);
        localStorage.removeItem('scriptsense_token');
        localStorage.removeItem('scriptsense_user');
    };

    const value = {
        user,
        token,
        login,
        logout,
        isAuthenticated: !!token && !!user,
        role: user?.role || null,
        loading,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
    return ctx;
}

export default AuthContext;
