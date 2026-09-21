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
} from "lucide-react"

import {
  getDashboardStats,
  getSourceAnalytics,
  getDashboardFollowUps,
  getLeads,
} from "../services/api"


/* =============================== */
/* INSIGHT CARD */
/* =============================== */

function InsightCard({ title, value, description }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">
        {title}
      </p>

      <p className="mt-2 text-3xl font-bold text-slate-900">
        {value}
      </p>

      <p className="mt-1 text-sm text-slate-500">
        {description}
      </p>
    </div>
  )
}


/* =============================== */
/* MAIN DASHBOARD */
/* =============================== */

function Dashboard() {
  const [stats, setStats] = useState({
    total_leads: 0,
    hot_leads: 0,
    warm_leads: 0,
    cold_leads: 0,
  })

  const [sourceAnalytics, setSourceAnalytics] = useState([])
  const [leads, setLeads] = useState([])

  const [search, setSearch] = useState("")
  const [temperature, setTemperature] = useState("ALL")
  const [status, setStatus] = useState("ALL")
  const [source, setSource] = useState("ALL")
  const [minScore, setMinScore] = useState("ALL")
  const [followUpFilter, setFollowUpFilter] = useState("ALL")
  const [sortBy, setSortBy] = useState("newest")

  const [followUps, setFollowUps] = useState([])

  const [followUpsLoading, setFollowUpsLoading] =
    useState(true)

  const [loading, setLoading] =
    useState(true)

  const [analyticsLoading, setAnalyticsLoading] =
    useState(true)


  /* =============================== */
  /* LOAD DASHBOARD */
  /* =============================== */

  const loadDashboard = async () => {
    try {
      setLoading(true)
      setAnalyticsLoading(true)
      setFollowUpsLoading(true)

      const [
        statsData,
        leadsData,
        analyticsData,
        followUpsData,
      ] = await Promise.all([
        getDashboardStats(),
        getLeads(),
        getSourceAnalytics(),
        getDashboardFollowUps(),
      ])

      setStats(statsData)

      setLeads(
        Array.isArray(leadsData)
          ? leadsData
          : []
      )

      setSourceAnalytics(
        Array.isArray(analyticsData)
          ? analyticsData
          : []
      )

      setFollowUps(
        Array.isArray(followUpsData)
          ? followUpsData
          : []
      )

    } catch (error) {
      console.error(
        "Failed to load dashboard:",
        error
      )

    } finally {
      setLoading(false)
      setAnalyticsLoading(false)
      setFollowUpsLoading(false)
    }
  }


  /* =============================== */
  /* INITIAL LOAD */
  /* =============================== */

  useEffect(() => {
    loadDashboard()
  }, [])


  /* =============================== */
  /* SALES INTELLIGENCE */
  /* =============================== */

  const salesInsights = useMemo(() => {
    const allLeads =
      Array.isArray(leads)
        ? leads
        : []


    const highIntent = allLeads.filter(
      (lead) =>
        lead.temperature === "HOT" ||
        Number(lead.score || 0) >= 80
    )


    const warmLeads = allLeads.filter(
      (lead) =>
        lead.temperature === "WARM"
    )


    const unqualified = allLeads.filter(
      (lead) =>
        !lead.temperature ||
        lead.temperature === "COLD" ||
        Number(lead.score || 0) < 40
    )


    const sourceCounts =
      allLeads.reduce(
        (acc, lead) => {
          const leadSource =
            lead.source || "Unknown"

          acc[leadSource] =
            (acc[leadSource] || 0) + 1

          return acc
        },
        {}
      )


    const topSource =
      Object.entries(sourceCounts)
        .sort(
          (a, b) =>
            b[1] - a[1]
        )[0] || null


    return {
      highIntentCount:
        highIntent.length,

      warmCount:
        warmLeads.length,

      unqualifiedCount:
        unqualified.length,

      topSource,
    }

  }, [leads])


  /* =============================== */
  /* FILTERED LEADS */
  /* =============================== */

  const filteredLeads = useMemo(() => {
    let result =
      Array.isArray(leads)
        ? [...leads]
        : []

  /* =============================== */
  /* PRIORITY SALES QUEUE */
  /* =============================== */

  const priorityQueue = useMemo(() => {
    const allLeads = Array.isArray(leads) ? leads : []

    const getPriority = (lead) => {
      const leadFollowUps = followUps.filter(
        (followUp) =>
          Number(followUp.lead_id) === Number(lead.id)
      )

      const hasDueFollowUp = leadFollowUps.some(
        (followUp) => followUp.timing === "DUE"
      )

      const score = Number(lead.score || 0)
      const temperature = lead.temperature

      if (
        temperature === "HOT" &&
        hasDueFollowUp
      ) {
        return {
          level: "URGENT",
          rank: 4,
        }
      }

      if (
        temperature === "HOT" ||
        score >= 80
      ) {
        return {
          level: "HIGH",
          rank: 3,
        }
      }

      if (
        (temperature === "WARM" &&
          hasDueFollowUp) ||
        score >= 60
      ) {
        return {
          level: "MEDIUM",
          rank: 2,
        }
      }

      if (temperature === "WARM") {
        return {
          level: "MEDIUM",
          rank: 2,
        }
      }

      return {
        level: "NORMAL",
        rank: 1,
      }
    }

    return allLeads
      .map((lead) => {
        const priority = getPriority(lead)

        const leadFollowUps = followUps.filter(
          (followUp) =>
            Number(followUp.lead_id) === Number(lead.id)
        )

        const dueFollowUp = leadFollowUps.find(
          (followUp) => followUp.timing === "DUE"
        )

        return {
          ...lead,
          priority: priority.level,
          priorityRank: priority.rank,
          dueFollowUp,
        }
      })
      .sort((a, b) => {
        if (b.priorityRank !== a.priorityRank) {
          return b.priorityRank - a.priorityRank
        }

        return (
          Number(b.score || 0) -
          Number(a.score || 0)
        )
      })
      .slice(0, 10)
  }, [leads, followUps])


    /* =============================== */
    /* SEARCH */
    /* =============================== */

    if (search.trim()) {
      const query =
        search.toLowerCase()

      result =
        result.filter((lead) =>
          [
            lead.name,
            lead.email,
            lead.phone,
            lead.location,
            lead.configuration,
          ]
            .filter(Boolean)
            .some((value) =>
              String(value)
                .toLowerCase()
                .includes(query)
            )
        )
    }


    /* =============================== */
    /* TEMPERATURE FILTER */
    /* =============================== */

    if (temperature !== "ALL") {
      result =
        result.filter(
          (lead) =>
            lead.temperature ===
            temperature
        )
    }


    /* =============================== */
    /* STATUS FILTER */
    /* =============================== */

    if (status !== "ALL") {
      result =
        result.filter(
          (lead) =>
            lead.status === status
        )
    }


    /* =============================== */
    /* SOURCE FILTER */
    /* =============================== */

    if (source !== "ALL") {
      result =
        result.filter(
          (lead) =>
            lead.source === source
        )
    }


    /* =============================== */
    /* MINIMUM SCORE FILTER */
    /* =============================== */

    if (minScore !== "ALL") {
      const minimum =
        Number(minScore)

      result =
        result.filter(
          (lead) =>
            Number(
              lead.score || 0
            ) >= minimum
        )
    }


    /* =============================== */
    /* FOLLOW-UP FILTER */
    /* =============================== */

    if (
      followUpFilter !== "ALL"
    ) {
      result =
        result.filter((lead) => {

          const hasFollowUp =
            followUps.some(
              (followUp) =>
                Number(
                  followUp.lead_id
                ) ===
                Number(lead.id)
            )

          if (
            followUpFilter ===
            "HAS_FOLLOW_UP"
          ) {
            return hasFollowUp
          }

          if (
            followUpFilter ===
            "NO_FOLLOW_UP"
          ) {
            return !hasFollowUp
          }

          return true
        })
    }


    /* =============================== */
    /* SORTING */
    /* =============================== */

    if (
      sortBy ===
      "score-high"
    ) {
      result.sort(
        (a, b) =>
          (b.score ?? 0) -
          (a.score ?? 0)
      )
    }


    if (
      sortBy ===
      "score-low"
    ) {
      result.sort(
        (a, b) =>
          (a.score ?? 0) -
          (b.score ?? 0)
      )
    }


    if (
      sortBy ===
      "newest"
    ) {
      result.sort(
        (a, b) =>
          new Date(
            b.created_at
          ) -
          new Date(
            a.created_at
          )
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
    followUps,
    sortBy,
  ])


  /* =============================== */
  /* RENDER */
  /* =============================== */

  return (
    <div className="min-h-screen bg-slate-50">


      {/* =============================== */}
      {/* HEADER */}
      {/* =============================== */}

      <header className="border-b bg-white px-8 py-5">

        <div className="flex items-center justify-between">

          <div>

            <h1 className="text-2xl font-bold text-slate-900">
              LeadFlow AI
            </h1>

            <p className="text-sm text-slate-500">
              AI-Powered Real Estate CRM
            </p>

          </div>


          <button
            onClick={loadDashboard}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
          >

            <RefreshCw
              size={16}
              className={
                loading
                  ? "animate-spin"
                  : ""
              }
            />

            Refresh

          </button>

        </div>

      </header>


      <main className="p-8">


        {/* =============================== */}
        {/* STATISTICS */}
        {/* =============================== */}

        <div className="grid grid-cols-1 gap-5 md:grid-cols-4">

          <StatCard
            title="Total Leads"
            value={stats.total_leads}
            icon={<Users size={20} />}
          />

          <StatCard
            title="HOT Leads"
            value={stats.hot_leads}
            icon={<Flame size={20} />}
          />

          <StatCard
            title="WARM Leads"
            value={stats.warm_leads}
            icon={<Thermometer size={20} />}
          />

          <StatCard
            title="COLD Leads"
            value={stats.cold_leads}
            icon={<Snowflake size={20} />}
          />

        </div>


        {/* =============================== */}
        {/* SALES INTELLIGENCE */}
        {/* =============================== */}

        <section className="mt-8">

          <div className="mb-4">

            <h2 className="text-lg font-semibold text-slate-900">
              Sales Intelligence
            </h2>

            <p className="text-sm text-slate-500">
              Quick signals from your current lead pipeline
            </p>

          </div>


          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">

            <InsightCard
              title="High Intent Leads"
              value={
                salesInsights.highIntentCount
              }
              description="Hot or score 80+"
            />


            <InsightCard
              title="Warm Leads"
              value={
                salesInsights.warmCount
              }
              description="Leads requiring follow-up"
            />


            <InsightCard
              title="Needs Attention"
              value={
                salesInsights.unqualifiedCount
              }
              description="Cold or low-score leads"
            />


            <InsightCard
              title="Top Lead Source"
              value={
                salesInsights.topSource?.[0] ||
                "N/A"
              }
              description={
                salesInsights.topSource
                  ? `${salesInsights.topSource[1]} leads`
                  : "No lead source data"
              }
            />

          </div>

        </section>


        {/* =============================== */}
        {/* SOURCE ANALYTICS */}
        {/* =============================== */}

        <div className="mt-8 rounded-xl bg-white shadow-sm">

          <div className="border-b px-6 py-5">

            <div className="flex items-center gap-3">

              <div className="rounded-lg bg-slate-100 p-2">

                <BarChart3
                  size={20}
                  className="text-slate-600"
                />

              </div>


              <div>

                <h2 className="text-lg font-semibold text-slate-900">
                  Lead Source Analytics
                </h2>

                <p className="text-sm text-slate-500">
                  Understand where your leads are coming from
                </p>

              </div>

            </div>

          </div>


          <div className="overflow-x-auto">

            <table className="w-full text-left">

              <thead className="border-b bg-slate-50">

                <tr>

                  <th className="px-6 py-4 text-sm font-medium">
                    Source
                  </th>

                  <th className="px-6 py-4 text-sm font-medium">
                    Total
                  </th>

                  <th className="px-6 py-4 text-sm font-medium">
                    HOT
                  </th>

                  <th className="px-6 py-4 text-sm font-medium">
                    WARM
                  </th>

                  <th className="px-6 py-4 text-sm font-medium">
                    COLD
                  </th>

                </tr>

              </thead>


              <tbody>

                {analyticsLoading ? (

                  <tr>

                    <td
                      colSpan="5"
                      className="px-6 py-10 text-center text-sm text-slate-500"
                    >
                      Loading source analytics...
                    </td>

                  </tr>

                ) : sourceAnalytics.length === 0 ? (

                  <tr>

                    <td
                      colSpan="5"
                      className="px-6 py-10 text-center text-sm text-slate-500"
                    >
                      No source data available.
                    </td>

                  </tr>

                ) : (

                  sourceAnalytics.map(
                    (item) => (

                      <tr
                        key={item.source}
                        className="border-b last:border-b-0 hover:bg-slate-50"
                      >

                        <td className="px-6 py-4">

                          <span className="font-medium text-slate-900">
                            {item.source}
                          </span>

                        </td>


                        <td className="px-6 py-4 font-semibold">
                          {item.total}
                        </td>


                        <td className="px-6 py-4">

                          <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-700">
                            {item.hot}
                          </span>

                        </td>


                        <td className="px-6 py-4">

                          <span className="rounded-full bg-yellow-100 px-3 py-1 text-sm font-medium text-yellow-700">
                            {item.warm}
                          </span>

                        </td>


                        <td className="px-6 py-4">

                          <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700">
                            {item.cold}
                          </span>

                        </td>

                      </tr>

                    )
                  )

                )}

              </tbody>

            </table>

          </div>

        </div>


        {/* =============================== */}
        {/* FOLLOW-UP MANAGEMENT */}
        {/* =============================== */}

        <div className="mt-8 rounded-xl bg-white shadow-sm">

          <div className="border-b px-6 py-5">

            <div className="flex items-center gap-3">

              <div className="rounded-lg bg-slate-100 p-2">

                <RefreshCw
                  size={20}
                  className="text-slate-600"
                />

              </div>


              <div>

                <h2 className="text-lg font-semibold text-slate-900">
                  Follow-up Management
                </h2>

                <p className="text-sm text-slate-500">
                  Track pending and upcoming lead follow-ups
                </p>

              </div>

            </div>

          </div>


          <div className="overflow-x-auto">

            <table className="w-full text-left">

              <thead className="border-b bg-slate-50">

                <tr>

                  <th className="px-6 py-4 text-sm font-medium">
                    Lead
                  </th>

                  <th className="px-6 py-4 text-sm font-medium">
                    Temperature
                  </th>

                  <th className="px-6 py-4 text-sm font-medium">
                    Follow-up
                  </th>

                  <th className="px-6 py-4 text-sm font-medium">
                    Scheduled
                  </th>

                  <th className="px-6 py-4 text-sm font-medium">
                    Action
                  </th>

                </tr>

              </thead>


              <tbody>

                {followUpsLoading ? (

                  <tr>

                    <td
                      colSpan="5"
                      className="px-6 py-10 text-center text-sm text-slate-500"
                    >
                      Loading follow-ups...
                    </td>

                  </tr>

                ) : followUps.length === 0 ? (

                  <tr>

                    <td
                      colSpan="5"
                      className="px-6 py-10 text-center text-sm text-slate-500"
                    >
                      No pending follow-ups.
                    </td>

                  </tr>

                ) : (

                  followUps.map(
                    (followUp) => (

                      <tr
                        key={followUp.id}
                        className="border-b last:border-b-0 hover:bg-slate-50"
                      >

                        <td className="px-6 py-4">

                          <Link
                            to={`/leads/${followUp.lead_id}`}
                            className="font-medium hover:underline"
                          >
                            {followUp.lead_name ||
                              "Unknown Lead"}
                          </Link>

                          <div className="text-sm text-slate-500">
                            {followUp.phone ||
                              "-"}
                          </div>

                        </td>


                        <td className="px-6 py-4">

                          <TemperatureBadge
                            temperature={
                              followUp.temperature
                            }
                          />

                        </td>


                        <td className="px-6 py-4">

                          <div className="font-medium">
                            {
                              followUp.follow_up_type
                            }
                          </div>

                          <div className="text-sm text-slate-500">
                            {
                              followUp.status
                            }
                          </div>

                        </td>


                        <td className="px-6 py-4">

                          <div
                            className={
                              followUp.timing ===
                              "DUE"
                                ? "font-semibold text-red-600"
                                : "font-medium text-slate-700"
                            }
                          >

                            {followUp.timing ===
                            "DUE"
                              ? "Due Now"
                              : "Upcoming"}

                          </div>


                          <div className="text-sm text-slate-500">

                            {followUp.scheduled_at
                              ? new Date(
                                  followUp.scheduled_at
                                ).toLocaleString()
                              : "-"}

                          </div>

                        </td>


                        <td className="px-6 py-4">

                          <div className="text-sm text-slate-700">
                            {followUp.action}
                          </div>


                          {followUp.reason && (

                            <div className="mt-1 text-xs text-slate-400">
                              {followUp.reason}
                            </div>

                          )}

                        </td>

                      </tr>

                    )
                  )

                )}

              </tbody>

            </table>

          </div>


          <div className="border-t px-6 py-4 text-sm text-slate-500">

            {followUps.length} pending follow-up
            {followUps.length === 1
              ? ""
              : "s"}

          </div>

        </div>

  {/* =============================== */}
  {/* PRIORITY SALES QUEUE */}
  {/* =============================== */}

  <div className="mt-8 rounded-xl bg-white shadow-sm">

    <div className="border-b px-6 py-5">

      <div>
        <h2 className="text-lg font-semibold text-slate-900">
          Priority Sales Queue
        </h2>

        <p className="text-sm text-slate-500">
          Leads that should receive sales attention first
        </p>
      </div>

    </div>

    <div className="overflow-x-auto">

      <table className="w-full text-left">

        <thead className="border-b bg-slate-50">

          <tr>

            <th className="px-6 py-4 text-sm font-medium">
              Priority
            </th>

            <th className="px-6 py-4 text-sm font-medium">
              Lead
            </th>

            <th className="px-6 py-4 text-sm font-medium">
              Score
            </th>

            <th className="px-6 py-4 text-sm font-medium">
              Temperature
            </th>

            <th className="px-6 py-4 text-sm font-medium">
              Follow-up
            </th>

            <th className="px-6 py-4 text-sm font-medium">
              Next Action
            </th>

          </tr>

        </thead>

        <tbody>

          {priorityQueue.length === 0 ? (

            <tr>

              <td
                colSpan="6"
                className="px-6 py-10 text-center text-sm text-slate-500"
              >
                No leads available for prioritization.
              </td>

            </tr>

          ) : (

            priorityQueue.map((lead) => (

              <tr
                key={lead.id}
                className="border-b last:border-b-0 hover:bg-slate-50"
              >

                {/* PRIORITY */}

                <td className="px-6 py-4">

                  <PriorityBadge
                    priority={lead.priority}
                  />

                </td>


                {/* LEAD */}

                <td className="px-6 py-4">

                  <Link
                    to={`/leads/${lead.id}`}
                    className="font-medium text-slate-900 hover:underline"
                  >
                    {lead.name || "Unnamed Lead"}
                  </Link>

                  <div className="text-sm text-slate-500">
                    {lead.phone ||
                      lead.email ||
                      "-"}
                  </div>

                </td>


                {/* SCORE */}

                <td className="px-6 py-4">

                  <span className="font-semibold">
                    {lead.score ?? 0}
                  </span>

                  <span className="text-sm text-slate-400">
                    /100
                  </span>

                </td>


                {/* TEMPERATURE */}

                <td className="px-6 py-4">

                  <TemperatureBadge
                    temperature={
                      lead.temperature
                    }
                  />

                </td>


                {/* FOLLOW-UP */}

                <td className="px-6 py-4">

                  {lead.dueFollowUp ? (

                    <span className="font-semibold text-red-600">
                      Due Now
                    </span>

                  ) : (

                    <span className="text-sm text-slate-500">
                      No due follow-up
                    </span>

                  )}

                </td>


                {/* NEXT ACTION */}

                <td className="px-6 py-4">

                  <span className="text-sm text-slate-700">
                    {lead.next_best_action ||
                      "Qualify and contact lead"}
                  </span>

                </td>

              </tr>

            ))

          )}

        </tbody>

      </table>

    </div>

    <div className="border-t px-6 py-4 text-sm text-slate-500">
      Showing {priorityQueue.length} priority lead
      {priorityQueue.length === 1 ? "" : "s"}
    </div>

  </div>
        {/* =============================== */}
        {/* LEAD MANAGEMENT */}
        {/* =============================== */}

        <div className="mt-8 rounded-xl bg-white shadow-sm">

          <div className="border-b px-6 py-5">

            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

              <div>

                <h2 className="text-lg font-semibold">
                  Lead Management
                </h2>

                <p className="text-sm text-slate-500">
                  Search, filter and manage AI-qualified leads
                </p>

              </div>


              <div className="flex flex-col gap-3 sm:flex-row">

                {/* SEARCH */}

                <div className="relative">

                  <Search
                    size={18}
                    className="absolute left-3 top-2.5 text-slate-400"
                  />

                  <input
                    type="text"
                    placeholder="Search leads..."
                    value={search}
                    onChange={(e) =>
                      setSearch(
                        e.target.value
                      )
                    }
                    className="rounded-lg border py-2 pl-10 pr-4 text-sm outline-none focus:ring-2"
                  />

                </div>


                {/* TEMPERATURE */}

                <select
                  value={temperature}
                  onChange={(e) =>
                    setTemperature(
                      e.target.value
                    )
                  }
                  className="rounded-lg border px-3 py-2 text-sm outline-none"
                >

                  <option value="ALL">
                    All Leads
                  </option>

                  <option value="HOT">
                    HOT
                  </option>

                  <option value="WARM">
                    WARM
                  </option>

                  <option value="COLD">
                    COLD
                  </option>

                </select>


                {/* SORT */}

                <select
                  value={sortBy}
                  onChange={(e) =>
                    setSortBy(
                      e.target.value
                    )
                  }
                  className="rounded-lg border px-3 py-2 text-sm outline-none"
                >

                  <option value="newest">
                    Newest
                  </option>

                  <option value="score-high">
                    Highest Score
                  </option>

                  <option value="score-low">
                    Lowest Score
                  </option>

                </select>

              </div>

            </div>

          </div>




          {/* TABLE */}

          <div className="overflow-x-auto">

            <table className="w-full text-left">

              <thead className="border-b bg-slate-50">

                <tr>

                  <th className="px-6 py-4 text-sm font-medium">
                    Lead
                  </th>

                  <th className="px-6 py-4 text-sm font-medium">
                    Requirement
                  </th>

                  <th className="px-6 py-4 text-sm font-medium">
                    Score
                  </th>

                  <th className="px-6 py-4 text-sm font-medium">
                    Temperature
                  </th>

                  <th className="px-6 py-4 text-sm font-medium">
                    Next Action
                  </th>

                </tr>

              </thead>


              <tbody>

                {loading ? (

                  <tr>

                    <td
                      colSpan="5"
                      className="px-6 py-10 text-center text-sm text-slate-500"
                    >
                      Loading leads...
                    </td>

                  </tr>

                ) : filteredLeads.length === 0 ? (

                  <tr>

                    <td
                      colSpan="5"
                      className="px-6 py-10 text-center text-sm text-slate-500"
                    >
                      No leads found.
                    </td>

                  </tr>

                ) : (

                  filteredLeads.map(
                    (lead) => (

                      <tr
                        key={lead.id}
                        className="border-b hover:bg-slate-50"
                      >

                        {/* LEAD */}

                        <td className="px-6 py-4">

                          <Link
                            to={`/leads/${lead.id}`}
                            className="font-medium hover:underline"
                          >
                            {lead.name}
                          </Link>

                          <div className="text-sm text-slate-500">
                            {lead.email ||
                              lead.phone ||
                              "-"}
                          </div>

                        </td>


                        {/* REQUIREMENT */}

                        <td className="px-6 py-4">

                          <div className="font-medium">
                            {lead.configuration ||
                              "-"}
                          </div>

                          <div className="text-sm text-slate-500">
                            {lead.location ||
                              "Location unavailable"}
                          </div>

                        </td>


                        {/* SCORE */}

                        <td className="px-6 py-4">

                          <span className="font-semibold">
                            {lead.score ??
                              "-"}
                          </span>

                          {lead.score != null && (

                            <span className="text-sm text-slate-400">
                              /100
                            </span>

                          )}

                        </td>


                        {/* TEMPERATURE */}

                        <td className="px-6 py-4">

                          <TemperatureBadge
                            temperature={
                              lead.temperature
                            }
                          />

                        </td>


                        {/* ACTION */}

                        <td className="px-6 py-4">

                          <span className="text-sm text-slate-600">
                            {lead.next_best_action ||
                              "No action yet"}
                          </span>

                        </td>

                      </tr>

                    )
                  )

                )}

              </tbody>

            </table>

          </div>


          {/* RESULT COUNT */}

          <div className="border-t px-6 py-4 text-sm text-slate-500">

            Showing{" "}
            {filteredLeads.length}{" "}
            of{" "}
            {leads.length}{" "}
            leads

          </div>

        </div>

      </main>

    </div>
  )
}


/* =============================== */
/* STAT CARD */
/* =============================== */

function StatCard({
  title,
  value,
  icon,
}) {
  return (

    <div className="rounded-xl bg-white p-6 shadow-sm">

      <div className="flex items-center justify-between">

        <p className="text-sm text-slate-500">
          {title}
        </p>

        <div className="text-slate-400">
          {icon}
        </div>

      </div>


      <h2 className="mt-2 text-3xl font-bold text-slate-900">
        {value}
      </h2>

    </div>

  )
}

/* =============================== */
/* PRIORITY BADGE */
/* =============================== */

function PriorityBadge({ priority }) {
  const styles = {
    URGENT:
      "bg-red-100 text-red-700 border-red-200",

    HIGH:
      "bg-orange-100 text-orange-700 border-orange-200",

    MEDIUM:
      "bg-yellow-100 text-yellow-700 border-yellow-200",

    NORMAL:
      "bg-slate-100 text-slate-600 border-slate-200",
  }

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-semibold ${
        styles[priority] ||
        styles.NORMAL
      }`}
    >
      {priority || "NORMAL"}
    </span>
  )
}
/* =============================== */
/* TEMPERATURE BADGE */
/* =============================== */

function TemperatureBadge({
  temperature,
}) {

  if (!temperature) {

    return (

      <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600">
        UNQUALIFIED
      </span>

    )

  }


  const styles = {

    HOT:
      "bg-red-100 text-red-700",

    WARM:
      "bg-yellow-100 text-yellow-700",

    COLD:
      "bg-blue-100 text-blue-700",

  }


  return (

    <span
      className={`rounded-full px-3 py-1 text-sm font-medium ${
        styles[temperature] ||
        "bg-slate-100 text-slate-600"
      }`}
    >
      {temperature}
    </span>

  )
}


export default Dashboard