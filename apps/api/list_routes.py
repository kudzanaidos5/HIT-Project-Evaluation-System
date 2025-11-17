from app import create_app

app = create_app()

print("All registered routes:")
for rule in app.url_map.iter_rules():
    print(f"  {rule.rule} -> {rule.endpoint} [{', '.join(rule.methods)}]")
