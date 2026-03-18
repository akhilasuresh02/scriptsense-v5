# ScriptSense 

## AI-Powered Answer Sheet Evaluation System

ScriptSense is a comprehensive full-stack application designed to automate and assist in the evaluation of student handwritten answer sheets. Leveraging the power of Google's Gemini AI for OCR and content analysis, it allows educators to upload answer sheets and grading rubrics, automatically transcribe handwriting, extract diagrams, and suggest marks based on predefined evaluation criteria.

---

## ✨ Features

- **Document Management**: Upload and manage Question Papers, Answer Sheets (PDFs), and Evaluation Rubrics.
- **AI Handwriting Recognition**: Uses Gemini OCR to transcribe handwritten student answers accurately.
- **Diagram Extraction**: Identifies and extracts diagrams from answer sheets for visual review.
- **Automated Grading Suggestions**: Evaluates transcribed answers against the provided rubric and suggests marks.
- **Interactive Grading Panel**: A dedicated UI for educators to review AI suggestions, verify extracted context, and finalize scores.
- **Smart Parsing**: Automatically identifies different answer formats and maps them to the correct questions and rubrics.
- **Marks Calculation & Export**: Calculates final scores accurately and allows exporting the results.

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 18 with Vite
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **PDF Rendering**: react-pdf
- **Routing**: React Router DOM

### Backend
- **Framework**: Python 3.10+ & Flask
- **Database**: SQLAlchemy (SQLite / PostgreSQL)
- **AI / OCR**: Google Generative AI (Gemini)
- **PDF Processing**: PyMuPDF
- **Authentication**: Flask-JWT-Extended
- **Utilities**: Pillow, Python-dotenv, Werkzeug, openpyxl

---

## 🚀 Getting Started

### Prerequisites
- **Python 3.10+**
- **Node.js 18+**
- **Git**
- **Google Gemini API Key**

### 1. Clone the Repository
```bash
git clone https://github.com/akhilasuresh02/scriptsense-v5.git
cd scriptsense-v5
```

### 2. Backend Setup
Set up the Python Flask environment:

```bash
cd backend
python -m venv venv

# Activate Virtual Environment
# Windows:
venv\Scripts\activate
# Mac/Linux:
# source venv/bin/activate

# Install Dependencies
pip install -r requirements.txt

# Environment Setup
cp .env.example .env
```
**CRITICAL**: Open the new `.env` file and add your `GEMINI_API_KEY`.

### 3. Frontend Setup
Open a **new terminal** in the project root:

```bash
cd frontend
npm install
```

---

## 💻 Running the Application

### Start the Backend
In your backend terminal (with the virtual environment activated):
```bash
python app.py
```
*The API will run on `http://localhost:5000`*

### Start the Frontend
In your frontend terminal:
```bash
npm run dev
```
*The web app will be available at `http://localhost:5173`*

---

## 📁 Project Structure

```text
scriptsense-v5/
├── backend/                 # Flask API Backend
│   ├── app.py               # Main application entry point
│   ├── models.py            # Database schemas
│   ├── routes/              # API endpoints (upload, evaluation, etc.)
│   └── services/            # Core business logic (gemini_ocr, pdf processing)
├── frontend/                # React Vite Frontend
│   ├── src/
│   │   ├── components/      # Reusable UI elements (GradingPanel, TranscriptionPanel)
│   │   ├── pages/           # Main views
│   │   └── services/        # Frontend API integration
└── README.md                # Project documentation
```

---

## 📖 Additional Documentation
- [Frontend README](./frontend/README.md)
- [Backend README](./backend/README.md)
