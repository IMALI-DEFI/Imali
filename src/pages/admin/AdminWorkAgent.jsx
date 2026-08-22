import React, { useCallback, useEffect, useState } from "react";
import {
  FaBriefcase,
  FaCheckCircle,
  FaDollarSign,
  FaEnvelope,
  FaExternalLinkAlt,
  FaSyncAlt,
  FaUserTie,
} from "react-icons/fa";

import BotAPI from "../../utils/BotAPI";
import "./AdminWorkAgent.css";

const money = (value) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

export default function AdminWorkAgent() {
  const [overview, setOverview] = useState(null);
  const [opportunities, setOpportunities] = useState([]);
  const [reviewOpportunities, setReviewOpportunities] = useState([]);
  const [securityRewards, setSecurityRewards] = useState([]);
  const [procurementOpportunities, setProcurementOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [
        overviewResponse,
        opportunitiesResponse,
        reviewResponse,
        securityRewardsResponse,
        procurementResponse,
      ] = await Promise.all([
        BotAPI.getWorkAgentOverview(),
        BotAPI.getWorkAgentOpportunities({
          execution: "ready",
          limit: 100,
        }),
        BotAPI.getWorkAgentOpportunities({
          execution: "review",
          limit: 100,
        }),
        BotAPI.getWorkAgentSecurityRewards(),
        BotAPI.getWorkAgentProcurement(),
      ]);

      const overviewData =
        overviewResponse?.data || overviewResponse;

      const opportunitiesData =
        opportunitiesResponse?.data || opportunitiesResponse;

      const reviewData =
        reviewResponse?.data || reviewResponse;

      const securityRewardsData =
        securityRewardsResponse?.data ||
        securityRewardsResponse;

      const procurementData =
        procurementResponse?.data ||
        procurementResponse;

      setOverview(overviewData);

      setOpportunities(
        opportunitiesData?.opportunities || []
      );

      setReviewOpportunities(
        reviewData?.opportunities || []
      );

      setSecurityRewards(
        securityRewardsData?.findings || []
      );

      setProcurementOpportunities(
        procurementData?.opportunities || []
      );
    } catch (err) {
      console.error("Work Agent load error:", err);

      setError(
        err?.response?.data?.error ||
        err?.message ||
        "Unable to load Work Agent."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const action = async (
    id,
    endpoint,
    body = {}
  ) => {
    try {
      setBusyId(id);

      const actionMap = {
        "approve-application": () =>
          BotAPI.approveWorkAgentApplication(id),

        applied: () =>
          BotAPI.markWorkAgentApplied(id),

        "approve-outreach": () =>
          BotAPI.approveWorkAgentOutreach(id),

        "outreach-sent": () =>
          BotAPI.markWorkAgentOutreachSent(id),

        reply: () =>
          BotAPI.recordWorkAgentReply(
            id,
            body.notes || ""
          ),

        interview: () =>
          BotAPI.markWorkAgentInterview(id),

        proposal: () =>
          BotAPI.markWorkAgentProposal(
            id,
            body.value || 0
          ),

        won: () =>
          BotAPI.markWorkAgentWon(
            id,
            body.revenue || 0,
            body.cost || 0
          ),

        lost: () =>
          BotAPI.markWorkAgentLost(
            id,
            body.reason || ""
          ),
      };

      const actionFn =
        actionMap[endpoint];

      if (!actionFn) {
        throw new Error(
          `Unsupported Work Agent action: ${endpoint}`
        );
      }

      await actionFn();

      await load();
    } catch (err) {
      console.error(err);

      alert(
        err?.response?.data?.error ||
        err?.message ||
        "Action failed"
      );
    } finally {
      setBusyId(null);
    }
  };

  const counts = overview?.counts || {};
  const financial = overview?.financial || {};
  const execution = overview?.execution || {};
  const delegation = overview?.delegation || {};
  const managedDelivery = overview?.managedDelivery || {};
  const security = overview?.security || {};

  if (loading && !overview) {
    return (
      <div className="admin-work-agent">
        <div className="wa-loading">
          <FaSyncAlt className="spin" />
          Loading Work Agent...
        </div>
      </div>
    );
  }

  return (
    <div className="admin-work-agent">
      <div className="wa-header">
        <div>
          <h1>Work Agent</h1>
          <p>
            Developer opportunities, applications,
            outreach and revenue pipeline.
          </p>
        </div>

        <button
          className="wa-button"
          onClick={load}
        >
          <FaSyncAlt />
          Refresh
        </button>
      </div>

      {error && (
        <div className="wa-error">
          {error}
        </div>
      )}

      <div className="wa-cards">
        <Metric
          icon={<FaBriefcase />}
          label="Pursuit Queue"
          value={counts.pursuitQueue}
        />

        <Metric
          icon={<FaCheckCircle />}
          label="Autonomous Ready"
          value={execution.autonomousReady}
        />

        <Metric
          icon={<FaUserTie />}
          label="Applications Sent"
          value={counts.applicationsSent}
        />

        <Metric
          icon={<FaEnvelope />}
          label="Outreach Sent"
          value={counts.outreachSent}
        />

        <Metric
          icon={<FaEnvelope />}
          label="Replies"
          value={counts.replies}
        />

        <Metric
          icon={<FaUserTie />}
          label="Interviews"
          value={counts.interviews}
        />

        <Metric
          icon={<FaCheckCircle />}
          label="Won"
          value={counts.won}
        />

        <Metric
          icon={<FaDollarSign />}
          label="Pipeline Value"
          value={money(
            financial.estimatedRevenue
          )}
        />
      </div>

      <div className="wa-cards">
        <Metric
          icon={<FaBriefcase />}
          label="Subcontractable"
          value={delegation.subcontractable}
        />

        <Metric
          icon={<FaBriefcase />}
          label="Delegation Review"
          value={delegation.needsVerification}
        />

        <Metric
          icon={<FaUserTie />}
          label="Referrals"
          value={delegation.referrals}
        />

        <Metric
          icon={<FaDollarSign />}
          label="Managed Contracts"
          value={managedDelivery.contracts}
        />

        <Metric
          icon={<FaBriefcase />}
          label="Security Findings"
          value={security.findings}
        />

        <Metric
          icon={<FaCheckCircle />}
          label="Reports Ready"
          value={security.reportsReady}
        />

        <Metric
          icon={<FaEnvelope />}
          label="Reports Submitted"
          value={security.reportsSubmitted}
        />

        <Metric
          icon={<FaDollarSign />}
          label="Security Rewards"
          value={money(security.actualRewards)}
        />
      </div>

      <div className="wa-money">
        <Money
          label="Estimated Revenue"
          value={financial.estimatedRevenue}
        />

        <Money
          label="Estimated Margin"
          value={financial.estimatedMargin}
        />

        <Money
          label="Actual Revenue"
          value={financial.actualRevenue}
        />

        <Money
          label="Actual Margin"
          value={financial.actualMargin}
        />
      </div>

      <div className="wa-review-summary">
        <div className="wa-review-heading">
          <div>
            <strong>Needs Review</strong>
            <p>
              Opportunities held back from execution until
              eligibility or application target is verified.
            </p>
          </div>

          <span className="wa-review-total">
            {reviewOpportunities.length}
          </span>
        </div>

        <div className="wa-review-stats">
          <div>
            <b>{counts.eligibilityReview || 0}</b>
            <span>Eligibility</span>
          </div>

          <div>
            <b>{counts.targetReview || 0}</b>
            <span>Target Review</span>
          </div>

          <div>
            <b>{execution.autonomousReady || 0}</b>
            <span>Autonomous Ready</span>
          </div>
        </div>
      </div>

      <div className="wa-review-summary">
        <div className="wa-review-heading">
          <div>
            <strong>Human Handoff</strong>
            <p>
              Applications requiring interaction before the
              agent can continue safely.
            </p>
          </div>

          <span className="wa-review-total">
            {execution.humanHandoff || 0}
          </span>
        </div>

        <div className="wa-review-stats">
          <div>
            <b>{execution.captchaRequired || 0}</b>
            <span>CAPTCHA</span>
          </div>

          <div>
            <b>{execution.authRequired || 0}</b>
            <span>Login</span>
          </div>

          <div>
            <b>{execution.referenceRequired || 0}</b>
            <span>Reference</span>
          </div>

          <div>
            <b>{execution.phoneRequired || 0}</b>
            <span>Phone Required</span>
          </div>

          <div>
            <b>{managedDelivery.payoutsReady || 0}</b>
            <span>Payouts Ready</span>
          </div>

          <div>
            <b>{security.reportsApproved || 0}</b>
            <span>Reward Reports Approved</span>
          </div>
        </div>
      </div>

      {reviewOpportunities.length > 0 && (
        <div className="wa-panel wa-review-panel">
          <div className="wa-panel-title">
            <div>
              <h2>Needs Review</h2>
              <span>
                Opportunities blocked from execution until
                eligibility and target verification pass.
              </span>
            </div>

            <span>
              {reviewOpportunities.length} opportunities
            </span>
          </div>

          <div className="wa-review-list">
            {reviewOpportunities.map((item) => {
              const target =
                item.application_url ||
                item.application_email ||
                item.outreach_contact_email ||
                item.url;

              return (
                <div
                  className="wa-review-item"
                  key={`review-${item.id}`}
                >
                  <div className="wa-review-main">
                    <div className="wa-review-priority">
                      {item.pursuit_priority || 0}
                    </div>

                    <div>
                      <strong>
                        {item.company || "Unknown company"}
                      </strong>

                      <div className="wa-review-role">
                        {item.title || "Untitled opportunity"}
                      </div>

                      <div className="wa-review-meta">
                        <span>
                          Path: {item.revenue_path || "—"}
                        </span>

                        <span>
                          P/B/D: {item.personal_fit || 0}/
                          {item.business_value || 0}/
                          {item.demand_confidence || 0}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="wa-review-checks">
                    <div>
                      <span>Eligibility</span>
                      <strong>
                        {item.eligibility_status || "unchecked"}
                      </strong>
                      {item.eligibility_reason && (
                        <small>
                          {item.eligibility_reason}
                        </small>
                      )}
                    </div>

                    <div>
                      <span>Target</span>
                      <strong>
                        {item.target_quality_status || "unchecked"}
                      </strong>
                      {item.target_quality_reason && (
                        <small>
                          {item.target_quality_reason}
                        </small>
                      )}
                    </div>
                  </div>

                  <div className="wa-review-action">
                    {target ? (
                      target.startsWith("http") ? (
                        <a
                          className="wa-action-link"
                          href={target}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Inspect
                          <FaExternalLinkAlt />
                        </a>
                      ) : (
                        <span>{target}</span>
                      )
                    ) : (
                      <span>No target</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="wa-panel">
        <div className="wa-panel">
        <div className="wa-panel-title">
          <div>
            <h2>Security Rewards</h2>
            <span>
              Authorized security findings, AI-prepared reports,
              submissions and bounty results.
            </span>
          </div>

          <span>
            {securityRewards.length} findings
          </span>
        </div>

        {securityRewards.length === 0 ? (
          <div className="wa-empty">
            No security findings recorded yet.
          </div>
        ) : (
          <div className="wa-table-wrap">
            <table className="wa-table">
              <thead>
                <tr>
                  <th>Finding</th>
                  <th>Severity</th>
                  <th>Confidence</th>
                  <th>Quality</th>
                  <th>Estimated Reward</th>
                  <th>Status</th>
                  <th>Actual Reward</th>
                  <th>Report</th>
                </tr>
              </thead>

              <tbody>
                {securityRewards.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>
                        {item.report_title ||
                          item.title ||
                          `Finding ${item.id}`}
                      </strong>

                      {item.report_summary && (
                        <div className="wa-subtext">
                          {item.report_summary}
                        </div>
                      )}
                    </td>

                    <td>
                      {item.severity || "—"}
                    </td>

                    <td>
                      {item.confidence != null
                        ? `${item.confidence}%`
                        : "—"}
                    </td>

                    <td>
                      {item.report_quality_score != null
                        ? `${item.report_quality_score}%`
                        : "—"}
                    </td>

                    <td>
                      {money(item.estimated_reward)}
                    </td>

                    <td>
                      {item.paid_at
                        ? "Paid"
                        : item.accepted_at
                        ? "Accepted"
                        : item.submitted_at
                        ? "Submitted"
                        : item.approved_for_submission
                        ? "Approved"
                        : item.submission_ready
                        ? "Ready for Review"
                        : item.report_status ||
                          item.status ||
                          "Draft"}
                    </td>

                    <td>
                      {money(item.actual_reward)}
                    </td>

                    <td>
                      {item.report_url ? (
                        <a
                          href={item.report_url}
                          target="_blank"
                          rel="noreferrer"
                          className="wa-link"
                        >
                          Open
                          <FaExternalLinkAlt />
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="wa-panel-title">
          <h2>Ready to Execute</h2>
          <span>
            {opportunities.length} opportunities
          </span>
        </div>

        <div className="wa-table-wrap">
          <table className="wa-table">
            <thead>
              <tr>
                <th>Priority</th>
                <th>Company</th>
                <th>Role</th>
                <th>Path</th>
                <th>P/B/D</th>
                <th>Status</th>
                <th>Target</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {opportunities.map((item) => {
                const target =
                  item.application_url ||
                  item.application_email ||
                  item.outreach_contact_email;

                const employment =
                  item.revenue_path ===
                  "employment";

                return (
                  <tr key={item.id}>
                    <td>
                      <strong>
                        {item.pursuit_priority}
                      </strong>
                    </td>

                    <td>
                      {item.company || "—"}
                    </td>

                    <td>
                      {item.title}
                    </td>

                    <td>
                      {item.revenue_path}
                    </td>

                    <td>
                      {item.personal_fit}/
                      {item.business_value}/
                      {item.demand_confidence}
                    </td>

                    <td>
                      {item.pipeline_stage ||
                        item.execution_status}
                    </td>

                    <td>
                      {target ? (
                        target.startsWith("http")
                          ? (
                            <a
                              href={target}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Open{" "}
                              <FaExternalLinkAlt />
                            </a>
                          )
                          : target
                      ) : "—"}
                    </td>

                    <td>
                      <div className="wa-actions">
                        {employment ? (
                          <>
                            {[
                              "applied",
                              "submitted"
                            ].includes(
                              item.application_status
                            ) ? (
                              <span className="wa-done">
                                ✓ Applied
                              </span>
                            ) : item.application_status ===
                                "approved" ? (
                              <>
                                {target &&
                                  target.startsWith(
                                    "http"
                                  ) && (
                                    <a
                                      className="wa-action-link"
                                      href={target}
                                      target="_blank"
                                      rel="noreferrer"
                                    >
                                      Apply
                                      <FaExternalLinkAlt />
                                    </a>
                                  )}

                                {target &&
                                  !target.startsWith(
                                    "http"
                                  ) && (
                                    <span className="wa-ready">
                                      Ready to send
                                    </span>
                                  )}

                                <button
                                  disabled={
                                    busyId === item.id
                                  }
                                  onClick={() =>
                                    action(
                                      item.id,
                                      "applied"
                                    )
                                  }
                                >
                                  Mark Applied
                                </button>
                              </>
                            ) : (
                              <button
                                disabled={
                                  busyId === item.id
                                }
                                onClick={() =>
                                  action(
                                    item.id,
                                    "approve-application"
                                  )
                                }
                              >
                                Approve
                              </button>
                            )}
                          </>
                        ) : (
                          <>
                            {item.outreach_status ===
                            "sent" ? (
                              <span className="wa-done">
                                ✓ Outreach Sent
                              </span>
                            ) : item.outreach_status ===
                              "approved_email" ? (
                              <>
                                {target && (
                                  <span className="wa-ready">
                                    Ready to send
                                  </span>
                                )}

                                <button
                                  disabled={
                                    busyId === item.id
                                  }
                                  onClick={() =>
                                    action(
                                      item.id,
                                      "outreach-sent"
                                    )
                                  }
                                >
                                  Mark Sent
                                </button>
                              </>
                            ) : (
                              <button
                                disabled={
                                  busyId === item.id
                                }
                                onClick={() =>
                                  action(
                                    item.id,
                                    "approve-outreach"
                                  )
                                }
                              >
                                Approve
                              </button>
                            )}
                          </>
                        )}
                        {(item.application_status === "applied" ||
                          item.application_status === "submitted" ||
                          item.outreach_status === "sent") &&
                          item.pipeline_stage !== "won" &&
                          item.pipeline_stage !== "lost" && (
                            <>
                              {item.response_status !== "replied" &&
                                item.pipeline_stage !== "interview" &&
                                item.pipeline_stage !== "proposal" && (
                                  <button
                                    disabled={busyId === item.id}
                                    onClick={() => {
                                      const notes =
                                        window.prompt(
                                          "Reply notes (optional):",
                                          ""
                                        );

                                      if (notes !== null) {
                                        action(
                                          item.id,
                                          "reply",
                                          { notes }
                                        );
                                      }
                                    }}
                                  >
                                    Record Reply
                                  </button>
                                )}

                              {(item.response_status === "replied" ||
                                item.pipeline_stage === "replied") &&
                                item.pipeline_stage !== "interview" &&
                                item.pipeline_stage !== "proposal" && (
                                  <button
                                    disabled={busyId === item.id}
                                    onClick={() =>
                                      action(
                                        item.id,
                                        "interview"
                                      )
                                    }
                                  >
                                    Interview
                                  </button>
                                )}

                              {item.pipeline_stage === "interview" && (
                                <button
                                  disabled={busyId === item.id}
                                  onClick={() => {
                                    const raw =
                                      window.prompt(
                                        "Proposal / expected value:",
                                        String(
                                          item.estimated_revenue || 0
                                        )
                                      );

                                    if (raw !== null) {
                                      action(
                                        item.id,
                                        "proposal",
                                        {
                                          value:
                                            Number(raw) || 0
                                        }
                                      );
                                    }
                                  }}
                                >
                                  Proposal
                                </button>
                              )}

                              {item.pipeline_stage === "proposal" && (
                                <button
                                  disabled={busyId === item.id}
                                  onClick={() => {
                                    const revenue =
                                      window.prompt(
                                        "Actual revenue:",
                                        String(
                                          item.estimated_revenue || 0
                                        )
                                      );

                                    if (revenue === null) return;

                                    const cost =
                                      window.prompt(
                                        "Actual cost:",
                                        String(
                                          item.estimated_cost || 0
                                        )
                                      );

                                    if (cost === null) return;

                                    action(
                                      item.id,
                                      "won",
                                      {
                                        revenue:
                                          Number(revenue) || 0,
                                        cost:
                                          Number(cost) || 0
                                      }
                                    );
                                  }}
                                >
                                  Won
                                </button>
                              )}

                              <button
                                disabled={busyId === item.id}
                                onClick={() => {
                                  const reason =
                                    window.prompt(
                                      "Reason lost:",
                                      ""
                                    );

                                  if (reason !== null) {
                                    action(
                                      item.id,
                                      "lost",
                                      { reason }
                                    );
                                  }
                                }}
                              >
                                Lost
                              </button>
                            </>
                          )}

                        {item.pipeline_stage === "won" && (
                          <span className="wa-done">
                            ✓ Won
                          </span>
                        )}

                        {item.pipeline_stage === "lost" && (
                          <span className="wa-lost">
                            Lost
                          </span>
                        )}

                      </div>
                    </td>
                  </tr>
                );
              })}

              {!opportunities.length && (
                <tr>
                  <td
                    colSpan="8"
                    className="wa-empty"
                  >
                    No execution-ready opportunities.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Metric({
  icon,
  label,
  value = 0,
}) {
  return (
    <div className="wa-card">
      <div className="wa-icon">
        {icon}
      </div>

      <div>
        <strong>
          {value || 0}
        </strong>

        <span>
          {label}
        </span>
      </div>
    </div>
  );
}

function Money({
  label,
  value,
}) {
  return (
    <div className="wa-money-card">
      <span>
        {label}
      </span>

      <strong>
        {money(value)}
      </strong>
    </div>
  );
}
