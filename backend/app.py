import os
from flask import Flask
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from flask_mail import Mail
from dotenv import load_dotenv

from database import init_db

# Load environment variables
load_dotenv()

# Initialize extensions
mail = Mail()
jwt = JWTManager()

def create_app():
    app = Flask(__name__)

    # Configuration
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'default_secret')
    app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'default_jwt_secret')
    
    # Mail Configuration
    app.config['MAIL_SERVER'] = os.getenv('MAIL_SERVER', 'smtp.gmail.com')
    app.config['MAIL_PORT'] = int(os.getenv('MAIL_PORT', 465))
    app.config['MAIL_USE_TLS'] = os.getenv('MAIL_USE_TLS', 'False') == 'True'
    app.config['MAIL_USE_SSL'] = os.getenv('MAIL_USE_SSL', 'True') == 'True'
    app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME')
    app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD')
    app.config['MAIL_DEFAULT_SENDER'] = os.getenv('MAIL_USERNAME')

    # Ensure media directory exists
    os.makedirs(os.path.join(app.root_path, 'media', 'images'), exist_ok=True)

    # Initialize extensions
    CORS(app, origins=["http://localhost:3000"], supports_credentials=True)
    mail.init_app(app)
    jwt.init_app(app)

    # Initialize DB (if not already done)
    if not os.path.exists('auctionedge.db'):
        init_db()

    # Register Blueprints
    from routes.auth import auth_bp
    from routes.listings import listings_bp
    from routes.profile import profile_bp
    from routes.watchlist import watchlist_bp
    from routes.admin import admin_bp
    from routes.categories import categories_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(listings_bp, url_prefix='/api/listings')
    app.register_blueprint(profile_bp, url_prefix='/api/profile')
    app.register_blueprint(watchlist_bp, url_prefix='/api/watchlist')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    app.register_blueprint(categories_bp, url_prefix='/api/categories')

    @app.route('/')
    def index():
        return {"message": "AuctionEdge API running"}

    # Serve uploaded images
    from flask import send_from_directory
    @app.route('/media/images/<filename>')
    def serve_image(filename):
        return send_from_directory(os.path.join(app.root_path, 'media', 'images'), filename)

    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, port=5000)
