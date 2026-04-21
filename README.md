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
## Screenshots

### Landing Page
<img width="940" height="458" alt="image" src="https://github.com/user-attachments/assets/85184391-102e-4dd8-8c44-6aa4f1283897" />
<img width="940" height="448" alt="image" src="https://github.com/user-attachments/assets/451add92-822f-48c0-8f0a-fa5f225f1658" />

### SignUp and Login Pages
<img width="940" height="461" alt="image" src="https://github.com/user-attachments/assets/6c585360-efce-4c37-9a37-3e368ef53f09" />
<img width="940" height="461" alt="image" src="https://github.com/user-attachments/assets/1700a67f-f91b-46d7-9335-59ab1eb1d7ea" />

### Dashboards
<img width="940" height="457" alt="image" src="https://github.com/user-attachments/assets/c29e877f-7841-48b2-8580-75acc476a722" />
<img width="940" height="461" alt="image" src="https://github.com/user-attachments/assets/3d928c75-c2f7-4c03-9033-3ef14d4cae96" />
<img width="940" height="454" alt="image" src="https://github.com/user-attachments/assets/5639f140-961e-4359-9733-7b52358f0f77" />

### AI Assisted Evaluation Pages

<img width="940" height="473" alt="image" src="https://github.com/user-attachments/assets/968610d1-5da8-4ee0-b6be-9c459b95c7bd" />
<img width="940" height="471" alt="image" src="https://github.com/user-attachments/assets/ef9e6bcd-3837-4bea-a1cb-157408b1dfc4" />
<img width="940" height="455" alt="image" src="https://github.com/user-attachments/assets/4b15440a-7824-467d-ba25-362c7ea95c15" />

## 🚀 Getting Started

### Prerequisites
- **Python 3.10+**
- **Node.js 18+**
- **Git**
- **Google Gemini API Key**

### 1. Clone the Repository
```bash
git clone https://github.com/akhilasuresh02/scriptsense-v6.git
cd scriptsense-v6
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
