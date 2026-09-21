import { useState, useEffect, useCallback } from "react";
import { Eye, EyeOff, Clock, Shield, Send } from "lucide-react";

const ROLES = ["submitter", "reviewer", "admin"];
const STATUS_STEPS = ["Submitted", "Under review", "Actioned", "Closed"];

const STATUS_STYLES = {
  Submitted: "bg-blue-100 text-blue-800",
  "Under review": "bg-amber-100 text-amber-800",
  Actioned: "bg-emerald-100 text-emerald-800",
  Closed: "bg-slate-200 text-slate-700",
};

async function api(path, options = {}, role) {
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-role": role,
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Request failed");
  }
  return res.json();
}

function StatusBadge({ status }) {
  return (
    <span className={`text-xs font-medium px-3 py-1 rounded-full whitespace-nowrap ${STATUS_STYLES[status]}`}>
      {status}
    </span>
  );
}

function StatusTracker({ status }) {
  const currentIndex = STATUS_STEPS.indexOf(status);
  return (
    <div className="flex items-center gap-1 mt-3">
      {STATUS_STEPS.map((step, i) => (
        <div key={step} className="flex items-center flex-1">
          <div className={`h-1.5 flex-1 rounded-full ${i <= currentIndex ? "bg-slate-700" : "bg-slate-200"}`} />
        </div>
      ))}
    </div>
  );
}

function SubmitterView({ onSubmit }) {
  const [text, setText] = useState("");
  const [anon, setAnon] = useState(true);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [confirmedRef, setConfirmedRef] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!text.trim()) {
      setError("Enter a description first.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const ref = await onSubmit(text.trim(), anon, name.trim());
      setConfirmedRef(ref);
      setText("");
      setName("");
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 max-w-md">
      <p className="text-sm text-slate-500 mb-3">New suggestion</p>
      <textarea
        value={text}
        onChange={(e) => { setText(e.target.value); if (error) setError(""); }}
        placeholder="Describe the issue or idea"
        className="w-full min-h-24 p-3 border border-slate-200 rounded-lg text-sm mb-3 resize-y focus:outline-none focus:ring-2 focus:ring-slate-400"
      />
      <label className="flex items-center gap-2 text-sm text-slate-600 mb-3">
        <input type="checkbox" checked={anon} onChange={(e) => setAnon(e.target.checked)} className="w-4 h-4" />
        Submit anonymously
      </label>
      {!anon && (
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          className="w-full p-2.5 border border-slate-200 rounded-lg text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-slate-400"
        />
      )}
      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 disabled:opacity-60 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
      >
        <Send size={16} />
        {submitting ? "Submitting…" : "Submit suggestion"}
      </button>
      {confirmedRef && (
        <p className="text-sm text-emerald-700 mt-3">
          Received. Reference #{confirmedRef} — saved to the office system.
        </p>
      )}
    </div>
  );
}

function StaffView({ role, items, expandedId, setExpandedId, onStatusChange }) {
  const isAdmin = role === "admin";
  return (
    <div className="max-w-md">
      <p className="text-sm text-slate-500 mb-3">
        {isAdmin ? "All submissions — full access" : "Submissions — identities hidden unless disclosed"}
      </p>
      {items.length === 0 && (
        <p className="text-sm text-slate-400">No submissions yet.</p>
      )}
      <div className="space-y-3">
        {items.map((item) => {
          const isOpen = expandedId === item.id;
          const currentIndex = STATUS_STEPS.indexOf(item.status);
          const nextStatus = STATUS_STEPS[currentIndex + 1];
          return (
            <div key={item.id} className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="flex justify-between items-start gap-3">
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-800">{item.id}</p>
                  <p className="text-sm text-slate-600 mt-1 leading-relaxed">{item.text}</p>
                  <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                    {item.anon ? <EyeOff size={12} /> : <Eye size={12} />}
                    From: {item.who}
                  </p>
                </div>
                <StatusBadge status={item.status} />
              </div>
              <StatusTracker status={item.status} />
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => setExpandedId(isOpen ? null : item.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs text-slate-600 border border-slate-200 rounded-lg py-1.5 hover:bg-slate-50 transition-colors"
                >
                  <Clock size={12} />
                  {isOpen ? "Hide log" : "View log"}
                </button>
                {nextStatus && (
                  <button
                    onClick={() => onStatusChange(item.id, nextStatus)}
                    className="flex-1 text-xs text-white bg-slate-700 hover:bg-slate-800 rounded-lg py-1.5 transition-colors"
                  >
                    Mark {nextStatus.toLowerCase()}
                  </button>
                )}
              </div>
              {isOpen && (
                <div className="mt-2 pt-2 border-t border-slate-100 space-y-1.5">
                  {item.log.map((entry, i) => (
                    <div key={i} className="flex gap-3 text-xs">
                      <span className="text-slate-400 font-mono min-w-16">
                        {new Date(entry.t).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <span className="text-slate-600">{entry.a}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function SuggestionBox() {
  const [role, setRole] = useState("submitter");
  const [items, setItems] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [loadError, setLoadError] = useState("");

  const loadItems = useCallback(async () => {
    try {
      const data = await api("/suggestions", { method: "GET" }, role);
      setItems(data);
      setLoadError("");
    } catch (e) {
      setLoadError("Couldn't reach the server. Is it running?");
    }
  }, [role]);

  useEffect(() => { loadItems(); }, [loadItems]);

  const handleNewSubmission = async (text, anon, name) => {
    const { id } = await api("/suggestions", {
      method: "POST",
      body: JSON.stringify({ text, anon, submitter: name }),
    }, role);
    await loadItems();
    return id;
  };

  const handleStatusChange = async (id, status) => {
    try {
      await api(`/suggestions/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }, role);
      await loadItems();
    } catch (e) {
      setLoadError(e.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-2 mb-1">
          <Shield size={18} className="text-slate-700" />
          <h1 className="text-lg font-semibold text-slate-800">Secure suggestion system</h1>
        </div>
        <p className="text-sm text-slate-500 mb-5">Anonymous by default. Every action logged.</p>

        <div className="flex gap-2 mb-5">
          {ROLES.map((r) => (
            <button
              key={r}
              onClick={() => { setRole(r); setExpandedId(null); }}
              className={`flex-1 text-sm py-2 rounded-lg border transition-colors capitalize ${
                role === r ? "bg-slate-800 text-white border-slate-800" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        {loadError && <p className="text-sm text-red-600 mb-3">{loadError}</p>}

        {role === "submitter" ? (
          <SubmitterView onSubmit={handleNewSubmission} />
        ) : (
          <StaffView
            role={role}
            items={items}
            expandedId={expandedId}
            setExpandedId={setExpandedId}
            onStatusChange={handleStatusChange}
          />
        )}
      </div>
    </div>
  );
}
