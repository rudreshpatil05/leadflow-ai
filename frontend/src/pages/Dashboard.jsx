import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import {
  Search,
  RefreshCw,
  Users,
  Flame,
  Thermometer,
  Snowflake,
  BarChart3,
  GitBranch,
  Filter,
  X,
  Phone,
  CalendarClock,
  ArrowRight,
  AlertCircle,
} from "lucide-react"

import {
  getDashboardStats,
  getSourceAnalytics,
  getSourcePerformance,
  getDashboardFollowUps,
  getLeads,
  getSalesAnalytics,
} from "../services/api"


const PIPELINE_STAGES = [
  {
    key: "NEW",
    label: "New",
    description: "Newly captured leads",
  },
  {
    key: "QUALIFIED",
    label: "Qualified",
    description: "Requirements qualified",
  },
  {
    key: "CONTACTED",
    label: "Contacted",
    description: "Sales team contacted",
  },
  {
    key: "INTERESTED",
    label: "Interested",
    description: "Lead showed interest",
  },
  {
    key: "SITE_VISIT",
    label: "Site Visit",
    description: "Site visit planned",
  },
  {
    key: "NEGOTIATION",
    label: "Negotiation",
    description: "Price or terms discussion",
  },
  {
    key: "CONVERTED",
    label: "Converted",
    description: "Successfully converted",
  },
]


const STATUS_OPTIONS = [
  "ALL",
  ...PIPELINE_STAGES.map((stage) => stage.key),
  "LOST",
]


function normalizeStatus(status) {
  const value = String(status || "NEW").trim().toUpperCase()

  if (!value) {
    return "NEW"
  }

  return value
}


function normalizeTemperature(temperature) {
  return String(temperature || "").trim().toUpperCase()
}


function formatStatus(status) {
  const value = normalizeStatus(status)

  if (value === "SITE_VISIT") {
    return "SITE VISIT"
  }

  return value.replaceAll("_", " ")
}


function formatTemperature(temperature) {
  const value = normalizeTemperature(temperature)

  if (!value) {
    return "UNQUALIFIED"
  }

  return value
}


function getLeadScore(lead) {
  const score = Number(lead?.score)

  if (Number.isNaN(score)) {
    return 0
  }

  return score
}


function formatDate(value) {
  if (!value) {
    return "—"
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return "—"
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}


function getFollowUpForLead(lead, followUps) {
  if (!lead || !Array.isArray(followUps)) {
    return null
  }

  const leadId = Number(lead.id)

  const matching = followUps.filter(
    (followUp) => Number(followUp.lead_id) === leadId
  )

  if (!matching.length) {
    return null
  }

  const pending = matching
    .filter(
      (followUp) =>
        String(followUp.status || "").toUpperCase() === "PENDING"
    )
    .sort((a, b) => {
      const dateA = new Date(a.scheduled_at || 0).getTime()
      const dateB = new Date(b.scheduled_at || 0).getTime()

      return dateA - dateB
    })

  return pending[0] || matching[0]
}


function getFollowUpTiming(followUp) {
  if (!followUp?.scheduled_at) {
    return null
  }

  const scheduled = new Date(followUp.scheduled_at)

  if (Number.isNaN(scheduled.getTime())) {
    return null
  }

  const now = new Date()

  return scheduled <= now ? "DUE" : "UPCOMING"
}


function TemperatureBadge({ temperature }) {
  const value = normalizeTemperature(temperature)

  if (value === "HOT") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
        <Flame size={13} />
        HOT
      </span>
    )
  }

  if (value === "WARM") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-700">
        <Thermometer size={13} />
        WARM
      </span>
    )
  }

  if (value === "COLD") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
        <Snowflake size={13} />
        COLD
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">
      UNQUALIFIED
    </span>
  )
}


function PriorityBadge({ score }) {
  const numericScore = getLeadScore({ score })

  if (numericScore >= 80) {
    return (
      <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700">
        PRIORITY
      </span>
    )
  }

  if (numericScore >= 60) {
    return (
      <span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-bold text-orange-700">
        HIGH
      </span>
    )
  }

  if (numericScore >= 40) {
    return (
      <span className="rounded-full bg-yellow-50 px-2.5 py-1 text-xs font-bold text-yellow-700">
        MEDIUM
      </span>
    )
  }

  return (
    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-600">
      LOW
    </span>
  )
}


function StatCard({ title, value, icon: Icon, description }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {value}
          </p>
          {description && (
            <p className="mt-1 text-xs text-gray-500">{description}</p>
          )}
        </div>

        <div className="rounded-xl bg-gray-100 p-3">
          <Icon size={20} className="text-gray-700" />
        </div>
      </div>
    </div>
  )
}


function InsightCard({ title, value, description }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {title}
      </p>

      <p className="mt-2 text-xl font-bold text-gray-900">
        {value}
      </p>

      {description && (
        <p className="mt-1 text-xs text-gray-500">
          {description}
        </p>
      )}
    </div>
  )
}


function Dashboard() {
  const [stats, setStats] = useState(null)
  const [sourceAnalytics, setSourceAnalytics] = useState([])
  const [sourcePerformance, setSourcePerformance] = useState([])
  const [leads, setLeads] = useState([])
  const [followUps, setFollowUps] = useState([])
  const [salesAnalytics, setSalesAnalytics] = useState(null)

  
  const [search, setSearch] = useState("")
  const [temperature, setTemperature] = useState("ALL")
  const [status, setStatus] = useState("ALL")
  const [source, setSource] = useState("ALL")
  const [minScore, setMinScore] = useState("ALL")
  const [followUpFilter, setFollowUpFilter] = useState("ALL")
  const [sortBy, setSortBy] = useState("NEWEST")

  const [loading, setLoading] = useState(true)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [followUpsLoading, setFollowUpsLoading] = useState(false)

  async function loadDashboard() {
    try {
      setLoading(true)
      setAnalyticsLoading(true)
      setFollowUpsLoading(true)

      const [
        dashboardStats,
        leadsResponse,
        salesAnalyticsResponse,
        sourceResponse,
        sourcePerformanceResponse,
        followUpsResponse,
      ] = await Promise.all([
        getDashboardStats(),
        getLeads(),
        getSalesAnalytics(),
        getSourceAnalytics(),
        getSourcePerformance(),
        getDashboardFollowUps(),
      ])

      setStats(dashboardStats || {})
      setSalesAnalytics(salesAnalyticsResponse || {})

      if (Array.isArray(leadsResponse)) {
        setLeads(leadsResponse)
      } else if (Array.isArray(leadsResponse?.items)) {
        setLeads(leadsResponse.items)
      } else if (Array.isArray(leadsResponse?.leads)) {
        setLeads(leadsResponse.leads)
      } else {
        setLeads([])
      }

      if (Array.isArray(sourceResponse)) {
        setSourceAnalytics(sourceResponse)
      } else if (Array.isArray(sourceResponse?.items)) {
        setSourceAnalytics(sourceResponse.items)
      } else if (Array.isArray(sourceResponse?.sources)) {
        setSourceAnalytics(sourceResponse.sources)
      } else {
        setSourceAnalytics([])
      }

      if (Array.isArray(sourcePerformanceResponse?.sources)) {
        setSourcePerformance(sourcePerformanceResponse.sources)
      } else if (Array.isArray(sourcePerformanceResponse)) {
        setSourcePerformance(sourcePerformanceResponse)
      } else {
        setSourcePerformance([])
      }

      if (Array.isArray(followUpsResponse)) {
        setFollowUps(followUpsResponse)
      } else if (Array.isArray(followUpsResponse?.items)) {
        setFollowUps(followUpsResponse.items)
      } else if (Array.isArray(followUpsResponse?.follow_ups)) {
        setFollowUps(followUpsResponse.follow_ups)
      } else {
        setFollowUps([])
      }
    } catch (error) {
      console.error("Dashboard loading failed:", error)
    } finally {
      setLoading(false)
      setAnalyticsLoading(false)
      setFollowUpsLoading(false)
    }
  }


  useEffect(() => {
    loadDashboard()
  }, [])


  const sourceOptions = useMemo(() => {
    const sources = new Set()

    leads.forEach((lead) => {
      if (lead?.source) {
        sources.add(String(lead.source))
      }
    })

    return Array.from(sources).sort((a, b) =>
      a.localeCompare(b)
    )
  }, [leads])


  const pipelineStats = useMemo(() => {
    const counts = {}

    PIPELINE_STAGES.forEach((stage) => {
      counts[stage.key] = 0
    })

    let lost = 0

    leads.forEach((lead) => {
      const leadStatus = normalizeStatus(lead.status)

      if (leadStatus === "LOST") {
        lost += 1
        return
      }

      if (Object.prototype.hasOwnProperty.call(counts, leadStatus)) {
        counts[leadStatus] += 1
      } else {
        counts.NEW += 1
      }
    })

    return {
      counts,
      lost,
      total: leads.length,
    }
  }, [leads])


  const salesInsights = useMemo(() => {
    const hotLeads = leads.filter(
      (lead) => normalizeTemperature(lead.temperature) === "HOT"
    )

    const warmLeads = leads.filter(
      (lead) => normalizeTemperature(lead.temperature) === "WARM"
    )

    const highIntent = leads.filter((lead) => {
      const intent = String(lead.intent || "").toUpperCase()

      return (
        intent === "HIGH" ||
        getLeadScore(lead) >= 80
      )
    })

    const unqualified = leads.filter(
      (lead) => !normalizeTemperature(lead.temperature)
    )

    const sourceCounts = {}

    leads.forEach((lead) => {
      const leadSource = lead.source || "UNKNOWN"

      sourceCounts[leadSource] =
        (sourceCounts[leadSource] || 0) + 1
    })

    const topSource = Object.entries(sourceCounts).sort(
      (a, b) => b[1] - a[1]
    )[0]

    return {
      hot: hotLeads.length,
      warm: warmLeads.length,
      highIntent: highIntent.length,
      unqualified: unqualified.length,
      topSource: topSource
        ? `${topSource[0]} (${topSource[1]})`
        : "—",
    }
  }, [leads])


  const priorityQueue = useMemo(() => {
    const now = new Date()

    return [...leads]
      .map((lead) => {
        const followUp = getFollowUpForLead(lead, followUps)
        const followUpTiming = getFollowUpTiming(followUp)

        const score = getLeadScore(lead)
        const temp = normalizeTemperature(lead.temperature)
        const leadStatus = normalizeStatus(lead.status)

        let priority = score

        if (temp === "HOT") {
          priority += 40
        } else if (temp === "WARM") {
          priority += 20
        }

        if (followUpTiming === "DUE") {
          priority += 50
        }

        if (
          leadStatus === "NEW" ||
          leadStatus === "QUALIFIED"
        ) {
          priority += 10
        }

        const updatedAt = lead.updated_at
          ? new Date(lead.updated_at).getTime()
          : 0

        const createdAt = lead.created_at
          ? new Date(lead.created_at).getTime()
          : 0

        return {
          ...lead,
          followUp,
          followUpTiming,
          priority,
          _updatedAt: updatedAt || createdAt || now.getTime(),
        }
      })
      .filter((lead) => {
        const leadStatus = normalizeStatus(lead.status)

        return leadStatus !== "CONVERTED" &&
          leadStatus !== "LOST"
      })
      .sort((a, b) => {
        if (b.priority !== a.priority) {
          return b.priority - a.priority
        }

        return b._updatedAt - a._updatedAt
      })
      .slice(0, 5)
  }, [leads, followUps])


  const filteredLeads = useMemo(() => {
    let result = [...leads]

    const searchValue = search.trim().toLowerCase()

    if (searchValue) {
      result = result.filter((lead) => {
        const searchableText = [
          lead.name,
          lead.phone,
          lead.email,
          lead.source,
          lead.location,
          lead.property_type,
          lead.configuration,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()

        return searchableText.includes(searchValue)
      })
    }

    if (temperature !== "ALL") {
      result = result.filter(
        (lead) =>
          normalizeTemperature(lead.temperature) ===
          temperature
      )
    }

    if (status !== "ALL") {
      result = result.filter(
        (lead) =>
          normalizeStatus(lead.status) === status
      )
    }

    if (source !== "ALL") {
      result = result.filter(
        (lead) =>
          String(lead.source || "") === source
      )
    }

    if (minScore !== "ALL") {
      const minimum = Number(minScore)

      result = result.filter(
        (lead) => getLeadScore(lead) >= minimum
      )
    }

    if (followUpFilter !== "ALL") {
      result = result.filter((lead) => {
        const followUp = getFollowUpForLead(
          lead,
          followUps
        )

        if (followUpFilter === "HAS_FOLLOW_UP") {
          return Boolean(followUp)
        }

        if (followUpFilter === "NO_FOLLOW_UP") {
          return !followUp
        }

        const timing = getFollowUpTiming(followUp)

        if (followUpFilter === "DUE") {
          return timing === "DUE"
        }

        if (followUpFilter === "UPCOMING") {
          return timing === "UPCOMING"
        }

        return true
      })
    }

    if (sortBy === "NEWEST") {
      result.sort((a, b) => {
        const dateA = new Date(
          a.created_at || a.updated_at || 0
        ).getTime()

        const dateB = new Date(
          b.created_at || b.updated_at || 0
        ).getTime()

        return dateB - dateA
      })
    }

    if (sortBy === "SCORE_HIGH") {
      result.sort(
        (a, b) =>
          getLeadScore(b) - getLeadScore(a)
      )
    }

    if (sortBy === "SCORE_LOW") {
      result.sort(
        (a, b) =>
          getLeadScore(a) - getLeadScore(b)
      )
    }

    return result
  }, [
    leads,
    search,
    temperature,
    status,
    source,
    minScore,
    followUpFilter,
    sortBy,
    followUps,
  ])


  const activeFilterCount = useMemo(() => {
    let count = 0

    if (search.trim()) count += 1
    if (temperature !== "ALL") count += 1
    if (status !== "ALL") count += 1
    if (source !== "ALL") count += 1
    if (minScore !== "ALL") count += 1
    if (followUpFilter !== "ALL") count += 1

    return count
  }, [
    search,
    temperature,
    status,
    source,
    minScore,
    followUpFilter,
  ])


  function clearFilters() {
    setSearch("")
    setTemperature("ALL")
    setStatus("ALL")
    setSource("ALL")
    setMinScore("ALL")
    setFollowUpFilter("ALL")
    setSortBy("NEWEST")
  }


  function handlePipelineStageClick(stage) {
    if (status === stage) {
      setStatus("ALL")
      return
    }

    setStatus(stage)
  }


  function handleLostClick() {
    if (status === "LOST") {
      setStatus("ALL")
      return
    }

    setStatus("LOST")
  }


  const totalLeads =
    stats?.total ??
    stats?.total_leads ??
    leads.length


  const hotCount =
    stats?.hot ??
    stats?.hot_leads ??
    salesInsights.hot


  const warmCount =
    stats?.warm ??
    stats?.warm_leads ??
    salesInsights.warm


  const coldCount =
    stats?.cold ??
    stats?.cold_leads ??
    leads.filter(
      (lead) =>
        normalizeTemperature(lead.temperature) === "COLD"
    ).length


  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">

        {/* HEADER */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Sales Dashboard
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Monitor leads, sales activity and pipeline progress.
            </p>
          </div>

          <button
            type="button"
            onClick={loadDashboard}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              size={16}
              className={loading ? "animate-spin" : ""}
            />

            Refresh
          </button>
        </div>


        {/* STATISTICS */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Leads"
            value={totalLeads}
            icon={Users}
            description="All leads in CRM"
          />

          <StatCard
            title="Hot Leads"
            value={hotCount}
            icon={Flame}
            description="High-priority opportunities"
          />

          <StatCard
            title="Warm Leads"
            value={warmCount}
            icon={Thermometer}
            description="Leads requiring nurturing"
          />

          <StatCard
            title="Cold Leads"
            value={coldCount}
            icon={Snowflake}
            description="Lower-priority opportunities"
          />
        </div>


        {/* STEP 29 - SALES PERFORMANCE */}
        <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-gray-100 p-2">
                  <BarChart3
                    size={18}
                    className="text-gray-700"
                  />
                </div>

                <h2 className="text-lg font-bold text-gray-900">
                  Sales Performance
                </h2>
              </div>

              <p className="mt-1 text-sm text-gray-500">
                Track conversion performance and revenue generated.
              </p>
            </div>

            <div className="text-sm text-gray-500">
              {salesAnalytics?.conversion_rate ?? 0}% conversion rate
            </div>
          </div>


          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <InsightCard
              title="Active Leads"
              value={salesAnalytics?.active_leads ?? 0}
              description="Leads currently in pipeline"
            />

            <InsightCard
              title="Converted"
              value={salesAnalytics?.converted_leads ?? 0}
              description="Successfully closed leads"
            />

            <InsightCard
              title="Lost"
              value={salesAnalytics?.lost_leads ?? 0}
              description="Leads marked as lost"
            />

            <InsightCard
              title="Conversion Rate"
              value={`${salesAnalytics?.conversion_rate ?? 0}%`}
              description="Converted leads / total leads"
            />
          </div>


          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <InsightCard
              title="Total Deal Value"
              value={`₹${Number(
                salesAnalytics?.total_deal_value ?? 0
              ).toLocaleString("en-IN")}`}
              description="Combined value of converted deals"
            />

            <InsightCard
              title="Average Deal Value"
              value={`₹${Number(
                salesAnalytics?.average_deal_value ?? 0
              ).toLocaleString("en-IN")}`}
              description="Average value per converted deal"
            />
          </div>
        </section>


        {/* STEP 27 - SALES PIPELINE */}
        <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-gray-100 p-2">
                  <GitBranch
                    size={18}
                    className="text-gray-700"
                  />
                </div>

                <h2 className="text-lg font-bold text-gray-900">
                  Sales Pipeline
                </h2>
              </div>

              <p className="mt-1 text-sm text-gray-500">
                Track leads from first capture to conversion.
              </p>
            </div>

            <div className="text-sm text-gray-500">
              {pipelineStats.total} total leads
            </div>
          </div>


          {/* PIPELINE STAGES */}
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {PIPELINE_STAGES.map((stage) => {
              const count =
                pipelineStats.counts[stage.key] || 0

              const isSelected = status === stage.key

              const percentage =
                pipelineStats.total > 0
                  ? Math.round(
                      (count / pipelineStats.total) * 100
                    )
                  : 0

              return (
                <button
                  key={stage.key}
                  type="button"
                  onClick={() =>
                    handlePipelineStageClick(stage.key)
                  }
                  className={`rounded-xl border p-4 text-left transition ${
                    isSelected
                      ? "border-gray-900 bg-gray-900 text-white shadow-md"
                      : "border-gray-200 bg-white hover:border-gray-400 hover:shadow-sm"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p
                        className={`text-xs font-semibold uppercase tracking-wide ${
                          isSelected
                            ? "text-gray-300"
                            : "text-gray-500"
                        }`}
                      >
                        {stage.label}
                      </p>

                      <p
                        className={`mt-2 text-2xl font-bold ${
                          isSelected
                            ? "text-white"
                            : "text-gray-900"
                        }`}
                      >
                        {count}
                      </p>
                    </div>

                    <ArrowRight
                      size={17}
                      className={
                        isSelected
                          ? "text-gray-300"
                          : "text-gray-400"
                      }
                    />
                  </div>

                  <p
                    className={`mt-2 text-xs ${
                      isSelected
                        ? "text-gray-300"
                        : "text-gray-500"
                    }`}
                  >
                    {stage.description}
                  </p>

                  <div
                    className={`mt-4 h-1.5 overflow-hidden rounded-full ${
                      isSelected
                        ? "bg-gray-700"
                        : "bg-gray-100"
                    }`}
                  >
                    <div
                      className={`h-full rounded-full ${
                        isSelected
                          ? "bg-white"
                          : "bg-gray-700"
                      }`}
                      style={{
                        width:
                          count > 0
                            ? `${Math.max(percentage, 4)}%`
                            : "0%",
                      }}
                    />
                  </div>

                  <p
                    className={`mt-2 text-xs ${
                      isSelected
                        ? "text-gray-300"
                        : "text-gray-400"
                    }`}
                  >
                    {percentage}% of leads
                  </p>
                </button>
              )
            })}


            {/* LOST */}
            <button
              type="button"
              onClick={handleLostClick}
              className={`rounded-xl border p-4 text-left transition ${
                status === "LOST"
                  ? "border-red-700 bg-red-700 text-white shadow-md"
                  : "border-red-100 bg-red-50 hover:border-red-300"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p
                    className={`text-xs font-semibold uppercase tracking-wide ${
                      status === "LOST"
                        ? "text-red-100"
                        : "text-red-600"
                    }`}
                  >
                    Lost
                  </p>

                  <p
                    className={`mt-2 text-2xl font-bold ${
                      status === "LOST"
                        ? "text-white"
                        : "text-red-700"
                    }`}
                  >
                    {pipelineStats.lost}
                  </p>
                </div>

                <AlertCircle
                  size={18}
                  className={
                    status === "LOST"
                      ? "text-red-100"
                      : "text-red-400"
                  }
                />
              </div>

              <p
                className={`mt-2 text-xs ${
                  status === "LOST"
                    ? "text-red-100"
                    : "text-red-500"
                }`}
              >
                Leads that did not convert
              </p>

              <div
                className={`mt-4 h-1.5 overflow-hidden rounded-full ${
                  status === "LOST"
                    ? "bg-red-600"
                    : "bg-red-100"
                }`}
              >
                <div
                  className={`h-full rounded-full ${
                    status === "LOST"
                      ? "bg-white"
                      : "bg-red-500"
                  }`}
                  style={{
                    width:
                      pipelineStats.lost > 0
                        ? `${Math.max(
                            Math.round(
                              (pipelineStats.lost /
                                Math.max(
                                  pipelineStats.total,
                                  1
                                )) *
                                100
                            ),
                            4
                          )}%`
                        : "0%",
                  }}
                />
              </div>
            </button>
          </div>


          {status !== "ALL" && (
            <div className="mt-4 flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
              <p className="text-sm text-gray-600">
                Showing leads in:
                <span className="ml-1 font-semibold text-gray-900">
                  {formatStatus(status)}
                </span>
              </p>

              <button
                type="button"
                onClick={() => setStatus("ALL")}
                className="inline-flex items-center gap-1 text-sm font-semibold text-gray-700 hover:text-gray-900"
              >
                <X size={15} />
                Clear stage
              </button>
            </div>
          )}
        </section>


        {/* SALES INTELLIGENCE */}
        <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <div className="rounded-lg bg-gray-100 p-2">
              <BarChart3
                size={18}
                className="text-gray-700"
              />
            </div>

            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Sales Intelligence
              </h2>

              <p className="text-sm text-gray-500">
                Quick view of current sales opportunities.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <InsightCard
              title="High Intent"
              value={salesInsights.highIntent}
              description="High-score or high-intent leads"
            />

            <InsightCard
              title="Hot"
              value={salesInsights.hot}
              description="Immediate sales attention"
            />

            <InsightCard
              title="Unqualified"
              value={salesInsights.unqualified}
              description="Leads needing qualification"
            />

            <InsightCard
              title="Top Source"
              value={salesInsights.topSource}
              description="Highest lead volume"
            />
          </div>
        </section>


        {/* STEP 31 - SALES SOURCE PERFORMANCE */}
        <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Sales by Source
              </h2>

              <p className="text-sm text-gray-500">
                Compare lead quality, conversions and revenue across acquisition sources.
              </p>
            </div>

            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Source Performance
            </span>
          </div>

          {analyticsLoading ? (
            <div className="py-8 text-center text-sm text-gray-500">
              Loading source performance...
            </div>
          ) : sourcePerformance.length === 0 ? (
            <div className="rounded-xl bg-gray-50 p-6 text-center text-sm text-gray-500">
              No source performance data available.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left">
                <thead className="border-b bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Source
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Total Leads
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Converted
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Lost
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Conversion
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Revenue
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Avg Deal
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {sourcePerformance.map((item) => {
                    const itemSource = String(item.source || "UNKNOWN")
                    const total = Number(item.total_leads || 0)
                    const converted = Number(item.converted_leads || 0)
                    const lost = Number(item.lost_leads || 0)
                    const conversionRate = Number(item.conversion_rate || 0)
                    const revenue = Number(item.total_deal_value || 0)
                    const averageDeal = Number(item.average_deal_value || 0)
                    const isSelected = source === itemSource

                    return (
                      <tr
                        key={itemSource}
                        className={`border-b last:border-b-0 ${
                          isSelected ? "bg-gray-50" : "hover:bg-gray-50"
                        }`}
                      >
                        <td className="px-4 py-4">
                          <button
                            type="button"
                            onClick={() =>
                              setSource(isSelected ? "ALL" : itemSource)
                            }
                            className={`font-semibold hover:underline ${
                              isSelected ? "text-gray-900" : "text-gray-700"
                            }`}
                          >
                            {itemSource}
                          </button>
                        </td>

                        <td className="px-4 py-4 text-sm font-semibold text-gray-900">
                          {total}
                        </td>

                        <td className="px-4 py-4 text-sm font-semibold text-gray-900">
                          {converted}
                        </td>

                        <td className="px-4 py-4 text-sm font-semibold text-gray-900">
                          {lost}
                        </td>

                        <td className="px-4 py-4">
                          <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
                            {conversionRate.toFixed(2)}%
                          </span>
                        </td>

                        <td className="px-4 py-4 text-sm font-semibold text-gray-900">
                          ₹{revenue.toLocaleString("en-IN")}
                        </td>

                        <td className="px-4 py-4 text-sm font-semibold text-gray-900">
                          ₹{averageDeal.toLocaleString("en-IN")}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {source !== "ALL" && (
            <div className="mt-4 flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
              <p className="text-sm text-gray-600">
                Showing leads from <span className="font-semibold text-gray-900">{source}</span>
              </p>

              <button
                type="button"
                onClick={() => setSource("ALL")}
                className="text-sm font-semibold text-gray-700 hover:text-gray-900"
              >
                Clear source
              </button>
            </div>
          )}
        </section>


        {/* FOLLOW-UP MANAGEMENT */}
        <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Follow-up Management
              </h2>

              <p className="text-sm text-gray-500">
                Leads that require sales follow-up.
              </p>
            </div>

            <span className="text-sm font-semibold text-gray-600">
              {followUps.length} follow-ups
            </span>
          </div>

          {followUpsLoading ? (
            <div className="py-8 text-center text-sm text-gray-500">
              Loading follow-ups...
            </div>
          ) : followUps.length === 0 ? (
            <div className="rounded-xl bg-gray-50 p-6 text-center text-sm text-gray-500">
              No follow-ups available.
            </div>
          ) : (
            <div className="space-y-3">
              {followUps.slice(0, 5).map((followUp) => {
                const lead = leads.find(
                  (item) =>
                    Number(item.id) ===
                    Number(followUp.lead_id)
                )

                const timing =
                  getFollowUpTiming(followUp)

                return (
                  <div
                    key={followUp.id}
                    className="flex flex-col gap-3 rounded-xl border border-gray-200 p-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="flex items-start gap-3">
                      <div className="rounded-lg bg-gray-100 p-2">
                        <CalendarClock
                          size={17}
                          className="text-gray-700"
                        />
                      </div>

                      <div>
                        <p className="font-semibold text-gray-900">
                          {lead?.name ||
                            `Lead #${followUp.lead_id}`}
                        </p>

                        <p className="mt-1 text-sm text-gray-600">
                          {followUp.action ||
                            followUp.reason ||
                            "Follow up with lead"}
                        </p>

                        {followUp.scheduled_at && (
                          <p className="mt-1 text-xs text-gray-500">
                            {formatDate(
                              followUp.scheduled_at
                            )}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {timing === "DUE" && (
                        <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700">
                          DUE
                        </span>
                      )}

                      {timing === "UPCOMING" && (
                        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
                          UPCOMING
                        </span>
                      )}

                      {lead && (
                        <Link
                          to={`/leads/${lead.id}`}
                          className="inline-flex items-center gap-1 rounded-lg bg-gray-900 px-3 py-2 text-xs font-semibold text-white hover:bg-gray-800"
                        >
                          Open
                          <ArrowRight size={13} />
                        </Link>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>


        {/* PRIORITY SALES QUEUE */}
        <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Priority Sales Queue
              </h2>

              <p className="text-sm text-gray-500">
                Leads requiring the most immediate attention.
              </p>
            </div>

            <span className="text-sm font-semibold text-gray-600">
              Top {priorityQueue.length}
            </span>
          </div>

          {priorityQueue.length === 0 ? (
            <div className="rounded-xl bg-gray-50 p-6 text-center text-sm text-gray-500">
              No priority leads available.
            </div>
          ) : (
            <div className="space-y-3">
              {priorityQueue.map((lead) => (
                <div
                  key={lead.id}
                  className="flex flex-col gap-4 rounded-xl border border-gray-200 p-4 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to={`/leads/${lead.id}`}
                        className="font-semibold text-gray-900 hover:underline"
                      >
                        {lead.name ||
                          `Lead #${lead.id}`}
                      </Link>

                      <TemperatureBadge
                        temperature={lead.temperature}
                      />

                      <PriorityBadge
                        score={lead.score}
                      />
                    </div>

                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                      <span>
                        Score:{" "}
                        <strong className="text-gray-700">
                          {getLeadScore(lead)}
                        </strong>
                      </span>

                      <span>
                        Stage:{" "}
                        <strong className="text-gray-700">
                          {formatStatus(lead.status)}
                        </strong>
                      </span>

                      {lead.source && (
                        <span>
                          Source:{" "}
                          <strong className="text-gray-700">
                            {lead.source}
                          </strong>
                        </span>
                      )}
                    </div>

                    {lead.next_best_action && (
                      <p className="mt-2 text-sm text-gray-600">
                        <span className="font-semibold">
                          Next action:
                        </span>{" "}
                        {lead.next_best_action}
                      </p>
                    )}

                    {lead.followUpTiming === "DUE" && (
                      <p className="mt-2 text-xs font-semibold text-red-600">
                        Follow-up is due.
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {lead.phone && (
                      <a
                        href={`tel:${lead.phone}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        <Phone size={14} />
                        Call
                      </a>
                    )}

                    <Link
                      to={`/leads/${lead.id}`}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-2 text-xs font-semibold text-white hover:bg-gray-800"
                    >
                      Open
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>


        {/* LEAD MANAGEMENT */}
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Lead Management
              </h2>

              <p className="text-sm text-gray-500">
                Search, filter and manage your leads.
              </p>
            </div>

            <div className="text-sm text-gray-500">
              Showing{" "}
              <span className="font-semibold text-gray-900">
                {filteredLeads.length}
              </span>{" "}
              of {leads.length}
            </div>
          </div>


          {/* FILTERS */}
          <div className="mb-5 rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter size={16} className="text-gray-600" />

                <span className="text-sm font-semibold text-gray-800">
                  Filters
                </span>

                {activeFilterCount > 0 && (
                  <span className="rounded-full bg-gray-900 px-2 py-0.5 text-xs font-bold text-white">
                    {activeFilterCount}
                  </span>
                )}
              </div>

              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-gray-600 hover:text-gray-900"
                >
                  <X size={14} />
                  Clear all
                </button>
              )}
            </div>


            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">

              {/* SEARCH */}
              <div className="relative xl:col-span-2">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />

                <input
                  type="text"
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Search name, phone, email..."
                  className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-gray-500"
                />
              </div>


              {/* STATUS */}
              <select
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value)
                }
                className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-gray-500"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    Status: {formatStatus(option)}
                  </option>
                ))}
              </select>


              {/* TEMPERATURE */}
              <select
                value={temperature}
                onChange={(event) =>
                  setTemperature(event.target.value)
                }
                className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-gray-500"
              >
                <option value="ALL">
                  Temperature: All
                </option>

                <option value="HOT">
                  Temperature: Hot
                </option>

                <option value="WARM">
                  Temperature: Warm
                </option>

                <option value="COLD">
                  Temperature: Cold
                </option>
              </select>


              {/* SOURCE */}
              <select
                value={source}
                onChange={(event) =>
                  setSource(event.target.value)
                }
                className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-gray-500"
              >
                <option value="ALL">
                  Source: All
                </option>

                {sourceOptions.map((item) => (
                  <option key={item} value={item}>
                    Source: {item}
                  </option>
                ))}
              </select>


              {/* SCORE */}
              <select
                value={minScore}
                onChange={(event) =>
                  setMinScore(event.target.value)
                }
                className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-gray-500"
              >
                <option value="ALL">
                  Min Score: All
                </option>

                <option value="40">
                  Score: 40+
                </option>

                <option value="60">
                  Score: 60+
                </option>

                <option value="80">
                  Score: 80+
                </option>
              </select>


              {/* FOLLOW UP */}
              <select
                value={followUpFilter}
                onChange={(event) =>
                  setFollowUpFilter(event.target.value)
                }
                className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-gray-500"
              >
                <option value="ALL">
                  Follow-up: All
                </option>

                <option value="DUE">
                  Follow-up: Due
                </option>

                <option value="UPCOMING">
                  Follow-up: Upcoming
                </option>

                <option value="HAS_FOLLOW_UP">
                  Follow-up: Has follow-up
                </option>

                <option value="NO_FOLLOW_UP">
                  Follow-up: None
                </option>
              </select>


              {/* SORT */}
              <select
                value={sortBy}
                onChange={(event) =>
                  setSortBy(event.target.value)
                }
                className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-gray-500"
              >
                <option value="NEWEST">
                  Sort: Newest
                </option>

                <option value="SCORE_HIGH">
                  Sort: Score high
                </option>

                <option value="SCORE_LOW">
                  Sort: Score low
                </option>
              </select>
            </div>
          </div>


          {/* LEAD TABLE */}
          {loading ? (
            <div className="py-12 text-center text-sm text-gray-500">
              Loading leads...
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="rounded-xl bg-gray-50 p-10 text-center">
              <Users
                size={30}
                className="mx-auto text-gray-400"
              />

              <p className="mt-3 font-semibold text-gray-800">
                No leads found
              </p>

              <p className="mt-1 text-sm text-gray-500">
                Try changing your filters or search terms.
              </p>

              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-4 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr className="text-left">
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Lead
                    </th>

                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Stage
                    </th>

                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Temperature
                    </th>

                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Score
                    </th>

                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Source
                    </th>

                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Follow-up
                    </th>

                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Created
                    </th>

                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {filteredLeads.map((lead) => {
                    const followUp =
                      getFollowUpForLead(
                        lead,
                        followUps
                      )

                    const followUpTiming =
                      getFollowUpTiming(followUp)

                    return (
                      <tr
                        key={lead.id}
                        className="transition hover:bg-gray-50"
                      >
                        <td className="px-4 py-4">
                          <div>
                            <Link
                              to={`/leads/${lead.id}`}
                              className="font-semibold text-gray-900 hover:underline"
                            >
                              {lead.name ||
                                `Lead #${lead.id}`}
                            </Link>

                            {lead.phone && (
                              <p className="mt-1 text-xs text-gray-500">
                                {lead.phone}
                              </p>
                            )}

                            {lead.email && (
                              <p className="text-xs text-gray-500">
                                {lead.email}
                              </p>
                            )}
                          </div>
                        </td>


                        <td className="px-4 py-4">
                          <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
                            {formatStatus(lead.status)}
                          </span>
                        </td>


                        <td className="px-4 py-4">
                          <TemperatureBadge
                            temperature={lead.temperature}
                          />
                        </td>


                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900">
                              {getLeadScore(lead)}
                            </span>

                            <PriorityBadge
                              score={lead.score}
                            />
                          </div>
                        </td>


                        <td className="px-4 py-4">
                          <span className="text-sm text-gray-600">
                            {lead.source || "—"}
                          </span>
                        </td>


                        <td className="px-4 py-4">
                          {followUp ? (
                            <div>
                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                                  followUpTiming === "DUE"
                                    ? "bg-red-50 text-red-700"
                                    : "bg-blue-50 text-blue-700"
                                }`}
                              >
                                {followUpTiming ||
                                  "FOLLOW-UP"}
                              </span>

                              {followUp.scheduled_at && (
                                <p className="mt-1 text-xs text-gray-500">
                                  {formatDate(
                                    followUp.scheduled_at
                                  )}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">
                              None
                            </span>
                          )}
                        </td>


                        <td className="px-4 py-4">
                          <span className="text-sm text-gray-600">
                            {formatDate(
                              lead.created_at
                            )}
                          </span>
                        </td>


                        <td className="px-4 py-4 text-right">
                          <Link
                            to={`/leads/${lead.id}`}
                            className="inline-flex items-center gap-1 rounded-lg bg-gray-900 px-3 py-2 text-xs font-semibold text-white hover:bg-gray-800"
                          >
                            Open
                            <ArrowRight size={13} />
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

      </div>
    </div>
  )
}


export default Dashboard