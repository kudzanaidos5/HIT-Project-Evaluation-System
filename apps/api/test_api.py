from app import create_app
from app.models.models import User, UserRole, Project
import json

app = create_app()
with app.app_context():
    print("Checking database...")
    projects = Project.query.limit(5).all()
    print(f"Found {len(projects)} projects")
    for p in projects:
        try:
            d = p.to_dict()
            print(f"Project {p.id} to_dict: Success")
        except Exception as e:
            print(f"Project {p.id} to_dict: FAILED - {str(e)}")
            import traceback
            traceback.print_exc()

    print("\nTesting analytics endpoints...")
    from app.routes.api import get_average_scores, get_completion_rate
    
    with app.test_request_context('/analytics/averages'):
        try:
            # Bypass decorators for testing
            func = get_average_scores.__wrapped__ if hasattr(get_average_scores, '__wrapped__') else get_average_scores
            # In Flask-JWT-Extended, decorators might be nested
            while hasattr(func, '__wrapped__'):
                func = func.__wrapped__
            
            res = func()
            print(f"get_average_scores: Success - {res[0].json}")
        except Exception as e:
            print(f"get_average_scores: FAILED - {str(e)}")
            import traceback
            traceback.print_exc()

    with app.test_request_context('/analytics/completion-rate'):
        try:
            func = get_completion_rate.__wrapped__ if hasattr(get_completion_rate, '__wrapped__') else get_completion_rate
            while hasattr(func, '__wrapped__'):
                func = func.__wrapped__
            
            res = func()
            print(f"get_completion_rate: Success - {res[0].json}")
        except Exception as e:
            print(f"get_completion_rate: FAILED - {str(e)}")
            import traceback
            traceback.print_exc()
