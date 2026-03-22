"use client";

import { useEffect, useMemo, useState } from "react";

type Run = {
  id: string;
  repo: string;
  task: string;
  status: string;
  current_step: string;
  pending_approval: string | null;
  branch?: string;
  updated_at?: string;
};

type EventItem = {
  ts: string;
  actor: string;
  type: string;
  summary: string;
};

type ArtifactItem = {
  name: string;
  url: string;
};

type CapabilityResult = {
  capability: string;
  required_servers: string[];
  available_servers: string[];
  missing_servers: string[];
  can_use_mcp: boolean;
  codex_snippets?: Record<string, string>;
  claude_snippets?: Record<string, string>;
  fallback_offline_target?: string;
};

type OfflinePlanResult = {
  target: string;
  command: string;
  script: string;
  seeds: string;
  out: string;
  args: string[];
};

type ApiError = {
  success?: false;
  error?: {
    code?: string;
    message?: string;
  };
};

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...init
  });

  const isJson = (response.headers.get("content-type") || "").includes("application/json");
  const body = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const msg = typeof body === "string"
      ? body
      : (body as ApiError)?.error?.message || `Request failed (${response.status})`;
    throw new Error(msg);
  }

  return body as T;
}

const styles = {
  page: {
    maxWidth: 1120,
    margin: "0 auto",
    padding: 24,
    fontFamily: "Inter, Segoe UI, Arial, sans-serif"
  } as const,
  title: { marginBottom: 4 } as const,
  subtitle: { color: "#a7b3cc", marginTop: 0 } as const,
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: 16
  } as const,
  card: {
    border: "1px solid #2a3550",
    borderRadius: 12,
    padding: 16,
    background: "#111827"
  } as const,
  label: { display: "block", marginBottom: 6, fontWeight: 600 } as const,
  input: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #34415f",
    background: "#0b1220",
    color: "#e6ecff"
  } as const,
  textarea: {
    width: "100%",
    minHeight: 88,
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #34415f",
    background: "#0b1220",
    color: "#e6ecff",
    resize: "vertical" as const
  },
  row: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap" as const,
    marginTop: 10
  },
  button: {
    padding: "10px 14px",
    borderRadius: 8,
    border: "1px solid #3b4d72",
    background: "#15213a",
    color: "#e6ecff",
    cursor: "pointer"
  } as const,
  buttonPrimary: {
    padding: "10px 14px",
    borderRadius: 8,
    border: "none",
    background: "linear-gradient(90deg,#00d4ff,#7a35cc)",
    color: "#fff",
    cursor: "pointer"
  } as const,
  statusBox: {
    marginTop: 10,
    padding: 10,
    borderRadius: 8,
    border: "1px solid #34415f",
    background: "#0b1220",
    whiteSpace: "pre-wrap" as const,
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
    fontSize: 12
  },
  list: { paddingLeft: 18, margin: 0 } as const,
  eventsBox: {
    marginTop: 8,
    maxHeight: 360,
    overflow: "auto" as const,
    border: "1px solid #34415f",
    borderRadius: 8,
    background: "#0b1220",
    padding: 10,
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
    fontSize: 12,
    whiteSpace: "pre-wrap" as const
  }
};

export default function HomePage() {
  const [repo, setRepo] = useState("https://github.com/acme/app");
  const [task, setTask] = useState("Add careers form CV validation for PDF and DOCX only");
  const [branch, setBranch] = useState("feat/demo-cv-validation");
  const [runId, setRunId] = useState("");
  const [approveStep, setApproveStep] = useState("plan");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [run, setRun] = useState<Run | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [artifacts, setArtifacts] = useState<ArtifactItem[]>([]);
  const [createStatus, setCreateStatus] = useState("");
  const [error, setError] = useState("");

  const [capabilityName, setCapabilityName] = useState("xai docs");
  const [capabilityResult, setCapabilityResult] = useState<CapabilityResult | null>(null);
  const [offlineTarget, setOfflineTarget] = useState("business-docs");
  const [offlinePlanResult, setOfflinePlanResult] = useState<OfflinePlanResult | null>(null);
  const [copyStatus, setCopyStatus] = useState("");

  const eventsText = useMemo(() => {
    if (!events.length) return "No events yet.";
    return events.map((e) => `[${e.ts}] ${e.actor} :: ${e.type} :: ${e.summary}`).join("\n");
  }, [events]);

  async function refreshRun(targetRunId?: string) {
    const id = (targetRunId || runId).trim();
    if (!id) return;

    const [runRes, eventsRes, artifactsRes] = await Promise.all([
      api<{ success: true; run: Run }>(`/api/mvp/runs/${encodeURIComponent(id)}`),
      api<{ success: true; events: EventItem[] }>(`/api/mvp/runs/${encodeURIComponent(id)}/events`),
      api<{ success: true; artifacts: ArtifactItem[] }>(`/api/mvp/runs/${encodeURIComponent(id)}/artifacts`)
    ]);

    setRun(runRes.run);
    setEvents(eventsRes.events || []);

    const normalizedArtifacts = (artifactsRes.artifacts || []).map((item) => ({
      ...item,
      url: item.url.startsWith("/api/") ? `/api/mvp${item.url.slice(4)}` : item.url
    }));
    setArtifacts(normalizedArtifacts);

    if (runRes.run.pending_approval) {
      setApproveStep(runRes.run.pending_approval);
    }
  }

  async function onCreateRun() {
    setError("");
    setCreateStatus("");

    try {
      const res = await api<{ success: true; run: Run }>("/api/mvp/runs", {
        method: "POST",
        body: JSON.stringify({ repo, task, branch, mode: "demo" })
      });

      setRunId(res.run.id);
      setCreateStatus(
        JSON.stringify(
          {
            success: true,
            run_id: res.run.id,
            status: res.run.status,
            next_action: `approve: ${res.run.pending_approval}`
          },
          null,
          2
        )
      );
      await refreshRun(res.run.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create run");
    }
  }

  async function onApprove() {
    setError("");
    if (!runId.trim()) {
      setError("Run ID is required.");
      return;
    }

    try {
      await api(`/api/mvp/runs/${encodeURIComponent(runId.trim())}/approve`, {
        method: "POST",
        body: JSON.stringify({ step: approveStep, approved_by: "demo-ui" })
      });
      await refreshRun();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Approval failed");
    }
  }

  async function onCheckCapability() {
    setError("");
    setOfflinePlanResult(null);
    setCopyStatus("");

    try {
      const res = await api<{ success: true; capability: CapabilityResult }>("/api/mvp/capabilities/check", {
        method: "POST",
        body: JSON.stringify({ capability: capabilityName })
      });
      setCapabilityResult(res.capability);

      if (res.capability.fallback_offline_target) {
        setOfflineTarget(res.capability.fallback_offline_target);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Capability check failed");
    }
  }

  async function onGenerateOfflinePlan() {
    setError("");

    try {
      const res = await api<{ success: true; plan: OfflinePlanResult }>("/api/mvp/offline-reference/plan", {
        method: "POST",
        body: JSON.stringify({ target: offlineTarget, manual_login: true, headless: false })
      });
      setOfflinePlanResult(res.plan);
      setCopyStatus("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Offline reference plan failed");
    }
  }
  async function onCopyOfflineCommand() {
    if (!offlinePlanResult?.command) return;

    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(offlinePlanResult.command);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = offlinePlanResult.command;
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopyStatus("Copied offline command to clipboard.");
    } catch {
      setCopyStatus("Copy failed. Select and copy the command manually.");
    }
  }
  useEffect(() => {
    if (!autoRefresh || !runId.trim()) return;

    const timer = setInterval(() => {
      refreshRun().catch((err) => {
        setError(err instanceof Error ? err.message : "Auto refresh failed");
      });
    }, 3000);

    return () => clearInterval(timer);
  }, [autoRefresh, runId]);

  return (
    <main style={styles.page}>
      <h1 style={styles.title}>365Soft Labs HITL Demo</h1>
      <p style={styles.subtitle}>
        Connected to local MVP API through Next.js proxy route <code>/api/mvp/*</code>.
      </p>

      {error ? <div style={{ ...styles.statusBox, borderColor: "#7a2c48" }}>{error}</div> : null}

      <section style={styles.grid}>
        <div style={styles.card}>
          <h2>Create Run</h2>
          <label style={styles.label}>Repository URL</label>
          <input style={styles.input} value={repo} onChange={(e) => setRepo(e.target.value)} />

          <label style={{ ...styles.label, marginTop: 10 }}>Task</label>
          <textarea style={styles.textarea} value={task} onChange={(e) => setTask(e.target.value)} />

          <label style={{ ...styles.label, marginTop: 10 }}>Branch</label>
          <input style={styles.input} value={branch} onChange={(e) => setBranch(e.target.value)} />

          <div style={styles.row}>
            <button style={styles.buttonPrimary} onClick={onCreateRun}>Start Run</button>
          </div>

          {createStatus ? <div style={styles.statusBox}>{createStatus}</div> : null}
        </div>

        <div style={styles.card}>
          <h2>Run Control</h2>
          <label style={styles.label}>Run ID</label>
          <input style={styles.input} value={runId} onChange={(e) => setRunId(e.target.value)} placeholder="run_xxx" />

          <div style={styles.row}>
            <button style={styles.button} onClick={() => refreshRun().catch((err) => setError(err.message))}>Refresh</button>
            <button style={styles.button} onClick={() => setAutoRefresh((v) => !v)}>
              Auto Refresh: {autoRefresh ? "On" : "Off"}
            </button>
          </div>

          <label style={{ ...styles.label, marginTop: 10 }}>Approve Step</label>
          <select style={styles.input} value={approveStep} onChange={(e) => setApproveStep(e.target.value)}>
            <option value="plan">plan</option>
            <option value="apply_patch">apply_patch</option>
            <option value="pr">pr</option>
          </select>

          <div style={styles.row}>
            <button style={styles.buttonPrimary} onClick={onApprove}>Approve Selected Step</button>
          </div>
        </div>

        <div style={styles.card}>
          <h2>Capability Preflight</h2>
          <label style={styles.label}>Capability</label>
          <input
            style={styles.input}
            value={capabilityName}
            onChange={(e) => setCapabilityName(e.target.value)}
            placeholder="xai docs"
          />

          <div style={styles.row}>
            <button style={styles.buttonPrimary} onClick={onCheckCapability}>Check MCP Availability</button>
          </div>

          {capabilityResult ? (
            <div style={styles.statusBox}>
              {JSON.stringify(
                {
                  capability: capabilityResult.capability,
                  required_servers: capabilityResult.required_servers,
                  available_servers: capabilityResult.available_servers,
                  missing_servers: capabilityResult.missing_servers,
                  can_use_mcp: capabilityResult.can_use_mcp
                },
                null,
                2
              )}
            </div>
          ) : null}

          {!capabilityResult?.can_use_mcp ? (
            <>
              <label style={{ ...styles.label, marginTop: 10 }}>Offline Reference Target</label>
              <select style={styles.input} value={offlineTarget} onChange={(e) => setOfflineTarget(e.target.value)}>
                <option value="business-docs">business-docs</option>
                <option value="developer-docs">developer-docs</option>
              </select>

              <div style={styles.row}>
                <button style={styles.button} onClick={onGenerateOfflinePlan}>Generate Offline Build Command</button>
              </div>
            </>
          ) : null}

          {offlinePlanResult ? (
            <div style={styles.statusBox}>{offlinePlanResult.command}</div>
          ) : null}

          {offlinePlanResult ? (
            <div style={styles.row}>
              <button style={styles.button} onClick={onCopyOfflineCommand}>Copy Command</button>
              {copyStatus ? <span style={{ color: "#9cc4ff", fontSize: 12 }}>{copyStatus}</span> : null}
            </div>
          ) : null}

          {capabilityResult && capabilityResult.missing_servers.length > 0 ? (
            <div style={styles.statusBox}>
              {JSON.stringify(
                {
                  codex_snippets: capabilityResult.codex_snippets || {},
                  claude_snippets: capabilityResult.claude_snippets || {}
                },
                null,
                2
              )}
            </div>
          ) : null}
        </div>

        <div style={styles.card}>
          <h2>Current Run</h2>
          {!run ? <p style={{ color: "#a7b3cc" }}>No run loaded.</p> : (
            <div>
              <p><b>Status:</b> {run.status}</p>
              <p><b>Current Step:</b> {run.current_step}</p>
              <p><b>Pending Approval:</b> {run.pending_approval || "none"}</p>
              <p><b>Repo:</b> <code>{run.repo}</code></p>
              <p><b>Task:</b> {run.task}</p>
              {run.updated_at ? <p><b>Updated:</b> {run.updated_at}</p> : null}
            </div>
          )}
        </div>

        <div style={styles.card}>
          <h2>Artifacts</h2>
          {!artifacts.length ? <p style={{ color: "#a7b3cc" }}>No artifacts yet.</p> : (
            <ul style={styles.list}>
              {artifacts.map((artifact) => (
                <li key={artifact.name}>
                  <a href={artifact.url} target="_blank" rel="noopener noreferrer">{artifact.name}</a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section style={{ ...styles.card, marginTop: 16 }}>
        <h2>Event Timeline</h2>
        <div style={styles.eventsBox}>{eventsText}</div>
      </section>
    </main>
  );
}





