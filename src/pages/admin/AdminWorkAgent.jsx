import React, {
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react";

import {
  FaBriefcase,
  FaBuilding,
  FaChartLine,
  FaChevronDown,
  FaChevronRight,
  FaClipboardCheck,
  FaDollarSign,
  FaEnvelope,
  FaExclamationTriangle,
  FaGlobeAmericas,
  FaHandshake,
  FaLock,
  FaRedo,
  FaRobot,
  FaSearch,
  FaShieldAlt,
  FaTasks,
  FaTrophy,
  FaUserCheck,
  FaUsers
} from "react-icons/fa";

import BotAPI from "../../utils/BotAPI";
import "./AdminWorkAgent.css";


const money = (value) => {
  const n = Number(value || 0);

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(Number.isFinite(n) ? n : 0);
};


const num = (value) => {
  const n = Number(value || 0);

  return new Intl.NumberFormat("en-US").format(
    Number.isFinite(n) ? n : 0
  );
};


const pick = (...values) => {
  for (const value of values) {
    if (
      value !== undefined &&
      value !== null &&
      value !== ""
    ) {
      return value;
    }
  }

  return 0;
};


const unwrap = (response) => {
  if (!response) return {};

  if (
    response.data &&
    typeof response.data === "object"
  ) {
    if (
      response.data.data &&
      typeof response.data.data === "object"
    ) {
      return response.data.data;
    }

    return response.data;
  }

  return response;
};


const asArray = (value) => {
  if (Array.isArray(value)) return value;

  if (Array.isArray(value?.data)) return value.data;

  if (Array.isArray(value?.items)) return value.items;

  if (Array.isArray(value?.opportunities)) {
    return value.opportunities;
  }

  if (Array.isArray(value?.rows)) return value.rows;

  return [];
};


const normalizeStatus = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");


const getOpportunityStatus = (row) =>
  normalizeStatus(
    pick(
      row?.pursuit_status,
      row?.status,
      row?.application_status,
      row?.outreach_status,
      "discovered"
    )
  );


const getRevenue = (row) =>
  Number(
    pick(
      row?.actual_revenue,
      row?.estimated_revenue,
      row?.estimated_value,
      row?.revenue_estimate,
      row?.potential_revenue,
      0
    )
  ) || 0;


const storageKey = "imaliAdminWorkAgentSectionsV2";


const DEFAULT_SECTIONS = {
  health: true,
  funnel: true,
  attention: true,
  opportunities: true,
  revenue: true,
  procurement: true,
  recovery: true,
  outreach: false,
  automation: false,
  security: false
};


function loadSectionState() {
  try {
    const saved = JSON.parse(
      window.localStorage.getItem(storageKey) || "{}"
    );

    return {
      ...DEFAULT_SECTIONS,
      ...saved
    };
  } catch {
    return DEFAULT_SECTIONS;
  }
}


function MetricCard({
  icon,
  label,
  value,
  note,
  tone = "default"
}) {
  return (
    <div className={`wa-kpi wa-kpi-${tone}`}>
      <div className="wa-kpi-top">
        <span className="wa-kpi-icon">{icon}</span>
        <span className="wa-kpi-label">{label}</span>
      </div>

      <div className="wa-kpi-value">{value}</div>

      {note ? (
        <div className="wa-kpi-note">{note}</div>
      ) : null}
    </div>
  );
}


function StatusBadge({
  children,
  tone = "neutral"
}) {
  return (
    <span className={`wa-badge wa-badge-${tone}`}>
      {children}
    </span>
  );
}


function Collapsible({
  id,
  title,
  subtitle,
  icon,
  badge,
  sections,
  setSections,
  children
}) {
  const open = sections[id] !== false;

  return (
    <section className="wa-panel">
      <button
        type="button"
        className="wa-panel-header"
        onClick={() =>
          setSections((current) => ({
            ...current,
            [id]: !open
          }))
        }
        aria-expanded={open}
      >
        <div className="wa-panel-heading">
          <span className="wa-panel-icon">{icon}</span>

          <div>
            <div className="wa-panel-title-row">
              <h2>{title}</h2>

              {badge !== undefined && badge !== null ? (
                <span className="wa-panel-count">
                  {badge}
                </span>
              ) : null}
            </div>

            {subtitle ? (
              <p>{subtitle}</p>
            ) : null}
          </div>
        </div>

        <div className="wa-panel-toggle">
          <span>{open ? "Minimize" : "Expand"}</span>

          {open ? (
            <FaChevronDown />
          ) : (
            <FaChevronRight />
          )}
        </div>
      </button>

      {open ? (
        <div className="wa-panel-body">
          {children}
        </div>
      ) : null}
    </section>
  );
}


function EmptyState({ children }) {
  return (
    <div className="wa-empty">
      {children}
    </div>
  );
}


function LaneRows({ data = [] }) {
  if (!data.length) {
    return <EmptyState>No data yet.</EmptyState>;
  }

  return (
    <div className="wa-lane-list">
      {data.map(([name, count]) => (
        <div
          className="wa-lane-row"
          key={name}
        >
          <span>{name}</span>
          <strong>{num(count)}</strong>
        </div>
      ))}
    </div>
  );
}


function buildGroups(rows, field) {
  const map = {};

  rows.forEach((row) => {
    const value =
      row?.[field] ||
      row?.[field === "source" ? "source_name" : field] ||
      "Unknown";

    const key = String(value);

    map[key] = (map[key] || 0) + 1;
  });

  return Object.entries(map)
    .sort((a, b) => b[1] - a[1]);
}


export default function AdminWorkAgent() {
  const [overview, setOverview] = useState({});
  const [conversion, setConversion] = useState({});

  const [opportunities, setOpportunities] = useState([]);
  const [procurement, setProcurement] = useState([]);
  const [followups, setFollowups] = useState([]);
  const [securityRewards, setSecurityRewards] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [query, setQuery] = useState("");
  const [laneFilter, setLaneFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [sections, setSections] = useState(
    loadSectionState
  );


  useEffect(() => {
    window.localStorage.setItem(
      storageKey,
      JSON.stringify(sections)
    );
  }, [sections]);


  const [procurementSearch, setProcurementSearch] =
    useState("");

  const load = useCallback(async (silent = false) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const requests = [
        BotAPI.getWorkAgentOverview?.(),
        BotAPI.getWorkAgentConversion?.(),
        BotAPI.getWorkAgentOpportunities?.({
          limit: 500
        }),
        (
          BotAPI.getWorkAgentProcurement?.() ||
          BotAPI.getProcurementQueue?.()
        ),
        BotAPI.getWorkAgentFollowups?.(),
        BotAPI.getWorkAgentSecurityRewards?.()
      ];

      const results = await Promise.allSettled(
        requests
      );

      const [
        overviewResult,
        conversionResult,
        opportunityResult,
        procurementResult,
        followupResult,
        securityResult
      ] = results;

      if (overviewResult.status === "fulfilled") {
        setOverview(
          unwrap(overviewResult.value) || {}
        );
      }

      if (conversionResult.status === "fulfilled") {
        setConversion(
          unwrap(conversionResult.value) || {}
        );
      }

      if (
        opportunityResult.status === "fulfilled"
      ) {
        const payload = unwrap(
          opportunityResult.value
        );

        setOpportunities(
          asArray(payload)
        );
      }

      if (
        procurementResult.status === "fulfilled"
      ) {
        setProcurement(
          asArray(
            unwrap(procurementResult.value)
          )
        );
      }

      if (followupResult.status === "fulfilled") {
        setFollowups(
          asArray(
            unwrap(followupResult.value)
          )
        );
      }

      if (securityResult.status === "fulfilled") {
        setSecurityRewards(
          asArray(
            unwrap(securityResult.value)
          )
        );
      }

      const successful = results.filter(
        (result) => result.status === "fulfilled"
      ).length;

      if (successful === 0) {
        throw new Error(
          "All Work Agent API requests failed."
        );
      }

      if (successful < results.length) {
        setError(
          "Some Work Agent sections could not refresh. Available data is still shown."
        );
      }
    } catch (err) {
      setError(
        err?.message ||
        "Unable to load Work Agent."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);


  useEffect(() => {
    load(false);
  }, [load]);


  const filteredProcurement = useMemo(() => {
    const q = procurementSearch
      .trim()
      .toLowerCase();

    if (!q) {
      return procurement;
    }

    return procurement.filter((row) => {
      const haystack = [
        row?.title,
        row?.company,
        row?.agency,
        row?.source,
        row?.revenue_path,
        row?.opportunity_type,
        row?.procurement_status,
        row?.solicitation_number,
        row?.location
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [procurement, procurementSearch]);


  const summary = useMemo(() => {
    const s =
      overview?.summary ||
      overview?.metrics ||
      overview?.stats ||
      overview ||
      {};

    const c =
      conversion?.summary ||
      conversion?.conversion ||
      conversion?.funnel ||
      conversion?.metrics ||
      conversion ||
      {};

    const applicationReview = Number(
      pick(
        c.application_review,
        c.applicationReview,
        c.review,
        0
      )
    ) || 0;

    const resumeReady = Number(
      pick(
        c.resume_ready,
        c.resumeReady,
        0
      )
    ) || 0;

    const approved = Number(
      pick(
        c.approved,
        c.applications_approved,
        c.applicationsApproved,
        0
      )
    ) || 0;

    const conversionReady =
      applicationReview + resumeReady + approved;

    const total = Number(
      pick(
        s.total_opportunities,
        s.total,
        s.opportunities,
        opportunities.length
      )
    ) || opportunities.length;

    const queuedRows = opportunities.filter(
      (row) =>
        [
          "queued",
          "pursuit_queue",
          "pursuit"
        ].includes(getOpportunityStatus(row))
    );

    const readyRows = opportunities.filter(
      (row) =>
        [
          "ready",
          "final_ready",
          "approved",
          "application_ready"
        ].includes(getOpportunityStatus(row))
    );

    const sentRows = opportunities.filter(
      (row) =>
        [
          "sent",
          "applied",
          "outreach_sent",
          "submitted"
        ].includes(getOpportunityStatus(row))
    );

    const wonRows = opportunities.filter(
      (row) =>
        getOpportunityStatus(row) === "won"
    );

    const lostRows = opportunities.filter(
      (row) =>
        getOpportunityStatus(row) === "lost"
    );

    const estimatedFromRows =
      opportunities.reduce(
        (sum, row) =>
          sum +
          Number(
            pick(
              row?.estimated_revenue,
              row?.estimated_value,
              row?.potential_revenue,
              0
            )
          ),
        0
      );

    const actualFromRows =
      opportunities.reduce(
        (sum, row) =>
          sum +
          Number(row?.actual_revenue || 0),
        0
      );

    return {
      total,

      queued: Number(
        pick(
          c.pursuit_queue,
          c.pursuitQueue,
          c.queued,
          s.queued,
          s.pursuit_queue,
          s.pursuitQueue,
          queuedRows.length
        )
      ),

      ready: Number(
        pick(
          conversionReady > 0
            ? conversionReady
            : undefined,
          c.ready,
          c.final_ready,
          c.finalReady,
          s.ready,
          s.final_ready,
          s.finalReady,
          readyRows.length
        )
      ),

      sent: Number(
        pick(
          c.sent,
          c.applications_sent,
          c.applicationsSent,
          s.sent,
          s.applications_sent,
          s.applicationsSent,
          sentRows.length
        )
      ),

      won: Number(
        pick(
          c.won,
          c.wins,
          s.won,
          s.wins,
          wonRows.length
        )
      ),

      lost: Number(
        pick(
          s.lost,
          s.losses,
          lostRows.length
        )
      ),

      applicationReview,
      resumeReady,
      approved,

      estimatedPipeline: Number(
        pick(
          s.estimated_pipeline,
          s.estimated_revenue,
          s.pipeline_value,
          s.pipelineValue,
          estimatedFromRows
        )
      ),

      actualRevenue: Number(
        pick(
          s.actual_revenue,
          s.realized_revenue,
          s.revenue_received,
          actualFromRows
        )
      ),

      revenueEstimated: Number(
        pick(
          s.revenue_estimated,
          s.estimated_count,
          opportunities.filter(
            (row) =>
              Number(
                row?.estimated_revenue || 0
              ) > 0
          ).length
        )
      )
    };
  }, [overview, opportunities]);


  const recovery = useMemo(() => {
    const direct = overview?.recovery || {};

    const rows = opportunities.filter((row) => {
      const type = normalizeStatus(
        pick(
          row?.opportunity_type,
          row?.revenue_path,
          ""
        )
      );

      return type === "asset_recovery";
    });

    return {
      opportunities: Number(
        pick(
          direct.opportunities,
          direct.total,
          rows.length
        )
      ),

      states: Number(
        pick(
          direct.states,
          direct.states_tracked,
          51
        )
      ),

      enabledStates: Number(
        pick(
          direct.enabled_states,
          direct.enabled,
          0
        )
      ),

      verifiedStates: Number(
        pick(
          direct.verified_states,
          direct.verified,
          0
        )
      ),

      review: Number(
        pick(
          direct.review,
          direct.needs_review,
          rows.filter(
            (row) =>
              normalizeStatus(
                row?.compliance_status
              ) === "review"
          ).length
        )
      ),

      eligible: Number(
        pick(
          direct.eligible,
          rows.filter(
            (row) =>
              normalizeStatus(
                row?.compliance_status
              ) === "eligible"
          ).length
        )
      ),

      contactAllowed: Number(
        pick(
          direct.contact_allowed,
          direct.authorized_contacts,
          rows.filter(
            (row) =>
              row?.contact_allowed === true
          ).length
        )
      ),

      potentialFee: Number(
        pick(
          direct.potential_fee,
          direct.authorized_fee_pipeline,
          0
        )
      )
    };
  }, [overview, opportunities]);


  const system = useMemo(() => {
    return (
      overview?.system ||
      overview?.health ||
      {}
    );
  }, [overview]);


  const revenuePaths = useMemo(
    () =>
      overview?.lanes?.revenue_paths?.length
        ? overview.lanes.revenue_paths.map(
            (item) => [
              item.name,
              item.count
            ]
          )
        : buildGroups(
            opportunities,
            "revenue_path"
          ),
    [overview, opportunities]
  );


  const opportunityTypes = useMemo(
    () =>
      overview?.lanes?.opportunity_types?.length
        ? overview.lanes.opportunity_types.map(
            (item) => [
              item.name,
              item.count
            ]
          )
        : buildGroups(
            opportunities,
            "opportunity_type"
          ),
    [overview, opportunities]
  );


  const sources = useMemo(
    () =>
      overview?.lanes?.sources?.length
        ? overview.lanes.sources.map(
            (item) => [
              item.name,
              item.count
            ]
          )
        : buildGroups(
            opportunities,
            "source"
          ),
    [overview, opportunities]
  );


  const attentionRows = useMemo(() => {
    return opportunities
      .filter((row) => {
        const status = getOpportunityStatus(row);

        const needsReview =
          row?.needs_review === true ||
          normalizeStatus(
            row?.compliance_status
          ) === "review" ||
          [
            "needs_review",
            "human_review",
            "eligibility_review",
            "target_review",
            "final_ready",
            "ready"
          ].includes(status);

        return needsReview;
      })
      .sort((a, b) => {
        const aScore = Number(
          pick(
            a?.priority,
            a?.score,
            a?.personal_fit,
            0
          )
        );

        const bScore = Number(
          pick(
            b?.priority,
            b?.score,
            b?.personal_fit,
            0
          )
        );

        return bScore - aScore;
      })
      .slice(0, 30);
  }, [opportunities]);


  const laneOptions = useMemo(() => {
    const values = new Set();

    opportunities.forEach((row) => {
      const value =
        row?.revenue_path ||
        row?.opportunity_type;

      if (value) {
        values.add(String(value));
      }
    });

    return Array.from(values).sort();
  }, [opportunities]);


  const statusOptions = useMemo(() => {
    const values = new Set();

    opportunities.forEach((row) => {
      const value = getOpportunityStatus(row);

      if (value) {
        values.add(value);
      }
    });

    return Array.from(values).sort();
  }, [opportunities]);


  const visibleOpportunities = useMemo(() => {
    const q = query
      .trim()
      .toLowerCase();

    return opportunities
      .filter((row) => {
        if (laneFilter !== "all") {
          const lane =
            row?.revenue_path ||
            row?.opportunity_type ||
            "";

          if (String(lane) !== laneFilter) {
            return false;
          }
        }

        if (
          statusFilter !== "all" &&
          getOpportunityStatus(row) !==
            statusFilter
        ) {
          return false;
        }

        if (!q) return true;

        const haystack = [
          row?.title,
          row?.company,
          row?.source,
          row?.source_name,
          row?.location,
          row?.revenue_path,
          row?.opportunity_type,
          row?.pursuit_status,
          row?.business_reason
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return haystack.includes(q);
      })
      .slice(0, 200);
  }, [
    opportunities,
    query,
    laneFilter,
    statusFilter
  ]);


  const expandAll = () => {
    const next = {};

    Object.keys(DEFAULT_SECTIONS).forEach(
      (key) => {
        next[key] = true;
      }
    );

    setSections(next);
  };


  const minimizeAll = () => {
    const next = {};

    Object.keys(DEFAULT_SECTIONS).forEach(
      (key) => {
        next[key] = false;
      }
    );

    setSections(next);
  };


  if (loading) {
    return (
      <div className="wa-page">
        <div className="wa-loading-card">
          <FaRobot className="wa-spin-icon" />
          <h2>Loading Opportunity System</h2>
          <p>
            Gathering discovery, pursuit,
            revenue and automation data…
          </p>
        </div>
      </div>
    );
  }


  const timerActive =
    normalizeStatus(
      pick(
        system?.work_agent_timer,
        system?.timer,
        ""
      )
    ) === "active";

  const recoveryLocked =
    recovery.contactAllowed === 0;


  return (
    <div className="wa-page">

      <header className="wa-hero">
        <div>
          <div className="wa-eyebrow">
            IMALI ADMIN
          </div>

          <h1>
            Opportunity Control Center
          </h1>

          <p>
            Human command center for discovery,
            pursuit, contracting, revenue,
            recovery and automation.
          </p>
        </div>

        <div className="wa-header-actions">
          <button
            type="button"
            onClick={minimizeAll}
            className="wa-btn wa-btn-secondary"
          >
            Minimize All
          </button>

          <button
            type="button"
            onClick={expandAll}
            className="wa-btn wa-btn-secondary"
          >
            Expand All
          </button>

          <button
            type="button"
            onClick={() => load(true)}
            className="wa-btn wa-btn-primary"
            disabled={refreshing}
          >
            <FaRedo
              className={
                refreshing
                  ? "wa-rotating"
                  : ""
              }
            />

            {refreshing
              ? "Refreshing"
              : "Refresh"}
          </button>
        </div>
      </header>


      {error ? (
        <div className="wa-alert wa-alert-warning">
          <FaExclamationTriangle />
          <span>{error}</span>
        </div>
      ) : null}


      <div className="wa-kpi-grid">
        <MetricCard
          icon={<FaBriefcase />}
          label="Opportunities"
          value={num(summary.total)}
          note="Total discovered"
        />

        <MetricCard
          icon={<FaTasks />}
          label="Pursuit Queue"
          value={num(summary.queued)}
          note="Currently being worked"
        />

        <MetricCard
          icon={<FaClipboardCheck />}
          label="Ready"
          value={num(summary.ready)}
          note="Ready for human/action step"
          tone={
            summary.ready > 0
              ? "attention"
              : "default"
          }
        />

        <MetricCard
          icon={<FaEnvelope />}
          label="Sent / Applied"
          value={num(summary.sent)}
          note="Outbound actions recorded"
        />

        <MetricCard
          icon={<FaDollarSign />}
          label="Estimated Pipeline"
          value={money(
            summary.estimatedPipeline
          )}
          note="Potential — not earned"
        />

        <MetricCard
          icon={<FaChartLine />}
          label="Actual Revenue"
          value={money(
            summary.actualRevenue
          )}
          note="Recorded realized revenue"
          tone={
            summary.actualRevenue > 0
              ? "success"
              : "default"
          }
        />

        <MetricCard
          icon={<FaTrophy />}
          label="Won"
          value={num(summary.won)}
          note="Closed wins"
          tone={
            summary.won > 0
              ? "success"
              : "default"
          }
        />

        <MetricCard
          icon={<FaShieldAlt />}
          label="Recovery Contact"
          value={
            recoveryLocked
              ? "LOCKED"
              : num(
                  recovery.contactAllowed
                )
          }
          note={
            recoveryLocked
              ? "Compliance safety active"
              : "Authorized records"
          }
          tone={
            recoveryLocked
              ? "success"
              : "attention"
          }
        />
      </div>


      <Collapsible
        id="health"
        title="System Health"
        subtitle="Is the opportunity machine alive and scheduled?"
        icon={<FaRobot />}
        badge={
          timerActive
            ? "ONLINE"
            : "CHECK"
        }
        sections={sections}
        setSections={setSections}
      >
        <div className="wa-health-grid">
          <div className="wa-health-item">
            <span>Database</span>
            <StatusBadge
              tone={
                normalizeStatus(
                  system?.database
                ) === "connected"
                  ? "good"
                  : "neutral"
              }
            >
              {system?.database ||
                "Connected"}
            </StatusBadge>
          </div>

          <div className="wa-health-item">
            <span>Hourly Scheduler</span>
            <StatusBadge
              tone={
                timerActive
                  ? "good"
                  : "neutral"
              }
            >
              {system?.work_agent_timer ||
                system?.timer ||
                "See server timer"}
            </StatusBadge>
          </div>

          <div className="wa-health-item">
            <span>Work Agent Job</span>
            <StatusBadge>
              {system?.work_agent_service ||
                "One-shot"}
            </StatusBadge>
          </div>

          <div className="wa-health-item">
            <span>Pipeline</span>
            <StatusBadge>
              {system?.pipeline_service ||
                "One-shot"}
            </StatusBadge>
          </div>

          <div className="wa-health-item">
            <span>Email</span>
            <StatusBadge>
              {system?.email_service ||
                "On demand"}
            </StatusBadge>
          </div>

          <div className="wa-health-item">
            <span>Follow-up</span>
            <StatusBadge>
              {system?.followup_service ||
                "On demand"}
            </StatusBadge>
          </div>
        </div>

        {system?.next_timer ? (
          <div className="wa-info-strip">
            <strong>Next scheduled run:</strong>
            <span>{system.next_timer}</span>
          </div>
        ) : null}
      </Collapsible>


      <Collapsible
        id="funnel"
        title="Opportunity Funnel"
        subtitle="See where opportunities are in the journey toward revenue."
        icon={<FaChartLine />}
        sections={sections}
        setSections={setSections}
      >
        <div className="wa-funnel">
          <div>
            <span>Discovered</span>
            <strong>{num(summary.total)}</strong>
          </div>

          <div className="wa-funnel-arrow">→</div>

          <div>
            <span>Pursuit</span>
            <strong>{num(summary.queued)}</strong>
          </div>

          <div className="wa-funnel-arrow">→</div>

          <div>
            <span>Ready</span>
            <strong>{num(summary.ready)}</strong>
          </div>

          <div className="wa-funnel-arrow">→</div>

          <div>
            <span>Sent</span>
            <strong>{num(summary.sent)}</strong>
          </div>

          <div className="wa-funnel-arrow">→</div>

          <div>
            <span>Won</span>
            <strong>{num(summary.won)}</strong>
          </div>
        </div>
      </Collapsible>


      <Collapsible
        id="attention"
        title="Human Attention"
        subtitle="Items most likely to require your review or approval."
        icon={<FaUserCheck />}
        badge={attentionRows.length}
        sections={sections}
        setSections={setSections}
      >
        {attentionRows.length === 0 ? (
          <EmptyState>
            Nothing currently flagged for
            immediate human attention.
          </EmptyState>
        ) : (
          <div className="wa-card-list">
            {attentionRows.map((row) => (
              <article
                className="wa-opportunity-card"
                key={row.id}
              >
                <div>
                  <div className="wa-card-title">
                    {row.title ||
                      "Untitled opportunity"}
                  </div>

                  <div className="wa-card-company">
                    {row.company ||
                      row.source ||
                      "Unknown source"}
                  </div>
                </div>

                <div className="wa-card-meta">
                  <StatusBadge tone="attention">
                    {getOpportunityStatus(row)
                      .replace(/_/g, " ")}
                  </StatusBadge>

                  <span>
                    {row.revenue_path ||
                      row.opportunity_type ||
                      "opportunity"}
                  </span>

                  {getRevenue(row) > 0 ? (
                    <strong>
                      {money(getRevenue(row))}
                    </strong>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </Collapsible>


      <Collapsible
        id="revenue"
        title="Revenue Paths"
        subtitle="Understand how each class of opportunity can become revenue."
        icon={<FaDollarSign />}
        sections={sections}
        setSections={setSections}
      >
        <div className="wa-two-columns">
          <div>
            <h3>Revenue paths</h3>
            <LaneRows data={revenuePaths} />
          </div>

          <div>
            <h3>Opportunity types</h3>
            <LaneRows data={opportunityTypes} />
          </div>
        </div>

        <div className="wa-finance-note">
          <FaDollarSign />

          <div>
            <strong>
              Estimated pipeline is not earned
              revenue.
            </strong>

            <span>
              Actual Revenue only increases when
              a win/payment is recorded.
            </span>
          </div>
        </div>
      </Collapsible>


      <Collapsible
        id="procurement"
        title="Government & Contractor Pipeline"
        subtitle="Government opportunities, subcontracting and RFQ work."
        icon={<FaBuilding />}
        badge={procurement.length}
        sections={sections}
        setSections={setSections}
      >
        <div className="wa-toolbar">
          <div className="wa-search">
            <FaSearch />
            <input
              type="search"
              value={procurementSearch}
              onChange={(event) =>
                setProcurementSearch(
                  event.target.value
                )
              }
              placeholder="Search government opportunities..."
              aria-label="Search government opportunities"
            />
          </div>

          {procurementSearch ? (
            <button
              type="button"
              className="wa-clear-button"
              onClick={() =>
                setProcurementSearch("")
              }
            >
              Clear
            </button>
          ) : null}
        </div>


        <div className="wa-mini-grid">
          <MetricCard
            icon={<FaGlobeAmericas />}
            label="Procurement Records"
            value={num(procurement.length)}
          />

          <MetricCard
            icon={<FaHandshake />}
            label="Managed Delivery"
            value={num(
              opportunities.filter(
                (row) =>
                  normalizeStatus(
                    row?.revenue_path
                  ) ===
                    "managed_delivery" ||
                  normalizeStatus(
                    row?.fulfillment_path
                  ) ===
                    "subcontractor"
              ).length
            )}
          />

          <MetricCard
            icon={<FaUsers />}
            label="Subcontractor Lane"
            value={num(
              opportunities.filter(
                (row) =>
                  normalizeStatus(
                    row?.fulfillment_path
                  ) === "subcontractor"
              ).length
            )}
          />
        </div>

        {procurement.length ? (
          <div className="wa-table-scroll">
            <table className="wa-table">
              <thead>
                <tr>
                  <th>Opportunity</th>
                  <th>Agency</th>
                  <th>Status</th>
                  <th>Path</th>
                </tr>
              </thead>

              <tbody>
                {procurement
                  .slice(0, 40)
                  .map((row, index) => (
                    <tr
                      key={
                        row.id ||
                        row.notice_id ||
                        index
                      }
                    >
                      <td>
                        {row.title ||
                          row.name ||
                          "Procurement"}
                      </td>

                      <td>
                        {row.company ||
                          row.agency ||
                          row.buyer ||
                          "—"}
                      </td>

                      <td>
                        {row.status ||
                          row.pursuit_status ||
                          "discovered"}
                      </td>

                      <td>
                        {row.revenue_path ||
                          row.fulfillment_path ||
                          "—"}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState>
            Procurement API returned no separate
            queue. Procurement opportunities may
            still be visible in the master
            opportunity list.
          </EmptyState>
        )}
      </Collapsible>


      <Collapsible
        id="recovery"
        title="Asset Recovery"
        subtitle="Unclaimed-property discovery with fail-closed compliance protection."
        icon={<FaLock />}
        badge={
          recoveryLocked
            ? "LOCKED"
            : "REVIEW"
        }
        sections={sections}
        setSections={setSections}
      >
        <div
          className={`wa-recovery-lock ${
            recoveryLocked
              ? "wa-recovery-safe"
              : "wa-recovery-review"
          }`}
        >
          <FaLock />

          <div>
            <strong>
              {recoveryLocked
                ? "Owner outreach is locked"
                : "Recovery authorization exists"}
            </strong>

            <span>
              Contact requires verified jurisdiction
              rules and explicit compliance
              authorization.
            </span>
          </div>
        </div>

        <div className="wa-mini-grid">
          <MetricCard
            icon={<FaBriefcase />}
            label="Recovery Records"
            value={num(
              recovery.opportunities
            )}
          />

          <MetricCard
            icon={<FaGlobeAmericas />}
            label="States Tracked"
            value={num(recovery.states)}
          />

          <MetricCard
            icon={<FaShieldAlt />}
            label="States Enabled"
            value={num(
              recovery.enabledStates
            )}
          />

          <MetricCard
            icon={<FaClipboardCheck />}
            label="States Verified"
            value={num(
              recovery.verifiedStates
            )}
          />

          <MetricCard
            icon={
              <FaExclamationTriangle />
            }
            label="Compliance Review"
            value={num(recovery.review)}
          />

          <MetricCard
            icon={<FaUserCheck />}
            label="Eligible"
            value={num(recovery.eligible)}
          />

          <MetricCard
            icon={<FaLock />}
            label="Contact Authorized"
            value={num(
              recovery.contactAllowed
            )}
            tone={
              recovery.contactAllowed === 0
                ? "success"
                : "attention"
            }
          />

          <MetricCard
            icon={<FaDollarSign />}
            label="Authorized Fee Pipeline"
            value={money(
              recovery.potentialFee
            )}
          />
        </div>
      </Collapsible>


      <Collapsible
        id="outreach"
        title="Outreach & Follow-up"
        subtitle="Human-facing communications and follow-up activity."
        icon={<FaEnvelope />}
        badge={followups.length}
        sections={sections}
        setSections={setSections}
      >
        <div className="wa-mini-grid">
          <MetricCard
            icon={<FaEnvelope />}
            label="Follow-ups"
            value={num(followups.length)}
          />

          <MetricCard
            icon={<FaUserCheck />}
            label="Sent / Applied"
            value={num(summary.sent)}
          />
        </div>

        <div className="wa-info-strip">
          Asset Recovery remains excluded from
          unauthorized contact by the backend
          compliance lock.
        </div>
      </Collapsible>


      <Collapsible
        id="automation"
        title="Automation"
        subtitle="Application, outreach and pursuit automation status."
        icon={<FaRobot />}
        sections={sections}
        setSections={setSections}
      >
        <div className="wa-health-grid">
          <div className="wa-health-item">
            <span>Application Execution</span>
            <StatusBadge>
              Pipeline controlled
            </StatusBadge>
          </div>

          <div className="wa-health-item">
            <span>Email / Outreach</span>
            <StatusBadge>
              Pipeline controlled
            </StatusBadge>
          </div>

          <div className="wa-health-item">
            <span>Follow-up</span>
            <StatusBadge>
              Pipeline controlled
            </StatusBadge>
          </div>

          <div className="wa-health-item">
            <span>Recovery Outreach</span>
            <StatusBadge tone="good">
              Blocked until eligible
            </StatusBadge>
          </div>
        </div>
      </Collapsible>


      <Collapsible
        id="security"
        title="Security Rewards"
        subtitle="Security research and reward opportunities."
        icon={<FaShieldAlt />}
        badge={securityRewards.length}
        sections={sections}
        setSections={setSections}
      >
        {securityRewards.length ? (
          <div className="wa-card-list">
            {securityRewards
              .slice(0, 25)
              .map((row, index) => (
                <article
                  className="wa-opportunity-card"
                  key={row.id || index}
                >
                  <div>
                    <div className="wa-card-title">
                      {row.title ||
                        row.program ||
                        "Security opportunity"}
                    </div>

                    <div className="wa-card-company">
                      {row.company ||
                        row.platform ||
                        ""}
                    </div>
                  </div>

                  <div className="wa-card-meta">
                    {row.status ? (
                      <StatusBadge>
                        {row.status}
                      </StatusBadge>
                    ) : null}

                    {Number(
                      row.reward ||
                      row.bounty ||
                      0
                    ) > 0 ? (
                      <strong>
                        {money(
                          row.reward ||
                          row.bounty
                        )}
                      </strong>
                    ) : null}
                  </div>
                </article>
              ))}
          </div>
        ) : (
          <EmptyState>
            No security reward records currently
            returned.
          </EmptyState>
        )}
      </Collapsible>


      <Collapsible
        id="opportunities"
        title="Master Opportunity Explorer"
        subtitle="Search and filter the actual opportunities IMALI has found."
        icon={<FaSearch />}
        badge={visibleOpportunities.length}
        sections={sections}
        setSections={setSections}
      >
        <div className="wa-filter-bar">
          <label className="wa-search-box">
            <FaSearch />

            <input
              type="text"
              value={query}
              onChange={(event) =>
                setQuery(event.target.value)
              }
              placeholder="Search opportunity, company, agency, source…"
            />
          </label>

          <select
            value={laneFilter}
            onChange={(event) =>
              setLaneFilter(event.target.value)
            }
          >
            <option value="all">
              All revenue paths
            </option>

            {laneOptions.map((lane) => (
              <option
                value={lane}
                key={lane}
              >
                {lane}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value
              )
            }
          >
            <option value="all">
              All statuses
            </option>

            {statusOptions.map((status) => (
              <option
                value={status}
                key={status}
              >
                {status.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>


        <div className="wa-source-summary">
          <div>
            <h3>Top discovery sources</h3>
            <LaneRows
              data={sources.slice(0, 12)}
            />
          </div>
        </div>


        <div className="wa-table-scroll">
          <table className="wa-table wa-master-table">
            <thead>
              <tr>
                <th>Opportunity</th>
                <th>Source</th>
                <th>Revenue Path</th>
                <th>Status</th>
                <th>Score</th>
                <th>Est. Value</th>
              </tr>
            </thead>

            <tbody>
              {visibleOpportunities.length ? (
                visibleOpportunities.map(
                  (row, index) => (
                    <tr
                      key={
                        row.id ||
                        `${row.title}-${index}`
                      }
                    >
                      <td>
                        <strong>
                          {row.title ||
                            "Untitled"}
                        </strong>

                        <span className="wa-table-sub">
                          {row.company ||
                            row.location ||
                            ""}
                        </span>
                      </td>

                      <td>
                        {row.source ||
                          row.source_name ||
                          "—"}
                      </td>

                      <td>
                        {row.revenue_path ||
                          row.opportunity_type ||
                          "—"}
                      </td>

                      <td>
                        <StatusBadge>
                          {getOpportunityStatus(row)
                            .replace(/_/g, " ")}
                        </StatusBadge>
                      </td>

                      <td>
                        {pick(
                          row.priority,
                          row.score,
                          row.personal_fit,
                          "—"
                        )}
                      </td>

                      <td>
                        {getRevenue(row) > 0
                          ? money(
                              getRevenue(row)
                            )
                          : "—"}
                      </td>
                    </tr>
                  )
                )
              ) : (
                <tr>
                  <td
                    colSpan="6"
                    className="wa-table-empty"
                  >
                    No opportunities match the
                    current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Collapsible>


      <footer className="wa-footer">
        <span>
          IMALI Opportunity System
        </span>

        <span>
          Showing {num(opportunities.length)}
          {" "}loaded opportunities
        </span>
      </footer>
    </div>
  );
}
