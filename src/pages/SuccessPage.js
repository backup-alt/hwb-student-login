import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { preferredWhatsAppUrl } from "../whatsapp";
import "./SuccessPage.css";

const API_URL = process.env.REACT_APP_API_URL || "https://hwb-production-00fd.up.railway.app";

function SuccessPage() {
  const [student, setStudent] = useState(null);
  const [pairingCode, setPairingCode] = useState("");
  const [pairingCreatedAt, setPairingCreatedAt] = useState(0);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    const token = localStorage.getItem("hits_token");
    if (!token) { navigate("/", { replace: true }); return undefined; }
    const headers = { Authorization: `Bearer ${token}` };
    const refresh = async (includePairing = false) => {
      try {
        const { data } = await axios.get(`${API_URL}/api/student-auth/me`, { headers });
        if (!active) return;
        setStudent(data.student);
        localStorage.setItem("hits_student", JSON.stringify(data.student));
        if (data.student.whatsappVerified) setPairingCode("");
        if (includePairing && !data.student.whatsappVerified) {
          const pairing = await axios.post(`${API_URL}/api/student-auth/link-code`, {}, { headers });
          if (active) { setPairingCode(pairing.data.code || ""); setPairingCreatedAt(Date.now()); }
        }
      } catch (err) {
        if (!active) return;
        if (err.response?.status === 401) {
          localStorage.removeItem("hits_token");
          localStorage.removeItem("hits_student");
          navigate("/", { replace: true });
        } else setError("Could not load your profile. Please refresh the page.");
      }
    };
    refresh(true);
    const onFocus = () => refresh(false);
    window.addEventListener("focus", onFocus);
    return () => { active = false; window.removeEventListener("focus", onFocus); };
  }, [navigate]);

  if (!student) return <main className="success-screen"><p>{error || "Loading your profile…"}</p></main>;
  const message = `Hi, I'm ${student.parentName || student.name || "a student"}. ${pairingCode ? `LINK ${pairingCode}` : ""}`.trim() +
    "\nCan you explain what this student assistant does?";

  return (
    <main className="success-screen">
      <section className="success-card" aria-labelledby="success-heading">
        <p className="success-eyebrow">HITS STUDENT ACCESS</p>
        <h1 id="success-heading">{student.role === "parent" ? "Parent access" : "Student profile"}</h1>
        {error && <p className="success-warning" role="alert">{error}</p>}
        <div className="success-student">
          <span className="success-avatar" aria-hidden="true">{student.name?.charAt(0).toUpperCase() || "S"}</span>
          <div><strong>{student.name || "Student"}</strong><span>{student.rollNo}</span></div>
        </div>
        <dl className="success-details">
          {student.role === "parent" && <div><dt>Parent</dt><dd>{student.parentName}</dd></div>}
          <div><dt>Semester</dt><dd>{student.semester || "—"}</dd></div>
          <div><dt>Year</dt><dd>{student.year ?? "—"}</dd></div>
          <div><dt>Section</dt><dd>{student.section || "—"}</dd></div>
          <div><dt>Department</dt><dd>{student.department}</dd></div>
          <div><dt>Email</dt><dd>{student.email}</dd></div>
          <div><dt>{student.role === "parent" ? "Parent mobile" : "Mobile"}</dt><dd>{student.phone}</dd></div>
        </dl>
        <a className="success-primary" href={preferredWhatsAppUrl(message)} aria-disabled={!student.whatsappVerified && !pairingCode}
          onClick={async (event) => {
            if (student.whatsappVerified) return;
            if (!pairingCode) { event.preventDefault(); return; }
            if (Date.now() - pairingCreatedAt < 8 * 60 * 1000) return;
            event.preventDefault();
            try {
              const { data } = await axios.post(`${API_URL}/api/student-auth/link-code`, {}, {
                headers: { Authorization: `Bearer ${localStorage.getItem("hits_token")}` },
              });
              setPairingCode(data.code);
              setPairingCreatedAt(Date.now());
              const freshMessage = `Hi, I'm ${student.parentName || student.name || "a student"}. LINK ${data.code}\nCan you explain what this student assistant does?`;
              window.location.href = preferredWhatsAppUrl(freshMessage);
            } catch (_) { setError("Could not prepare WhatsApp. Please try again."); }
          }}>
          Open WhatsApp
        </a>
      </section>
    </main>
  );
}

export default SuccessPage;
