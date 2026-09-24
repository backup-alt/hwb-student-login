import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./LoginPage.css";

const API_URL = process.env.REACT_APP_API_URL || "https://hwb-production-00fd.up.railway.app";

function LoginPage() {
  const [rollNo, setRollNo] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [step, setStep] = useState("details");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const requestCode = async (event) => {
    event.preventDefault();
    setError("");
    if (!rollNo.trim() || !email.trim()) {
      setError("Enter your roll number and student email.");
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/student-auth/request-otp`, {
        rollNo: rollNo.trim(), email: email.trim(),
      });
      setChallengeId(response.data.challengeId);
      setStep("code");
      setCode("");
    } catch (err) {
      setError(err.response?.data?.error || "Could not send a code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async (event) => {
    event.preventDefault();
    setError("");
    if (!/^\d{6}$/.test(code)) {
      setError("Enter the six-digit code from your email.");
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/student-auth/verify-otp`, {
        rollNo: rollNo.trim(), email: email.trim(), challengeId, code,
      });
      localStorage.setItem("hits_token", response.data.token);
      localStorage.setItem("hits_student", JSON.stringify(response.data.student));
      sessionStorage.setItem("hits_open_whatsapp", "1");
      navigate("/success");
    } catch (err) {
      setError(err.response?.data?.error || "Could not verify the code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-screen">
      <section className="login-card" aria-labelledby="login-heading">
        <div className="login-mark" aria-hidden="true">H</div>
        <p className="login-eyebrow">HITS STUDENT ACCESS</p>
        <h1 id="login-heading">Sign in to HWB</h1>
        <p className="login-intro">
          {step === "details"
            ? "Use your roll number and registered student email to get a secure login code."
            : `Enter the code sent to ${email.trim()}. It expires in 10 minutes.`}
        </p>

        {error && <div className="login-error" role="alert">{error}</div>}

        {step === "details" ? (
          <form onSubmit={requestCode} className="login-form">
            <label htmlFor="rollNo">Roll number</label>
            <input id="rollNo" name="rollNo" type="text" autoComplete="username" autoCapitalize="characters"
              maxLength={30} placeholder="e.g. 23CS001" value={rollNo}
              onChange={(event) => setRollNo(event.target.value)} required />

            <label htmlFor="studentEmail">Student email</label>
            <input id="studentEmail" name="studentEmail" type="email" autoComplete="email"
              placeholder="you@college.edu" value={email}
              onChange={(event) => setEmail(event.target.value)} required />

            <button className="login-primary" type="submit" disabled={loading}>
              {loading ? "Sending code…" : "Send email code"}
            </button>
          </form>
        ) : (
          <form onSubmit={verifyCode} className="login-form">
            <label htmlFor="code">Six-digit code</label>
            <input id="code" name="code" className="login-code" type="text" inputMode="numeric"
              pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" autoFocus
              placeholder="000000" value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} required />

            <button className="login-primary" type="submit" disabled={loading}>
              {loading ? "Verifying…" : "Verify and sign in"}
            </button>
            <button className="login-link" type="button" onClick={() => { setStep("details"); setError(""); }}>
              Change details or request another code
            </button>
          </form>
        )}

        <aside className="login-help">
          <span aria-hidden="true">✉</span>
          <p><strong>Check your spam folder</strong><br />The OTP email may land in spam or junk. Only the newest code will work.</p>
        </aside>
      </section>
      <p className="login-footer">Hindustan Institute of Technology and Science</p>
    </main>
  );
}

export default LoginPage;
