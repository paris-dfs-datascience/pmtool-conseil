import { useState } from "react";

const FUNCTION_URL = "https://data-upload-ben-443545551926.us-central1.run.app/generate-upload-url";

export default function FileUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"uploading" | "success" | "error" | null>(null);
  const [error, setError] = useState<string>("");

  async function handleUpload() {
    if (!file) return;
    setStatus("uploading");
    setError("");

    try {
      const res = await fetch(FUNCTION_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, content_type: file.type || "application/octet-stream" }),
      });
      const { upload_url } = await res.json();

      const upload = await fetch(upload_url, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });

      if (!upload.ok) throw new Error("Upload failed");
      setStatus("success");
      setFile(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
      setStatus("error");
    }
  }

  return (
    <div style={{ maxWidth: 400, margin: "60px auto", fontFamily: "sans-serif" }}>
      <h2 style={{ marginBottom: 16 }}>Upload File</h2>

      <input
        type="file"
        onChange={e => { if (e.target.files?.[0]) { setFile(e.target.files[0]); setStatus(null); } }}
        style={{ display: "block", marginBottom: 12 }}
      />

      <button
        onClick={handleUpload}
        disabled={!file || status === "uploading"}
        style={{ padding: "10px 20px", cursor: "pointer" }}
      >
        {status === "uploading" ? "Uploading..." : "Upload"}
      </button>

      {status === "success" && <p style={{ color: "green", marginTop: 12 }}>✓ Uploaded successfully!</p>}
      {status === "error" && <p style={{ color: "red", marginTop: 12 }}>✗ {error}</p>}
    </div>
  );
}