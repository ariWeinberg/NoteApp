import React, { useState } from "react";
import "./CreateNote.css";

function CreateNote({ onCreate }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState([]); // Tags state
  const [newTag, setNewTag] = useState(""); // For adding new tags
  const [error, setError] = useState("");

  const addNote = async () => {
    if (title.trim() === "" || content.trim() === "") {
      setError("Title and content are required!");
      return;
    }

    try {
      const response = await fetch("http://127.0.0.1:5500/notes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ title, content, tags }),
      });

      if (response.ok) {
        setTitle("");
        setContent("");
        setTags([]);
        setNewTag("");
        setError("");
        onCreate(); // Navigate back to the Notes List
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to create note");
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    }
  };

  const addTag = () => {
    if (newTag.trim() !== "" && !tags.includes(newTag)) {
      setTags((prevTags) => [...prevTags, newTag]);
      setNewTag("");
    }
  };

  return (
    <div className="create-note-container">
      {error && <p className="error-message">{error}</p>}
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
        className="note-title-input"
      />
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Content"
        rows="10"
        className="note-content-input"
      />
      <div className="tags-container">
        <input
          type="text"
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          placeholder="Add a tag"
          className="tag-input"
        />
        <button onClick={addTag} className="add-tag-button">Add Tag</button>
      </div>
      <div className="tags-list">
        {tags.map((tag, index) => (
          <span key={index} className="tag">
            {tag}
            <button onClick={() => setTags(tags.filter((t) => t !== tag))} className="remove-tag-button">
              ×
            </button>
          </span>
        ))}
      </div>
      <button onClick={addNote} className="create-note-button">Create Note</button>
    </div>
  );
}

export default CreateNote;
