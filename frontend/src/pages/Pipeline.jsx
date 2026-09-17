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
  X,
  ChevronDown,
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

const TEMPERATURES = ["HOT", "WARM", "COLD"]

function Pipeline() {
  const [leads, setLeads] = useState([])
  const [followUps, setFollowUps] = useState([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [draggedLead, setDraggedLead] = useState(null)
  const [updating, setUpdating] = useState(false)
  const [updatingLeadId, setUpdatingLeadId] = useState(null)

  // ===============================
  // FILTERS
  // ===============================

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [temperature, setTemperature] = useState("ALL")
  const [source, setSource] = useState("ALL")

  // ===============================
  // LOAD PIPELINE
  // ===============================

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
      console.error("Failed to load pipeline:", err)
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
      const query = search.trim().toLowerCase()

      result = result.filter((lead) =>
        [
          lead.name,
          lead.phone,
          lead.email,
          lead.location,
          lead.configuration,
          lead.property_type,
          lead.source,
        ]
          .filter(Boolean)
          .some((value) =>
            String(value)
              .toLowerCase()
              .includes(query)
          )
      )
    }

    // STATUS
    if (statusFilter !== "ALL") {
      result = result.filter(
        (lead) =>
          String(lead.status || "NEW").toUpperCase() ===
          statusFilter
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
    statusFilter,
    temperature,
    source,
  ])

  // ===============================
  // PIPELINE COUNTS
  // ===============================

  const pipelineCounts = useMemo(() => {
    const counts = {}

    STATUSES.forEach((status) => {
      counts[status] = leads.filter(
        (lead) =>
          String(lead.status || "NEW").toUpperCase() ===
          status
      ).length
    })

    return counts
  }, [leads])

  const hotCount = useMemo(() => {
    return leads.filter(
      (lead) =>
        String(lead.temperature || "").toUpperCase() === "HOT"
    ).length
  }, [leads])

  const warmCount = useMemo(() => {
    return leads.filter(
      (lead) =>
        String(lead.temperature || "").toUpperCase() === "WARM"
    ).length
  }, [leads])

  const coldCount = useMemo(() => {
    return leads.filter(
      (lead) =>
        String(lead.temperature || "").toUpperCase() === "COLD"
    ).length
  }, [leads])

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
  // CLEAR FILTERS
  // ===============================

  const clearFilters = () => {
    setSearch("")
    setStatusFilter("ALL")
    setTemperature("ALL")
    setSource("ALL")
  }

  const hasActiveFilters =
    search.trim() !== "" ||
    statusFilter !== "ALL" ||
    temperature !== "ALL" ||
    source !== "ALL"

  // ===============================
  // TEMPERATURE STYLE
  // ===============================

  const getTemperatureClass = (value) => {
    const normalized = String(value || "").toUpperCase()

    switch (normalized) {
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
  // UPDATE LEAD STATUS
  // ===============================

  const updateLeadStatus = async (lead, newStatus) => {
    const currentStatus =
      String(lead.status || "NEW").toUpperCase()

    if (
      !newStatus ||
      currentStatus === newStatus
    ) {
      return
    }

    try {
      setUpdating(true)
      setUpdatingLeadId(lead.id)
      setError("")

      const updatedLead = await updateLead(
        lead.id,
        {
          status: newStatus,
        }
      )

      setLeads((currentLeads) =>
        currentLeads.map((item) =>
          item.id === lead.id
            ? updatedLead
            : item
        )
      )
    } catch (err) {
      console.error("Failed to update lead status:", err)
      setError("Failed to update lead status.")
    } finally {
      setUpdating(false)
      setUpdatingLeadId(null)
    }
  }

  // ===============================
  // UPDATE LEAD TEMPERATURE
  // ===============================

  const updateLeadTemperature = async (
    lead,
    newTemperature
  ) => {
    const currentTemperature =
      String(lead.temperature || "").toUpperCase()

    if (
      !newTemperature ||
      currentTemperature === newTemperature
    ) {
      return
    }

    try {
      setUpdating(true)
      setUpdatingLeadId(lead.id)
      setError("")

      const updatedLead = await updateLead(
        lead.id,
        {
          temperature: newTemperature,
        }
      )

      setLeads((currentLeads) =>
        currentLeads.map((item) =>
          item.id === lead.id
            ? updatedLead
            : item
        )
      )
    } catch (err) {
      console.error(
        "Failed to update lead temperature:",
        err
      )

      setError("Failed to update lead temperature.")
    } finally {
      setUpdating(false)
      setUpdatingLeadId(null)
    }
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
      String(
        draggedLead.status || "NEW"
      ).toUpperCase()

    if (oldStatus === newStatus) {
      setDraggedLead(null)
      return
    }

    try {
      setUpdating(true)
      setUpdatingLeadId(draggedLead.id)
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
      setUpdatingLeadId(null)
      setDraggedLead(null)
    }
  }

  // ===============================
  // STATUS LABEL
  // ===============================

  const getStatusDescription = (status) => {
    switch (status) {
      case "NEW":
        return "New enquiries"

      case "CONTACTED":
        return "Initial contact"

      case "QUALIFIED":
        return "Qualified prospects"

      case "SITE_VISIT":
        return "Property visits"

      case "NEGOTIATION":
        return "Active negotiations"

      case "CONVERTED":
        return "Successful deals"

      case "LOST":
        return "Closed lost"

      default:
        return ""
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

        {/* PIPELINE SUMMARY */}
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-8">

          <button
            onClick={() => setStatusFilter("ALL")}
            className={`rounded-xl border bg-white p-4 text-left shadow-sm transition hover:shadow-md ${
              statusFilter === "ALL"
                ? "border-slate-400 ring-2 ring-slate-100"
                : "border-slate-200"
            }`}
          >
            <p className="text-xs font-medium text-slate-500">
              Total Leads
            </p>

            <p className="mt-1 text-2xl font-bold text-slate-900">
              {leads.length}
            </p>
          </button>

          {STATUSES.slice(0, 3).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`rounded-xl border bg-white p-4 text-left shadow-sm transition hover:shadow-md ${
                statusFilter === status
                  ? "border-slate-400 ring-2 ring-slate-100"
                  : "border-slate-200"
              }`}
            >
              <p className="text-xs font-medium text-slate-500">
                {status.replace("_", " ")}
              </p>

              <p className="mt-1 text-2xl font-bold text-slate-900">
                {pipelineCounts[status]}
              </p>
            </button>
          ))}

          <button
            onClick={() => setTemperature("HOT")}
            className={`rounded-xl border bg-white p-4 text-left shadow-sm transition hover:shadow-md ${
              temperature === "HOT"
                ? "border-red-300 ring-2 ring-red-100"
                : "border-slate-200"
            }`}
          >
            <p className="text-xs font-medium text-red-600">
              HOT
            </p>

            <p className="mt-1 text-2xl font-bold text-slate-900">
              {hotCount}
            </p>
          </button>

          <button
            onClick={() => setTemperature("WARM")}
            className={`rounded-xl border bg-white p-4 text-left shadow-sm transition hover:shadow-md ${
              temperature === "WARM"
                ? "border-orange-300 ring-2 ring-orange-100"
                : "border-slate-200"
            }`}
          >
            <p className="text-xs font-medium text-orange-600">
              WARM
            </p>

            <p className="mt-1 text-2xl font-bold text-slate-900">
              {warmCount}
            </p>
          </button>

          <button
            onClick={() => setTemperature("COLD")}
            className={`rounded-xl border bg-white p-4 text-left shadow-sm transition hover:shadow-md ${
              temperature === "COLD"
                ? "border-blue-300 ring-2 ring-blue-100"
                : "border-slate-200"
            }`}
          >
            <p className="text-xs font-medium text-blue-600">
              COLD
            </p>

            <p className="mt-1 text-2xl font-bold text-slate-900">
              {coldCount}
            </p>
          </button>

          <button
            onClick={() => setStatusFilter("CONVERTED")}
            className={`rounded-xl border bg-white p-4 text-left shadow-sm transition hover:shadow-md ${
              statusFilter === "CONVERTED"
                ? "border-emerald-300 ring-2 ring-emerald-100"
                : "border-slate-200"
            }`}
          >
            <p className="text-xs font-medium text-emerald-600">
              CONVERTED
            </p>

            <p className="mt-1 text-2xl font-bold text-slate-900">
              {pipelineCounts.CONVERTED}
            </p>
          </button>

        </div>

        {/* STATUS */}
        {updating && (
          <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
            Updating lead...
          </div>
        )}

        {error && (
          <div className="mb-5 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">

            <span>{error}</span>

            <button
              onClick={() => setError("")}
              className="rounded p-1 hover:bg-red-100"
            >
              <X size={16} />
            </button>

          </div>
        )}

        {/* FILTER BAR */}
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">

          <div className="mb-3 flex flex-wrap items-center gap-2">

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

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">

            {/* SEARCH */}
            <div className="relative">

              <Search
                size={18}
                className="absolute left-3 top-2.5 text-slate-400"
              />

              <input
                type="text"
                placeholder="Search name, phone, email..."
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                className="w-full rounded-lg border border-slate-200 py-2 pl-10 pr-4 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              />

            </div>

            {/* STATUS */}
            <div className="relative">

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value)
                }
                className="w-full appearance-none rounded-lg border border-slate-200 px-3 py-2 pr-9 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              >
                <option value="ALL">
                  All Statuses
                </option>

                {STATUSES.map((status) => (
                  <option
                    key={status}
                    value={status}
                  >
                    {status.replace("_", " ")}
                  </option>
                ))}
              </select>

              <ChevronDown
                size={16}
                className="pointer-events-none absolute right-3 top-2.5 text-slate-400"
              />

            </div>

            {/* TEMPERATURE */}
            <div className="relative">

              <select
                value={temperature}
                onChange={(event) =>
                  setTemperature(event.target.value)
                }
                className="w-full appearance-none rounded-lg border border-slate-200 px-3 py-2 pr-9 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              >
                <option value="ALL">
                  All Temperatures
                </option>

                {TEMPERATURES.map((item) => (
                  <option
                    key={item}
                    value={item}
                  >
                    {item}
                  </option>
                ))}
              </select>

              <ChevronDown
                size={16}
                className="pointer-events-none absolute right-3 top-2.5 text-slate-400"
              />

            </div>

            {/* SOURCE */}
            <div className="relative">

              <select
                value={source}
                onChange={(event) =>
                  setSource(event.target.value)
                }
                className="w-full appearance-none rounded-lg border border-slate-200 px-3 py-2 pr-9 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
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

              <ChevronDown
                size={16}
                className="pointer-events-none absolute right-3 top-2.5 text-slate-400"
              />

            </div>

          </div>

          {/* ACTIVE FILTERS */}
          {hasActiveFilters && (
            <div className="mt-3 flex flex-wrap items-center gap-2">

              <span className="text-xs font-medium text-slate-500">
                Active filters:
              </span>

              {search.trim() && (
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                  Search: {search}
                </span>
              )}

              {statusFilter !== "ALL" && (
                <span className="rounded-full bg-violet-100 px-3 py-1 text-xs text-violet-700">
                  Status: {statusFilter.replace("_", " ")}
                </span>
              )}

              {temperature !== "ALL" && (
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${getTemperatureClass(
                    temperature
                  )}`}
                >
                  Temperature: {temperature}
                </span>
              )}

              {source !== "ALL" && (
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                  Source: {source}
                </span>
              )}

              <button
                onClick={clearFilters}
                className="ml-1 flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
              >
                <X size={13} />
                Clear filters
              </button>

            </div>
          )}

        </div>

        {/* PIPELINE */}
        {loading ? (

          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-500">
            Loading pipeline...
          </div>

        ) : filteredLeads.length === 0 ? (

          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm">

            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
              <Search
                size={22}
                className="text-slate-400"
              />
            </div>

            <h2 className="text-lg font-semibold text-slate-800">
              No leads found
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              No leads match your current search or filters.
            </p>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Clear Filters
              </button>
            )}

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
                    className={`min-h-[650px] rounded-xl border p-3 ${
                      draggedLead
                        ? "border-dashed border-slate-300 bg-slate-50"
                        : "border-slate-200 bg-slate-100"
                    }`}
                  >

                    {/* COLUMN HEADER */}
                    <div className="mb-4 flex items-center justify-between">

                      <div>
                        <h2 className="text-sm font-semibold text-slate-700">
                          {status.replace("_", " ")}
                        </h2>

                        <p className="mt-1 text-[11px] text-slate-400">
                          {getStatusDescription(status)}
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

                          const currentStatus =
                            String(
                              lead.status || "NEW"
                            ).toUpperCase()

                          const currentTemperature =
                            String(
                              lead.temperature || ""
                            ).toUpperCase()

                          const isUpdatingThisLead =
                            updatingLeadId === lead.id

                          return (

                            <div
                              key={lead.id}
                              draggable={!isUpdatingThisLead}
                              onDragStart={() =>
                                handleDragStart(lead)
                              }
                              className={`cursor-grab rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:cursor-grabbing ${
                                isUpdatingThisLead
                                  ? "opacity-60"
                                  : ""
                              }`}
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

                              {/* QUICK STATUS */}
                              <div className="mb-2">

                                <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-slate-400">
                                  Quick Status
                                </label>

                                <div className="relative">

                                  <select
                                    value={currentStatus}
                                    disabled={isUpdatingThisLead}
                                    onChange={(event) =>
                                      updateLeadStatus(
                                        lead,
                                        event.target.value
                                      )
                                    }
                                    className={`w-full appearance-none rounded-lg border border-slate-200 px-2.5 py-1.5 pr-8 text-[11px] font-semibold outline-none ${getStatusClass(
                                      currentStatus
                                    )}`}
                                  >
                                    {STATUSES.map(
                                      (item) => (
                                        <option
                                          key={item}
                                          value={item}
                                        >
                                          {item.replace(
                                            "_",
                                            " "
                                          )}
                                        </option>
                                      )
                                    )}
                                  </select>

                                  <ChevronDown
                                    size={13}
                                    className="pointer-events-none absolute right-2 top-2 text-slate-500"
                                  />

                                </div>

                              </div>

                              {/* TEMPERATURE + SCORE */}
                              <div className="flex items-center justify-between gap-2">

                                <div className="relative">

                                  {currentTemperature ? (

                                    <select
                                      value={
                                        currentTemperature
                                      }
                                      disabled={
                                        isUpdatingThisLead
                                      }
                                      onChange={(event) =>
                                        updateLeadTemperature(
                                          lead,
                                          event.target.value
                                        )
                                      }
                                      className={`appearance-none rounded-full border-0 px-2 py-1 pr-6 text-[11px] font-semibold outline-none ${getTemperatureClass(
                                        currentTemperature
                                      )}`}
                                    >
                                      {TEMPERATURES.map(
                                        (item) => (
                                          <option
                                            key={item}
                                            value={item}
                                          >
                                            {item}
                                          </option>
                                        )
                                      )}
                                    </select>

                                  ) : (

                                    <select
                                      value=""
                                      disabled={
                                        isUpdatingThisLead
                                      }
                                      onChange={(event) =>
                                        updateLeadTemperature(
                                          lead,
                                          event.target.value
                                        )
                                      }
                                      className="appearance-none rounded-full border-0 bg-slate-100 px-2 py-1 pr-6 text-[11px] font-semibold text-slate-500 outline-none"
                                    >
                                      <option value="">
                                        Temperature
                                      </option>

                                      {TEMPERATURES.map(
                                        (item) => (
                                          <option
                                            key={item}
                                            value={item}
                                          >
                                            {item}
                                          </option>
                                        )
                                      )}
                                    </select>

                                  )}

                                  <ChevronDown
                                    size={11}
                                    className="pointer-events-none absolute right-1.5 top-1.5 text-slate-500"
                                  />

                                </div>

                                <span className="text-xs font-bold text-slate-700">
                                  Score {lead.score ?? 0}/100
                                </span>

                              </div>

                              {/* REQUIREMENT */}
                              {(lead.configuration ||
                                lead.property_type ||
                                lead.location ||
                                budget) && (

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