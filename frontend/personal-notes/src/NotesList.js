import React, { useState, useEffect } from "react";
import { io } from "socket.io-client";
import "./NotesList.css";

const socket = io("http://127.0.0.1:5500");

function NotesList({ onNoteClick }) {
  const [notes, setNotes] = useState([]);
  const [tags, setTags] = useState([]); // List of all available tags
  const [selectedTag, setSelectedTag] = useState(""); // Selected tag for filtering
  const [searchTerm, setSearchTerm] = useState(""); // Search input
  const [searchMode, setSearchMode] = useState("title"); // Search by title or content
  const [error, setError] = useState("");

  // Fetch notes and tags from the backend
  useEffect(() => {
    fetch("http://127.0.0.1:5500/notes", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`, // Include token
      },
    })
      .then((response) => {
        if (!response.ok) {
          if (response.status === 401) {
            throw new Error("Unauthorized access. Please log in again.");
          }
          throw new Error("Failed to fetch notes.");
        }
        return response.json();
      })
      .then((data) => {
        setNotes(data);
        const uniqueTags = Array.from(
          new Set(data.flatMap((note) => (note.tags ? note.tags.split(",") : [])))
        );
        setTags(uniqueTags);
      })
      .catch((error) => setError(error.message));
  }, []);

  // Listen for real-time updates with Socket.IO
  useEffect(() => {
    socket.on("note_added", (note) => {
      setNotes((prevNotes) => [...prevNotes, note]);
    });

    socket.on("note_deleted", (data) => {
      setNotes((prevNotes) => prevNotes.filter((note) => note.id !== data.id));
    });

    return () => {
      socket.off("note_added");
      socket.off("note_deleted");
    };
  }, []);

  // Delete a note
  const deleteNote = (id) => {
    fetch(`http://127.0.0.1:5500/notes/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`, // Include token
      },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to delete note.");
        }
        setNotes((prevNotes) => prevNotes.filter((note) => note.id !== id));
      })
      .catch((error) => setError(error.message));
  };

  // Filter notes based on search term, mode, and selected tag
  const filteredNotes = notes.filter((note) => {
    const searchIn = searchMode === "title" ? note.title : note.content;
    const matchesSearch = searchIn.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTag =
      selectedTag === "" || (note.tags && note.tags.split(",").includes(selectedTag));
    return matchesSearch && matchesTag;
  });

  return (
    <div className="notes-list-container">
      {/* Search Bar, Dropdown, and Tag Filter */}
      <div className="search-bar-container">
        <input
          type="text"
          placeholder={`Search by ${searchMode}...`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-bar"
        />
        <select
          value={searchMode}
          onChange={(e) => setSearchMode(e.target.value)}
          className="search-mode-dropdown"
        >
          <option value="title">Title</option>
          <option value="content">Content</option>
        </select>
        <select
          value={selectedTag}
          onChange={(e) => setSelectedTag(e.target.value)}
          className="tag-filter-dropdown"
        >
          <option value="">All Tags</option>
          {tags.map((tag, index) => (
            <option key={index} value={tag}>
              {tag}
            </option>
          ))}
        </select>
      </div>

      <div className="notes-list">
        {error && <p className="error-message">{error}</p>}

        {filteredNotes.length > 0 ? (
          filteredNotes.map((note) => (
            <div
              className="note-card"
              key={note.id}
              onClick={() => onNoteClick(note)} // Navigate to NoteDetails
            >
              <h3>{note.title}</h3>
              <p className="tags">
                {note.tags ? note.tags.split(",").map((tag) => `#${tag}`).join(", ") : "No tags"}
              </p>
              <button
                className="delete-button"
                onClick={(e) => {
                  e.stopPropagation(); // Prevent click from navigating
                  deleteNote(note.id);
                }}
              >
                Delete
              </button>
            </div>
          ))
        ) : (
          <p>No notes found. Create a new one!</p>
        )}
      </div>
    </div>
  );
}

export default NotesList;
