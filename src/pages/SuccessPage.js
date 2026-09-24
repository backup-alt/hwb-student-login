import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { WHATSAPP_CHAT_URL, preferredWhatsAppUrl, isMobileDevice } from "../whatsapp";
import "./SuccessPage.css";

function SuccessPage() {
  const [student, setStudent] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const stored = localStorage.getItem("hits_student");
    if (!stored) {
      navigate("/", { replace: true });
      return;
    }
    try {
      setStudent(JSON.parse(stored));
    } catch (_) {
      navigate("/", { replace: true });
      return;
    }
    if (sessionStorage.getItem("hits_open_whatsapp") === "1") {
      sessionStorage.removeItem("hits_open_whatsapp");
      // An app launch after an asynchronous OTP request can be blocked.
      // Keep the direct tap target below for that case.
      window.location.assign(preferredWhatsAppUrl());
    }
  }, [navigate]);

  if (!student) return null;

  return (
    <main className="success-screen">
      <section className="success-card" aria-labelledby="success-heading">
        <div className="success-check" aria-hidden="true">✓</div>
        <p className="success-eyebrow">HITS STUDENT ACCESS</p>
        <h1 id="success-heading">You’re signed in</h1>
        <p className="success-intro">Your email is verified. Open the HITS WhatsApp Bot chat to continue.</p>

        <div className="success-student">
          <span className="success-avatar" aria-hidden="true">{student.name?.charAt(0).toUpperCase() || "S"}</span>
          <div>
            <strong>{student.name || "Student"}</strong>
            <span>Roll no. {student.rollNo || student.rollNumber || "—"}</span>
          </div>
        </div>

        <p className="success-instruction">Send the prefilled <strong>Hi</strong> message in WhatsApp. The bot will greet you as a student.</p>
        {student.whatsappPhoneLast4 ? (
          <p className="success-phone">Use the WhatsApp account ending <strong>{student.whatsappPhoneLast4}</strong>, saved in your ERP profile.</p>
        ) : (
          <p className="success-warning">Your ERP profile has no valid phone number. Ask the ERP admin to add the number you use for WhatsApp.</p>
        )}

        <a className="success-primary" href={preferredWhatsAppUrl()}>
          {isMobileDevice() ? "Open WhatsApp app" : "Open WhatsApp chat"}
        </a>
        <a className="success-fallback" href={WHATSAPP_CHAT_URL}>If the app does not open, try the web chat</a>
        <p className="success-note">If you opened this page inside Google, use your browser’s menu to open it in Chrome, then tap the button above.</p>
      </section>
    </main>
  );
}

export default SuccessPage;
