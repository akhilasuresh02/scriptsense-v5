import axios from 'axios';

const getApiBaseUrl = () => {
    // We now use Vercel/Vite Proxies for everything
    // This allows the browser to think it's talking to the same domain, bypassing CORS entirely
    return '/api/';
};

export const DIRECT_RENDER_URL = import.meta.env.VITE_API_URL
    ? (import.meta.env.VITE_API_URL.toLowerCase().includes('/api')
        ? (import.meta.env.VITE_API_URL.endsWith('/') ? import.meta.env.VITE_API_URL : `${import.meta.env.VITE_API_URL}/`)
        : (import.meta.env.VITE_API_URL.endsWith('/') ? `${import.meta.env.VITE_API_URL}api/` : `${import.meta.env.VITE_API_URL}/api/`))
    : null;

const API_BASE_URL = getApiBaseUrl();

console.log("🚀 ScriptSense Final API URL:", API_BASE_URL);
console.log("🔗 Direct Render URL:", DIRECT_RENDER_URL);
console.log("🌍 Environment:", import.meta.env.MODE);
console.log("📡 Production API defined:", !!import.meta.env.VITE_API_URL);

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 120000, // 2 minutes timeout for slow mobile uploads
});

// Attach JWT token to every request if present
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('scriptsense_token');
    if (token) {
        // Use the proper way to set headers in axios
        config.headers = config.headers || {};
        config.headers['Authorization'] = `Bearer ${token}`;
        config.headers['authorization'] = `Bearer ${token}`;
    }
    return config;
}, (error) => Promise.reject(error));

// Response interceptor: log errors + auto-logout on 401 (stale/invalid token)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        console.error('🌐 API Error:', {
            url: error.config?.url,
            method: error.config?.method,
            status: error.response?.status,
            data: error.response?.data,
            message: error.message
        });

        // Auto-logout on 401 — token is stale or invalid, clear it
        if (error.response?.status === 401) {
            const isAuthRoute = error.config?.url?.includes('auth/login') ||
                error.config?.url?.includes('auth/register') ||
                error.config?.url?.includes('auth/seed-custodian');
            if (!isAuthRoute) {
                console.warn('🔒 401 received — clearing stale token');
                localStorage.removeItem('scriptsense_token');
                localStorage.removeItem('scriptsense_user');
                // Don't hard-redirect here — let the component handle it gracefully
                // The ProtectedRoute will redirect to /login on next render
            }
        }

        return Promise.reject(error);
    }
);


// Upload services
export const uploadQuestionPaper = async (file, { title, totalQuestions, subjectId }, onProgress) => {
    const formData = new FormData();
    formData.append('file', file);
    if (title) formData.append('title', title);
    if (totalQuestions) formData.append('total_questions', totalQuestions);
    if (subjectId) formData.append('subject_id', subjectId);

    const response = await api.post('upload/question-paper', formData, {
        onUploadProgress: onProgress
    });
    return response.data;
};

export const uploadAnswerSheet = async (file, { studentName, questionPaperId, subjectId }, onProgress) => {
    const formData = new FormData();
    formData.append('file', file);
    if (studentName) formData.append('student_name', studentName);
    if (questionPaperId) formData.append('question_paper_id', questionPaperId);
    if (subjectId) formData.append('subject_id', subjectId);

    const response = await api.post('upload/answer-sheet', formData, {
        onUploadProgress: onProgress
    });
    return response.data;
};

export const uploadRubric = async (file, { title, subjectId }, onProgress) => {
    const formData = new FormData();
    formData.append('file', file);
    if (title) formData.append('title', title);
    if (subjectId) formData.append('subject_id', subjectId);

    const response = await api.post('upload/rubric', formData, {
        onUploadProgress: onProgress
    });
    return response.data;
};

export const getFiles = async (type = 'all') => {
    const response = await api.get(`upload/files?type=${type}`);
    return response.data;
};

export const getFileUrl = (fileId, type) => {
    return `${API_BASE_URL}/upload/files/${fileId}/view?type=${type}`.replace('//upload', '/upload');
};

export const getThumbnailUrl = (fileId, type) => {
    return `${API_BASE_URL}/upload/files/${fileId}/thumbnail?type=${type}`.replace('//upload', '/upload');
};

// Evaluation services
export const autoScanPage = async (answersheetId, page) => {
    const response = await api.post('evaluate/auto-scan', {
        answersheetId,
        page
    });
    return response.data;
};

export const transcribeRegion = async (answersheetId, page, coordinates) => {
    const response = await api.post('evaluate/transcribe', {
        answersheetId,
        page,
        coordinates
    });
    return response.data;
};

export const extractDiagram = async (answersheetId, page, coordinates) => {
    const response = await api.post('evaluate/extract-diagram', {
        answersheetId,
        page,
        coordinates
    });
    return response.data;
};

export const saveMarks = async (answersheetId, questionPaperId, questionNumber, marksAwarded, maxMarks, evaluatorRole = 'teacher') => {
    const response = await api.post('evaluate/marks', {
        answersheetId,
        questionPaperId,
        questionNumber,
        marksAwarded,
        maxMarks,
        evaluatorRole
    });
    return response.data;
};

export const getMarks = async (answersheetId, role = 'teacher') => {
    const response = await api.get(`evaluate/marks/${answersheetId}?role=${role}`);
    return response.data;
};

export const getTotalMarks = async (answersheetId, role = 'teacher') => {
    const response = await api.get(`evaluate/marks/${answersheetId}/total?role=${role}`);
    return response.data;
};

export const getPdfInfo = async (answersheetId) => {
    const response = await api.get(`evaluate/pdf-info/${answersheetId}`);
    return response.data;
};

export const saveReport = async (answersheetId, remarks, evaluatorRole = 'teacher') => {
    const response = await api.post('evaluate/save-report', {
        answersheetId,
        remarks,
        evaluatorRole
    });
    return response.data;
};

export const deleteFile = async (fileId, type) => {
    const response = await api.delete(`upload/files/${fileId}?type=${type}`);
    return response.data;
};

export const zoomRegion = async (answersheetId, page, coordinates) => {
    const response = await api.post('evaluate/zoom', {
        answersheetId,
        page,
        coordinates
    });
    return response.data;
};

export const getMatchedContent = async (answerSheetId) => {
    const response = await api.get(`evaluate/match-content/${answerSheetId}`);
    return response.data;
};

// Question-Answer-Rubric matching services
export const scanQuestionPaper = async (questionPaperId, page = 0) => {
    const response = await api.post('evaluate/scan-question-paper', {
        questionPaperId,
        page
    });
    return response.data;
};

export const scanRubric = async (rubricId, page = 0) => {
    const response = await api.post('evaluate/scan-rubric', {
        rubricId,
        page
    });
    return response.data;
};

export const getResults = async (subjectId = null) => {
    const url = subjectId ? `evaluate/results?subject_id=${subjectId}` : 'evaluate/results';
    const response = await api.get(url);
    return response.data;
};

export const exportResultsUrl = (subjectId = null) => {
    const base = `${API_BASE_URL}/evaluate/results/export`.replace('//evaluate', '/evaluate');
    return subjectId ? `${base}?subject_id=${subjectId}` : base;
};

// Subject management services
export const createSubject = async (name, className, academicYear, firstEvaluatorId, secondEvaluatorId, createdBy) => {
    const response = await api.post('subjects', {
        name,
        className,
        academicYear,
        first_evaluator_id: firstEvaluatorId || null,
        second_evaluator_id: secondEvaluatorId || null,
        created_by: createdBy || null,
    });
    return response.data;
};

export const getSubjects = async () => {
    const response = await api.get('subjects');
    return response.data;
};

export const getSubject = async (subjectId) => {
    const response = await api.get(`subjects/${subjectId}`);
    return response.data;
};

export const deleteSubject = async (subjectId) => {
    const response = await api.delete(`subjects/${subjectId}`);
    return response.data;
};

export const updateSubject = async (subjectId, name, className, academicYear) => {
    const response = await api.put(`subjects/${subjectId}`, { name, className, academicYear });
    return response.data;
};

export const getSubjectStudents = async (subjectId) => {
    const response = await api.get(`subjects/${subjectId}/students`);
    return response.data;
};

export const exportSubjectMarks = (subjectId) => {
    return `${API_BASE_URL}/subjects/${subjectId}/export-marks`.replace('//subjects', '/subjects');
};

// Batch upload service
export const uploadAnswerSheetsBatch = async (files, subjectId, questionPaperId, onProgress) => {
    const formData = new FormData();
    files.forEach(file => {
        formData.append('files', file);
    });
    if (subjectId) formData.append('subject_id', subjectId);
    if (questionPaperId) formData.append('question_paper_id', questionPaperId);

    const response = await api.post('upload/answer-sheets-batch', formData, {
        onUploadProgress: onProgress
    });
    return response.data;
};

// Question/Rubric content scanning services
export const scanAllPages = async (type, id) => {
    const response = await api.post('evaluate/scan-all-pages', { type, id });
    return response.data;
};

export const getQuestionContents = async (questionPaperId) => {
    const response = await api.get(`evaluate/question-contents/${questionPaperId}`);
    return response.data;
};

export const getRubricContents = async (rubricId) => {
    const response = await api.get(`evaluate/rubric-contents/${rubricId}`);
    return response.data;
};

export const getSubjectResults = async (subjectId) => {
    const response = await api.get(`subjects/${subjectId}/results`);
    return response.data;
};

export const analyzeBlooms = async (text) => {
    const response = await api.post('evaluate/analyze-blooms', { text });
    return response.data;
};

export const prescanAnswerSheet = async (answersheetId) => {
    const response = await api.post('evaluate/prescan-all', { answersheetId });
    return response.data;
};

export const getPrescanData = async (answersheetId) => {
    const response = await api.get(`evaluate/prescan-data/${answersheetId}`);
    return response.data;
};

// AI-assisted evaluation
export const aiEvaluateQuestion = async (answersheetId, questionNumber, maxMarks) => {
    const response = await api.post('evaluate/ai-evaluate', {
        answersheetId,
        questionNumber,
        maxMarks
    });
    return response.data;
};

// ── NEW: Auth API functions ───────────────────────────────────────────────────

export const registerFaculty = async (name, email, password, department) => {
    const response = await api.post('auth/register', { name, email, password, department });
    return response.data;
};

export const loginUser = async (email, password) => {
    const response = await api.post('auth/login', { email, password });
    return response.data;
};

export const getCurrentUser = async () => {
    const response = await api.get('auth/me');
    return response.data;
};

export const getFacultyList = async (userId) => {
    const params = userId ? { user_id: userId } : {};
    const response = await api.get('auth/faculty', { params });
    return response.data;
};

export const seedCustodian = async (name, email, password) => {
    const response = await api.post('auth/seed-custodian', { name, email, password });
    return response.data;
};

// ── NEW: Evaluator assignment ─────────────────────────────────────────────────

export const assignEvaluators = async (subjectId, firstEvaluatorId, secondEvaluatorId) => {
    const response = await api.put(`subjects/${subjectId}/assign-evaluators`, {
        first_evaluator_id: firstEvaluatorId,
        second_evaluator_id: secondEvaluatorId,
    });
    return response.data;
};

// ── NEW: Teacher (First Evaluator) API functions ──────────────────────────────

export const getTeacherSubjects = async (userId) => {
    const response = await api.get('teacher/subjects', { params: { user_id: userId } });
    return response.data;
};

export const getTeacherScripts = async (subjectId, userId) => {
    const response = await api.get(`teacher/subjects/${subjectId}/scripts`, { params: { user_id: userId } });
    return response.data;
};

export const submitTeacherMarks = async (scriptId, marks, remarks, userId) => {
    const response = await api.post(`teacher/scripts/${scriptId}/marks`, { marks, remarks, user_id: userId });
    return response.data;
};

// ── NEW: External Evaluator API functions ─────────────────────────────────────

export const getExternalSubjects = async (userId) => {
    const response = await api.get('external/subjects', { params: { user_id: userId } });
    return response.data;
};

export const getExternalScripts = async (subjectId, userId) => {
    const response = await api.get(`external/subjects/${subjectId}/scripts`, { params: { user_id: userId } });
    return response.data;
};

export const submitExternalMarks = async (scriptId, marks, remarks, userId) => {
    const response = await api.post(`external/scripts/${scriptId}/marks`, { marks, remarks, user_id: userId });
    return response.data;
};

export default api;
