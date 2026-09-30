from backend.app.db.database import Base, engine, SessionLocal
from backend.app.models.user import User
from backend.app.core.security import hash_password


def main():
    Base.metadata.create_all(
        bind=engine,
        tables=[User.__table__],
    )

    db = SessionLocal()

    try:
        existing = (
            db.query(User)
            .filter(
                User.email == "admin@leadflow.ai"
            )
            .first()
        )

        if existing:
            print("Admin already exists.")
            return

        admin = User(
            name="LeadFlow Admin",
            email="admin@leadflow.ai",
            password_hash=hash_password(
                "Admin@12345"
            ),
            role="ADMIN",
            is_active=True,
        )

        db.add(admin)
        db.commit()

        print("Admin user created.")
        print("Email: admin@leadflow.ai")
        print("Password: Admin@12345")

    finally:
        db.close()


if __name__ == "__main__":
    main()