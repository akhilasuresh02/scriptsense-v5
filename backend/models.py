from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
import bcrypt

db = SQLAlchemy()


# ─────────────────────────────────────────────
# NEW: User model for authentication & roles
# ─────────────────────────────────────────────
class User(db.Model):
    """User model supporting custodian and faculty roles.
    
    Faculty users register themselves; the custodian assigns them as
    first/second evaluators per subject.
    """
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    email = db.Column(db.String(200), nullable=False, unique=True)
    password_hash = db.Column(db.String(500), nullable=False)
    # role: 'custodian' or 'faculty'
    role = db.Column(db.String(50), nullable=False, default='faculty')
    department = db.Column(db.String(200), nullable=True)  # Faculty department
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def set_password(self, password: str):
        """Hash and store password using bcrypt."""
        self.password_hash = bcrypt.hashpw(
            password.encode('utf-8'), bcrypt.gensalt()
        ).decode('utf-8')

    def check_password(self, password: str) -> bool:
        """Verify a plaintext password against the stored hash."""
        return bcrypt.checkpw(
            password.encode('utf-8'),
            self.password_hash.encode('utf-8')
        )

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'role': self.role,
            'department': self.department,
            'created_at': self.created_at.isoformat()
        }


class Subject(db.Model):
    """Subject/Class model for organizing evaluations.
    
    Extended with first_evaluator_id and second_evaluator_id to support
    the role-based dual-evaluation workflow.
    """
    __tablename__ = 'subjects'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)  # e.g., "Physics 101"
    class_name = db.Column(db.String(100), nullable=True)  # e.g., "Class 12A"
    academic_year = db.Column(db.String(20), nullable=True)  # e.g., "2025-2026"
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # NEW: Role assignments per subject
    # first_evaluator_id → Teacher (First Evaluator)
    # second_evaluator_id → External Evaluator (Second Evaluator)
    # created_by → Custodian who set up this subject
    first_evaluator_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    second_evaluator_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)

    # Relationships
    question_papers = db.relationship('QuestionPaper', backref='subject', lazy=True, cascade='all, delete-orphan')
    answer_sheets = db.relationship('AnswerSheet', backref='subject', lazy=True, cascade='all, delete-orphan')
    rubrics = db.relationship('EvaluationRubric', backref='subject', lazy=True, cascade='all, delete-orphan')

    # Evaluator relationships (use foreign_keys to disambiguate multiple FKs to same table)
    first_evaluator = db.relationship('User', foreign_keys=[first_evaluator_id], backref='first_eval_subjects')
    second_evaluator = db.relationship('User', foreign_keys=[second_evaluator_id], backref='second_eval_subjects')
    creator = db.relationship('User', foreign_keys=[created_by], backref='created_subjects')
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'class_name': self.class_name,
            'academic_year': self.academic_year,
            'created_at': self.created_at.isoformat(),
            'total_students': len(self.answer_sheets),
            'total_questions': sum(qp.total_questions for qp in self.question_papers) if self.question_papers else 0,
            # NEW: evaluator info
            'first_evaluator_id': self.first_evaluator_id,
            'first_evaluator_name': self.first_evaluator.name if self.first_evaluator else None,
            'second_evaluator_id': self.second_evaluator_id,
            'second_evaluator_name': self.second_evaluator.name if self.second_evaluator else None,
        }

class QuestionPaper(db.Model):
    """Question paper model"""
    __tablename__ = 'question_papers'
    
    id = db.Column(db.Integer, primary_key=True)
    subject_id = db.Column(db.Integer, db.ForeignKey('subjects.id'), nullable=True)  # Nullable for backward compatibility
    title = db.Column(db.String(200), nullable=False)
    file_path = db.Column(db.String(500), nullable=False)
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)
    total_questions = db.Column(db.Integer, default=0)
    
    # Relationships
    marks = db.relationship('Mark', backref='question_paper', lazy=True, cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'subject_id': self.subject_id,
            'title': self.title,
            'file_path': self.file_path,
            'uploaded_at': self.uploaded_at.isoformat(),
            'total_questions': self.total_questions
        }


class AnswerSheet(db.Model):
    """Answer sheet model.
    
    Extended with teacher_marks, external_marks, final_marks for the
    dual-evaluation workflow. Status values:
      - 'pending'   : uploaded, not yet evaluated (legacy)
      - 'UPLOADED'  : uploaded, awaiting first evaluation
      - 'FIRST_DONE': teacher marks submitted
      - 'SECOND_DONE': external marks submitted, final_marks computed
      - 'evaluated' : legacy status (treated as fully evaluated)
    """
    __tablename__ = 'answer_sheets'
    
    id = db.Column(db.Integer, primary_key=True)
    subject_id = db.Column(db.Integer, db.ForeignKey('subjects.id'), nullable=True)  # Nullable for backward compatibility
    student_name = db.Column(db.String(200), nullable=False)
    roll_number = db.Column(db.String(50), nullable=True)  # Auto-extracted from answer sheet
    class_name = db.Column(db.String(100), nullable=True)  # Auto-extracted from answer sheet
    file_path = db.Column(db.String(500), nullable=False)
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)
    question_paper_id = db.Column(db.Integer, db.ForeignKey('question_papers.id'), nullable=True)
    remarks = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(50), default='UPLOADED')  # UPLOADED, FIRST_DONE, SECOND_DONE (legacy: pending, evaluated)

    # NEW: Dual-evaluation marks
    teacher_marks = db.Column(db.Float, nullable=True)    # Submitted by first evaluator
    external_marks = db.Column(db.Float, nullable=True)   # Submitted by second evaluator
    final_marks = db.Column(db.Float, nullable=True)      # (teacher_marks + external_marks) / 2

    # Relationships
    marks = db.relationship('Mark', backref='answer_sheet', lazy=True, cascade='all, delete-orphan')
    
    def compute_final_marks(self):
        """Compute final_marks as average of teacher and external marks.
        Called automatically when both marks are present.
        """
        if self.teacher_marks is not None and self.external_marks is not None:
            self.final_marks = (self.teacher_marks + self.external_marks) / 2
            return self.final_marks
        return None

    def to_dict(self):
        return {
            'id': self.id,
            'student_name': self.student_name,
            'roll_number': self.roll_number,
            'class_name': self.class_name,
            'file_path': self.file_path,
            'uploaded_at': self.uploaded_at.isoformat(),
            'question_paper_id': self.question_paper_id,
            'subject_id': self.subject_id,
            'remarks': self.remarks,
            'status': self.status,
            # NEW: dual-evaluation marks
            'teacher_marks': self.teacher_marks,
            'external_marks': self.external_marks,
            'final_marks': self.final_marks,
        }


class EvaluationRubric(db.Model):
    """Evaluation rubric model"""
    __tablename__ = 'evaluation_rubrics'
    
    id = db.Column(db.Integer, primary_key=True)
    subject_id = db.Column(db.Integer, db.ForeignKey('subjects.id'), nullable=True)  # Nullable for backward compatibility
    title = db.Column(db.String(200), nullable=False)
    file_path = db.Column(db.String(500), nullable=False)
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)
    rubric_data = db.Column(db.Text, nullable=True)  # JSON string for structured data
    
    def to_dict(self):
        return {
            'id': self.id,
            'subject_id': self.subject_id,
            'title': self.title,
            'file_path': self.file_path,
            'uploaded_at': self.uploaded_at.isoformat(),
            'rubric_data': self.rubric_data
        }


class Mark(db.Model):
    """Mark model for storing question-wise marks"""
    __tablename__ = 'marks'
    
    id = db.Column(db.Integer, primary_key=True)
    answer_sheet_id = db.Column(db.Integer, db.ForeignKey('answer_sheets.id'), nullable=False)
    question_paper_id = db.Column(db.Integer, db.ForeignKey('question_papers.id'), nullable=True)
    question_number = db.Column(db.Integer, nullable=False)
    marks_awarded = db.Column(db.Float, nullable=False)
    max_marks = db.Column(db.Float, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Unique constraint to prevent duplicate marks for same question
    __table_args__ = (
        db.UniqueConstraint('answer_sheet_id', 'question_number', name='unique_answer_question'),
    )
    
    def to_dict(self):
        return {
            'id': self.id,
            'answer_sheet_id': self.answer_sheet_id,
            'question_paper_id': self.question_paper_id,
            'question_number': self.question_number,
            'marks_awarded': self.marks_awarded,
            'max_marks': self.max_marks,
            'created_at': self.created_at.isoformat()
        }


class QuestionContent(db.Model):
    """Stores extracted question text from question papers"""
    __tablename__ = 'question_contents'
    
    id = db.Column(db.Integer, primary_key=True)
    question_paper_id = db.Column(db.Integer, db.ForeignKey('question_papers.id'), nullable=False)
    question_number = db.Column(db.String(50), nullable=False)  # e.g., "Q1", "2a", "3.1"
    question_text = db.Column(db.Text, nullable=False)
    page_number = db.Column(db.Integer, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Unique constraint
    __table_args__ = (
        db.UniqueConstraint('question_paper_id', 'question_number', name='unique_qp_question'),
    )
    
    def to_dict(self):
        return {
            'id': self.id,
            'question_paper_id': self.question_paper_id,
            'question_number': self.question_number,
            'question_text': self.question_text,
            'page_number': self.page_number,
            'created_at': self.created_at.isoformat()
        }


class RubricContent(db.Model):
    """Stores extracted grading criteria from rubrics"""
    __tablename__ = 'rubric_contents'
    
    id = db.Column(db.Integer, primary_key=True)
    rubric_id = db.Column(db.Integer, db.ForeignKey('evaluation_rubrics.id'), nullable=False)
    question_number = db.Column(db.String(50), nullable=False)  # e.g., "Q1", "2a"
    criteria_text = db.Column(db.Text, nullable=False)
    max_marks = db.Column(db.Float, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Unique constraint
    __table_args__ = (
        db.UniqueConstraint('rubric_id', 'question_number', name='unique_rubric_question'),
    )
    
    def to_dict(self):
        return {
            'id': self.id,
            'rubric_id': self.rubric_id,
            'question_number': self.question_number,
            'criteria_text': self.criteria_text,
            'max_marks': self.max_marks,
            'created_at': self.created_at.isoformat()
        }

