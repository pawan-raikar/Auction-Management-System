from flask import Blueprint, jsonify

categories_bp = Blueprint('categories', __name__)

CATEGORIES = [
    "Electronics",
    "Fashion",
    "Home & Garden",
    "Sports",
    "Collectibles",
    "Art",
    "Vehicles",
    "Other"
]

@categories_bp.route('/', methods=['GET'])
def get_categories():
    return jsonify(CATEGORIES), 200
