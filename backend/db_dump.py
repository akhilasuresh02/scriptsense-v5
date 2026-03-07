from app import create_app
from models import QuestionContent, RubricContent

app = create_app()
with app.app_context():
    print('--- Questions ---')
    for q in QuestionContent.query.all():
        print(f"QP:{q.question_paper_id} QNum:{q.question_number} Text:{q.question_text[:50]}")
    print('--- Rubrics ---')
    for r in RubricContent.query.all():
        print(f"Rubric:{r.rubric_id} QNum:{r.question_number} Text:{r.criteria_text[:50]}")
