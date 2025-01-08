from flask_jwt_extended import create_access_token
from flask import Flask, request, jsonify
from flask_bcrypt import Bcrypt
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from flask_cors import CORS
from flask_socketio import SocketIO
import sqlite3
import eventlet

# Initialize Flask app and extensions
app = Flask(__name__)
app.config["SECRET_KEY"] = "your-secret-key"  # Replace with a secure key
app.config["JWT_SECRET_KEY"] = "your-jwt-secret-key"  # Replace with a secure key
CORS(app, resources={r"/*": {"origins": "*"}})  # Allow all origins for simplicity
bcrypt = Bcrypt(app)
jwt = JWTManager(app)
socketio = SocketIO(app, cors_allowed_origins="*")

# Database connection helper
def get_db_connection():
    conn = sqlite3.connect("database.db")
    conn.row_factory = sqlite3.Row
    return conn

# Initialize database
def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    # Create users table
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL
        )
        """
    )

    # Create notes table
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            user_id INTEGER NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
        """
    )

    conn.commit()
    conn.close()

# Initialize the database
init_db()

# SocketIO events
@socketio.on("connect")
def handle_connect():
    print("Client connected")

@socketio.on("disconnect")
def handle_disconnect():
    print("Client disconnected")

# User registration
@app.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return jsonify({"error": "Username and password are required"}), 400

    hashed_password = bcrypt.generate_password_hash(password).decode("utf-8")

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("INSERT INTO users (username, password) VALUES (?, ?)", (username, hashed_password))
        conn.commit()
        conn.close()
        return jsonify({"message": "User registered successfully"}), 201
    except sqlite3.IntegrityError:
        return jsonify({"error": "Username already exists"}), 409

# User login
@app.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return jsonify({"error": "Username and password are required"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    user = cursor.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()
    conn.close()

    if user and bcrypt.check_password_hash(user["password"], password):
        # Ensure `sub` is a string
        access_token = create_access_token(identity=str(user["id"]))
        return jsonify({"access_token": access_token}), 200
    else:
        return jsonify({"error": "Invalid username or password"}), 401

# Fetch all notes for the authenticated user
@app.route("/notes", methods=["GET"])
@jwt_required()
def get_notes():
    user_id = get_jwt_identity()
    conn = get_db_connection()

    # Fetch notes with their tags
    cursor = conn.cursor()
    notes_query = """
        SELECT notes.id, notes.title, notes.content, GROUP_CONCAT(tags.name) AS tags
        FROM notes
        LEFT JOIN note_tags ON notes.id = note_tags.note_id
        LEFT JOIN tags ON note_tags.tag_id = tags.id
        WHERE notes.user_id = ?
        GROUP BY notes.id
    """
    notes = cursor.execute(notes_query, (user_id,)).fetchall()

    conn.close()
    return jsonify([dict(note) for note in notes])

# Create a new note
@app.route("/notes", methods=["POST"])
@jwt_required()
def create_note():
    data = request.get_json()
    title = data.get("title")
    content = data.get("content")
    tags = data.get("tags", [])  # List of tags
    user_id = get_jwt_identity()

    if not title or not content:
        return jsonify({"error": "Title and content are required"}), 422

    conn = get_db_connection()
    cursor = conn.cursor()

    # Insert the note
    cursor.execute(
        "INSERT INTO notes (title, content, user_id) VALUES (?, ?, ?)",
        (title, content, user_id),
    )
    note_id = cursor.lastrowid

    # Process tags
    for tag_name in tags:
        # Insert the tag if it doesn't exist
        cursor.execute("INSERT OR IGNORE INTO tags (name) VALUES (?)", (tag_name,))
        tag_id = cursor.execute("SELECT id FROM tags WHERE name = ?", (tag_name,)).fetchone()["id"]

        # Link the tag to the note
        cursor.execute("INSERT INTO note_tags (note_id, tag_id) VALUES (?, ?)", (note_id, tag_id))

    conn.commit()
    conn.close()

    # Emit the new note
    socketio.emit("note_added", {"id": note_id, "title": title, "content": content, "tags": tags})
    return jsonify({"message": "Note created successfully"}), 201
@app.route("/notes/<int:id>", methods=["PUT"])
@jwt_required()
def update_note(id):
    data = request.get_json()
    title = data.get("title")
    content = data.get("content")
    tags = data.get("tags", [])  # List of tags

    if not title or not content:
        return jsonify({"error": "Title and content are required"}), 422

    user_id = get_jwt_identity()

    conn = get_db_connection()
    cursor = conn.cursor()

    # Check if the note exists and belongs to the user
    note = cursor.execute("SELECT * FROM notes WHERE id = ? AND user_id = ?", (id, user_id)).fetchone()
    if not note:
        return jsonify({"error": "Note not found or unauthorized"}), 404

    # Update the note
    cursor.execute(
        "UPDATE notes SET title = ?, content = ? WHERE id = ?",
        (title, content, id),
    )

    # Update tags
    cursor.execute("DELETE FROM note_tags WHERE note_id = ?", (id,))  # Clear existing tags
    for tag_name in tags:
        # Insert the tag if it doesn't exist
        cursor.execute("INSERT OR IGNORE INTO tags (name) VALUES (?)", (tag_name,))
        tag_id = cursor.execute("SELECT id FROM tags WHERE name = ?", (tag_name,)).fetchone()["id"]

        # Link the tag to the note
        cursor.execute("INSERT INTO note_tags (note_id, tag_id) VALUES (?, ?)", (id, tag_id))

    conn.commit()
    conn.close()

    return jsonify({"message": "Note updated successfully"}), 200

# Delete a note
@app.route("/notes/<int:note_id>", methods=["DELETE"])
@jwt_required()
def delete_note(note_id):
    user_id = get_jwt_identity()
    conn = get_db_connection()
    cursor = conn.cursor()
    note = cursor.execute("SELECT * FROM notes WHERE id = ? AND user_id = ?", (note_id, user_id)).fetchone()

    if not note:
        conn.close()
        return jsonify({"error": "Note not found or unauthorized"}), 404

    cursor.execute("DELETE FROM notes WHERE id = ?", (note_id,))
    conn.commit()
    conn.close()

    # Emit the deleted note ID to all connected clients
    socketio.emit("note_deleted", {"id": note_id})
    return jsonify({"message": "Note deleted successfully"}), 200

# Run the app with Socket.IO
if __name__ == "__main__":
    socketio.run(app, port=5500, debug=True)
