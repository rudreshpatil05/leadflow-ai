import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import {
  ArrowLeft,
  RefreshCw,
  Sparkles,
  Copy,
  Check,
  MessageCircle,
  Send,
} from "lucide-react"

import {
  getLead,
  qualifyLead,
  getLeadActivities,
  getLeadFollowUps,
  getLeadNextAction,
  getSalesCopilot,
  generateLeadMessage,
  getWhatsAppUrl,
  createLeadActivity
} from "../services/api"


const MESSAGE_TYPES = [
  {
    value: "initial_follow_up",
    label: "Initial Follow-up",
  },
  {
    value: "whatsapp_follow_up",
    label: "WhatsApp Follow-up",
  },
  {
    value: "property_recommendation",
    label: "Property Recommendation",
  },
  {
    value: "site_visit",
    label: "Site Visit Invitation",
  },
  {
    value: "budget_discussion",
    label: "Price / Budget Discussion",
  },
  {
    value: "re_engagement",
    label: "Re-engagement",
  },
  {
    value: "post_site_visit",
    label: "Post Site-Visit Follow-up",
  },
]


function LeadDetails() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [lead, setLead] = useState(null)
  const [activities, setActivities] = useState([])
  const [followUps, setFollowUps] = useState([])
  const [nextAction, setNextAction] = useState(null)

  const [copilot, setCopilot] = useState(null)
  const [copilotLoading, setCopilotLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  // AI Message Generator
  const [messageType, setMessageType] = useState("whatsapp_follow_up")
  const [generatedMessage, setGeneratedMessage] = useState(null)
  const [messageLoading, setMessageLoading] = useState(false)
  const [messageCopied, setMessageCopied] = useState(false)
  const [messageError, setMessageError] = useState("")


  /*
   * Load AI Sales Copilot
   */
  const loadSalesCopilot = async () => {
    if (!id) return

    try {
      setCopilotLoading(true)

      const data = await getSalesCopilot(id)

      setCopilot(data)
    } catch (error) {
      console.error("Failed to load Sales Copilot:", error)
      setCopilot(null)
    } finally {
      setCopilotLoading(false)
    }
  }
  const formatActivityType = (type) => {
  if (!type) return "Activity"

  return type
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

const formatActivityDate = (date) => {
  if (!date) return ""

  const parsedDate = new Date(date)

  if (Number.isNaN(parsedDate.getTime())) {
    return date
  }

  return parsedDate.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}
const openWhatsApp = async (message = "") => {
  if (!lead?.phone) return

  const whatsappUrl = getWhatsAppUrl(
    lead.phone,
    message
  )

  window.open(
    whatsappUrl,
    "_blank",
    "noopener,noreferrer"
  )

  try {
    await createLeadActivity(
      lead.id,
      "WHATSAPP_OPENED",
      "WhatsApp conversation opened from Lead Details."
    )

    const updatedActivities = await getLeadActivities(lead.id)
    setActivities(updatedActivities)
  } catch (error) {
    console.error("Failed to record WhatsApp activity:", error)
  }
}
  /*
   * Generate AI Message
   */
  const handleGenerateMessage = async () => {
    if (!id) return

    try {
      setMessageLoading(true)
      setMessageError("")
      setGeneratedMessage(null)
      setMessageCopied(false)

      const data = await generateLeadMessage(
        id,
        messageType
      )

      setGeneratedMessage(data)
    } catch (error) {
      console.error(
        "Failed to generate AI message:",
        error
      )

      setMessageError(
        error.response?.data?.detail ||
        "Failed to generate AI message."
      )
    } finally {
      setMessageLoading(false)
    }
  }


  /*
   * Copy generated AI message
   */
  const copyGeneratedMessage = async () => {
    if (!generatedMessage?.message) return

    try {
      await navigator.clipboard.writeText(
        generatedMessage.message
      )

      setMessageCopied(true)

      setTimeout(() => {
        setMessageCopied(false)
      }, 2000)
    } catch (error) {
      console.error(
        "Failed to copy generated message:",
        error
      )
    }
  }


  /*
   * Load lead details
   */
  useEffect(() => {
    const loadLeadDetails = async () => {
      try {
        const [
          leadData,
          activitiesData,
          followUpsData,
          nextActionData,
        ] = await Promise.all([
          getLead(id),
          getLeadActivities(id),
          getLeadFollowUps(id),
          getLeadNextAction(id),
        ])

        setLead(leadData)
        setActivities(activitiesData)
        setFollowUps(followUpsData)
        setNextAction(nextActionData)

      } catch (error) {
        console.error(
          "Failed to load lead details:",
          error
        )
      }
    }

    if (id) {
      loadLeadDetails()
      loadSalesCopilot()
    }
  }, [id])


  /*
   * Copy Sales Copilot WhatsApp message
   */
  const copyWhatsAppMessage = async () => {
    if (!copilot?.whatsapp_message) return

    try {
      await navigator.clipboard.writeText(
        copilot.whatsapp_message
      )

      setCopied(true)

      setTimeout(() => {
        setCopied(false)
      }, 2000)

    } catch (error) {
      console.error(
        "Failed to copy WhatsApp message:",
        error
      )
    }
  }


  /*
   * Loading state
   */
  if (!lead) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-slate-500">
            Loading lead...
          </p>
        </div>
      </div>
    )
  }


  return (
    <div className="min-h-screen bg-slate-50">

      {/* Header */}
      <header className="border-b bg-white px-8 py-5">
        <div className="mx-auto max-w-7xl">

          <button
            onClick={() => navigate(-1)}
            className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
          >
            <ArrowLeft size={17} />
            Back
          </button>

          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">

            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                {lead.name || "Unnamed Lead"}
              </h1>

              <p className="text-sm text-slate-500">
                Lead #{lead.id}
              </p>
            </div>

            <div className="flex items-center gap-3">

              <span className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700">
                {lead.status || "NEW"}
              </span>

              {lead.temperature && (
                <span
                  className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
                    lead.temperature === "HOT"
                      ? "bg-red-100 text-red-700"
                      : lead.temperature === "WARM"
                        ? "bg-orange-100 text-orange-700"
                        : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {lead.temperature}
                </span>
              )}

            </div>

          </div>

        </div>
      </header>


      <main className="mx-auto max-w-7xl space-y-6 p-8">

        {/* Top Information Cards */}
        <div className="grid gap-6 lg:grid-cols-3">

          {/* Lead Information */}
          <div className="rounded-xl bg-white p-6 shadow-sm">

            <h2 className="mb-4 text-lg font-semibold text-slate-900">
              Lead Information
            </h2>

            <div className="space-y-3 text-sm">

              <p>
                <strong>Phone:</strong>{" "}
                {lead.phone || "-"}
              </p>

              <p>
                <strong>Email:</strong>{" "}
                {lead.email || "-"}
              </p>

              <p>
                <strong>Source:</strong>{" "}
                {lead.source || "-"}
              </p>

              <p>
                <strong>Score:</strong>{" "}
                {lead.score ?? "-"}
              </p>

              <p>
                <strong>Temperature:</strong>{" "}
                {lead.temperature || "-"}
              </p>

              <p>
                <strong>Intent:</strong>{" "}
                {lead.intent || "-"}
              </p>

            </div>

          </div>


          {/* Property Requirements */}
          <div className="rounded-xl bg-white p-6 shadow-sm">

            <h2 className="mb-4 text-lg font-semibold text-slate-900">
              Property Requirements
            </h2>

            <div className="space-y-3 text-sm">

              <p>
                <strong>Property:</strong>{" "}
                {lead.property_type || "-"}
              </p>

              <p>
                <strong>Configuration:</strong>{" "}
                {lead.configuration || "-"}
              </p>

              <p>
                <strong>Location:</strong>{" "}
                {lead.location || "-"}
              </p>

              <p>
                <strong>Budget:</strong>{" "}
                {lead.budget_max
                  ? `₹${Number(
                      lead.budget_max
                    ).toLocaleString("en-IN")}`
                  : "-"}
              </p>

              <p>
                <strong>Timeline:</strong>{" "}
                {lead.timeline || "-"}
              </p>

              <p>
                <strong>Purpose:</strong>{" "}
                {lead.purpose || "-"}
              </p>

              <p>
                <strong>Down Payment:</strong>{" "}
                {lead.down_payment
                  ? `₹${Number(
                      lead.down_payment
                    ).toLocaleString("en-IN")}`
                  : "-"}
              </p>

              <p>
                <strong>Financing:</strong>{" "}
                {lead.financing_required === null ||
                lead.financing_required === undefined
                  ? "-"
                  : lead.financing_required
                    ? "Required"
                    : "Not Required"}
              </p>

            </div>

          </div>


          {/* Next Best Action */}
          <div className="rounded-xl bg-white p-6 shadow-sm">

            <h2 className="mb-4 text-lg font-semibold text-slate-900">
              Next Best Action
            </h2>

            {nextAction ? (

              <div className="space-y-3">

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Priority
                  </p>

                  <p className="mt-1 font-semibold text-slate-900">
                    {nextAction.priority || "-"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Action
                  </p>

                  <p className="mt-1 text-sm text-slate-700">
                    {nextAction.action || "-"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Channel
                  </p>

                  <p className="mt-1 text-sm font-medium text-slate-700">
                    {nextAction.channel || "-"}
                  </p>
                </div>

                {nextAction.reason && (
                  <p className="border-t pt-3 text-sm leading-6 text-slate-500">
                    {nextAction.reason}
                  </p>
                )}

              </div>

            ) : (

              <p className="text-sm text-slate-500">
                No pending action.
              </p>

            )}

          </div>

        </div>


        {/* AI Sales Copilot */}
        <div className="overflow-hidden rounded-2xl border border-violet-200 bg-white shadow-sm">

          {/* Copilot Header */}
          <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-5 text-white">

            <div className="flex items-center justify-between gap-4">

              <div className="flex items-center gap-3">

                <div className="rounded-xl bg-white/20 p-2">
                  <Sparkles size={22} />
                </div>

                <div>

                  <h2 className="text-lg font-semibold">
                    AI Sales Copilot
                  </h2>

                  <p className="text-sm text-violet-100">
                    AI-powered guidance for your next sales conversation
                  </p>

                </div>

              </div>


              <button
                onClick={loadSalesCopilot}
                disabled={copilotLoading}
                className="flex items-center gap-2 rounded-lg bg-white/15 px-3 py-2 text-sm font-medium transition hover:bg-white/25 disabled:cursor-not-allowed disabled:opacity-60"
              >

                <RefreshCw
                  size={16}
                  className={
                    copilotLoading
                      ? "animate-spin"
                      : ""
                  }
                />

                Refresh AI

              </button>

            </div>

          </div>


          {/* Copilot Content */}
          <div className="p-6">

            {copilotLoading ? (

              <div className="flex items-center justify-center gap-3 py-12 text-slate-500">

                <RefreshCw
                  size={20}
                  className="animate-spin"
                />

                <span>
                  Generating AI sales recommendations...
                </span>

              </div>

            ) : copilot ? (

              <div className="space-y-6">

                {/* Summary */}
                <div>

                  <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
                    Lead Summary
                  </h3>

                  <p className="leading-7 text-slate-700">
                    {copilot.summary || "-"}
                  </p>

                </div>


                {/* Priority */}
                <div>

                  <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
                    AI Priority
                  </h3>

                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${
                      copilot.priority === "HIGH"
                        ? "bg-red-100 text-red-700"
                        : copilot.priority === "MEDIUM"
                          ? "bg-orange-100 text-orange-700"
                          : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {copilot.priority || "NORMAL"}
                  </span>

                </div>


                {/* Talking Points */}
                <div>

                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
                    Talking Points
                  </h3>

                  <div className="grid gap-3 md:grid-cols-3">

                    {copilot.talking_points?.map(
                      (point, index) => (

                        <div
                          key={index}
                          className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                        >

                          <div className="mb-3 flex h-7 w-7 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700">
                            {index + 1}
                          </div>

                          <p className="text-sm leading-6 text-slate-700">
                            {point}
                          </p>

                        </div>

                      )
                    )}

                  </div>

                </div>


                {/* Sales Strategy */}
                <div>

                  <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
                    Recommended Sales Strategy
                  </h3>

                  <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4">

                    <p className="text-sm leading-6 text-indigo-950">
                      {copilot.sales_strategy || "-"}
                    </p>

                  </div>

                </div>


                {/* WhatsApp Message */}
                <div>

                  <div className="mb-3 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">

                    <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                      Personalized WhatsApp Message
                    </h3>

                    <button
                      onClick={copyWhatsAppMessage}
                      className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    >

                      {copied ? (
                        <>
                          <Check size={16} />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy size={16} />
                          Copy Message
                        </>
                      )}

                    </button>

                  </div>


                  <div className="rounded-xl border border-green-200 bg-green-50 p-5">

                    <div className="mb-3 flex items-center gap-2 text-green-700">

                      <MessageCircle size={19} />

                      <span className="text-sm font-semibold">
                        WhatsApp
                      </span>

                    </div>

                    <p className="whitespace-pre-line text-sm leading-7 text-slate-700">
                      {copilot.whatsapp_message || "-"}
                    </p>

                  </div>

                </div>

              </div>

            ) : (

              <div className="py-10 text-center">

                <Sparkles
                  size={30}
                  className="mx-auto mb-3 text-slate-300"
                />

                <p className="text-sm text-slate-500">
                  Sales Copilot information is unavailable.
                </p>

                <button
                  onClick={loadSalesCopilot}
                  className="mt-4 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-700"
                >
                  Generate AI Recommendations
                </button>

              </div>

            )}

          </div>

        </div>


        {/* ================================================= */}
        {/* AI MESSAGE GENERATOR */}
        {/* ================================================= */}

        <div className="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm">

          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-5 text-white">

            <div className="flex items-center gap-3">

              <div className="rounded-xl bg-white/20 p-2">
                <Send size={22} />
              </div>

              <div>

                <h2 className="text-lg font-semibold">
                  AI Message Generator
                </h2>

                <p className="text-sm text-emerald-100">
                  Generate context-specific messages for this lead
                </p>

              </div>

            </div>

          </div>


          {/* Generator Content */}
          <div className="p-6">

            <div className="grid gap-6 lg:grid-cols-3">

              {/* Message Type */}
              <div className="lg:col-span-1">

                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Message Type
                </label>

                <select
                  value={messageType}
                  onChange={(event) =>
                    setMessageType(event.target.value)
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                >

                  {MESSAGE_TYPES.map((type) => (
                    <option
                      key={type.value}
                      value={type.value}
                    >
                      {type.label}
                    </option>
                  ))}

                </select>


                <button
                  onClick={handleGenerateMessage}
                  disabled={messageLoading}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >

                  {messageLoading ? (
                    <>
                      <RefreshCw
                        size={17}
                        className="animate-spin"
                      />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles size={17} />
                      Generate AI Message
                    </>
                  )}

                </button>


                {messageError && (
                  <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">

                    <p className="text-sm leading-6 text-red-700">
                      {messageError}
                    </p>

                  </div>
                )}

              </div>


              {/* Generated Message */}
              <div className="lg:col-span-2">

                {!generatedMessage && !messageLoading && (
                  <div className="flex min-h-[220px] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50">

                    <div className="text-center">

                      <MessageCircle
                        size={32}
                        className="mx-auto mb-3 text-slate-300"
                      />

                      <p className="text-sm font-medium text-slate-500">
                        Your AI-generated message will appear here
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        Select a message type and click Generate
                      </p>

                    </div>

                  </div>
                )}


                {messageLoading && (
                  <div className="flex min-h-[220px] items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50">

                    <div className="text-center">

                      <RefreshCw
                        size={30}
                        className="mx-auto mb-3 animate-spin text-emerald-600"
                      />

                      <p className="text-sm font-medium text-emerald-700">
                        AI is generating your message...
                      </p>

                    </div>

                  </div>
                )}


                {generatedMessage && !messageLoading && (
                  <div className="rounded-xl border border-green-200 bg-green-50 p-5">

                    <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">

                      <div>

                        <div className="flex items-center gap-2 text-green-700">

                          <MessageCircle size={19} />

                          <span className="text-sm font-semibold">
                            {generatedMessage.message_type || "WhatsApp Message"}
                          </span>

                        </div>

                        {generatedMessage.subject && (
                          <p className="mt-1 text-xs text-slate-500">
                            {generatedMessage.subject}
                          </p>
                        )}

                      </div>


                      <button
                        onClick={copyGeneratedMessage}
                        className="flex items-center justify-center gap-2 rounded-lg border border-green-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-green-50"
                      >

                        {messageCopied ? (
                          <>
                            <Check size={16} />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy size={16} />
                            Copy Message
                          </>
                        )}

                      </button>

                    </div>


                    <div className="rounded-xl border border-green-100 bg-white p-5">

                      <p className="whitespace-pre-line text-sm leading-7 text-slate-700">
                        {generatedMessage.message || "-"}
                      </p>

                    </div>


                    {generatedMessage.sales_note && (
                      <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">

                        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-600">
                          Salesperson Note
                        </p>

                        <p className="text-sm leading-6 text-amber-900">
                          {generatedMessage.sales_note}
                        </p>

                      </div>
                    )}

                  </div>
                )}

              </div>

            </div>

          </div>

        </div>


        {/* AI Qualification + Follow Ups */}
        <div className="grid gap-6 lg:grid-cols-3">

          {/* AI Qualification */}
          <div className="rounded-xl bg-white p-6 shadow-sm lg:col-span-2">

            <h2 className="mb-4 text-lg font-semibold text-slate-900">
              AI Qualification
            </h2>

            <p className="whitespace-pre-line text-sm leading-7 text-slate-600">
              {lead.qualification_reasons ||
                "No qualification reasons available."}
            </p>

          </div>


          {/* Follow Ups */}
          <div className="rounded-xl bg-white p-6 shadow-sm">

            <h2 className="mb-4 text-lg font-semibold text-slate-900">
              Follow-ups
            </h2>

            <div className="space-y-4">

              {followUps.length === 0 ? (

                <p className="text-sm text-slate-500">
                  No follow-ups available.
                </p>

              ) : (

                followUps.map((followUp) => (

                  <div
                    key={followUp.id}
                    className="border-b border-slate-100 pb-3 last:border-0"
                  >

                    <p className="font-medium text-slate-800">
                      {followUp.action}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      {followUp.follow_up_type}
                    </p>

                    <p className="mt-1 text-xs font-medium text-slate-400">
                      {followUp.status}
                    </p>

                  </div>

                ))

              )}

            </div>

          </div>

        </div>


        {/* =============================== */}
        {/* ACTIVITY TIMELINE */}
        {/* =============================== */}

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Activity Timeline
              </h2>
              <p className="text-sm text-slate-500">
                Complete history of interactions and lead actions
              </p>
            </div>

            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              {activities.length} activities
            </span>
          </div>

          {activities.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center">
              <p className="text-sm text-slate-500">
                No activity recorded yet.
              </p>
            </div>
          ) : (
            <div className="relative ml-2 border-l border-slate-200">
              {activities.map((activity) => (
                <div
                  key={activity.id}
                  className="relative pb-7 pl-8 last:pb-0"
                >
                  {/* Timeline dot */}
                  <div className="absolute -left-[7px] top-1 h-3 w-3 rounded-full bg-blue-600 ring-4 ring-white" />

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {formatActivityType(activity.activity_type)}
                        </p>

                        {activity.description && (
                          <p className="mt-1 text-sm text-slate-600">
                            {activity.description}
                          </p>
                        )}
                      </div>

                      <span className="text-xs text-slate-400">
                        {formatActivityDate(activity.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
           )}
        </div>

      </main>
    </div>
  )
}

export default LeadDetails