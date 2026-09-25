import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { isMobileDevice, preferredWhatsAppUrl, whatsappChatUrl } from "../whatsapp";
import "./SuccessPage.css";

const API_URL = process.env.REACT_APP_API_URL || "https://hwb-production-00fd.up.railway.app";

function SuccessPage() {
  const [student, setStudent] = useState(null);
  const [pairingCode, setPairingCode] = useState("");
  const [attendance, setAttendance] = useState(undefined);
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
        if (includePairing) {
          axios.get(`${API_URL}/api/student-auth/attendance`, { headers })
            .then((response) => { if (active) setAttendance(response.data.attendance); })
            .catch(() => { if (active) setAttendance({ error: true }); });
        }
        if (includePairing && !data.student.whatsappVerified) {
          const pairing = await axios.post(`${API_URL}/api/student-auth/link-code`, {}, { headers });
          if (active) setPairingCode(pairing.data.code || "");
        }
        if (data.student.whatsappVerified) setPairingCode("");
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

  const logout = async () => {
    try {
      await axios.post(`${API_URL}/api/student-auth/logout`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem("hits_token")}` },
      });
      localStorage.removeItem("hits_token");
      localStorage.removeItem("hits_student");
      navigate("/", { replace: true });
    } catch (_) { setError("Could not log out. Please try again."); }
  };

  const renewPairingCode = async () => {
    try {
      const { data } = await axios.post(`${API_URL}/api/student-auth/link-code`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem("hits_token")}` },
      });
      setPairingCode(data.code || "");
      setError("");
    } catch (_) { setError("Could not create a new pairing code. Please try again."); }
  };

  if (!student) return <main className="success-screen"><p>{error || "Loading your profile…"}</p></main>;
  const message = pairingCode ? `LINK ${pairingCode}` : "Hi";

  return (
    <main className="success-screen">
      <section className="success-card" aria-labelledby="success-heading">
        <div className="success-check" aria-hidden="true">✓</div>
        <p className="success-eyebrow">HITS STUDENT ACCESS</p>
        <h1 id="success-heading">Your student profile</h1>
        <p className="success-intro">You’re signed in. Your account remains active until you log out.</p>
        {error && <p className="success-warning" role="alert">{error}</p>}
        <div className="success-student">
          <span className="success-avatar" aria-hidden="true">{student.name?.charAt(0).toUpperCase() || "S"}</span>
          <div><strong>{student.name || "Student"}</strong><span>{student.rollNo}</span></div>
        </div>
        <dl className="success-details">
          <div><dt>Semester</dt><dd>{student.semester || "—"}</dd></div>
          <div><dt>Year</dt><dd>{student.year ?? "—"}</dd></div>
          <div><dt>Section</dt><dd>{student.section || "—"}</dd></div>
          <div><dt>Department</dt><dd>{student.department}</dd></div>
          <div><dt>Email</dt><dd>{student.email}</dd></div>
          <div><dt>Mobile</dt><dd>{student.phone}</dd></div>
        </dl>
        <section className="success-attendance" aria-labelledby="attendance-heading">
          <h2 id="attendance-heading">Attendance</h2>
          {attendance === undefined ? <p>Loading attendance…</p> : attendance === null ? (
            <p>Your attendance record has not been added yet.</p>
          ) : attendance.error ? (
            <p>Attendance is temporarily unavailable. Please refresh the page.</p>
          ) : <>
            <p className="success-attendance-overall">Overall: <strong>{attendance.overallPercentage == null ? "Not available" : `${attendance.overallPercentage}%`}</strong></p>
            {attendance.period && <p>Period: {attendance.period}</p>}
            <ul>{attendance.subjects.map((subject) => (
              <li key={subject.code}><span>{subject.name} <small>({subject.code})</small></span><strong>{subject.percentage == null ? "Not available" : `${subject.percentage}%`}</strong></li>
            ))}</ul>
            <p>Daily attendance records are not available in this data source.</p>
          </>}
        </section>
        <section className="success-leave" aria-labelledby="leave-heading">
          <h2 id="leave-heading">How to apply for leave</h2>
          <p>Contact your class advisor or department office with your roll number, leave dates, reason, and any required documents. Leave requests cannot be submitted here yet.</p>
        </section>
        <p className="success-instruction">
          {student.whatsappVerified
            ? "Open WhatsApp to view attendance, profile, leave guidance, or log out."
            : pairingCode
              ? <>Open WhatsApp from the mobile number ending <strong>{student.whatsappPhoneLast4}</strong> and send the prefilled <strong>LINK {pairingCode}</strong> message. The pairing code expires in 10 minutes.</>
              : "Preparing your WhatsApp pairing message…"}
        </p>
        <a className="success-primary" href={preferredWhatsAppUrl(message)} aria-disabled={!student.whatsappVerified && !pairingCode}
          onClick={(event) => { if (!student.whatsappVerified && !pairingCode) event.preventDefault(); }}>
          {isMobileDevice() ? "Open WhatsApp app" : "Open WhatsApp chat"}
        </a>
        {(student.whatsappVerified || pairingCode) && <a className="success-fallback" href={whatsappChatUrl(message)}>Use WhatsApp Web instead</a>}
        {!student.whatsappVerified && <button className="success-renew" type="button" onClick={renewPairingCode}>Get a new pairing code</button>}
        <button className="success-logout" type="button" onClick={logout}>Log out</button>
      </section>
    </main>
  );
}

export default SuccessPage;
