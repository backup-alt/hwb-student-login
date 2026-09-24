import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { WHATSAPP_CHAT_URL } from "../whatsapp";

function SuccessPage() {
  const [student, setStudent] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const stored = localStorage.getItem("hits_student");
    if (!stored) {
      navigate("/");
      return;
    }
    setStudent(JSON.parse(stored));
    if (sessionStorage.getItem("hits_open_whatsapp") === "1") {
      sessionStorage.removeItem("hits_open_whatsapp");
      window.location.assign(WHATSAPP_CHAT_URL);
    }
  }, [navigate]);

  if (!student) return null;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
          {/* Success Icon */}
          <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
            <svg
              className="w-10 h-10 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Login Successful!
          </h1>
          <p className="text-gray-500 mb-6">Welcome back to HITS</p>

          {/* Student Info Card */}
          <div className="bg-gradient-to-r from-primary-50 to-primary-100 border border-primary-200 rounded-xl p-5 mb-6">
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center">
                <span className="text-white text-lg font-bold">
                  {student.name ? student.name.charAt(0).toUpperCase() : "S"}
                </span>
              </div>
              <div className="text-left">
                <p className="font-semibold text-gray-800 text-lg">
                  {student.name || "Student"}
                </p>
                <p className="text-sm text-gray-500">
                  Roll No: {student.rollNo || student.rollNumber || student.username || "N/A"}
                </p>
              </div>
            </div>
          </div>

          <p className="text-gray-600 mb-6">
            Opening your chat with the <span className="font-semibold text-primary-600">HITS WhatsApp Bot</span>.
            If it does not open, use the button below.
          </p>

          {/* WhatsApp Button */}
          <a
              href={WHATSAPP_CHAT_URL}
              className="w-full py-3 px-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2 mb-3"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Open WhatsApp chat
          </a>

        </div>
      </div>
    </div>
  );
}

export default SuccessPage;
