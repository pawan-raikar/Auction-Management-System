import os
from flask import Flask
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from flask_mail import Mail
from dotenv import load_dotenv
from database import init_db

load_dotenv()
mail = Mail()
jwt = JWTManager()


def create_app():
    app = Flask(__name__)

    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'auctionedge_secret_v2')
    app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'auctionedge_jwt_v2')
    app.config['MAIL_SERVER'] = os.getenv('MAIL_SERVER', 'smtp.gmail.com')
    app.config['MAIL_PORT'] = int(os.getenv('MAIL_PORT', 587))
    app.config['MAIL_USE_TLS'] = os.getenv('MAIL_USE_TLS', 'True') == 'True'
    app.config['MAIL_USE_SSL'] = os.getenv('MAIL_USE_SSL', 'False') == 'True'
    app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME')
    app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD')
    app.config['MAIL_DEFAULT_SENDER'] = os.getenv('MAIL_USERNAME')

    os.makedirs(os.path.join(app.root_path, 'media', 'images'), exist_ok=True)

    CORS(app, origins=["http://localhost:3001"], supports_credentials=True)
    mail.init_app(app)
    jwt.init_app(app)

    if not os.path.exists('auctionedge.db'):
        init_db()

    from routes.auth import auth_bp
    from routes.listings import listings_bp
    from routes.profile import profile_bp
    from routes.watchlist import watchlist_bp
    from routes.admin import admin_bp
    from routes.categories import categories_bp
    from routes.notifications import notifications_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(listings_bp, url_prefix='/api/listings')
    app.register_blueprint(profile_bp, url_prefix='/api/profile')
    app.register_blueprint(watchlist_bp, url_prefix='/api/watchlist')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    app.register_blueprint(categories_bp, url_prefix='/api/categories')
    app.register_blueprint(notifications_bp, url_prefix='/api/notifications')

    @app.route('/')
    def index():
        return {"message": "AuctionEdge API v2"}

    from flask import send_from_directory
    @app.route('/media/images/<filename>')
    def serve_image(filename):
        return send_from_directory(os.path.join(app.root_path, 'media', 'images'), filename)

    return app


if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, port=5003)
