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
  getLeads,
} from "../services/api"


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
  const [sortBy, setSortBy] = useState("newest")

  const [loading, setLoading] = useState(true)
  const [analyticsLoading, setAnalyticsLoading] = useState(true)

  const loadDashboard = async () => {
    try {
      setLoading(true)
      setAnalyticsLoading(true)

      const [statsData, leadsData, analyticsData] =
        await Promise.all([
          getDashboardStats(),
          getLeads(),
          getSourceAnalytics(),
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
    } catch (error) {
      console.error(
        "Failed to load dashboard:",
        error
      )
    } finally {
      setLoading(false)
      setAnalyticsLoading(false)
    }
  }


  useEffect(() => {
    loadDashboard()
  }, [])


  const filteredLeads = useMemo(() => {
    let result = Array.isArray(leads)
      ? [...leads]
      : []


    // ===============================
    // SEARCH
    // ===============================

    if (search.trim()) {
      const query = search.toLowerCase()

      result = result.filter((lead) =>
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


    // ===============================
    // TEMPERATURE FILTER
    // ===============================

    if (temperature !== "ALL") {
      result = result.filter(
        (lead) =>
          lead.temperature === temperature
      )
    }


    // ===============================
    // SORTING
    // ===============================

    if (sortBy === "score-high") {
      result.sort(
        (a, b) =>
          (b.score ?? 0) -
          (a.score ?? 0)
      )
    }

    if (sortBy === "score-low") {
      result.sort(
        (a, b) =>
          (a.score ?? 0) -
          (b.score ?? 0)
      )
    }

    if (sortBy === "newest") {
      result.sort(
        (a, b) =>
          new Date(b.created_at) -
          new Date(a.created_at)
      )
    }

    return result
  }, [
    leads,
    search,
    temperature,
    sortBy,
  ])


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
                      setSearch(e.target.value)
                    }
                    className="rounded-lg border py-2 pl-10 pr-4 text-sm outline-none focus:ring-2"
                  />

                </div>


                {/* TEMPERATURE */}

                <select
                  value={temperature}
                  onChange={(e) =>
                    setTemperature(e.target.value)
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
                    setSortBy(e.target.value)
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
                            {lead.score ?? "-"}
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
            Showing {filteredLeads.length} of{" "}
            {leads.length} leads
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