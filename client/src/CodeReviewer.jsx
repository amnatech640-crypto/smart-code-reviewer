import React, { useState, useEffect } from "react";
import Editor from "@monaco-editor/react";
import ReactMarkdown from "react-markdown";
import axios from "axios";
import { jsPDF } from "jspdf";
import "./CodeReviewer.css";

// Formats your endpoint safely across your local setup and production deployments
const getBaseUrl = () => {
  if (typeof window !== "undefined" && window.location.hostname !== "localhost") {
    return ""; // Empty string tells the browser to utilize relative paths on Netlify
  }
  return "http://localhost:5000"; 
};

const API_BASE_URL = getBaseUrl();

const CodeReviewer = () => {
  const [code, setCode] = useState(`// Paste your code here to review\n#include <stdio.h>\n\nint main() {\n    printf("Hello World\\n");\n    return 0;\n}`);
  const [review, setReview] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("detailed"); 
  const [history, setHistory] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const fetchHistory = async () => {
    try {
      const targetUrl = API_BASE_URL === "" ? "/.netlify/functions/api/history" : `${API_BASE_URL}/api/history`;
      const res = await axios.get(targetUrl);
      setHistory(res.data);
    } catch (err) {
      console.error("Could not fetch database records:", err);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleReview = async () => {
    setLoading(true);
    setReview("");
    try {
      const targetUrl = API_BASE_URL === "" ? "/.netlify/functions/api/review" : `${API_BASE_URL}/api/review`;
      const response = await axios.post(targetUrl, { code, mode });
      setReview(response.data.review);
      fetchHistory(); 
    } catch (error) {
      console.error("Review request failed:", error);
      setReview("### ❌ Error\nFailed to connect to the AI engine.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!review) return alert("Generate a review first!");
    navigator.clipboard.writeText(review);
    alert("Review copied to clipboard! 📋");
  };

  const downloadTxt = () => {
    if (!review) return alert("Generate a review first!");
    const element = document.createElement("a");
    const file = new Blob([review], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = "ai_code_review.txt";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const downloadPdf = () => {
    if (!review) return alert("No review content available to download!");
    const doc = new jsPDF();
    doc.setFont("Courier");
    doc.setFontSize(10);
    const splitText = doc.splitTextToSize(review, 180);
    doc.text("AI CODE REVIEW REPORT", 14, 15);
    doc.text("========================================", 14, 20);
    doc.text(splitText, 14, 28);
    doc.save("ai-code-review.pdf");
  };

  const shareReview = () => {
    if (!review) return alert("Generate a review first before sharing!");
    const shareUrl = `${window.location.origin}/review/share?id=${Math.random().toString(36).substr(2, 9)}`;
    navigator.clipboard.writeText(shareUrl);
    alert("🟢 Share link copied to your clipboard!\n" + shareUrl);
  };

  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          <button className="hamburger-btn" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
            <svg width="20" height="14" viewBox="0 0 18 12" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M0 12H18V10H0V12ZM0 7H18V5H0V7ZM0 0V2H18V0H0Z" fill="currentColor"/>
            </svg>
          </button>
          <h1>AI CODE REVIEWER ⚡</h1>
        </div>
      </header>

      <main className="main">
        <aside className={`sidebar ${isSidebarOpen ? "open" : ""}`}>
          <h2>Saved Audits</h2>
          <div className="history-list">
            {history.length === 0 ? (
              <div className="placeholder-text" style={{ fontSize: "0.75rem" }}>No records found</div>
            ) : (
              history.map((item, index) => {
                const date = new Date(item.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" });
                return (
                  <div key={item._id || index} className="history-item" onClick={() => { setCode(item.code); setReview(item.review); setIsSidebarOpen(false); }}>
                    ↳ Audit ({date})
                  </div>
                );
              })
            )}
          </div>
        </aside>

        <section className="editor-section">
          <div className="editor-topbar">
            <span className="workspace-label">WORKSPACE INPUT</span>
          </div>
          <div className="monaco-wrapper">
            <Editor
              height="100%"
              theme="vs-dark"
              defaultLanguage="c"
              value={code}
              onChange={(value) => setCode(value || "")}
              options={{
                fontSize: 14,
                minimap: { enabled: false },
                wordWrap: "on",
                lineNumbersMinChars: 3,
                scrollbar: { horizontal: "hidden", verticalScrollbarSize: 6 }
              }}
            />
          </div>
        </section>

        <section className="output-section">
          <div className="top-controls">
            <div className="toggle-buttons">
              <button className={mode === "summary" ? "active-toggle" : ""} onClick={() => setMode("summary")}>Summary</button>
              <button className={mode === "detailed" ? "active-toggle" : ""} onClick={() => setMode("detailed")}>Detailed</button>
            </div>
            <button className="review-btn" onClick={handleReview} disabled={loading}>
              {loading ? "Analyzing..." : "Review Code"}
            </button>
          </div>

          <div className="utility-bar">
            <button onClick={copyToClipboard}>Copy Review</button>
            <button onClick={downloadTxt}>Download TXT</button>
            <button onClick={downloadPdf}>Download PDF</button>
            <button onClick={shareReview}>Share</button>
          </div>

          <div className="output-box">
            {loading && (
              <div className="loading">
                <div>⚡ Executing Deep Logic Scan...</div>
                <div>⚡ Running Vulnerability Check Vectors...</div>
              </div>
            )}
            {!loading && !review && <span className="placeholder-text">Click "Review Code" to analyze your script...</span>}
            {!loading && review && <div className="review-container"><ReactMarkdown>{review}</ReactMarkdown></div>}
          </div>
        </section>
      </main>
    </div>
  );
};

export default CodeReviewer;