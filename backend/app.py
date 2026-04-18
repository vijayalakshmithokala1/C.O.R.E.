"""
SmartLaw — Flask Application Factory
Privacy-first Legal AI Platform
"""
import os
from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv
from models import db

load_dotenv()


def create_app() -> Flask:
    app = Flask(__name__)

    # ── Configuration ──────────────────────────────
    app.config["SECRET_KEY"] = os.getenv("JWT_SECRET", "smartlaw-dev-secret")
    
    # Render-specific fix: SQLAlchemy expects 'postgresql://' not 'postgres://'
    db_url = os.getenv("DATABASE_URL", f"sqlite:///{os.path.join(os.getcwd(), 'smartlaw.db')}")
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)
        
    app.config["SQLALCHEMY_DATABASE_URI"] = db_url
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["MAX_CONTENT_LENGTH"] = 20 * 1024 * 1024  # 20 MB max upload

    # ── Extensions ─────────────────────────────────
    db.init_app(app)
    
    # Production CORS: allow configurable origins via environment
    allowed_origins = os.getenv("CORS_ORIGINS", "*").split(",")
    CORS(app, resources={r"/api/*": {"origins": allowed_origins}}, supports_credentials=True, allow_headers=["Content-Type", "Authorization", "Accept"])

    # ── Blueprints ─────────────────────────────────
    from routes.auth_routes import auth_bp
    from routes.document_routes import document_bp
    from routes.admin_routes import admin_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(document_bp, url_prefix="/api/document")
    app.register_blueprint(admin_bp, url_prefix="/api/admin")

    # ── Create tables ──────────────────────────────
    with app.app_context():
        db.create_all()

    return app


# ── Entry Point ────────────────────────────────────
app = create_app()

if __name__ == "__main__":
    print("\n🏛️  SmartLaw API is starting...")
    app.run(debug=True, host="0.0.0.0", port=5000)