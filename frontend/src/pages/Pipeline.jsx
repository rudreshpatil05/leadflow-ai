import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import {
  RefreshCw,
  ArrowRight,
  Search,
  Phone,
  MapPin,
  IndianRupee,
  CalendarClock,
  Filter,
} from "lucide-react"

import {
  getLeads,
  updateLead,
  getDashboardFollowUps,
} from "../services/api"

const STATUSES = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "SITE_VISIT",
  "NEGOTIATION",
  "CONVERTED",
  "LOST",
]

function Pipeline() {
  const [leads, setLeads] = useState([])
  const [followUps, setFollowUps] = useState([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [draggedLead, setDraggedLead] = useState(null)
  const [updating, setUpdating] = useState(false)

  // Filters
  const [search, setSearch] = useState("")
  const [temperature, setTemperature] = useState("ALL")
  const [source, setSource] = useState("ALL")

  const loadLeads = async () => {
    try {
      setLoading(true)
      setError("")

      const [leadsData, followUpsData] = await Promise.all([
        getLeads(),
        getDashboardFollowUps(),
      ])

      setLeads(
        Array.isArray(leadsData)
          ? leadsData
          : []
      )

      setFollowUps(
        Array.isArray(followUpsData)
          ? followUpsData
          : []
      )
    } catch (err) {
      console.error(err)
      setError("Failed to load pipeline.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLeads()
  }, [])

  // ===============================
  // SOURCE OPTIONS
  // ===============================

  const sourceOptions = useMemo(() => {
    return [
      ...new Set(
        leads.map((lead) =>
          String(lead.source || "OTHER").toUpperCase()
        )
      ),
    ].sort()
  }, [leads])

  // ===============================
  // FOLLOW-UP MAP
  // ===============================

  const followUpMap = useMemo(() => {
    const map = {}

    followUps.forEach((followUp) => {
      if (!map[followUp.lead_id]) {
        map[followUp.lead_id] = followUp
      }
    })

    return map
  }, [followUps])

  // ===============================
  // FILTERED LEADS
  // ===============================

  const filteredLeads = useMemo(() => {
    let result = Array.isArray(leads)
      ? [...leads]
      : []

    // SEARCH
    if (search.trim()) {
      const query = search.toLowerCase()

      result = result.filter((lead) =>
        [
          lead.name,
          lead.phone,
          lead.email,
          lead.location,
          lead.configuration,
          lead.property_type,
        ]
          .filter(Boolean)
          .some((value) =>
            String(value)
              .toLowerCase()
              .includes(query)
          )
      )
    }

    // TEMPERATURE
    if (temperature !== "ALL") {
      result = result.filter(
        (lead) =>
          String(lead.temperature || "").toUpperCase() ===
          temperature
      )
    }

    // SOURCE
    if (source !== "ALL") {
      result = result.filter(
        (lead) =>
          String(lead.source || "OTHER").toUpperCase() ===
          source
      )
    }

    return result
  }, [
    leads,
    search,
    temperature,
    source,
  ])

  // ===============================
  // STATUS GROUPING
  // ===============================

  const getLeadsByStatus = (status) => {
    return filteredLeads.filter(
      (lead) =>
        String(lead.status || "NEW").toUpperCase() ===
        status
    )
  }

  // ===============================
  // TEMPERATURE STYLE
  // ===============================

  const getTemperatureClass = (temperature) => {
    switch (temperature) {
      case "HOT":
        return "bg-red-100 text-red-700"

      case "WARM":
        return "bg-orange-100 text-orange-700"

      case "COLD":
        return "bg-blue-100 text-blue-700"

      default:
        return "bg-slate-100 text-slate-600"
    }
  }

  // ===============================
  // STATUS STYLE
  // ===============================

  const getStatusClass = (status) => {
    switch (status) {
      case "NEW":
        return "bg-slate-100 text-slate-700"

      case "CONTACTED":
        return "bg-blue-100 text-blue-700"

      case "QUALIFIED":
        return "bg-violet-100 text-violet-700"

      case "SITE_VISIT":
        return "bg-cyan-100 text-cyan-700"

      case "NEGOTIATION":
        return "bg-orange-100 text-orange-700"

      case "CONVERTED":
        return "bg-emerald-100 text-emerald-700"

      case "LOST":
        return "bg-red-100 text-red-700"

      default:
        return "bg-slate-100 text-slate-600"
    }
  }

  // ===============================
  // BUDGET FORMAT
  // ===============================

  const formatBudget = (lead) => {
    const min = Number(lead.budget_min)
    const max = Number(lead.budget_max)

    if (!min && !max) {
      return null
    }

    const formatAmount = (amount) => {
      if (amount >= 10000000) {
        return `₹${(amount / 10000000).toFixed(2)} Cr`
      }

      if (amount >= 100000) {
        return `₹${(amount / 100000).toFixed(2)} L`
      }

      return `₹${amount.toLocaleString("en-IN")}`
    }

    if (min && max) {
      return `${formatAmount(min)} - ${formatAmount(max)}`
    }

    return formatAmount(max || min)
  }

  // ===============================
  // DRAG START
  // ===============================

  const handleDragStart = (lead) => {
    setDraggedLead(lead)
  }

  // ===============================
  // DROP
  // ===============================

  const handleDrop = async (newStatus) => {
    if (!draggedLead) return

    const oldStatus =
      String(draggedLead.status || "NEW").toUpperCase()

    if (oldStatus === newStatus) {
      setDraggedLead(null)
      return
    }

    try {
      setUpdating(true)
      setError("")

      const updatedLead = await updateLead(
        draggedLead.id,
        {
          status: newStatus,
        }
      )

      setLeads((currentLeads) =>
        currentLeads.map((lead) =>
          lead.id === draggedLead.id
            ? updatedLead
            : lead
        )
      )
    } catch (err) {
      console.error(err)
      setError("Failed to update lead status.")
    } finally {
      setUpdating(false)
      setDraggedLead(null)
    }
  }

  // ===============================
  // RENDER
  // ===============================

  return (
    <div className="min-h-screen bg-slate-50 p-6">

      <div className="mx-auto max-w-[1600px]">

        {/* HEADER */}
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

          <div>
            <div className="mb-1 text-sm font-medium text-slate-500">
              LeadFlow AI
            </div>

            <h1 className="text-3xl font-bold text-slate-900">
              Sales Pipeline
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Manage and track leads across the complete sales journey.
            </p>
          </div>

          <div className="flex gap-3">

            <Link
              to="/"
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Dashboard
            </Link>

            <button
              onClick={loadLeads}
              disabled={loading || updating}
              className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
            >
              <RefreshCw
                size={16}
                className={loading ? "animate-spin" : ""}
              />

              Refresh
            </button>

          </div>

        </div>

        {/* STATUS */}
        {updating && (
          <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
            Updating lead status...
          </div>
        )}

        {error && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* FILTER BAR */}
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">

          <div className="mb-3 flex items-center gap-2">
            <Filter
              size={17}
              className="text-slate-500"
            />

            <h2 className="text-sm font-semibold text-slate-700">
              Pipeline Filters
            </h2>

            <span className="ml-auto text-xs text-slate-400">
              Showing {filteredLeads.length} of {leads.length} leads
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">

            {/* SEARCH */}
            <div className="relative">
              <Search
                size={18}
                className="absolute left-3 top-2.5 text-slate-400"
              />

              <input
                type="text"
                placeholder="Search name, phone, email, location..."
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                className="w-full rounded-lg border border-slate-200 py-2 pl-10 pr-4 text-sm outline-none focus:ring-2"
              />
            </div>

            {/* TEMPERATURE */}
            <select
              value={temperature}
              onChange={(e) =>
                setTemperature(e.target.value)
              }
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none"
            >
              <option value="ALL">
                All Temperatures
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

            {/* SOURCE */}
            <select
              value={source}
              onChange={(e) =>
                setSource(e.target.value)
              }
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none"
            >
              <option value="ALL">
                All Sources
              </option>

              {sourceOptions.map((item) => (
                <option
                  key={item}
                  value={item}
                >
                  {item}
                </option>
              ))}
            </select>

          </div>

        </div>

        {/* PIPELINE */}
        {loading ? (

          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-500">
            Loading pipeline...
          </div>

        ) : (

          <div className="overflow-x-auto pb-4">

            <div className="grid min-w-[1500px] grid-cols-7 gap-4">

              {STATUSES.map((status) => {

                const statusLeads =
                  getLeadsByStatus(status)

                return (

                  <div
                    key={status}
                    onDragOver={(event) => {
                      event.preventDefault()
                    }}
                    onDrop={() => {
                      handleDrop(status)
                    }}
                    className="min-h-[650px] rounded-xl border border-slate-200 bg-slate-100 p-3"
                  >

                    {/* COLUMN HEADER */}
                    <div className="mb-4 flex items-center justify-between">

                      <div>
                        <h2 className="text-sm font-semibold text-slate-700">
                          {status.replace("_", " ")}
                        </h2>

                        <p className="mt-1 text-[11px] text-slate-400">
                          {status === "NEW" &&
                            "New enquiries"}

                          {status === "CONTACTED" &&
                            "Initial contact"}

                          {status === "QUALIFIED" &&
                            "Qualified prospects"}

                          {status === "SITE_VISIT" &&
                            "Property visits"}

                          {status === "NEGOTIATION" &&
                            "Active negotiations"}

                          {status === "CONVERTED" &&
                            "Successful deals"}

                          {status === "LOST" &&
                            "Closed lost"}
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClass(
                          status
                        )}`}
                      >
                        {statusLeads.length}
                      </span>

                    </div>

                    {/* CARDS */}
                    <div className="space-y-3">

                      {statusLeads.length === 0 ? (

                        <div className="rounded-lg border border-dashed border-slate-300 bg-white/50 p-5 text-center text-xs text-slate-400">
                          Drop lead here
                        </div>

                      ) : (

                        statusLeads.map((lead) => {

                          const followUp =
                            followUpMap[lead.id]

                          const budget =
                            formatBudget(lead)

                          return (

                            <div
                              key={lead.id}
                              draggable
                              onDragStart={() =>
                                handleDragStart(lead)
                              }
                              className="cursor-grab rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:cursor-grabbing"
                            >

                              {/* NAME + ARROW */}
                              <div className="mb-3 flex items-start justify-between gap-2">

                                <div className="min-w-0">

                                  <Link
                                    to={`/leads/${lead.id}`}
                                    className="block truncate font-semibold text-slate-900 hover:underline"
                                  >
                                    {lead.name ||
                                      "Unnamed Lead"}
                                  </Link>

                                  <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                                    <Phone size={12} />
                                    {lead.phone || "-"}
                                  </div>

                                </div>

                                <ArrowRight
                                  size={15}
                                  className="shrink-0 text-slate-400"
                                />

                              </div>

                              {/* TEMPERATURE + SCORE */}
                              <div className="flex items-center justify-between gap-2">

                                {lead.temperature ? (

                                  <span
                                    className={`rounded-full px-2 py-1 text-[11px] font-semibold ${getTemperatureClass(
                                      lead.temperature
                                    )}`}
                                  >
                                    {lead.temperature}
                                  </span>

                                ) : (

                                  <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-500">
                                    UNQUALIFIED
                                  </span>

                                )}

                                <span className="text-xs font-bold text-slate-700">
                                  Score {lead.score ?? 0}/100
                                </span>

                              </div>

                              {/* REQUIREMENT */}
                              {(lead.configuration ||
                                lead.property_type ||
                                lead.location) && (

                                <div className="mt-3 space-y-1 border-t border-slate-100 pt-3">

                                  {(lead.configuration ||
                                    lead.property_type) && (

                                    <div className="flex items-center gap-2 text-xs text-slate-600">
                                      <span className="font-medium">
                                        {lead.configuration ||
                                          lead.property_type}
                                      </span>
                                    </div>

                                  )}

                                  {lead.location && (
                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                      <MapPin size={12} />
                                      <span className="truncate">
                                        {lead.location}
                                      </span>
                                    </div>
                                  )}

                                  {budget && (
                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                      <IndianRupee size={12} />
                                      <span>
                                        {budget}
                                      </span>
                                    </div>
                                  )}

                                </div>

                              )}

                              {/* FOLLOW-UP */}
                              {followUp && (

                                <div
                                  className={`mt-3 rounded-lg px-3 py-2 ${
                                    followUp.timing === "DUE"
                                      ? "bg-red-50"
                                      : "bg-slate-50"
                                  }`}
                                >

                                  <div className="flex items-center gap-2">

                                    <CalendarClock
                                      size={13}
                                      className={
                                        followUp.timing === "DUE"
                                          ? "text-red-500"
                                          : "text-slate-500"
                                      }
                                    />

                                    <span
                                      className={`text-[11px] font-semibold ${
                                        followUp.timing === "DUE"
                                          ? "text-red-600"
                                          : "text-slate-600"
                                      }`}
                                    >
                                      {followUp.timing === "DUE"
                                        ? "FOLLOW-UP DUE"
                                        : "UPCOMING FOLLOW-UP"}
                                    </span>

                                  </div>

                                  <p className="mt-1 text-[11px] text-slate-500">
                                    {followUp.action}
                                  </p>

                                </div>

                              )}

                              {/* FOOTER */}
                              <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">

                                <span className="text-[11px] text-slate-400">
                                  {String(
                                    lead.source || "OTHER"
                                  ).toUpperCase()}
                                </span>

                                <Link
                                  to={`/leads/${lead.id}`}
                                  className="text-xs font-medium text-slate-700 hover:underline"
                                >
                                  View Lead
                                </Link>

                              </div>

                            </div>

                          )
                        })

                      )}

                    </div>

                  </div>

                )
              })}

            </div>

          </div>

        )}

      </div>

    </div>
  )
}

export default Pipeline