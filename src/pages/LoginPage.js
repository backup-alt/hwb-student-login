import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./LoginPage.css";

const API_URL = process.env.REACT_APP_API_URL || "https://hwb-production-00fd.up.railway.app";

function LoginPage() {
  const [rollNo, setRollNo] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [step, setStep] = useState("details");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const codeInputs = useRef([]);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("hits_token");
    if (!token) { setCheckingSession(false); return; }
    axios.get(`${API_URL}/api/student-auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(({ data }) => {
        localStorage.setItem("hits_student", JSON.stringify(data.student));
        navigate("/success", { replace: true });
      })
      .catch((err) => {
        if (err.response?.status === 401) {
          localStorage.removeItem("hits_token");
          localStorage.removeItem("hits_student");
          setCheckingSession(false);
        } else navigate("/success", { replace: true });
      });
  }, [navigate]);

  const updateCode = (digits, focusIndex) => {
    setCode(digits);
    if (focusIndex !== undefined) {
      requestAnimationFrame(() => codeInputs.current[focusIndex]?.focus());
    }
  };

  const handleCodeChange = (index, value) => {
    const digits = value.replace(/\D/g, "");
    if (!digits) {
      const next = code.split("");
      next[index] = " ";
      updateCode(next.join(""));
      return;
    }
    const next = Array.from({ length: 6 }, (_, position) => code[position] || " ");
    // Mobile one-time-code suggestions can insert the full code into one input.
    for (let offset = 0; offset < digits.length && index + offset < 6; offset += 1) {
      next[index + offset] = digits[offset];
    }
    updateCode(next.join(""), Math.min(index + digits.length, 5));
  };

  const handleCodePaste = (event) => {
    const digits = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!digits) return;
    event.preventDefault();
    updateCode(digits, Math.min(digits.length, 5));
  };

  const handleCodeKeyDown = (event, index) => {
    if (event.key === "Backspace") {
      event.preventDefault();
      const next = code.split("");
      const target = next[index]?.trim() ? index : Math.max(index - 1, 0);
      next[target] = " ";
      updateCode(next.join(""), target);
    } else if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      codeInputs.current[index - 1]?.focus();
    } else if (event.key === "ArrowRight" && index < 5) {
      event.preventDefault();
      codeInputs.current[index + 1]?.focus();
    }
  };

  const requestCode = async (event) => {
    event.preventDefault();
    setError("");
    if (!rollNo.trim() || !email.trim() || !phone.trim()) {
      setError("Enter your roll number, student email, and mobile number.");
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/student-auth/request-otp`, {
        rollNo: rollNo.trim(), email: email.trim(), phone: phone.trim(),
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
        rollNo: rollNo.trim(), email: email.trim(), phone: phone.trim(), challengeId, code,
      });
      localStorage.setItem("hits_token", response.data.token);
      localStorage.setItem("hits_student", JSON.stringify(response.data.student));
      navigate("/success");
    } catch (err) {
      setError(err.response?.data?.error || "Could not verify the code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) return <main className="login-screen"><p>Checking your session…</p></main>;

  return (
    <main className="login-screen">
      <section className="login-card" aria-labelledby="login-heading">
        <div className="login-mark" aria-hidden="true">H</div>
        <p className="login-eyebrow">HITS STUDENT ACCESS</p>
        <h1 id="login-heading">Sign in to HWB</h1>
        <p className="login-intro">
          {step === "details"
            ? "Use your roll number, matching university email, and mobile number to get a secure login code."
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
              placeholder="rollno@student.hindustanuniv.ac.in" value={email}
              onChange={(event) => setEmail(event.target.value)} required />

            <label htmlFor="mobileNumber">Mobile number for WhatsApp</label>
            <input id="mobileNumber" name="mobileNumber" type="tel" autoComplete="tel"
              placeholder="Your WhatsApp mobile number" value={phone}
              onChange={(event) => setPhone(event.target.value)} required />

            <button className="login-primary" type="submit" disabled={loading}>
              {loading ? "Sending code…" : "Send email code"}
            </button>
          </form>
        ) : (
          <form onSubmit={verifyCode} className="login-form">
            <label htmlFor="code-0">Six-digit code</label>
            <div className="login-code-boxes" role="group" aria-label="Six-digit email code" onPaste={handleCodePaste}>
              {Array.from({ length: 6 }, (_, index) => (
                <input key={index} id={`code-${index}`} ref={(element) => { codeInputs.current[index] = element; }}
                  className="login-code-box" type="text" inputMode="numeric" autoComplete={index === 0 ? "one-time-code" : "off"}
                  autoFocus={index === 0} maxLength={6} aria-label={`Code digit ${index + 1} of 6`}
                  value={code[index]?.trim() || ""} onChange={(event) => handleCodeChange(index, event.target.value)}
                  onKeyDown={(event) => handleCodeKeyDown(event, index)} />
              ))}
            </div>

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
