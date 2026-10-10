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
  getDashboardFollowUps,
  getLeads,
  getSalesAnalytics,
  getSourcePerformance,
  getRevenueTrend,
  getConversionFunnel,
  getLeadAging,
  getSalesAlerts,
  getLeadIntelligence,
  getFollowUpIntelligence,
  getRevenueForecast,
  getSalesProductivity,
  getLeadFilterOptions,
  completeFollowUp,
  rescheduleFollowUp,
  cancelFollowUp,
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

  const pending = followUps
    .filter(
      (followUp) =>
        Number(followUp.lead_id) === leadId &&
        String(followUp.status || "").toUpperCase() === "PENDING"
    )
    .sort((a, b) => {
      const dateA = new Date(a.scheduled_at || 0).getTime()
      const dateB = new Date(b.scheduled_at || 0).getTime()

      return dateA - dateB
    })

  return pending[0] || null
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
  const [leads, setLeads] = useState([])
  const [followUps, setFollowUps] = useState([])
  const [salesAnalytics, setSalesAnalytics] = useState(null)
  const [sourcePerformance, setSourcePerformance] = useState([])
  const [revenueTrend, setRevenueTrend] = useState([])
  const [conversionFunnel, setConversionFunnel] = useState([])
  const [leadAging, setLeadAging] = useState({
    fresh: 0,
    attention: 0,
    stale: 0,
    critical: 0,
  })
  const [staleLeads, setStaleLeads] = useState([])
  const [salesAlerts, setSalesAlerts] = useState([])
  const [alertSummary, setAlertSummary] = useState({})

  const [leadIntelligence, setLeadIntelligence] = useState({
    hot: 0,
    warm: 0,
    cold: 0,
    total_active: 0,
  })
  const [priorityLeads, setPriorityLeads] = useState([])
  const [followUpIntelligence, setFollowUpIntelligence] = useState({
    overdue: 0,
    today: 0,
    upcoming: 0,
    completed: 0,
    completion_rate: 0,
  })
  const [revenueForecast, setRevenueForecast] = useState({
    converted_revenue: 0,
    pipeline_value: 0,
    forecast_value: 0,
    components: {
      qualified: 0,
      interested: 0,
      negotiation: 0,
    },
  })
  const [salesProductivity, setSalesProductivity] = useState({
    total_leads: 0,
    active_leads: 0,
    converted_leads: 0,
    lost_leads: 0,
    conversion_rate: 0,
  })
  const [leadFilterOptions, setLeadFilterOptions] = useState({
    statuses: [],
    temperatures: [],
    sources: [],
    locations: [],
  })

 
  
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
  const [followUpActionLoading, setFollowUpActionLoading] = useState(null)

  async function handleCompleteFollowUp(followUp) {
    if (!followUp?.id) return

    try {
      setFollowUpActionLoading(`complete-${followUp.id}`)
      await completeFollowUp(followUp.id)
      await loadDashboard()
    } catch (error) {
      console.error("Failed to complete follow-up:", error)
      window.alert(
        error?.response?.data?.detail || "Failed to complete follow-up."
      )
    } finally {
      setFollowUpActionLoading(null)
    }
  }

  async function handleRescheduleFollowUp(followUp) {
    if (!followUp?.id) return

    const currentDate = followUp.scheduled_at
      ? new Date(followUp.scheduled_at).toISOString().slice(0, 16)
      : ""

    const newDate = window.prompt(
      "Enter new date and time (YYYY-MM-DDTHH:MM):",
      currentDate
    )

    if (!newDate) return

    if (Number.isNaN(new Date(newDate).getTime())) {
      window.alert("Please enter a valid date and time.")
      return
    }

    const notes = window.prompt(
      "Add a note for this reschedule (optional):",
      followUp.notes || ""
    )

    try {
      setFollowUpActionLoading(`reschedule-${followUp.id}`)
      await rescheduleFollowUp(followUp.id, newDate, notes || null)
      await loadDashboard()
    } catch (error) {
      console.error("Failed to reschedule follow-up:", error)
      window.alert(
        error?.response?.data?.detail || "Failed to reschedule follow-up."
      )
    } finally {
      setFollowUpActionLoading(null)
    }
  }

  async function handleCancelFollowUp(followUp) {
    if (!followUp?.id) return

    if (!window.confirm("Are you sure you want to cancel this follow-up?")) {
      return
    }

    try {
      setFollowUpActionLoading(`cancel-${followUp.id}`)
      await cancelFollowUp(followUp.id)
      await loadDashboard()
    } catch (error) {
      console.error("Failed to cancel follow-up:", error)
      window.alert(
        error?.response?.data?.detail || "Failed to cancel follow-up."
      )
    } finally {
      setFollowUpActionLoading(null)
    }
  }

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
        revenueTrendResponse,
        conversionFunnelResponse,
        leadAgingResponse,
        salesAlertsResponse,
        followUpsResponse,
        leadIntelligenceResponse,
        followUpIntelligenceResponse,
        revenueForecastResponse,
        salesProductivityResponse,
        leadFilterOptionsResponse,
      ] = await Promise.all([
        getDashboardStats(),
        getLeads(),
        getSalesAnalytics(),
        getSourceAnalytics(),
        getSourcePerformance(),
        getRevenueTrend(),
        getConversionFunnel(),
        getLeadAging(),
        getSalesAlerts(),
        getDashboardFollowUps(),
        getLeadIntelligence(),
        getFollowUpIntelligence(),
        getRevenueForecast(),
        getSalesProductivity(),
        getLeadFilterOptions(),
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

      if (Array.isArray(followUpsResponse)) {
        setFollowUps(followUpsResponse)
      } else if (Array.isArray(followUpsResponse?.items)) {
        setFollowUps(followUpsResponse.items)
      } else if (Array.isArray(followUpsResponse?.follow_ups)) {
        setFollowUps(followUpsResponse.follow_ups)
      } else {
        setFollowUps([])
      }

      setLeadIntelligence(
        leadIntelligenceResponse?.summary || {
          hot: 0,
          warm: 0,
          cold: 0,
          total_active: 0,
        }
      )
      setPriorityLeads(
        Array.isArray(leadIntelligenceResponse?.priority_leads)
          ? leadIntelligenceResponse.priority_leads
          : []
      )

      setFollowUpIntelligence(
        followUpIntelligenceResponse?.summary || {
          overdue: 0,
          today: 0,
          upcoming: 0,
          completed: 0,
          completion_rate: 0,
        }
      )

      setRevenueForecast(
        revenueForecastResponse || {
          converted_revenue: 0,
          pipeline_value: 0,
          forecast_value: 0,
          components: {
            qualified: 0,
            interested: 0,
            negotiation: 0,
          },
        }
      )

      setSalesProductivity(
        salesProductivityResponse || {
          total_leads: 0,
          active_leads: 0,
          converted_leads: 0,
          lost_leads: 0,
          conversion_rate: 0,
        }
      )

      setLeadFilterOptions(
        leadFilterOptionsResponse || {
          statuses: [],
          temperatures: [],
          sources: [],
          locations: [],
        }
      )

      if (Array.isArray(revenueTrendResponse?.trend)) {
        setRevenueTrend(revenueTrendResponse.trend)
      } else if (Array.isArray(revenueTrendResponse)) {
        setRevenueTrend(revenueTrendResponse)
      } else {
        setRevenueTrend([])
      }

      if (Array.isArray(conversionFunnelResponse?.funnel)) {
        setConversionFunnel(conversionFunnelResponse.funnel)
      } else if (Array.isArray(conversionFunnelResponse)) {
        setConversionFunnel(conversionFunnelResponse)
      } else {
        setConversionFunnel([])
      }

      if (leadAgingResponse?.summary) {
        setLeadAging({
          fresh: Number(leadAgingResponse.summary.fresh || 0),
          attention: Number(leadAgingResponse.summary.attention || 0),
          stale: Number(leadAgingResponse.summary.stale || 0),
          critical: Number(leadAgingResponse.summary.critical || 0),
        })
      } else {
        setLeadAging({ fresh: 0, attention: 0, stale: 0, critical: 0 })
      }

      setStaleLeads(
        Array.isArray(leadAgingResponse?.stale_leads)
          ? leadAgingResponse.stale_leads
          : []
      )

      setSalesAlerts(
        Array.isArray(salesAlertsResponse?.alerts)
          ? salesAlertsResponse.alerts
          : Array.isArray(salesAlertsResponse)
            ? salesAlertsResponse
            : []
      )
      setAlertSummary(salesAlertsResponse?.summary || {})
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
    salesInsights.cold ??
    leads.filter(
      (lead) =>
        normalizeTemperature(lead.temperature) === "COLD"
    ).length

  const maxRevenueTrendValue = Math.max(
    ...revenueTrend.map((item) => Number(item.revenue || 0)),
    1
  )

  const maxFunnelCount = Math.max(
    ...conversionFunnel.map((item) => Number(item.count || 0)),
    1
  )

  const totalAgingLeads =
    Number(leadAging.fresh || 0) +
    Number(leadAging.attention || 0) +
    Number(leadAging.stale || 0) +
    Number(leadAging.critical || 0)

  const formatCurrency = (value) =>
    `₹${Number(value || 0).toLocaleString("en-IN")}`


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


        {/* STEP 30 - PIPELINE & REVENUE BREAKDOWN */}
        <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
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
                Track pipeline movement, conversion and revenue.
              </p>
            </div>

            <div className="rounded-full bg-gray-100 px-3 py-1.5 text-sm font-semibold text-gray-700">
              {salesAnalytics?.conversion_rate ?? 0}% conversion
            </div>
          </div>

          {/* PERFORMANCE KPIs */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <InsightCard
              title="Active Leads"
              value={salesAnalytics?.active_leads ?? 0}
              description="Currently in sales pipeline"
            />

            <InsightCard
              title="Converted"
              value={salesAnalytics?.converted_leads ?? 0}
              description="Successfully closed"
            />

            <InsightCard
              title="Lost"
              value={salesAnalytics?.lost_leads ?? 0}
              description="Marked as lost"
            />

            <InsightCard
              title="Conversion Rate"
              value={`${salesAnalytics?.conversion_rate ?? 0}%`}
              description="Converted / total leads"
            />
          </div>

          {/* REVENUE KPIs */}
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Total Revenue
              </p>

              <p className="mt-2 text-2xl font-bold text-gray-900">
                ₹{Number(
                  salesAnalytics?.total_deal_value ?? 0
                ).toLocaleString("en-IN")}
              </p>

              <p className="mt-1 text-xs text-gray-500">
                Combined value of converted deals
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Average Deal Value
              </p>

              <p className="mt-2 text-2xl font-bold text-gray-900">
                ₹{Number(
                  salesAnalytics?.average_deal_value ?? 0
                ).toLocaleString("en-IN")}
              </p>

              <p className="mt-1 text-xs text-gray-500">
                Average revenue per converted lead
              </p>
            </div>
          </div>

          {/* PIPELINE BREAKDOWN */}
          <div className="mt-5 rounded-xl border border-gray-200 p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-gray-900">
                  Pipeline Breakdown
                </h3>

                <p className="mt-1 text-xs text-gray-500">
                  Click any stage to filter the lead table below.
                </p>
              </div>

              <span className="text-xs font-semibold text-gray-500">
                {salesAnalytics?.total_leads ?? pipelineStats.total} total
              </span>
            </div>

            <div className="space-y-3">
              {PIPELINE_STAGES.map((stage) => {
                const count = Number(
                  salesAnalytics?.pipeline?.[stage.key] ??
                    pipelineStats.counts[stage.key] ??
                    0
                )

                const total = Number(
                  salesAnalytics?.total_leads ??
                    pipelineStats.total ??
                    0
                )

                const percentage =
                  total > 0
                    ? Math.round((count / total) * 100)
                    : 0

                const isSelected = status === stage.key

                return (
                  <button
                    key={stage.key}
                    type="button"
                    onClick={() =>
                      handlePipelineStageClick(stage.key)
                    }
                    className="block w-full text-left"
                  >
                    <div className="mb-1.5 flex items-center justify-between gap-3">
                      <span
                        className={`text-xs font-semibold ${
                          isSelected
                            ? "text-gray-900"
                            : "text-gray-600"
                        }`}
                      >
                        {stage.label}
                      </span>

                      <span className="text-xs font-semibold text-gray-500">
                        {count} · {percentage}%
                      </span>
                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isSelected
                            ? "bg-gray-900"
                            : "bg-gray-500"
                        }`}
                        style={{
                          width: `${Math.min(
                            percentage,
                            100
                          )}%`,
                        }}
                      />
                    </div>
                  </button>
                )
              })}

              {/* LOST */}
              {(() => {
                const count = Number(
                  salesAnalytics?.pipeline?.LOST ??
                    pipelineStats.lost ??
                    0
                )

                const total = Number(
                  salesAnalytics?.total_leads ??
                    pipelineStats.total ??
                    0
                )

                const percentage =
                  total > 0
                    ? Math.round((count / total) * 100)
                    : 0

                const isSelected = status === "LOST"

                return (
                  <button
                    type="button"
                    onClick={handleLostClick}
                    className="block w-full text-left"
                  >
                    <div className="mb-1.5 flex items-center justify-between gap-3">
                      <span
                        className={`text-xs font-semibold ${
                          isSelected
                            ? "text-red-700"
                            : "text-gray-600"
                        }`}
                      >
                        Lost
                      </span>

                      <span className="text-xs font-semibold text-gray-500">
                        {count} · {percentage}%
                      </span>
                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-red-400 transition-all"
                        style={{
                          width: `${Math.min(
                            percentage,
                            100
                          )}%`,
                        }}
                      />
                    </div>
                  </button>
                )
              })()}
            </div>
          </div>
        </section>


        {/* ============================================================
            STEP 37 - LEAD INTELLIGENCE
        ============================================================ */}
        <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-gray-900">Lead Intelligence</h2>
            <p className="mt-1 text-sm text-gray-500">Understand active lead quality and priority opportunities.</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <InsightCard title="Hot Leads" value={leadIntelligence.hot} description="High-priority active leads" />
            <InsightCard title="Warm Leads" value={leadIntelligence.warm} description="Leads requiring nurturing" />
            <InsightCard title="Cold Leads" value={leadIntelligence.cold} description="Lower-priority active leads" />
            <InsightCard title="Active Leads" value={leadIntelligence.total_active} description="Open opportunities" />
          </div>

          <div className="mt-5">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Priority Leads</h3>
                <p className="mt-1 text-xs text-gray-500">Highest-scoring active opportunities.</p>
              </div>
              <span className="text-xs font-semibold text-gray-500">Top {priorityLeads.length}</span>
            </div>

            {priorityLeads.length === 0 ? (
              <div className="rounded-xl bg-gray-50 p-5 text-center text-sm text-gray-500">No priority leads available.</div>
            ) : (
              <div className="space-y-2">
                {priorityLeads.map((lead) => (
                  <Link key={lead.id} to={`/leads/${lead.id}`} className="block rounded-xl border border-gray-200 p-4 transition hover:border-gray-400 hover:shadow-sm">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-gray-900">{lead.name}</span>
                          <TemperatureBadge temperature={lead.temperature} />
                          <PriorityBadge score={lead.score} />
                        </div>
                        <p className="mt-1 text-xs text-gray-500">{lead.phone}{lead.location ? ` · ${lead.location}` : ""}</p>
                      </div>
                      <div className="flex items-center gap-5 text-right">
                        <div><p className="text-xs text-gray-500">Score</p><p className="font-bold text-gray-900">{lead.score}</p></div>
                        <div><p className="text-xs text-gray-500">Budget</p><p className="font-semibold text-gray-900">{formatCurrency(lead.budget_max)}</p></div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* STEP 38 - FOLLOW-UP INTELLIGENCE */}
        <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-gray-900">Follow-up Intelligence</h2>
            <p className="mt-1 text-sm text-gray-500">Monitor overdue, current and upcoming sales follow-ups.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <InsightCard title="Overdue" value={followUpIntelligence.overdue} description="Needs immediate action" />
            <InsightCard title="Today" value={followUpIntelligence.today} description="Scheduled today" />
            <InsightCard title="Upcoming" value={followUpIntelligence.upcoming} description="Future follow-ups" />
            <InsightCard title="Completed" value={followUpIntelligence.completed} description="Completed follow-ups" />
            <InsightCard title="Completion Rate" value={`${followUpIntelligence.completion_rate}%`} description="Follow-up completion" />
          </div>
        </section>

        {/* STEP 39 - REVENUE FORECAST */}
        <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-gray-900">Revenue Forecast</h2>
            <p className="mt-1 text-sm text-gray-500">Current revenue and probability-weighted active pipeline.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <InsightCard title="Converted Revenue" value={formatCurrency(revenueForecast.converted_revenue)} description="Recorded closed-deal revenue" />
            <InsightCard title="Active Pipeline" value={formatCurrency(revenueForecast.pipeline_value)} description="Potential active pipeline" />
            <InsightCard title="Weighted Forecast" value={formatCurrency(revenueForecast.forecast_value)} description="Probability-weighted pipeline" />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-gray-50 p-4"><p className="text-xs text-gray-500">Qualified · 20%</p><p className="mt-1 font-bold text-gray-900">{formatCurrency(revenueForecast.components?.qualified)}</p></div>
            <div className="rounded-xl bg-gray-50 p-4"><p className="text-xs text-gray-500">Interested · 40%</p><p className="mt-1 font-bold text-gray-900">{formatCurrency(revenueForecast.components?.interested)}</p></div>
            <div className="rounded-xl bg-gray-50 p-4"><p className="text-xs text-gray-500">Negotiation · 70%</p><p className="mt-1 font-bold text-gray-900">{formatCurrency(revenueForecast.components?.negotiation)}</p></div>
          </div>
        </section>

        {/* STEP 40 - SALES PRODUCTIVITY */}
        <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-gray-900">Sales Productivity</h2>
            <p className="mt-1 text-sm text-gray-500">Overall CRM sales performance.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <InsightCard title="Total Leads" value={salesProductivity.total_leads} description="All CRM leads" />
            <InsightCard title="Active" value={salesProductivity.active_leads} description="Open opportunities" />
            <InsightCard title="Converted" value={salesProductivity.converted_leads} description="Closed deals" />
            <InsightCard title="Lost" value={salesProductivity.lost_leads} description="Lost opportunities" />
            <InsightCard title="Conversion Rate" value={`${salesProductivity.conversion_rate}%`} description="Overall conversion" />
          </div>
        </section>

        {/* STEP 41 - ANALYTICS DETAIL */}
        <section className="mb-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4"><h2 className="text-lg font-bold text-gray-900">Revenue & Conversion Trend</h2><p className="mt-1 text-sm text-gray-500">Daily lead, conversion and revenue movement.</p></div>
            {revenueTrend.length === 0 ? (
              <div className="rounded-xl bg-gray-50 p-6 text-center text-sm text-gray-500">No trend data available.</div>
            ) : (
              <div className="space-y-3">
                {revenueTrend.slice(-7).map((item) => {
                  const revenue = Number(item.revenue || 0)
                  const width = Math.max((revenue / maxRevenueTrendValue) * 100, revenue > 0 ? 4 : 0)
                  return (
                    <div key={item.date}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="font-semibold text-gray-700">{formatDate(item.date)}</span>
                        <span className="text-gray-500">{item.leads || 0} leads · {item.converted || 0} converted · {formatCurrency(revenue)}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-gray-700" style={{ width: `${width}%` }} /></div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4"><h2 className="text-lg font-bold text-gray-900">Conversion Funnel</h2><p className="mt-1 text-sm text-gray-500">Lead movement through the sales stages.</p></div>
            {conversionFunnel.length === 0 ? (
              <div className="rounded-xl bg-gray-50 p-6 text-center text-sm text-gray-500">No funnel data available.</div>
            ) : (
              <div className="space-y-3">
                {conversionFunnel.map((item) => {
                  const count = Number(item.count || 0)
                  const width = Math.max((count / maxFunnelCount) * 100, count > 0 ? 4 : 0)
                  return (
                    <button key={item.stage} type="button" onClick={() => setStatus(item.stage)} className="block w-full text-left">
                      <div className="mb-1 flex items-center justify-between text-xs"><span className="font-semibold text-gray-700">{formatStatus(item.stage)}</span><span className="text-gray-500">{count} · {Number(item.overall_percentage || 0)}%</span></div>
                      <div className="h-2 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-gray-700" style={{ width: `${width}%` }} /></div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </section>

        {/* STEP 42 - LEAD AGING & SMART ALERTS */}
        <section className="mb-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4"><h2 className="text-lg font-bold text-gray-900">Lead Aging</h2><p className="mt-1 text-sm text-gray-500">Identify leads that have not been updated recently.</p></div>
            <div className="grid grid-cols-2 gap-3">
              <InsightCard title="Fresh" value={leadAging.fresh} description="0–2 days" />
              <InsightCard title="Attention" value={leadAging.attention} description="3–5 days" />
              <InsightCard title="Stale" value={leadAging.stale} description="6–7 days" />
              <InsightCard title="Critical" value={leadAging.critical} description="8+ days" />
            </div>
            <p className="mt-4 text-xs text-gray-500">{totalAgingLeads} active leads classified by age.</p>
            {staleLeads.length > 0 && (
              <div className="mt-4 space-y-2">
                {staleLeads.slice(0, 5).map((lead) => (
                  <Link key={lead.id} to={`/leads/${lead.id}`} className="flex items-center justify-between rounded-lg border border-gray-100 p-3 hover:bg-gray-50">
                    <div><p className="text-sm font-semibold text-gray-800">{lead.name}</p><p className="text-xs text-gray-500">{lead.status} · Score {lead.score}</p></div>
                    <span className="text-xs font-bold text-gray-600">{lead.age_days}d</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4"><h2 className="text-lg font-bold text-gray-900">Smart Sales Alerts</h2><p className="mt-1 text-sm text-gray-500">Signals that may require sales attention.</p></div>
            {salesAlerts.length === 0 ? (
              <div className="rounded-xl bg-gray-50 p-6 text-center text-sm text-gray-500">No active sales alerts.</div>
            ) : (
              <div className="space-y-3">
                {salesAlerts.map((alert, index) => (
                  <div key={`${alert.type || "alert"}-${index}`} className="rounded-xl border border-gray-200 p-4">
                    <div className="flex items-start gap-3"><AlertCircle size={18} className="mt-0.5 text-gray-600" /><div><p className="font-semibold text-gray-900">{alert.title}</p><p className="mt-1 text-sm text-gray-500">{alert.description}</p></div></div>
                  </div>
                ))}
              </div>
            )}
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


        {/* SOURCE ANALYTICS */}
        <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-gray-900">
              Lead Sources
            </h2>

            <p className="text-sm text-gray-500">
              Understand where your leads are coming from.
            </p>
          </div>

          {analyticsLoading ? (
            <div className="py-8 text-center text-sm text-gray-500">
              Loading source analytics...
            </div>
          ) : sourceAnalytics.length === 0 ? (
            <div className="rounded-xl bg-gray-50 p-6 text-center text-sm text-gray-500">
              No source analytics available.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {sourceAnalytics.map((item, index) => {
                const name =
                  item.source ||
                  item.name ||
                  item.label ||
                  "Unknown"

                const count =
                  Number(
                    item.count ??
                      item.total ??
                      item.leads ??
                      item.value ??
                      0
                  )

                return (
                  <div
                    key={`${name}-${index}`}
                    className="rounded-xl border border-gray-200 p-4"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {name}
                    </p>

                    <p className="mt-2 text-2xl font-bold text-gray-900">
                      {count}
                    </p>

                    <p className="mt-1 text-xs text-gray-500">
                      leads
                    </p>
                  </div>
                )
              })}
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
                Complete, reschedule or cancel pending sales follow-ups.
              </p>
            </div>

            <span className="text-sm font-semibold text-gray-600">
              {
                followUps.filter(
                  (followUp) =>
                    String(followUp.status || "").toUpperCase() === "PENDING"
                ).length
              }{" "}
              pending follow-ups
            </span>
          </div>

          {followUpsLoading ? (
            <div className="py-8 text-center text-sm text-gray-500">
              Loading follow-ups...
            </div>
          ) : !followUps.some(
              (followUp) =>
                String(followUp.status || "").toUpperCase() === "PENDING"
            ) ? (
            <div className="rounded-xl bg-gray-50 p-6 text-center text-sm text-gray-500">
              No pending follow-ups available.
            </div>
          ) : (
            <div className="space-y-3">
              {followUps
                .filter(
                  (followUp) =>
                    String(followUp.status || "").toUpperCase() === "PENDING"
                )
                .sort(
                  (a, b) =>
                    new Date(a.scheduled_at || 0).getTime() -
                    new Date(b.scheduled_at || 0).getTime()
                )
                .slice(0, 5)
                .map((followUp) => {
                  const lead = leads.find(
                    (item) => Number(item.id) === Number(followUp.lead_id)
                  )
                  const timing = getFollowUpTiming(followUp)

                  return (
                    <div
                      key={followUp.id}
                      className="flex flex-col gap-3 rounded-xl border border-gray-200 p-4"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="flex items-start gap-3">
                          <div className="rounded-lg bg-gray-100 p-2">
                            <CalendarClock size={17} className="text-gray-700" />
                          </div>

                          <div>
                            <p className="font-semibold text-gray-900">
                              {lead?.name || `Lead #${followUp.lead_id}`}
                            </p>
                            <p className="mt-1 text-sm text-gray-600">
                              {followUp.action ||
                                followUp.reason ||
                                "Follow up with lead"}
                            </p>
                            {followUp.scheduled_at && (
                              <p className="mt-1 text-xs text-gray-500">
                                Scheduled: {formatDate(followUp.scheduled_at)}
                              </p>
                            )}
                            {followUp.notes && (
                              <p className="mt-1 text-xs text-gray-500">
                                Note: {followUp.notes}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
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
                              Open <ArrowRight size={13} />
                            </Link>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-3">
                        <button
                          type="button"
                          onClick={() => handleCompleteFollowUp(followUp)}
                          disabled={followUpActionLoading !== null}
                          className="rounded-lg bg-gray-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {followUpActionLoading === `complete-${followUp.id}`
                            ? "Completing..."
                            : "Complete"}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRescheduleFollowUp(followUp)}
                          disabled={followUpActionLoading !== null}
                          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {followUpActionLoading === `reschedule-${followUp.id}`
                            ? "Saving..."
                            : "Reschedule"}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleCancelFollowUp(followUp)}
                          disabled={followUpActionLoading !== null}
                          className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {followUpActionLoading === `cancel-${followUp.id}`
                            ? "Cancelling..."
                            : "Cancel"}
                        </button>
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