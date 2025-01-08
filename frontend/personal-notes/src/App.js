import React, { useState } from "react";
import NotesList from "./NotesList";
import CreateNote from "./CreateNote";
import NoteDetails from "./NoteDetails";
import Login from "./Login";
import Register from "./Register";
import "./App.css";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    !!localStorage.getItem("token") // Check if a token exists in localStorage
  );
  const [currentView, setCurrentView] = useState(isAuthenticated ? "notes" : "login"); // Default view
  const [selectedNote, setSelectedNote] = useState(null); // Tracks the selected note for details

  // Handle successful login
  const handleLogin = () => {
    setIsAuthenticated(true);
    setCurrentView("notes"); // Redirect to notes list after login
  };

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem("token"); // Remove the token from localStorage
    setIsAuthenticated(false);
    setCurrentView("login"); // Redirect to login
  };

  // Navigate to NoteDetails
  const openNoteDetails = (note) => {
    setSelectedNote(note);
    setCurrentView("details");
  };

  // Navigate to NotesList
  const goToNotesList = () => {
    setCurrentView("notes");
    setSelectedNote(null); // Clear selected note
  };

  return (
    <div className="app-container">
      <header className="header">
        <h1>Personal Notes</h1>
        {isAuthenticated && (
          <nav>
            <button
              onClick={goToNotesList}
              className={currentView === "notes" ? "active" : ""}
            >
              Notes List
            </button>
            <button
              onClick={() => setCurrentView("create")}
              className={currentView === "create" ? "active" : ""}
            >
              Create Note
            </button>
            <button onClick={handleLogout} className="logout-button">
              Logout
            </button>
          </nav>
        )}
      </header>
      <main className="main">
        {!isAuthenticated ? (
          currentView === "login" ? (
            <Login onLogin={handleLogin} />
          ) : (
            <Register onRegister={() => setCurrentView("login")} />
          )
        ) : currentView === "notes" ? (
          <NotesList onNoteClick={openNoteDetails} />
        ) : currentView === "create" ? (
          <CreateNote onCreate={goToNotesList} />
        ) : currentView === "details" && selectedNote ? (
          <NoteDetails note={selectedNote} onBack={goToNotesList} />
        ) : (
          <div>
            <p>No note selected. Please select a note from the list.</p>
            <button onClick={goToNotesList}>Back to Notes</button>
          </div>
        )}
        {!isAuthenticated && (
          <button
            onClick={() =>
              setCurrentView(currentView === "login" ? "register" : "login")
            }
            className="switch-auth-button"
          >
            {currentView === "login" ? "Go to Register" : "Go to Login"}
          </button>
        )}
      </main>
    </div>
  );
}

export default App;
