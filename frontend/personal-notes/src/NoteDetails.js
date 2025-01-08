import React, { useState, useEffect } from "react";
import { marked } from "marked";
import "./NoteDetails.css";
import { markedHighlight } from "marked-highlight";
import { markedEmoji } from "marked-emoji";
import hljs from "highlight.js";
import "highlight.js/styles/github.css";

// Configure marked
marked.use(
  markedHighlight({
    langPrefix: "hljs language-", // Highlight.js class prefix
    highlight(code, lang) {
      if (hljs.getLanguage(lang)) {
        return hljs.highlight(code, { language: lang }).value;
      } else {
        return hljs.highlightAuto(code).value;
      }
    },
  })
);


// Emoji mapping
const emojiMap = {
  smile: "😄",
  heart: "❤️",
  tada: "🎉",
  sparkles: "✨",
  rocket: "🚀",
  computer: "💻",
  star: "⭐",
};

// Add Emoji support with the provided map
marked.use(markedEmoji({ emojis: emojiMap }));

// Extend table support (alignments for extended tables)
marked.setOptions({
  headerIds: true,
  gfm: true, // GitHub Flavored Markdown
  tables: true, // Basic and extended table support
  breaks: true, // Line breaks on a single newline
});

// Custom renderer for more-lists or nested lists (optional enhancement)
const renderer = new marked.Renderer();
renderer.listitem = function (text, task) {
  if (task) {
    return `<li style="list-style: none;"><input type="checkbox" disabled ${task.checked ? "checked" : ""}/> ${text}</li>`;
  }
  return `<li>${text}</li>`;
};
marked.use({ renderer });

function NoteDetails({ note, onBack }) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [tags, setTags] = useState(note.tags ? note.tags.split(",") : []);
  const [newTag, setNewTag] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setTitle(note.title);
    setContent(note.content);
    setTags(note.tags ? note.tags.split(",") : []);
  }, [note]);

  const saveNote = async () => {
    if (title.trim() === "" || content.trim() === "") {
      setError("Both title and content are required!");
      return;
    }

    try {
      const response = await fetch(`http://127.0.0.1:5500/notes/${note.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ title, content, tags }),
      });

      if (response.ok) {
        setError("");
        const updatedNote = { ...note, title, content, tags: tags.join(",") };
        setIsEditing(false);
        onBack(updatedNote); // Pass updated note back to NotesList
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to save note.");
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    }
  };

  const addTag = () => {
    if (newTag.trim() !== "" && !tags.includes(newTag)) {
      setTags([...tags, newTag]);
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  return (
    <div className="note-details-container">
      <button className="back-button" onClick={() => onBack(null)}>
        Back to Notes
      </button>
      {error && <p className="error-message">{error}</p>}
      {isEditing ? (
        <>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Edit Title"
            className="edit-title-input"
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Edit Content"
            rows="10"
            className="edit-content-input"
          />
          <div className="tags-container">
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="Add a tag"
              className="tag-input"
            />
            <button onClick={addTag} className="add-tag-button">
              Add Tag
            </button>
          </div>
          <div className="tags-list">
            {tags.map((tag, index) => (
              <span key={index} className="tag">
                {tag}
                <button onClick={() => removeTag(tag)} className="remove-tag-button">
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="edit-actions">
            <button onClick={saveNote} className="save-button">
              Save
            </button>
            <button onClick={() => setIsEditing(false)} className="cancel-button">
              Cancel
            </button>
          </div>
        </>
      ) : (
        <>
          <h2>{note.title}</h2>
          <div
            className="note-content"
            dangerouslySetInnerHTML={{ __html: marked(note.content) }}
          />
          <div className="tags-list">
            {tags.length > 0 ? (
              tags.map((tag, index) => (
                <span key={index} className="tag">
                  {tag}
                </span>
              ))
            ) : (
              <p>No tags</p>
            )}
          </div>
          <button onClick={() => setIsEditing(true)} className="edit-button">
            Edit Note
          </button>
        </>
      )}
    </div>
  );
}

export default NoteDetails;
