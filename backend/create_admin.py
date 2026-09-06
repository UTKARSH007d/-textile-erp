from database import SessionLocal
from models.user import User
from auth import hash_password


db = SessionLocal()

try:
    existing_user = (
        db.query(User)
        .filter(User.username == "admin")
        .first()
    )

    if existing_user:
        print("Admin user already exists.")
    else:
        admin = User(
            username="admin",
            full_name="ERP Administrator",
            email="admin@textilerp.com",
            hashed_password=hash_password("admin123"),
            role="Admin",
            is_active=True
        )

        db.add(admin)
        db.commit()

        print("Admin user created successfully.")

finally:
    db.close()