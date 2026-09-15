import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { RefreshCw, ArrowRight } from "lucide-react"
import { getLeads, updateLead } from "../services/api"

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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [draggedLead, setDraggedLead] = useState(null)
  const [updating, setUpdating] = useState(false)

  const loadLeads = async () => {
    try {
      setLoading(true)
      setError("")

      const data = await getLeads()
      setLeads(data)
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

  const getLeadsByStatus = (status) => {
    return leads.filter(
      (lead) =>
        (lead.status || "NEW").toUpperCase() === status
    )
  }

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

  const handleDragStart = (lead) => {
    setDraggedLead(lead)
  }

  const handleDrop = async (newStatus) => {
    if (!draggedLead) return

    const oldStatus =
      (draggedLead.status || "NEW").toUpperCase()

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

  return (
    <div className="min-h-screen bg-slate-50 p-6">

      <div className="mx-auto max-w-[1600px]">

        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

          <div>
            <div className="mb-1 text-sm font-medium text-slate-500">
              LeadFlow AI
            </div>

            <h1 className="text-3xl font-bold text-slate-900">
              Sales Pipeline
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Drag leads between stages to update the sales pipeline.
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
              <RefreshCw size={16} />
              Refresh
            </button>

          </div>

        </div>

        {/* Status */}
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

        {/* Pipeline */}
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
                    className="min-h-[600px] rounded-xl border border-slate-200 bg-slate-100 p-3"
                  >

                    {/* Column Header */}
                    <div className="mb-3 flex items-center justify-between">

                      <h2 className="text-sm font-semibold text-slate-700">
                        {status.replace("_", " ")}
                      </h2>

                      <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-slate-500">
                        {statusLeads.length}
                      </span>

                    </div>

                    {/* Cards */}
                    <div className="space-y-3">

                      {statusLeads.length === 0 ? (

                        <div className="rounded-lg border border-dashed border-slate-300 bg-white/50 p-5 text-center text-xs text-slate-400">
                          Drop lead here
                        </div>

                      ) : (

                        statusLeads.map((lead) => (

                          <div
                            key={lead.id}
                            draggable
                            onDragStart={() =>
                              handleDragStart(lead)
                            }
                            className="cursor-grab rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:cursor-grabbing"
                          >

                            <div className="mb-3 flex items-start justify-between gap-2">

                              <div>

                                <Link
                                  to={`/leads/${lead.id}`}
                                  className="font-semibold text-slate-900 hover:underline"
                                >
                                  {lead.name || "Unnamed Lead"}
                                </Link>

                                <p className="mt-1 text-xs text-slate-500">
                                  {lead.phone}
                                </p>

                              </div>

                              <ArrowRight
                                size={15}
                                className="text-slate-400"
                              />

                            </div>

                            {/* Temperature */}
                            {lead.temperature && (

                              <span
                                className={`inline-block rounded-full px-2 py-1 text-[11px] font-semibold ${getTemperatureClass(
                                  lead.temperature
                                )}`}
                              >
                                {lead.temperature}
                              </span>

                            )}

                            {/* Score */}
                            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">

                              <span className="text-xs text-slate-500">
                                AI Score
                              </span>

                              <span className="text-sm font-bold text-slate-900">
                                {lead.score ?? 0}/100
                              </span>

                            </div>

                            {/* Requirement */}
                            {(lead.configuration ||
                              lead.location) && (

                              <div className="mt-3 text-xs text-slate-500">

                                {lead.configuration && (
                                  <div>
                                    {lead.configuration}
                                  </div>
                                )}

                                {lead.location && (
                                  <div>
                                    {lead.location}
                                  </div>
                                )}

                              </div>

                            )}

                          </div>

                        ))

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