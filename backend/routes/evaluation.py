from flask import Blueprint, request, jsonify
from models import db, Mark, AnswerSheet, QuestionPaper, QuestionContent, RubricContent, EvaluationRubric, PageScan
from services.gemini_ocr import GeminiOCRService
from services.pdf_processor import PDFProcessor
import base64
import io
import json

evaluation_bp = Blueprint('evaluation', __name__)

# Initialize OCR service
ocr_service = GeminiOCRService()

@evaluation_bp.route('/auto-scan', methods=['POST'])
def auto_scan():
    """Automatically scan a full page for transcription and diagrams.
    Returns cached data from PageScan if available."""
    try:
        data = request.json
        answer_sheet_id = data.get('answersheetId')
        page_number = data.get('page', 0)
        
        print(f"🔍 Auto-scan request: ID={answer_sheet_id}, Page={page_number}")
        
        # Check cache first
        cached = PageScan.query.filter_by(
            answer_sheet_id=answer_sheet_id,
            page_number=page_number
        ).first()
        
        if cached:
            print(f"⚡ Using cached scan for page {page_number}")
            cached_data = cached.to_dict()
            return jsonify({
                'transcription': cached_data['transcription'] or '',
                'questions': cached_data['questions'],
                'diagrams': cached_data['diagrams'],
                'answer_numbers': cached_data['answer_numbers'],
                'success': True,
                'cached': True
            }), 200
        
        # No cache — perform live scan
        answer_sheet = AnswerSheet.query.get_or_404(answer_sheet_id)
        
        print(f"📄 Processing PDF: {answer_sheet.file_path}")
        image = PDFProcessor.pdf_page_to_image(
            answer_sheet.file_path,
            page_number,
            zoom=2.0
        )
        print(f"🖼️ Full page image generated: {image.size}")
        
        print(f"🤖 Sending to Gemini...")
        result = ocr_service.auto_analyze_page(image, is_path=False)
        print(f"✅ Gemini response received. success={result.get('success')}")
        
        # Process detected diagrams
        processed_diagrams = []
        for i, diag in enumerate(result.get('diagrams', [])):
            bbox = diag.get('bounding_box')
            if bbox and len(bbox) == 4:
                norm_coords = {
                    'y': bbox[0] / 1000.0,
                    'x': bbox[1] / 1000.0,
                    'height': (bbox[2] - bbox[0]) / 1000.0,
                    'width': (bbox[3] - bbox[1]) / 1000.0
                }
                
                try:
                    print(f"📐 Extracting diagram {i+1}...")
                    diag_image = PDFProcessor.extract_region(
                        answer_sheet.file_path,
                        page_number,
                        norm_coords
                    )
                    
                    img_buffer = io.BytesIO()
                    diag_image.save(img_buffer, format='PNG')
                    diag_img_base64 = base64.b64encode(img_buffer.getvalue()).decode('utf-8')
                    
                    processed_diagrams.append({
                        'description': diag.get('description', 'Diagram'),
                        'image': f"data:image/png;base64,{diag_img_base64}"
                    })
                except Exception as ex:
                    print(f"⚠️ Failed to extract diagram {i+1}: {ex}")
        
        answer_numbers = result.get('answer_numbers', [])
        questions = result.get('questions', [])
        
        # Cache the result in PageScan
        try:
            page_scan = PageScan(
                answer_sheet_id=answer_sheet_id,
                page_number=page_number,
                transcription=result.get('transcription', ''),
                questions_json=json.dumps(questions),
                diagrams_json=json.dumps(processed_diagrams),
                answer_numbers_json=json.dumps(answer_numbers)
            )
            db.session.merge(page_scan)
            db.session.commit()
        except Exception as cache_err:
            print(f"⚠️ Failed to cache scan: {cache_err}")
            db.session.rollback()
        
        return jsonify({
            'transcription': result.get('transcription', ''),
            'questions': questions,
            'diagrams': processed_diagrams,
            'answer_numbers': answer_numbers,
            'success': result.get('success', False),
            'cached': False,
            'error': result.get('error') if not result.get('success') else None
        }), 200
        
    except Exception as e:
        print(f"❌ CRITICAL error in auto-scan: {str(e)}")
        return jsonify({'error': str(e), 'success': False}), 500

@evaluation_bp.route('/transcribe', methods=['POST'])
def transcribe():
    """Transcribe handwriting from a specific region of an answer sheet"""
    try:
        data = request.json
        answer_sheet_id = data.get('answersheetId')
        page_number = data.get('page', 0)
        coordinates = data.get('coordinates')
        
        # Get answer sheet
        answer_sheet = AnswerSheet.query.get_or_404(answer_sheet_id)
        
        # Convert PDF region to image
        if coordinates:
            image = PDFProcessor.extract_region(
                answer_sheet.file_path,
                page_number,
                coordinates
            )
        else:
            # Get full page if no coordinates
            image = PDFProcessor.pdf_page_to_image(
                answer_sheet.file_path,
                page_number
            )
        
        # Perform OCR
        result = ocr_service.process_pdf_region(image, None)
        
        # Convert image to base64 for sending back
        img_buffer = io.BytesIO()
        image.save(img_buffer, format='PNG')
        img_base64 = base64.b64encode(img_buffer.getvalue()).decode('utf-8')
        
        return jsonify({
            'transcription': result['transcription'],
            'diagram_info': result['diagram_info'],
            'image': f"data:image/png;base64,{img_base64}",
            'success': result['success']
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e), 'success': False}), 500

@evaluation_bp.route('/extract-diagram', methods=['POST'])
def extract_diagram():
    """Extract diagrams from a specific region"""
    try:
        data = request.json
        answer_sheet_id = data.get('answersheetId')
        page_number = data.get('page', 0)
        coordinates = data.get('coordinates')
        
        # Get answer sheet
        answer_sheet = AnswerSheet.query.get_or_404(answer_sheet_id)
        
        # Extract region
        image = PDFProcessor.extract_region(
            answer_sheet.file_path,
            page_number,
            coordinates
        )
        
        # Analyze for diagrams
        diagram_info = ocr_service.extract_diagram(image, is_path=False)
        
        # Convert image to base64
        img_buffer = io.BytesIO()
        image.save(img_buffer, format='PNG')
        img_base64 = base64.b64encode(img_buffer.getvalue()).decode('utf-8')
        
        return jsonify({
            'diagram_info': diagram_info,
            'image': f"data:image/png;base64,{img_base64}",
            'success': True
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e), 'success': False}), 500

@evaluation_bp.route('/marks', methods=['POST'])
def save_marks():
    """Save marks for a specific question"""
    try:
        data = request.json
        answer_sheet_id = data.get('answersheetId')
        question_paper_id = data.get('questionPaperId')
        question_number = data.get('questionNumber')
        marks_awarded = data.get('marksAwarded')
        max_marks = data.get('maxMarks')
        evaluator_role = data.get('evaluatorRole', 'teacher') # 'teacher' or 'external'
        
        # Validate inputs
        if not all([answer_sheet_id, question_number is not None, marks_awarded is not None, max_marks is not None]):
            return jsonify({'error': 'Missing required fields'}), 400
            
        if float(marks_awarded) > float(max_marks):
            return jsonify({'error': 'Awarded marks cannot be greater than max marks'}), 400
        
        # Check if mark already exists
        existing_mark = Mark.query.filter_by(
            answer_sheet_id=answer_sheet_id,
            question_number=question_number,
            evaluator_role=evaluator_role
        ).first()
        
        if existing_mark:
            # Update existing mark
            existing_mark.marks_awarded = float(marks_awarded)
            existing_mark.max_marks = float(max_marks)
            existing_mark.question_paper_id = question_paper_id
        else:
            # Create new mark
            mark = Mark(
                answer_sheet_id=answer_sheet_id,
                question_paper_id=question_paper_id,
                question_number=question_number,
                marks_awarded=float(marks_awarded),
                max_marks=float(max_marks),
                evaluator_role=evaluator_role
            )
            db.session.add(mark)
            
        # Update total_questions in QuestionPaper if this is a new high
        if question_paper_id:
            qp = QuestionPaper.query.get(question_paper_id)
            if qp and question_number > qp.total_questions:
                qp.total_questions = question_number
                print(f"📈 Updated QuestionPaper {qp.id} total_questions to {question_number}")
        
        db.session.commit()
        
        return jsonify({
            'message': 'Marks saved successfully',
            'data': existing_mark.to_dict() if existing_mark else mark.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@evaluation_bp.route('/marks/<int:answer_sheet_id>', methods=['GET'])
def get_marks(answer_sheet_id):
    """Get all marks for an answer sheet"""
    try:
        evaluator_role = request.args.get('role', 'teacher')
        marks = Mark.query.filter_by(
            answer_sheet_id=answer_sheet_id,
            evaluator_role=evaluator_role
        ).order_by(Mark.question_number).all()
        
        return jsonify({
            'marks': [mark.to_dict() for mark in marks]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@evaluation_bp.route('/marks/<int:answer_sheet_id>/total', methods=['GET'])
def get_total_marks(answer_sheet_id):
    """Calculate total marks for an answer sheet"""
    try:
        evaluator_role = request.args.get('role', 'teacher')
        marks = Mark.query.filter_by(
            answer_sheet_id=answer_sheet_id,
            evaluator_role=evaluator_role
        ).all()
        
        total_awarded = sum(mark.marks_awarded for mark in marks)
        total_max = sum(mark.max_marks for mark in marks)
        
        return jsonify({
            'total_awarded': total_awarded,
            'total_max': total_max,
            'percentage': (total_awarded / total_max * 100) if total_max > 0 else 0
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@evaluation_bp.route('/pdf-info/<int:answer_sheet_id>', methods=['GET'])
def get_pdf_info(answer_sheet_id):
    """Get PDF information (page count, etc.)"""
    try:
        answer_sheet = AnswerSheet.query.get_or_404(answer_sheet_id)
        page_count = PDFProcessor.get_page_count(answer_sheet.file_path)
        
        return jsonify({
            'page_count': page_count,
            'file_path': answer_sheet.file_path
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
@evaluation_bp.route('/save-report', methods=['POST'])
def save_report():
    """Save final evaluation report and write teacher_marks to AnswerSheet."""
    try:
        data = request.json
        answer_sheet_id = data.get('answersheetId')
        remarks = data.get('remarks')

        if not answer_sheet_id:
            return jsonify({'error': 'Missing answer sheet ID'}), 400

        answer_sheet = AnswerSheet.query.get_or_404(answer_sheet_id)

        # Compute total marks from Mark table for the given role
        evaluator_role = data.get('evaluatorRole', 'teacher')
        marks = Mark.query.filter_by(
            answer_sheet_id=answer_sheet_id,
            evaluator_role=evaluator_role
        ).all()
        total_awarded = sum(m.marks_awarded for m in marks) if marks else 0

        answer_sheet.remarks = remarks
        
        if evaluator_role == 'teacher':
            answer_sheet.teacher_marks = total_awarded
            # Transition to FIRST_DONE if it was UPLOADED
            if answer_sheet.status == 'UPLOADED':
                answer_sheet.status = 'FIRST_DONE'
        else:
            answer_sheet.external_marks = total_awarded
            # Transition to SECOND_DONE if first was done
            if answer_sheet.status == 'FIRST_DONE' or answer_sheet.status == 'evaluated':
                answer_sheet.status = 'SECOND_DONE'
            elif answer_sheet.status == 'UPLOADED':
                # External evaluated even before teacher? Keep as UPLOADED or FIRST_DONE?
                # Usually teacher evaluates first. 
                answer_sheet.status = 'FIRST_DONE' # Treat as first evaluation done
        
        # Compute final if both exist
        if answer_sheet.teacher_marks is not None and answer_sheet.external_marks is not None:
            answer_sheet.final_marks = (answer_sheet.teacher_marks + answer_sheet.external_marks) / 2
            answer_sheet.status = 'evaluated' # Marks as fully evaluated

        db.session.commit()

        return jsonify({
            'message': 'Report saved successfully',
            'data': answer_sheet.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@evaluation_bp.route('/results', methods=['GET'])
def get_results():
    """Get evaluated answer sheets with results, optionally filtered by subject"""
    try:
        subject_id = request.args.get('subject_id')
        
        # Fetch status='evaluated' sheets
        query = AnswerSheet.query.filter_by(status='evaluated')
        
        if subject_id and subject_id.lower() not in ['undefined', 'null', '', 'none']:
            query = query.filter_by(subject_id=int(subject_id))
            
        evaluated_sheets = query.all()
        
        results = []
        for sheet in evaluated_sheets:
            # Calculate total marks
            marks = Mark.query.filter_by(answer_sheet_id=sheet.id).all()
            total_awarded = sum(m.marks_awarded for m in marks)
            total_max = sum(m.max_marks for m in marks)
            percentage = (total_awarded / total_max * 100) if total_max > 0 else 0
            
            # Get Question Paper title
            qp = QuestionPaper.query.get(sheet.question_paper_id) if sheet.question_paper_id else None
            
            results.append({
                'id': sheet.id,
                'student_name': sheet.student_name,
                'roll_number': sheet.roll_number,
                'question_paper': qp.title if qp else 'Unknown',
                'total_awarded': total_awarded,
                'total_max': total_max,
                'percentage': round(percentage, 2),
                'remarks': sheet.remarks,
                'evaluated_at': sheet.uploaded_at.isoformat()
            })
            
        return jsonify({'results': results}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@evaluation_bp.route('/results/export', methods=['GET'])
def export_results():
    """Export results as CSV, optionally filtered by subject"""
    try:
        import csv
        import io
        from flask import make_response
        
        subject_id = request.args.get('subject_id')
        query = AnswerSheet.query.filter_by(status='evaluated')
        
        if subject_id and subject_id.lower() not in ['undefined', 'null', '', 'none']:
            query = query.filter_by(subject_id=int(subject_id))
            
        evaluated_sheets = query.all()
        
        si = io.StringIO()
        cw = csv.writer(si)
        cw.writerow(['Student Name', 'Roll Number', 'Question Paper', 'Marks Obtained', 'Max Marks', 'Percentage', 'Remarks'])
        
        for sheet in evaluated_sheets:
            marks = Mark.query.filter_by(answer_sheet_id=sheet.id).all()
            total_awarded = sum(m.marks_awarded for m in marks)
            total_max = sum(m.max_marks for m in marks)
            percentage = (total_awarded / total_max * 100) if total_max > 0 else 0
            qp = QuestionPaper.query.get(sheet.question_paper_id) if sheet.question_paper_id else None
            
            cw.writerow([
                sheet.student_name,
                sheet.roll_number or 'N/A',
                qp.title if qp else 'Unknown',
                total_awarded,
                total_max,
                f"{percentage:.2f}%",
                sheet.remarks or ''
            ])
            
        output = make_response(si.getvalue())
        filename = "class_results.csv"
        if subject_id:
            from models import Subject
            subj = Subject.query.get(subject_id)
            if subj:
                filename = f"{subj.name}_results.csv".replace(" ", "_")
        
        output.headers["Content-Disposition"] = f"attachment; filename={filename}"
        output.headers["Content-type"] = "text/csv"
        return output
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
@evaluation_bp.route('/zoom', methods=['POST'])
def zoom_region():
    """Crop and return a high-resolution zoomed version of a region"""
    try:
        data = request.json
        answer_sheet_id = data.get('answersheetId')
        page_number = data.get('page', 0)
        coordinates = data.get('coordinates')
        
        if not all([answer_sheet_id, coordinates]):
            return jsonify({'error': 'Missing required fields'}), 400
            
        answer_sheet = AnswerSheet.query.get_or_404(answer_sheet_id)
        
        # Extract region with high quality (zoom=4.0)
        zoom_image = PDFProcessor.extract_region(
            answer_sheet.file_path,
            page_number,
            coordinates
        )
        
        # Convert to base64
        img_buffer = io.BytesIO()
        zoom_image.save(img_buffer, format='PNG')
        img_base64 = base64.b64encode(img_buffer.getvalue()).decode('utf-8')
        
        return jsonify({
            'image': f"data:image/png;base64,{img_base64}",
            'success': True
        }), 200
        
    except Exception as e:
        print(f"Error in zoom: {str(e)}")
        return jsonify({'error': str(e), 'success': False}), 500


@evaluation_bp.route('/scan-question-paper', methods=['POST'])
def scan_question_paper():
    """Scan question paper and extract questions by number"""
    try:
        data = request.json
        question_paper_id = data.get('questionPaperId')
        page_number = data.get('page', 0)
        
        print(f"📝 Scanning question paper ID={question_paper_id}, Page={page_number}")
        
        question_paper = QuestionPaper.query.get_or_404(question_paper_id)
        
        # Convert page to image
        image = PDFProcessor.pdf_page_to_image(
            question_paper.file_path,
            page_number,
            zoom=2.0
        )
        
        # Analyze with Gemini
        result = ocr_service.auto_analyze_page(image, is_path=False)
        
        if not result.get('success'):
            return jsonify({'error': 'Failed to analyze page', 'success': False}), 500
        
        # Parse questions from response
        questions = result.get('questions', [])
        stored_count = 0
        
        for q in questions:
            q_number = q.get('id', '').strip()
            q_text = q.get('content', '').strip()
            
            if q_number and q_text:
                # Check if already exists
                existing = QuestionContent.query.filter_by(
                    question_paper_id=question_paper_id,
                    question_number=q_number
                ).first()
                
                if existing:
                    existing.question_text = q_text
                    existing.page_number = page_number
                else:
                    new_question = QuestionContent(
                        question_paper_id=question_paper_id,
                        question_number=q_number,
                        question_text=q_text,
                        page_number=page_number
                    )
                    db.session.add(new_question)
                stored_count += 1
        
        db.session.commit()
        
        print(f"✅ Stored {stored_count} questions from page {page_number}")
        
        return jsonify({
            'success': True,
            'questions_found': len(questions),
            'questions_stored': stored_count,
            'questions': [q.to_dict() for q in QuestionContent.query.filter_by(question_paper_id=question_paper_id).all()]
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"❌ Error scanning question paper: {str(e)}")
        return jsonify({'error': str(e), 'success': False}), 500


@evaluation_bp.route('/scan-rubric', methods=['POST'])
def scan_rubric():
    """Scan rubric and extract grading criteria by question number"""
    try:
        data = request.json
        rubric_id = data.get('rubricId')
        page_number = data.get('page', 0)
        
        print(f"📋 Scanning rubric ID={rubric_id}, Page={page_number}")
        
        rubric = EvaluationRubric.query.get_or_404(rubric_id)
        
        # Convert page to image
        image = PDFProcessor.pdf_page_to_image(
            rubric.file_path,
            page_number,
            zoom=2.0
        )
        
        # Analyze with Gemini
        result = ocr_service.auto_analyze_page(image, is_path=False)
        
        if not result.get('success'):
            return jsonify({'error': 'Failed to analyze page', 'success': False}), 500
        
        # Parse rubric criteria from response
        questions = result.get('questions', [])
        stored_count = 0
        
        for q in questions:
            q_number = q.get('id', '').strip()
            criteria = q.get('content', '').strip()
            
            # Try to extract max marks from criteria text (e.g., "[10 marks]" or "10M")
            max_marks = None
            import re
            marks_pattern = r'(?:[\[\(])?(\d+)\s*(?:marks?|M)[\]\)]?'
            marks_match = re.search(marks_pattern, criteria, re.IGNORECASE)
            if marks_match:
                max_marks = float(marks_match.group(1))
            
            if q_number and criteria:
                # Check if already exists
                existing = RubricContent.query.filter_by(
                    rubric_id=rubric_id,
                    question_number=q_number
                ).first()
                
                if existing:
                    existing.criteria_text = criteria
                    existing.max_marks = max_marks
                else:
                    new_rubric = RubricContent(
                        rubric_id=rubric_id,
                        question_number=q_number,
                        criteria_text=criteria,
                        max_marks=max_marks
                    )
                    db.session.add(new_rubric)
                stored_count += 1
        
        db.session.commit()
        
        print(f"✅ Stored {stored_count} rubric entries from page {page_number}")
        
        return jsonify({
            'success': True,
            'criteria_found': len(questions),
            'criteria_stored': stored_count,
            'rubrics': [r.to_dict() for r in RubricContent.query.filter_by(rubric_id=rubric_id).all()]
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"❌ Error scanning rubric: {str(e)}")
        return jsonify({'error': str(e), 'success': False}), 500

@evaluation_bp.route('/match-content/<int:answer_sheet_id>', methods=['GET'])
def match_content(answer_sheet_id):
    """Get matched questions, answers, and rubrics for an answer sheet"""
    try:
        print(f"🔗 Matching content for answer sheet ID={answer_sheet_id}")
        
        # Get answer sheet
        answer_sheet = AnswerSheet.query.get_or_404(answer_sheet_id)
        
        # Get associated question paper ID
        question_paper_id = answer_sheet.question_paper_id
        if not question_paper_id:
            return jsonify({
                'success': True, 
                'matches': [],
                'warning': 'No question paper associated'
            }), 200
        
        # Get all question contents for this question paper
        questions = QuestionContent.query.filter_by(question_paper_id=question_paper_id).all()
        questions_dict = {q.question_number: q for q in questions}
        
        # Get rubrics filtered by subject
        rubrics_dict = {}
        if answer_sheet.subject_id:
            subject_rubrics = EvaluationRubric.query.filter_by(subject_id=answer_sheet.subject_id).all()
            for rubric in subject_rubrics:
                rubric_contents = RubricContent.query.filter_by(rubric_id=rubric.id).all()
                for r in rubric_contents:
                    rubrics_dict[r.question_number] = r
        else:
            # Fallback: get all rubric contents
            all_rubrics = RubricContent.query.all()
            rubrics_dict = {r.question_number: r for r in all_rubrics}
        
        # Iterate through all question numbers we have
        all_question_numbers = set(questions_dict.keys()) | set(rubrics_dict.keys())
        
        matches = []
        for q_num in sorted(all_question_numbers):
            match = {
                'question_number': q_num,
                'question_text': questions_dict[q_num].question_text if q_num in questions_dict else None,
                'question_page': questions_dict[q_num].page_number if q_num in questions_dict else None,
                'rubric_criteria': rubrics_dict[q_num].criteria_text if q_num in rubrics_dict else None,
                'rubric_max_marks': rubrics_dict[q_num].max_marks if q_num in rubrics_dict else None,
                'answer_text': None  # Will be populated from scan results
            }
            matches.append(match)
        
        return jsonify({
            'success': True,
            'answer_sheet_id': answer_sheet_id,
            'question_paper_id': question_paper_id,
            'matches': matches
        }), 200
        
    except Exception as e:
        print(f"❌ Error matching content: {str(e)}")
        return jsonify({'error': str(e), 'success': False}), 500


@evaluation_bp.route('/scan-all-pages', methods=['POST'])
def scan_all_pages():
    """Scan all pages of a question paper or rubric and extract questions/criteria"""
    try:
        data = request.json
        doc_type = data.get('type')  # 'question_paper' or 'rubric'
        doc_id = data.get('id')
        
        if not doc_type or not doc_id:
            return jsonify({'error': 'Missing type or id', 'success': False}), 400
        
        print(f"📖 Scanning all pages: type={doc_type}, id={doc_id}")
        
        if doc_type == 'question_paper':
            doc = QuestionPaper.query.get_or_404(doc_id)
        elif doc_type == 'rubric':
            doc = EvaluationRubric.query.get_or_404(doc_id)
        else:
            return jsonify({'error': 'Invalid type. Use "question_paper" or "rubric"', 'success': False}), 400
        
        # Get total pages
        total_pages = PDFProcessor.get_page_count(doc.file_path)
        print(f"📄 Total pages: {total_pages}")
        
        # CLEAR EXISTING DATA FIRST TO AVOID STALE OR MISNUMBERED MAPPINGS
        if doc_type == 'question_paper':
            QuestionContent.query.filter_by(question_paper_id=doc_id).delete()
        elif doc_type == 'rubric':
            RubricContent.query.filter_by(rubric_id=doc_id).delete()
        db.session.commit()
        print(f"🧹 Cleared existing data for {doc_type} {doc_id} before re-scan")
        
        total_stored = 0
        
        for page_number in range(total_pages):
            print(f"🔍 Scanning page {page_number + 1}/{total_pages}...")
            
            # Convert page to image
            image = PDFProcessor.pdf_page_to_image(doc.file_path, page_number, zoom=2.0)
            
            # Use dedicated method for rubrics/answer keys vs generic for question papers
            if doc_type == 'rubric':
                result = ocr_service.analyze_answer_key_page(image, is_path=False)
                questions = result.get('questions', [])
                success = result.get('success', False)
            else:
                result = ocr_service.auto_analyze_page(image, is_path=False)
                questions = result.get('questions', [])
                success = result.get('success', False)
            
            if not success:
                print(f"⚠️ Failed to analyze page {page_number + 1}")
                continue
            
            for q in questions:
                q_number = q.get('id', '').strip()
                q_text = q.get('content', '').strip()
                
                if not q_number or not q_text:
                    continue
                
                if doc_type == 'question_paper':
                    existing = QuestionContent.query.filter_by(
                        question_paper_id=doc_id,
                        question_number=q_number
                    ).first()
                    
                    if existing:
                        existing.question_text = q_text
                        existing.page_number = page_number
                    else:
                        db.session.add(QuestionContent(
                            question_paper_id=doc_id,
                            question_number=q_number,
                            question_text=q_text,
                            page_number=page_number
                        ))
                    total_stored += 1
                    
                elif doc_type == 'rubric':
                    # Try to extract max marks
                    import re
                    max_marks = None
                    marks_match = re.search(r'(?:[\[\(])?(\d+)\s*(?:marks?|M)[\]\)]?', q_text, re.IGNORECASE)
                    if marks_match:
                        max_marks = float(marks_match.group(1))
                    
                    existing = RubricContent.query.filter_by(
                        rubric_id=doc_id,
                        question_number=q_number
                    ).first()
                    
                    if existing:
                        existing.criteria_text = q_text
                        existing.max_marks = max_marks
                    else:
                        db.session.add(RubricContent(
                            rubric_id=doc_id,
                            question_number=q_number,
                            criteria_text=q_text,
                            max_marks=max_marks
                        ))
                    total_stored += 1
        
        # Update total_questions on QuestionPaper if applicable
        if doc_type == 'question_paper':
            count = QuestionContent.query.filter_by(question_paper_id=doc_id).count()
            doc.total_questions = count
        
        db.session.commit()
        
        print(f"✅ Scan complete. Stored {total_stored} items across {total_pages} pages.")
        
        # Return all stored content
        if doc_type == 'question_paper':
            items = [q.to_dict() for q in QuestionContent.query.filter_by(question_paper_id=doc_id).order_by(QuestionContent.question_number).all()]
        else:
            items = [r.to_dict() for r in RubricContent.query.filter_by(rubric_id=doc_id).order_by(RubricContent.question_number).all()]
        
        return jsonify({
            'success': True,
            'total_pages_scanned': total_pages,
            'total_items_stored': total_stored,
            'items': items
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"❌ Error in scan-all-pages: {str(e)}")
        return jsonify({'error': str(e), 'success': False}), 500


@evaluation_bp.route('/question-contents/<int:question_paper_id>', methods=['GET'])
def get_question_contents(question_paper_id):
    """Get all stored question content for a question paper"""
    try:
        questions = QuestionContent.query.filter_by(
            question_paper_id=question_paper_id
        ).order_by(QuestionContent.question_number).all()
        
        return jsonify({
            'success': True,
            'questions': [q.to_dict() for q in questions]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e), 'success': False}), 500


@evaluation_bp.route('/rubric-contents/<int:rubric_id>', methods=['GET'])
def get_rubric_contents(rubric_id):
    """Get all stored rubric content for a rubric"""
    try:
        rubrics = RubricContent.query.filter_by(
            rubric_id=rubric_id
        ).order_by(RubricContent.question_number).all()
        
        return jsonify({
            'success': True,
            'rubrics': [r.to_dict() for r in rubrics]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e), 'success': False}), 500


@evaluation_bp.route('/prescan-all', methods=['POST'])
def prescan_all():
    """Pre-scan all pages of an answer sheet and cache results in PageScan table"""
    try:
        data = request.json
        answer_sheet_id = data.get('answersheetId')

        if not answer_sheet_id:
            return jsonify({'error': 'Missing answersheetId', 'success': False}), 400

        answer_sheet = AnswerSheet.query.get_or_404(answer_sheet_id)

        # Check if already scanned
        if answer_sheet.scan_status == 'scanned':
            scans = PageScan.query.filter_by(
                answer_sheet_id=answer_sheet_id
            ).order_by(PageScan.page_number).all()
            return jsonify({
                'success': True,
                'status': 'already_scanned',
                'total_pages': len(scans),
                'pages': [s.to_dict() for s in scans]
            }), 200

        # Mark as scanning
        answer_sheet.scan_status = 'scanning'
        db.session.commit()

        total_pages = PDFProcessor.get_page_count(answer_sheet.file_path)
        print(f"📖 Pre-scanning all {total_pages} pages for answer sheet {answer_sheet_id}")

        scanned_pages = []

        for page_number in range(total_pages):
            # Check if already cached
            existing = PageScan.query.filter_by(
                answer_sheet_id=answer_sheet_id,
                page_number=page_number
            ).first()

            if existing:
                print(f"⚡ Page {page_number} already cached, skipping")
                scanned_pages.append(existing.to_dict())
                continue

            print(f"🔍 Scanning page {page_number + 1}/{total_pages}...")

            try:
                image = PDFProcessor.pdf_page_to_image(
                    answer_sheet.file_path,
                    page_number,
                    zoom=2.0
                )

                result = ocr_service.auto_analyze_page(image, is_path=False)

                if not result.get('success'):
                    print(f"⚠️ Page {page_number} scan failed")
                    page_scan = PageScan(
                        answer_sheet_id=answer_sheet_id,
                        page_number=page_number,
                        transcription='',
                        questions_json='[]',
                        diagrams_json='[]',
                        answer_numbers_json='[]'
                    )
                else:
                    # Process diagrams
                    processed_diagrams = []
                    for i, diag in enumerate(result.get('diagrams', [])):
                        bbox = diag.get('bounding_box')
                        if bbox and len(bbox) == 4:
                            norm_coords = {
                                'y': bbox[0] / 1000.0,
                                'x': bbox[1] / 1000.0,
                                'height': (bbox[2] - bbox[0]) / 1000.0,
                                'width': (bbox[3] - bbox[1]) / 1000.0
                            }
                            try:
                                diag_image = PDFProcessor.extract_region(
                                    answer_sheet.file_path,
                                    page_number,
                                    norm_coords
                                )
                                img_buffer = io.BytesIO()
                                diag_image.save(img_buffer, format='PNG')
                                diag_img_base64 = base64.b64encode(img_buffer.getvalue()).decode('utf-8')
                                processed_diagrams.append({
                                    'description': diag.get('description', 'Diagram'),
                                    'image': f"data:image/png;base64,{diag_img_base64}"
                                })
                            except Exception as ex:
                                print(f"⚠️ Diagram extraction failed: {ex}")

                    page_scan = PageScan(
                        answer_sheet_id=answer_sheet_id,
                        page_number=page_number,
                        transcription=result.get('transcription', ''),
                        questions_json=json.dumps(result.get('questions', [])),
                        diagrams_json=json.dumps(processed_diagrams),
                        answer_numbers_json=json.dumps(result.get('answer_numbers', []))
                    )

                db.session.add(page_scan)
                db.session.commit()
                scanned_pages.append(page_scan.to_dict())

            except Exception as page_err:
                print(f"❌ Error scanning page {page_number}: {page_err}")
                db.session.rollback()
                scanned_pages.append({
                    'page_number': page_number,
                    'transcription': '',
                    'questions': [],
                    'diagrams': [],
                    'answer_numbers': [],
                    'error': str(page_err)
                })

        # Mark as scanned
        answer_sheet.scan_status = 'scanned'
        db.session.commit()

        print(f"✅ Pre-scan complete for answer sheet {answer_sheet_id}: {total_pages} pages")

        return jsonify({
            'success': True,
            'status': 'scanned',
            'total_pages': total_pages,
            'pages': scanned_pages
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"❌ Error in prescan-all: {str(e)}")
        return jsonify({'error': str(e), 'success': False}), 500


@evaluation_bp.route('/prescan-data/<int:answer_sheet_id>', methods=['GET'])
def get_prescan_data(answer_sheet_id):
    """Get all pre-scanned data for an answer sheet, with answers segmented by number"""
    try:
        import re
        answer_sheet = AnswerSheet.query.get_or_404(answer_sheet_id)

        scans = PageScan.query.filter_by(
            answer_sheet_id=answer_sheet_id
        ).order_by(PageScan.page_number).all()

        pages = [s.to_dict() for s in scans]

        # Build answer segments: group transcription text by answer number
        answer_segments = {}

        for page_data in pages:
            text = page_data.get('transcription', '') or ''
            ans_nums = page_data.get('answer_numbers', [])
            page_num = page_data.get('page_number', 0)

            if not ans_nums:
                if 'unassigned' not in answer_segments:
                    answer_segments['unassigned'] = []
                if text.strip():
                    answer_segments['unassigned'].append({
                        'page': page_num,
                        'text': text
                    })
            else:
                # Split text by answer labels
                parts = re.split(r'(?i)\bans(?:wer)?\s*(\d+)\s*[:.)\-]', text)

                if len(parts) > 1:
                    if parts[0].strip():
                        if 'unassigned' not in answer_segments:
                            answer_segments['unassigned'] = []
                        answer_segments['unassigned'].append({
                            'page': page_num,
                            'text': parts[0].strip()
                        })
                    for i in range(1, len(parts), 2):
                        ans_num = int(parts[i])
                        content = parts[i + 1].strip() if i + 1 < len(parts) else ''
                        key = str(ans_num)
                        if key not in answer_segments:
                            answer_segments[key] = []
                        if content:
                            answer_segments[key].append({
                                'page': page_num,
                                'text': content
                            })
                else:
                    key = str(ans_nums[0])
                    if key not in answer_segments:
                        answer_segments[key] = []
                    if text.strip():
                        answer_segments[key].append({
                            'page': page_num,
                            'text': text.strip()
                        })

        return jsonify({
            'success': True,
            'scan_status': answer_sheet.scan_status,
            'total_pages': len(pages),
            'pages': pages,
            'answer_segments': answer_segments
        }), 200

    except Exception as e:
        print(f"❌ Error getting prescan data: {str(e)}")
        return jsonify({'error': str(e), 'success': False}), 500


@evaluation_bp.route('/analyze-blooms', methods=['POST'])
def analyze_blooms():
    """Analyze text for Bloom's Taxonomy levels"""
    try:
        data = request.json
        text = data.get('text')
        
        if not text:
            return jsonify({'error': 'No text provided', 'success': False}), 400
        
        prompt = f"""
        Analyze the following text and determine the percentage accuracy or alignment with each level of Bloom's Taxonomy:
        1. Remembering
        2. Understanding
        3. Applying
        4. Analyzing
        5. Evaluating
        6. Creating

        Text to analyze:
        "{text}"

        Return ONLY a JSON object with keys for each level and their percentage values (0-100). The total need not be 100%, but ideally should reflect the distribution. 
        Example format:
        {{
            "remembering": 20,
            "understanding": 30,
            "applying": 10,
            "analyzing": 20,
            "evaluating": 10,
            "creating": 10
        }}
        """
        
        result = ocr_service.model.generate_content(prompt)
        response_text = result.text.strip()
        
        # Clean up JSON
        if '```json' in response_text:
            response_text = response_text.split('```json')[1].split('```')[0].strip()
        elif '```' in response_text:
            response_text = response_text.split('```')[1].split('```')[0].strip()
            
        import json
        analysis = json.loads(response_text)
        
        return jsonify({
            'success': True,
            'analysis': analysis
        }), 200
        
    except Exception as e:
        print(f"❌ Error analyzing Bloom's: {str(e)}")
        return jsonify({'error': str(e), 'success': False}), 500
