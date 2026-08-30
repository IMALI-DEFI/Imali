import React, { useCallback, useEffect, useMemo, useState } from "react";

const API =
  process.env.REACT_APP_API_URL ||
  "https://api.imali-defi.com";

const ISSUE_ORDER = [
  "captcha",
  "auth",
  "reference",
  "eligibility",
  "target",
  "contact",
  "verification",
  "submission",
];

const SEVERITY = {
  captcha: "Action required",
  auth: "Action required",
  reference: "Review",
  eligibility: "Decision required",
  target: "Review",
  contact: "Research",
  verification: "Verify",
  submission: "Check first",
};

export default function HumanAttentionPanel() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("all");
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");

  const authHeaders = () => {
    const token = localStorage.getItem("token");

    return {
      "Content-Type": "application/json",
      ...(token
        ? { Authorization: `Bearer ${token}` }
        : {}),
    };
  };

  const load = useCallback(async () => {
    try {
      setError("");

      const r = await fetch(
        `${API}/api/admin/work-agent/human-attention`,
        {
          credentials: "include",
          headers: authHeaders(),
        }
      );

      const data = await r.json();

      if (!r.ok || data.success === false) {
        throw new Error(
          data.error || "Unable to load human attention queue"
        );
      }

      setItems(data.items || []);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    load();

    const timer = setInterval(load, 60000);
    return () => clearInterval(timer);
  }, [load]);

  const counts = useMemo(() => {
    const out = { all: items.length };

    items.forEach((x) => {
      out[x.issue_type] =
        (out[x.issue_type] || 0) + 1;
    });

    return out;
  }, [items]);

  const visible = useMemo(() => {
    if (filter === "all") return items;

    return items.filter(
      (x) => x.issue_type === filter
    );
  }, [items, filter]);

  async function act(item, action) {
    let note = "";

    if (
      action === "rejected" ||
      action === "reviewed"
    ) {
      note =
        window.prompt(
          "Optional note for this decision:"
        ) || "";
    }

    if (
      action === "approved" &&
      item.issue_type === "eligibility"
    ) {
      const ok = window.confirm(
        "Confirm that you reviewed the requirements and this opportunity is eligible?"
      );

      if (!ok) return;
    }

    setBusy(`${item.id}-${item.issue_type}`);

    try {
      const r = await fetch(
        `${API}/api/admin/work-agent/human-attention/${item.id}/action`,
        {
          method: "POST",
          credentials: "include",
          headers: authHeaders(),
          body: JSON.stringify({
            issue_type: item.issue_type,
            action,
            note,
          }),
        }
      );

      const data = await r.json();

      if (!r.ok || data.success === false) {
        throw new Error(
          data.error || "Action failed"
        );
      }

      if (action === "resolved") {
        setItems((current) =>
          current.filter(
            (x) =>
              !(
                x.id === item.id &&
                x.issue_type === item.issue_type
              )
          )
        );
      } else {
        await load();
      }
    } catch (e) {
      window.alert(e.message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <section style={{
      marginBottom: 32,
      padding: 20,
      border: "1px solid #ddd",
      borderRadius: 12,
    }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 16,
        alignItems: "center",
        flexWrap: "wrap",
      }}>
        <div>
          <h2 style={{ marginBottom: 4 }}>
            Human Attention
          </h2>

          <div style={{ opacity: 0.7 }}>
            IMALI handles the volume. These are the
            decisions that currently need you.
          </div>
        </div>

        <button onClick={load}>
          Refresh
        </button>
      </div>

      {error && (
        <div style={{
          marginTop: 16,
          padding: 12,
          border: "1px solid #c00",
          borderRadius: 8,
        }}>
          {error}
        </div>
      )}

      <div style={{
        display: "flex",
        gap: 8,
        flexWrap: "wrap",
        marginTop: 18,
        marginBottom: 18,
      }}>
        <button
          onClick={() => setFilter("all")}
          style={{
            fontWeight:
              filter === "all" ? 700 : 400
          }}
        >
          All ({counts.all || 0})
        </button>

        {ISSUE_ORDER.map((type) => (
          counts[type] ? (
            <button
              key={type}
              onClick={() => setFilter(type)}
              style={{
                fontWeight:
                  filter === type ? 700 : 400
              }}
            >
              {type.replace("_", " ")}
              {" "}
              ({counts[type]})
            </button>
          ) : null
        ))}
      </div>

      {visible.length === 0 ? (
        <div style={{
          padding: 24,
          textAlign: "center",
          opacity: 0.7,
        }}>
          No human action required in this category.
        </div>
      ) : (
        <div style={{
          display: "grid",
          gap: 12,
        }}>
          {visible.map((item) => {
            const key =
              `${item.id}-${item.issue_type}`;

            return (
              <div
                key={key}
                style={{
                  padding: 16,
                  border: "1px solid #ddd",
                  borderRadius: 10,
                }}
              >
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  flexWrap: "wrap",
                }}>
                  <div>
                    <strong>
                      {item.issue_title}
                    </strong>

                    <div style={{
                      fontSize: 12,
                      opacity: 0.65,
                      marginTop: 2,
                    }}>
                      {SEVERITY[item.issue_type]}
                    </div>
                  </div>

                  <div style={{ fontSize: 13 }}>
                    #{item.id}
                  </div>
                </div>

                <h3 style={{
                  marginTop: 12,
                  marginBottom: 4,
                }}>
                  {item.title || "Untitled opportunity"}
                </h3>

                <div style={{ opacity: 0.8 }}>
                  {item.company || "Unknown organization"}
                  {item.revenue_path
                    ? ` • ${item.revenue_path}`
                    : ""}
                </div>

                <div style={{
                  marginTop: 12,
                  padding: 12,
                  borderRadius: 8,
                  background: "rgba(127,127,127,.08)",
                }}>
                  <strong>Issue:</strong>{" "}
                  {item.issue_summary}

                  <div style={{ marginTop: 6 }}>
                    <strong>What you do:</strong>{" "}
                    {item.next_action}
                  </div>
                </div>

                {(item.estimated_revenue ||
                  item.estimated_margin) && (
                  <div style={{
                    display: "flex",
                    gap: 18,
                    marginTop: 10,
                    fontSize: 13,
                  }}>
                    {item.estimated_revenue && (
                      <span>
                        Revenue: $
                        {Number(
                          item.estimated_revenue
                        ).toLocaleString()}
                      </span>
                    )}

                    {item.estimated_margin && (
                      <span>
                        Margin: $
                        {Number(
                          item.estimated_margin
                        ).toLocaleString()}
                      </span>
                    )}
                  </div>
                )}

                <div style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  marginTop: 14,
                }}>
                  {item.target_url && (
                    <button
                      onClick={() =>
                        window.open(
                          item.target_url,
                          "_blank",
                          "noopener,noreferrer"
                        )
                      }
                    >
                      Open Target
                    </button>
                  )}

                  {item.issue_type ===
                    "eligibility" && (
                    <>
                      <button
                        disabled={busy === key}
                        onClick={() =>
                          act(item, "approved")
                        }
                      >
                        Approve Eligibility
                      </button>

                      <button
                        disabled={busy === key}
                        onClick={() =>
                          act(item, "rejected")
                        }
                      >
                        Not Eligible
                      </button>
                    </>
                  )}

                  <button
                    disabled={busy === key}
                    onClick={() =>
                      act(item, "reviewed")
                    }
                  >
                    Add Note
                  </button>

                  <button
                    disabled={busy === key}
                    onClick={() =>
                      act(item, "resolved")
                    }
                  >
                    Completed
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
