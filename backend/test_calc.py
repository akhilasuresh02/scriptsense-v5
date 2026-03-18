from app import app
from models import AnswerSheet
from routes.subject import get_total_marks_logic

with app.app_context():
    sheets = AnswerSheet.query.filter_by(status='evaluated').all()
    print(f"Found {len(sheets)} evaluated answer sheets.\n")
    for sheet in sheets:
        res = get_total_marks_logic(sheet.id)
        print(f"Sheet ID: {sheet.id} | Student: {sheet.student_name}")
        print(f"  Teacher Marks: {sheet.teacher_marks}")
        print(f"  External Marks: {sheet.external_marks}")
        print(f"  Final Marks: {sheet.final_marks}")
        print(f"  Calculated Total Awarded: {res['total_awarded'] if res else None}")
        print(f"  Calculated Total Max: {res['total_max'] if res else None}")
        print(f"  Calculated Percentage: {res['percentage'] if res else None}%")
        print("-" * 30)
