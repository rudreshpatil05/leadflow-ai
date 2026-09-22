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
  X,
  CheckCircle2,
  XCircle,
} from "lucide-react"

import {
  getLead,
  updateLead,
  qualifyLead,
  getLeadActivities,
  getLeadFollowUps,
  completeFollowUp,
  createManualFollowUp,
  getLeadNextAction,
  getSalesCopilot,
  generateLeadMessage,
  getWhatsAppUrl,
  createLeadActivity,
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


const SALES_PIPELINE_STAGES = [
  "NEW",
  "QUALIFIED",
  "CONTACTED",
  "INTERESTED",
  "SITE_VISIT",
  "NEGOTIATION",
  "CONVERTED",
]


const LOST_REASONS = [
  "Budget mismatch",
  "Bought another property",
  "Location mismatch",
  "Timeline changed",
  "Financing issue",
  "Not interested",
  "Could not contact",
  "Duplicate lead",
  "Other",
]


const formatPipelineStage = (stage) => {
  if (!stage) return "NEW"

  return stage
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase())
}


function LeadDetails() {
  const { id } = useParams()
  const navigate = useNavigate()

  // =========================================================
  // LEAD STATE
  // =========================================================

  const [lead, setLead] = useState(null)

  const [editMode, setEditMode] = useState(false)

  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    source: "",
    status: "NEW",
    temperature: "",
    notes: "",
  })

  const [saveLoading, setSaveLoading] = useState(false)
  const [saveError, setSaveError] = useState("")
  const [saveSuccess, setSaveSuccess] = useState(false)

  // =========================================================
  // SALES PIPELINE STATE
  // =========================================================

  const [pipelineUpdating, setPipelineUpdating] = useState(false)
  const [pipelineError, setPipelineError] = useState("")
  const [pipelineSuccess, setPipelineSuccess] = useState("")

  // =========================================================
  // CONVERSION / LOST STATE
  // =========================================================

  const [showConversionModal, setShowConversionModal] =
    useState(false)

  const [showLostModal, setShowLostModal] =
    useState(false)

  const [conversionLoading, setConversionLoading] =
    useState(false)

  const [lostLoading, setLostLoading] =
    useState(false)

  const [conversionError, setConversionError] =
    useState("")

  const [lostError, setLostError] =
    useState("")

  const [conversionForm, setConversionForm] = useState({
    conversion_date: new Date().toISOString().slice(0, 16),
    deal_value: "",
    conversion_notes: "",
  })

  const [lostForm, setLostForm] = useState({
    lost_date: new Date().toISOString().slice(0, 16),
    lost_reason: "",
    lost_notes: "",
  })

  // =========================================================
  // LEAD INTELLIGENCE STATE
  // =========================================================

  const [activities, setActivities] = useState([])
  const [followUps, setFollowUps] = useState([])
  const [nextAction, setNextAction] = useState(null)

  // =========================================================
  // FOLLOW-UP MANAGEMENT STATE
  // =========================================================

  const [showFollowUpForm, setShowFollowUpForm] =
    useState(false)

  const [followUpLoading, setFollowUpLoading] =
    useState(false)

  const [followUpError, setFollowUpError] =
    useState("")

  const [followUpSuccess, setFollowUpSuccess] =
    useState("")

  const [completingFollowUpId, setCompletingFollowUpId] =
    useState(null)

  const [followUpForm, setFollowUpForm] = useState({
    follow_up_type: "CALL",
    scheduled_at: "",
    action: "",
    reason: "",
  })

  // =========================================================
  // SALES COPILOT STATE
  // =========================================================

  const [copilot, setCopilot] = useState(null)
  const [copilotLoading, setCopilotLoading] =
    useState(false)

  const [copied, setCopied] = useState(false)

  // =========================================================
  // AI MESSAGE GENERATOR STATE
  // =========================================================

  const [messageType, setMessageType] =
    useState("whatsapp_follow_up")

  const [generatedMessage, setGeneratedMessage] =
    useState(null)

  const [messageLoading, setMessageLoading] =
    useState(false)

  const [messageCopied, setMessageCopied] =
    useState(false)

  const [messageError, setMessageError] =
    useState("")


  // =========================================================
  // LOAD AI SALES COPILOT
  // =========================================================

  const loadSalesCopilot = async () => {
    if (!id) return

    try {
      setCopilotLoading(true)

      const data = await getSalesCopilot(id)

      setCopilot(data)
    } catch (error) {
      console.error(
        "Failed to load Sales Copilot:",
        error
      )

      setCopilot(null)
    } finally {
      setCopilotLoading(false)
    }
  }


  // =========================================================
  // FORMAT ACTIVITY TYPE
  // =========================================================

  const formatActivityType = (type) => {
    if (!type) return "Activity"

    return type
      .replaceAll("_", " ")
      .toLowerCase()
      .replace(/\b\w/g, (char) => char.toUpperCase())
  }


  // =========================================================
  // FORMAT ACTIVITY DATE
  // =========================================================

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


  // =========================================================
  // FOLLOW-UP DATE HELPERS
  // =========================================================

  const getFollowUpDate = (date) => {
    if (!date) return null

    const parsedDate = new Date(date)

    if (Number.isNaN(parsedDate.getTime())) {
      return null
    }

    return parsedDate
  }


  const isFollowUpOverdue = (followUp) => {
    if (!followUp || followUp.status !== "PENDING") {
      return false
    }

    const scheduledDate = getFollowUpDate(
      followUp.scheduled_at
    )

    if (!scheduledDate) {
      return false
    }

    return scheduledDate.getTime() < Date.now()
  }


  const getFollowUpStatus = (followUp) => {
    if (followUp.status === "COMPLETED") {
      return "COMPLETED"
    }

    if (isFollowUpOverdue(followUp)) {
      return "OVERDUE"
    }

    return "PENDING"
  }


  const formatFollowUpDate = (date) => {
    if (!date) return "Date not set"

    const parsedDate = getFollowUpDate(date)

    if (!parsedDate) {
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


  // =========================================================
  // START EDITING
  // =========================================================

  const startEditing = () => {
    if (!lead) return

    setEditForm({
      name: lead.name || "",
      email: lead.email || "",
      source: lead.source || "",
      status: lead.status || "NEW",
      temperature: lead.temperature || "",
      notes: lead.notes || "",
    })

    setSaveError("")
    setSaveSuccess(false)
    setEditMode(true)
  }


  // =========================================================
  // HANDLE EDIT FIELD CHANGE
  // =========================================================

  const handleEditChange = (event) => {
    const { name, value } = event.target

    setEditForm((current) => ({
      ...current,
      [name]: value,
    }))
  }


  // =========================================================
  // SAVE LEAD
  // =========================================================

  const handleSaveLead = async (event) => {
    event.preventDefault()

    if (!lead) return

    try {
      setSaveLoading(true)
      setSaveError("")
      setSaveSuccess(false)

      const oldStatus = lead.status
      const oldTemperature = lead.temperature

      const updatedLead = await updateLead(lead.id, {
        name: editForm.name,
        email: editForm.email || null,
        source: editForm.source || null,
        status: editForm.status,
        temperature: editForm.temperature || null,
        notes: editForm.notes || null,
      })

      setLead(updatedLead)
      setEditMode(false)
      setSaveSuccess(true)

      if (
        oldStatus !== editForm.status ||
        oldTemperature !== editForm.temperature
      ) {
        try {
          const updatedActivities =
            await getLeadActivities(lead.id)

          setActivities(updatedActivities)
        } catch (activityError) {
          console.error(
            "Failed to refresh activities:",
            activityError
          )
        }
      }

      setTimeout(() => {
        setSaveSuccess(false)
      }, 2500)
    } catch (error) {
      console.error(
        "Failed to update lead:",
        error
      )

      setSaveError(
        error.response?.data?.detail ||
          "Failed to update lead."
      )
    } finally {
      setSaveLoading(false)
    }
  }


  // =========================================================
  // OPEN CONVERSION MODAL
  // =========================================================

  const openConversionModal = () => {
    setConversionError("")

    setConversionForm({
      conversion_date:
        lead?.conversion_date
          ? new Date(lead.conversion_date)
              .toISOString()
              .slice(0, 16)
          : new Date()
              .toISOString()
              .slice(0, 16),

      deal_value:
        lead?.deal_value !== null &&
        lead?.deal_value !== undefined
          ? String(lead.deal_value)
          : "",

      conversion_notes:
        lead?.conversion_notes || "",
    })

    setShowConversionModal(true)
  }


  // =========================================================
  // OPEN LOST MODAL
  // =========================================================

  const openLostModal = () => {
    setLostError("")

    setLostForm({
      lost_date:
        lead?.lost_date
          ? new Date(lead.lost_date)
              .toISOString()
              .slice(0, 16)
          : new Date()
              .toISOString()
              .slice(0, 16),

      lost_reason:
        lead?.lost_reason || "",

      lost_notes:
        lead?.lost_notes || "",
    })

    setShowLostModal(true)
  }


  // =========================================================
  // HANDLE CONVERSION FORM CHANGE
  // =========================================================

  const handleConversionChange = (event) => {
    const { name, value } = event.target

    setConversionForm((current) => ({
      ...current,
      [name]: value,
    }))
  }


  // =========================================================
  // HANDLE LOST FORM CHANGE
  // =========================================================

  const handleLostChange = (event) => {
    const { name, value } = event.target

    setLostForm((current) => ({
      ...current,
      [name]: value,
    }))
  }


  // =========================================================
  // CONVERT LEAD
  // =========================================================

  const handleConvertLead = async (event) => {
    event.preventDefault()

    if (!lead) return

    if (!conversionForm.conversion_date) {
      setConversionError(
        "Please select the conversion date."
      )

      return
    }

    if (
      !conversionForm.deal_value ||
      Number(conversionForm.deal_value) <= 0
    ) {
      setConversionError(
        "Please enter a valid deal value."
      )

      return
    }

    try {
      setConversionLoading(true)
      setConversionError("")
      setPipelineError("")
      setPipelineSuccess("")

      const updatedLead = await updateLead(
        lead.id,
        {
          status: "CONVERTED",
          conversion_date:
            conversionForm.conversion_date,
          deal_value:
            Number(conversionForm.deal_value),
          conversion_notes:
            conversionForm.conversion_notes.trim() ||
            null,
          lost_date: null,
          lost_reason: null,
          lost_notes: null,
        }
      )

      setLead(updatedLead)

      await createLeadActivity(
        lead.id,
        "LEAD_CONVERTED",
        `Lead converted successfully. Deal value: ₹${Number(
          conversionForm.deal_value
        ).toLocaleString("en-IN")}.`
      )

      const updatedActivities =
        await getLeadActivities(lead.id)

      setActivities(updatedActivities)

      setShowConversionModal(false)

      setPipelineSuccess(
        "Lead converted successfully."
      )

      setTimeout(() => {
        setPipelineSuccess("")
      }, 3500)
    } catch (error) {
      console.error(
        "Failed to convert lead:",
        error
      )

      setConversionError(
        error.response?.data?.detail ||
          "Failed to convert lead."
      )
    } finally {
      setConversionLoading(false)
    }
  }


  // =========================================================
  // MARK LEAD AS LOST
  // =========================================================

  const handleMarkLeadLost = async (event) => {
    event.preventDefault()

    if (!lead) return

    if (!lostForm.lost_date) {
      setLostError(
        "Please select the lost date."
      )

      return
    }

    if (!lostForm.lost_reason) {
      setLostError(
        "Please select a lost reason."
      )

      return
    }

    try {
      setLostLoading(true)
      setLostError("")
      setPipelineError("")
      setPipelineSuccess("")

      const updatedLead = await updateLead(
        lead.id,
        {
          status: "LOST",
          lost_date: lostForm.lost_date,
          lost_reason: lostForm.lost_reason,
          lost_notes:
            lostForm.lost_notes.trim() ||
            null,
          conversion_date: null,
          deal_value: null,
          conversion_notes: null,
        }
      )

      setLead(updatedLead)

      await createLeadActivity(
        lead.id,
        "LEAD_LOST",
        `Lead marked as lost. Reason: ${lostForm.lost_reason}.`
      )

      const updatedActivities =
        await getLeadActivities(lead.id)

      setActivities(updatedActivities)

      setShowLostModal(false)

      setPipelineSuccess(
        "Lead marked as lost successfully."
      )

      setTimeout(() => {
        setPipelineSuccess("")
      }, 3500)
    } catch (error) {
      console.error(
        "Failed to mark lead as lost:",
        error
      )

      setLostError(
        error.response?.data?.detail ||
          "Failed to mark lead as lost."
      )
    } finally {
      setLostLoading(false)
    }
  }


  // =========================================================
  // UPDATE SALES PIPELINE
  // =========================================================

  const handlePipelineChange = async (nextStatus) => {
    if (!lead || pipelineUpdating) return

    const currentStatus = String(
      lead.status || "NEW"
    ).toUpperCase()

    if (currentStatus === nextStatus) return

    // Conversion requires deal details.
    if (nextStatus === "CONVERTED") {
      openConversionModal()
      return
    }

    // Lost requires a reason/details.
    if (nextStatus === "LOST") {
      openLostModal()
      return
    }

    try {
      setPipelineUpdating(true)
      setPipelineError("")
      setPipelineSuccess("")

      const updatedLead = await updateLead(
        lead.id,
        {
          status: nextStatus,
        }
      )

      setLead(updatedLead)

      const updatedActivities =
        await getLeadActivities(lead.id)

      setActivities(updatedActivities)

      setPipelineSuccess(
        `Lead moved to ${formatPipelineStage(
          nextStatus
        )}.`
      )

      setTimeout(() => {
        setPipelineSuccess("")
      }, 2500)
    } catch (error) {
      console.error(
        "Failed to update sales pipeline:",
        error
      )

      setPipelineError(
        error.response?.data?.detail ||
          "Failed to update sales pipeline."
      )
    } finally {
      setPipelineUpdating(false)
    }
  }


  // =========================================================
  // OPEN WHATSAPP
  // =========================================================

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

      const updatedActivities =
        await getLeadActivities(lead.id)

      setActivities(updatedActivities)
    } catch (error) {
      console.error(
        "Failed to record WhatsApp activity:",
        error
      )
    }
  }


  // =========================================================
  // GENERATE AI MESSAGE
  // =========================================================

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


  // =========================================================
  // COPY GENERATED MESSAGE
  // =========================================================

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


  // =========================================================
  // FOLLOW-UP FORM CHANGE
  // =========================================================

  const handleFollowUpFormChange = (event) => {
    const { name, value } = event.target

    setFollowUpForm((previous) => ({
      ...previous,
      [name]: value,
    }))
  }


  // =========================================================
  // CREATE MANUAL FOLLOW-UP
  // =========================================================

  const handleCreateManualFollowUp = async (event) => {
    event.preventDefault()

    if (
      !followUpForm.scheduled_at ||
      !followUpForm.action.trim()
    ) {
      setFollowUpError(
        "Please provide a scheduled date/time and action."
      )

      setFollowUpSuccess("")

      return
    }

    try {
      setFollowUpLoading(true)
      setFollowUpError("")
      setFollowUpSuccess("")

      await createManualFollowUp(
        id,
        followUpForm.follow_up_type,
        followUpForm.scheduled_at,
        followUpForm.action.trim(),
        followUpForm.reason.trim()
      )

      const [
        updatedFollowUps,
        updatedActivities,
      ] = await Promise.all([
        getLeadFollowUps(id),
        getLeadActivities(id),
      ])

      setFollowUps(updatedFollowUps)
      setActivities(updatedActivities)

      setFollowUpForm({
        follow_up_type: "CALL",
        scheduled_at: "",
        action: "",
        reason: "",
      })

      setShowFollowUpForm(false)

      setFollowUpSuccess(
        "Follow-up created successfully."
      )

      setTimeout(() => {
        setFollowUpSuccess("")
      }, 3000)
    } catch (error) {
      console.error(
        "Failed to create follow-up:",
        error
      )

      setFollowUpError(
        error.response?.data?.detail ||
          "Failed to create follow-up."
      )
    } finally {
      setFollowUpLoading(false)
    }
  }


  // =========================================================
  // COMPLETE FOLLOW-UP
  // =========================================================

  const handleCompleteFollowUp = async (
    followUpId
  ) => {
    try {
      setCompletingFollowUpId(followUpId)
      setFollowUpError("")
      setFollowUpSuccess("")

      const result =
        await completeFollowUp(followUpId)

      const [
        updatedFollowUps,
        updatedActivities,
        updatedNextAction,
      ] = await Promise.all([
        getLeadFollowUps(id),
        getLeadActivities(id),
        getLeadNextAction(id),
      ])

      setFollowUps(updatedFollowUps)
      setActivities(updatedActivities)
      setNextAction(updatedNextAction)

      if (result?.next_follow_up) {
        setFollowUpSuccess(
          "Follow-up completed. Next follow-up created automatically."
        )
      } else {
        setFollowUpSuccess(
          "Follow-up completed successfully."
        )
      }

      setTimeout(() => {
        setFollowUpSuccess("")
      }, 3500)
    } catch (error) {
      console.error(
        "Failed to complete follow-up:",
        error
      )

      setFollowUpError(
        error.response?.data?.detail ||
          "Failed to complete follow-up."
      )
    } finally {
      setCompletingFollowUpId(null)
    }
  }


  // =========================================================
  // LOAD LEAD DETAILS
  // =========================================================

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


  // =========================================================
  // COPY SALES COPILOT WHATSAPP MESSAGE
  // =========================================================

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


  // =========================================================
  // LOADING STATE
  // =========================================================

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


  const currentPipelineStatus = String(
    lead.status || "NEW"
  ).toUpperCase()


  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ===================================================== */}
      {/* HEADER */}
      {/* ===================================================== */}

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


            <div className="flex flex-wrap items-center gap-3">

              <button
                onClick={startEditing}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Edit Lead
              </button>


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


      {/* ===================================================== */}
      {/* EDIT LEAD PANEL */}
      {/* ===================================================== */}

      {editMode && (
        <div className="border-b border-blue-100 bg-blue-50 px-8 py-6">
          <div className="mx-auto max-w-7xl">

            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Edit Lead
                </h2>

                <p className="text-sm text-slate-500">
                  Update salesperson-managed lead information.
                </p>
              </div>
            </div>


            {saveError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="text-sm text-red-700">
                  {saveError}
                </p>
              </div>
            )}


            <form
              onSubmit={handleSaveLead}
              className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
            >

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Name
                </label>

                <input
                  name="name"
                  value={editForm.name}
                  onChange={handleEditChange}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="Lead name"
                />
              </div>


              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Email
                </label>

                <input
                  type="email"
                  name="email"
                  value={editForm.email}
                  onChange={handleEditChange}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="Email address"
                />
              </div>


              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Source
                </label>

                <input
                  name="source"
                  value={editForm.source}
                  onChange={handleEditChange}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="WEBSITE"
                />
              </div>


              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Status
                </label>

                <select
                  name="status"
                  value={editForm.status}
                  onChange={handleEditChange}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="NEW">NEW</option>
                  <option value="CONTACTED">CONTACTED</option>
                  <option value="QUALIFIED">QUALIFIED</option>
                  <option value="INTERESTED">INTERESTED</option>
                  <option value="SITE_VISIT">SITE VISIT</option>
                  <option value="NEGOTIATION">NEGOTIATION</option>
                  <option value="CONVERTED">CONVERTED</option>
                  <option value="LOST">LOST</option>
                </select>
              </div>


              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Temperature
                </label>

                <select
                  name="temperature"
                  value={editForm.temperature}
                  onChange={handleEditChange}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">Not Set</option>
                  <option value="HOT">HOT</option>
                  <option value="WARM">WARM</option>
                  <option value="COLD">COLD</option>
                </select>
              </div>


              <div className="md:col-span-2 lg:col-span-3">
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Sales Notes
                </label>

                <textarea
                  name="notes"
                  value={editForm.notes}
                  onChange={handleEditChange}
                  rows={4}
                  className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="Add salesperson notes..."
                />
              </div>


              <div className="flex flex-wrap gap-3 md:col-span-2 lg:col-span-3">

                <button
                  type="submit"
                  disabled={saveLoading}
                  className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saveLoading
                    ? "Saving..."
                    : "Save Changes"}
                </button>


                <button
                  type="button"
                  onClick={() => {
                    setEditMode(false)
                    setSaveError("")
                  }}
                  className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>

              </div>

            </form>

          </div>
        </div>
      )}


      {/* ===================================================== */}
      {/* MAIN CONTENT */}
      {/* ===================================================== */}

      <main className="mx-auto max-w-7xl space-y-6 p-8">


        {/* ================================================= */}
        {/* SALES PIPELINE */}
        {/* ================================================= */}

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

          <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-center">

            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Sales Pipeline
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Move this lead through the sales journey. Each change is recorded in the activity timeline.
              </p>
            </div>

            <span className="w-fit rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
              Current:{" "}
              {formatPipelineStage(
                lead.status
              )}
            </span>

          </div>


          {pipelineError && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-sm font-medium text-red-700">
                {pipelineError}
              </p>
            </div>
          )}


          {pipelineSuccess && (
            <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
              <p className="text-sm font-medium text-green-700">
                {pipelineSuccess}
              </p>
            </div>
          )}


          <div className="overflow-x-auto pb-2">

            <div className="flex min-w-max items-center gap-2">

              {SALES_PIPELINE_STAGES.map(
                (stage, index) => {

                  const isCurrent =
                    currentPipelineStatus ===
                    stage

                  const isCompleted =
                    SALES_PIPELINE_STAGES.indexOf(
                      currentPipelineStatus
                    ) >= index &&
                    currentPipelineStatus !==
                      "LOST"

                  return (
                    <div
                      key={stage}
                      className="flex items-center gap-2"
                    >

                      <button
                        type="button"
                        onClick={() =>
                          handlePipelineChange(
                            stage
                          )
                        }
                        disabled={
                          pipelineUpdating ||
                          isCurrent
                        }
                        className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                          isCurrent
                            ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                            : isCompleted
                              ? "border-blue-200 bg-blue-50 text-blue-700 hover:border-blue-300"
                              : "border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:bg-blue-50"
                        } disabled:cursor-not-allowed disabled:opacity-60`}
                      >
                        {formatPipelineStage(
                          stage
                        )}
                      </button>


                      {index <
                        SALES_PIPELINE_STAGES.length -
                          1 && (
                        <span className="text-slate-300">
                          →
                        </span>
                      )}

                    </div>
                  )
                }
              )}

            </div>

          </div>


          <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-5">

            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Other outcome
            </span>


            <button
              type="button"
              onClick={() =>
                handlePipelineChange("LOST")
              }
              disabled={
                pipelineUpdating ||
                currentPipelineStatus ===
                  "LOST"
              }
              className={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${
                currentPipelineStatus ===
                "LOST"
                  ? "border-red-500 bg-red-500 text-white"
                  : "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
              } disabled:cursor-not-allowed disabled:opacity-60`}
            >
              Mark as Lost
            </button>


            {currentPipelineStatus ===
              "NEGOTIATION" && (
              <button
                type="button"
                onClick={openConversionModal}
                className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm font-semibold text-green-700 transition hover:bg-green-100"
              >
                <CheckCircle2 size={16} />
                Convert Lead
              </button>
            )}

          </div>

        </section>


        {/* ================================================= */}
        {/* CONVERSION / LOST SUMMARY */}
        {/* ================================================= */}

        {(currentPipelineStatus ===
          "CONVERTED" ||
          currentPipelineStatus ===
            "LOST") && (

          <section className="rounded-2xl border bg-white p-6 shadow-sm">

            {currentPipelineStatus ===
              "CONVERTED" ? (

              <div>

                <div className="mb-5 flex items-center gap-3">

                  <div className="rounded-xl bg-green-100 p-2.5 text-green-700">
                    <CheckCircle2 size={22} />
                  </div>

                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                      Conversion Details
                    </h2>

                    <p className="text-sm text-slate-500">
                      This lead has been converted successfully.
                    </p>
                  </div>

                </div>


                <div className="grid gap-4 md:grid-cols-3">

                  <div className="rounded-xl bg-green-50 p-4">

                    <p className="text-xs font-semibold uppercase tracking-wide text-green-600">
                      Deal Value
                    </p>

                    <p className="mt-2 text-xl font-bold text-green-800">
                      {lead.deal_value
                        ? `₹${Number(
                            lead.deal_value
                          ).toLocaleString(
                            "en-IN"
                          )}`
                        : "-"}
                    </p>

                  </div>


                  <div className="rounded-xl bg-slate-50 p-4">

                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Conversion Date
                    </p>

                    <p className="mt-2 text-sm font-semibold text-slate-800">
                      {lead.conversion_date
                        ? formatActivityDate(
                            lead.conversion_date
                          )
                        : "-"}
                    </p>

                  </div>


                  <div className="rounded-xl bg-slate-50 p-4">

                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Notes
                    </p>

                    <p className="mt-2 text-sm leading-6 text-slate-700">
                      {lead.conversion_notes ||
                        "-"}
                    </p>

                  </div>

                </div>


                <button
                  type="button"
                  onClick={openConversionModal}
                  className="mt-5 rounded-lg border border-green-200 bg-white px-4 py-2 text-sm font-semibold text-green-700 transition hover:bg-green-50"
                >
                  Edit Conversion Details
                </button>

              </div>

            ) : (

              <div>

                <div className="mb-5 flex items-center gap-3">

                  <div className="rounded-xl bg-red-100 p-2.5 text-red-700">
                    <XCircle size={22} />
                  </div>

                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                      Lost Lead Details
                    </h2>

                    <p className="text-sm text-slate-500">
                      This lead has been marked as lost.
                    </p>
                  </div>

                </div>


                <div className="grid gap-4 md:grid-cols-3">

                  <div className="rounded-xl bg-red-50 p-4">

                    <p className="text-xs font-semibold uppercase tracking-wide text-red-600">
                      Lost Reason
                    </p>

                    <p className="mt-2 text-sm font-semibold text-red-800">
                      {lead.lost_reason ||
                        "-"}
                    </p>

                  </div>


                  <div className="rounded-xl bg-slate-50 p-4">

                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Lost Date
                    </p>

                    <p className="mt-2 text-sm font-semibold text-slate-800">
                      {lead.lost_date
                        ? formatActivityDate(
                            lead.lost_date
                          )
                        : "-"}
                    </p>

                  </div>


                  <div className="rounded-xl bg-slate-50 p-4">

                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Notes
                    </p>

                    <p className="mt-2 text-sm leading-6 text-slate-700">
                      {lead.lost_notes ||
                        "-"}
                    </p>

                  </div>

                </div>


                <button
                  type="button"
                  onClick={openLostModal}
                  className="mt-5 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50"
                >
                  Edit Lost Details
                </button>

              </div>

            )}

          </section>
        )}


        {/* ================================================= */}
        {/* SUCCESS MESSAGE */}
        {/* ================================================= */}

        {saveSuccess && (
          <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3">
            <p className="text-sm font-medium text-green-700">
              Lead updated successfully.
            </p>
          </div>
        )}


        {followUpSuccess && (
          <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3">
            <p className="text-sm font-medium text-green-700">
              {followUpSuccess}
            </p>
          </div>
        )}


        {followUpError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm font-medium text-red-700">
              {followUpError}
            </p>
          </div>
        )}


        {/* ================================================= */}
        {/* TOP INFORMATION CARDS */}
        {/* ================================================= */}

        <div className="grid gap-6 lg:grid-cols-3">

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
                    ).toLocaleString(
                      "en-IN"
                    )}`
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
                    ).toLocaleString(
                      "en-IN"
                    )}`
                  : "-"}
              </p>

              <p>
                <strong>Financing:</strong>{" "}
                {lead.financing_required ===
                  null ||
                lead.financing_required ===
                  undefined
                  ? "-"
                  : lead.financing_required
                    ? "Required"
                    : "Not Required"}
              </p>

            </div>

          </div>


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
                    {nextAction.priority ||
                      "-"}
                  </p>
                </div>


                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Action
                  </p>

                  <p className="mt-1 text-sm text-slate-700">
                    {nextAction.action ||
                      "-"}
                  </p>
                </div>


                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Channel
                  </p>

                  <p className="mt-1 text-sm font-medium text-slate-700">
                    {nextAction.channel ||
                      "-"}
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


        {/* ================================================= */}
        {/* AI SALES COPILOT */}
        {/* ================================================= */}

        <div className="overflow-hidden rounded-2xl border border-violet-200 bg-white shadow-sm">

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

                <div>

                  <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
                    Lead Summary
                  </h3>

                  <p className="leading-7 text-slate-700">
                    {copilot.summary || "-"}
                  </p>

                </div>


                <div>

                  <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
                    AI Priority
                  </h3>

                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${
                      copilot.priority ===
                      "HIGH"
                        ? "bg-red-100 text-red-700"
                        : copilot.priority ===
                            "MEDIUM"
                          ? "bg-orange-100 text-orange-700"
                          : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {copilot.priority ||
                      "NORMAL"}
                  </span>

                </div>


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


                <div>

                  <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
                    Recommended Sales Strategy
                  </h3>

                  <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4">

                    <p className="text-sm leading-6 text-indigo-950">
                      {copilot.sales_strategy ||
                        "-"}
                    </p>

                  </div>

                </div>


                <div>

                  <div className="mb-3 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">

                    <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                      Personalized WhatsApp Message
                    </h3>


                    <div className="flex flex-wrap gap-2">

                      <button
                        onClick={
                          copyWhatsAppMessage
                        }
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


                      <button
                        onClick={() =>
                          openWhatsApp(
                            copilot.whatsapp_message
                          )
                        }
                        className="flex items-center justify-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-green-700"
                      >
                        <MessageCircle size={16} />
                        Open WhatsApp
                      </button>

                    </div>

                  </div>


                  <div className="rounded-xl border border-green-200 bg-green-50 p-5">

                    <div className="mb-3 flex items-center gap-2 text-green-700">

                      <MessageCircle size={19} />

                      <span className="text-sm font-semibold">
                        WhatsApp
                      </span>

                    </div>

                    <p className="whitespace-pre-line text-sm leading-7 text-slate-700">
                      {copilot.whatsapp_message ||
                        "-"}
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


          <div className="p-6">

            <div className="grid gap-6 lg:grid-cols-3">

              <div className="lg:col-span-1">

                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Message Type
                </label>

                <select
                  value={messageType}
                  onChange={(event) =>
                    setMessageType(
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                >

                  {MESSAGE_TYPES.map(
                    (type) => (

                      <option
                        key={type.value}
                        value={type.value}
                      >
                        {type.label}
                      </option>

                    )
                  )}

                </select>


                <button
                  onClick={
                    handleGenerateMessage
                  }
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


              <div className="lg:col-span-2">

                {!generatedMessage &&
                  !messageLoading && (
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


                {generatedMessage &&
                  !messageLoading && (
                    <div className="rounded-xl border border-green-200 bg-green-50 p-5">

                      <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">

                        <div>

                          <div className="flex items-center gap-2 text-green-700">

                            <MessageCircle
                              size={19}
                            />

                            <span className="text-sm font-semibold">
                              {generatedMessage.message_type ||
                                "WhatsApp Message"}
                            </span>

                          </div>


                          {generatedMessage.subject && (
                            <p className="mt-1 text-xs text-slate-500">
                              {
                                generatedMessage.subject
                              }
                            </p>
                          )}

                        </div>


                        <div className="flex flex-wrap gap-2">

                          <button
                            onClick={
                              copyGeneratedMessage
                            }
                            className="flex items-center justify-center gap-2 rounded-lg border border-green-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-green-50"
                          >

                            {messageCopied ? (
                              <>
                                <Check
                                  size={16}
                                />
                                Copied
                              </>
                            ) : (
                              <>
                                <Copy
                                  size={16}
                                />
                                Copy Message
                              </>
                            )}

                          </button>


                          <button
                            onClick={() =>
                              openWhatsApp(
                                generatedMessage.message
                              )
                            }
                            className="flex items-center justify-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-green-700"
                          >
                            <MessageCircle
                              size={16}
                            />
                            Open WhatsApp
                          </button>

                        </div>

                      </div>


                      <div className="rounded-xl border border-green-100 bg-white p-5">

                        <p className="whitespace-pre-line text-sm leading-7 text-slate-700">
                          {generatedMessage.message ||
                            "-"}
                        </p>

                      </div>


                      {generatedMessage.sales_note && (
                        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">

                          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-600">
                            Salesperson Note
                          </p>

                          <p className="text-sm leading-6 text-amber-900">
                            {
                              generatedMessage.sales_note
                            }
                          </p>

                        </div>
                      )}

                    </div>
                  )}

              </div>

            </div>

          </div>

        </div>


        {/* ================================================= */}
        {/* AI QUALIFICATION + FOLLOW UPS */}
        {/* ================================================= */}

        <div className="grid gap-6 lg:grid-cols-3">

          <div className="rounded-xl bg-white p-6 shadow-sm lg:col-span-2">

            <h2 className="mb-4 text-lg font-semibold text-slate-900">
              AI Qualification
            </h2>

            <p className="whitespace-pre-line text-sm leading-7 text-slate-600">
              {lead.qualification_reasons ||
                "No qualification reasons available."}
            </p>

          </div>


          <div className="rounded-xl bg-white p-6 shadow-sm">

            <div className="mb-4 flex items-center justify-between gap-3">

              <div>

                <h2 className="text-lg font-semibold text-slate-900">
                  Follow-ups
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Manage scheduled sales tasks
                </p>

              </div>


              <button
                type="button"
                onClick={() => {
                  setShowFollowUpForm(
                    (current) => !current
                  )

                  setFollowUpError("")
                  setFollowUpSuccess("")
                }}
                className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
              >
                {showFollowUpForm
                  ? "Close"
                  : "+ Add Task"}
              </button>

            </div>


            {showFollowUpForm && (

              <form
                onSubmit={
                  handleCreateManualFollowUp
                }
                className="mb-5 rounded-xl border border-blue-100 bg-blue-50 p-4"
              >

                <div className="mb-4">

                  <p className="text-sm font-semibold text-slate-900">
                    Create Follow-up Task
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Schedule the next action for this lead.
                  </p>

                </div>


                <div className="mb-3">

                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Task Type
                  </label>

                  <select
                    name="follow_up_type"
                    value={
                      followUpForm.follow_up_type
                    }
                    onChange={
                      handleFollowUpFormChange
                    }
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >

                    <option value="CALL">
                      Call
                    </option>

                    <option value="WHATSAPP">
                      WhatsApp
                    </option>

                    <option value="SITE_VISIT">
                      Site Visit
                    </option>

                    <option value="PROPERTY_DETAILS">
                      Property Details
                    </option>

                    <option value="OTHER">
                      Other
                    </option>

                  </select>

                </div>


                <div className="mb-3">

                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Scheduled Date & Time
                  </label>

                  <input
                    type="datetime-local"
                    name="scheduled_at"
                    value={
                      followUpForm.scheduled_at
                    }
                    onChange={
                      handleFollowUpFormChange
                    }
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />

                </div>


                <div className="mb-3">

                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Action
                  </label>

                  <input
                    type="text"
                    name="action"
                    value={
                      followUpForm.action
                    }
                    onChange={
                      handleFollowUpFormChange
                    }
                    placeholder="e.g. Call customer about 2BHK options"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />

                </div>


                <div className="mb-4">

                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Notes / Reason
                  </label>

                  <textarea
                    name="reason"
                    value={
                      followUpForm.reason
                    }
                    onChange={
                      handleFollowUpFormChange
                    }
                    rows={3}
                    placeholder="Optional notes for this task..."
                    className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />

                </div>


                <div className="flex gap-2">

                  <button
                    type="submit"
                    disabled={
                      followUpLoading
                    }
                    className="flex-1 rounded-lg bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {followUpLoading
                      ? "Creating..."
                      : "Create Task"}
                  </button>


                  <button
                    type="button"
                    onClick={() => {
                      setShowFollowUpForm(
                        false
                      )

                      setFollowUpError("")
                    }}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    Cancel
                  </button>

                </div>

              </form>
            )}


            <div className="space-y-4">

              {followUps.length === 0 ? (

                <div className="rounded-xl border border-dashed border-slate-300 p-5 text-center">

                  <p className="text-sm font-medium text-slate-600">
                    No follow-ups available.
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Add a task to plan the next sales action.
                  </p>

                </div>

              ) : (

                followUps.map(
                  (followUp) => {

                    const status =
                      getFollowUpStatus(
                        followUp
                      )

                    return (

                      <div
                        key={followUp.id}
                        className={`rounded-xl border p-4 ${
                          status ===
                          "OVERDUE"
                            ? "border-red-200 bg-red-50"
                            : status ===
                                "COMPLETED"
                              ? "border-slate-200 bg-slate-50"
                              : "border-blue-100 bg-blue-50/40"
                        }`}
                      >

                        <div className="flex items-start justify-between gap-3">

                          <div className="min-w-0">

                            <p
                              className={`font-semibold ${
                                status ===
                                "COMPLETED"
                                  ? "text-slate-500 line-through"
                                  : "text-slate-800"
                              }`}
                            >
                              {
                                followUp.action
                              }
                            </p>

                            <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                              {
                                followUp.follow_up_type
                              }
                            </p>

                          </div>


                          <span
                            className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                              status ===
                              "OVERDUE"
                                ? "bg-red-100 text-red-700"
                                : status ===
                                    "COMPLETED"
                                  ? "bg-slate-200 text-slate-600"
                                  : "bg-blue-100 text-blue-700"
                            }`}
                          >
                            {status}
                          </span>

                        </div>


                        <div className="mt-3">

                          <p
                            className={`text-xs font-medium ${
                              status ===
                              "OVERDUE"
                                ? "text-red-700"
                                : "text-slate-500"
                            }`}
                          >
                            Scheduled:{" "}
                            {formatFollowUpDate(
                              followUp.scheduled_at
                            )}
                          </p>

                        </div>


                        {followUp.reason && (

                          <div className="mt-3 border-t border-slate-200/70 pt-3">

                            <p className="text-xs leading-5 text-slate-500">
                              {
                                followUp.reason
                              }
                            </p>

                          </div>

                        )}


                        {status !==
                          "COMPLETED" && (

                          <button
                            type="button"
                            onClick={() =>
                              handleCompleteFollowUp(
                                followUp.id
                              )
                            }
                            disabled={
                              completingFollowUpId ===
                              followUp.id
                            }
                            className="mt-4 w-full rounded-lg bg-emerald-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {completingFollowUpId ===
                            followUp.id
                              ? "Completing..."
                              : "✓ Complete Follow-up"}
                          </button>

                        )}

                      </div>

                    )
                  }
                )

              )}

            </div>

          </div>

        </div>


        {/* ================================================= */}
        {/* ACTIVITY TIMELINE */}
        {/* ================================================= */}

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

              {activities.map(
                (activity) => (

                  <div
                    key={activity.id}
                    className="relative pb-7 pl-8 last:pb-0"
                  >

                    <div className="absolute -left-[7px] top-1 h-3 w-3 rounded-full bg-blue-600 ring-4 ring-white" />


                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">

                      <div className="flex flex-wrap items-start justify-between gap-3">

                        <div>

                          <p className="text-sm font-semibold text-slate-900">
                            {formatActivityType(
                              activity.activity_type
                            )}
                          </p>


                          {activity.description && (
                            <p className="mt-1 text-sm text-slate-600">
                              {
                                activity.description
                              }
                            </p>
                          )}

                        </div>


                        <span className="text-xs text-slate-400">
                          {formatActivityDate(
                            activity.created_at
                          )}
                        </span>

                      </div>

                    </div>

                  </div>

                )
              )}

            </div>

          )}

        </div>

      </main>


      {/* ===================================================== */}
      {/* CONVERT LEAD MODAL */}
      {/* ===================================================== */}

      {showConversionModal && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">

          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">

            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">

              <div className="flex items-center gap-3">

                <div className="rounded-xl bg-green-100 p-2.5 text-green-700">
                  <CheckCircle2 size={22} />
                </div>

                <div>

                  <h2 className="text-lg font-semibold text-slate-900">
                    Convert Lead
                  </h2>

                  <p className="text-sm text-slate-500">
                    Record the completed deal.
                  </p>

                </div>

              </div>


              <button
                type="button"
                onClick={() =>
                  setShowConversionModal(false)
                }
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={20} />
              </button>

            </div>


            <form
              onSubmit={handleConvertLead}
              className="space-y-5 p-6"
            >

              {conversionError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                  <p className="text-sm text-red-700">
                    {conversionError}
                  </p>
                </div>
              )}


              <div>

                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Conversion Date
                </label>

                <input
                  type="datetime-local"
                  name="conversion_date"
                  value={
                    conversionForm.conversion_date
                  }
                  onChange={
                    handleConversionChange
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                />

              </div>


              <div>

                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Deal Value
                </label>

                <div className="relative">

                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
                    ₹
                  </span>

                  <input
                    type="number"
                    name="deal_value"
                    value={
                      conversionForm.deal_value
                    }
                    onChange={
                      handleConversionChange
                    }
                    min="0"
                    step="0.01"
                    placeholder="Enter final deal value"
                    className="w-full rounded-xl border border-slate-200 py-3 pl-8 pr-4 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                  />

                </div>

              </div>


              <div>

                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Conversion Notes
                </label>

                <textarea
                  name="conversion_notes"
                  value={
                    conversionForm.conversion_notes
                  }
                  onChange={
                    handleConversionChange
                  }
                  rows={4}
                  placeholder="Add important details about the completed deal..."
                  className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                />

              </div>


              <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">

                <button
                  type="button"
                  onClick={() =>
                    setShowConversionModal(false)
                  }
                  className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>


                <button
                  type="submit"
                  disabled={conversionLoading}
                  className="flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                >

                  {conversionLoading ? (
                    <>
                      <RefreshCw
                        size={16}
                        className="animate-spin"
                      />
                      Converting...
                    </>
                  ) : (
                    <>
                      <CheckCircle2
                        size={16}
                      />
                      Convert Lead
                    </>
                  )}

                </button>

              </div>

            </form>

          </div>

        </div>
      )}


      {/* ===================================================== */}
      {/* LOST LEAD MODAL */}
      {/* ===================================================== */}

      {showLostModal && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">

          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">

            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">

              <div className="flex items-center gap-3">

                <div className="rounded-xl bg-red-100 p-2.5 text-red-700">
                  <XCircle size={22} />
                </div>

                <div>

                  <h2 className="text-lg font-semibold text-slate-900">
                    Mark Lead as Lost
                  </h2>

                  <p className="text-sm text-slate-500">
                    Record why this opportunity was lost.
                  </p>

                </div>

              </div>


              <button
                type="button"
                onClick={() =>
                  setShowLostModal(false)
                }
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={20} />
              </button>

            </div>


            <form
              onSubmit={handleMarkLeadLost}
              className="space-y-5 p-6"
            >

              {lostError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                  <p className="text-sm text-red-700">
                    {lostError}
                  </p>
                </div>
              )}


              <div>

                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Lost Date
                </label>

                <input
                  type="datetime-local"
                  name="lost_date"
                  value={
                    lostForm.lost_date
                  }
                  onChange={
                    handleLostChange
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
                />

              </div>


              <div>

                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Lost Reason
                </label>

                <select
                  name="lost_reason"
                  value={
                    lostForm.lost_reason
                  }
                  onChange={
                    handleLostChange
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
                >

                  <option value="">
                    Select reason
                  </option>

                  {LOST_REASONS.map(
                    (reason) => (
                      <option
                        key={reason}
                        value={reason}
                      >
                        {reason}
                      </option>
                    )
                  )}

                </select>

              </div>


              <div>

                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Lost Notes
                </label>

                <textarea
                  name="lost_notes"
                  value={
                    lostForm.lost_notes
                  }
                  onChange={
                    handleLostChange
                  }
                  rows={4}
                  placeholder="Add details about why the opportunity was lost..."
                  className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
                />

              </div>


              <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">

                <button
                  type="button"
                  onClick={() =>
                    setShowLostModal(false)
                  }
                  className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>


                <button
                  type="submit"
                  disabled={lostLoading}
                  className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >

                  {lostLoading ? (
                    <>
                      <RefreshCw
                        size={16}
                        className="animate-spin"
                      />
                      Saving...
                    </>
                  ) : (
                    <>
                      <XCircle size={16} />
                      Mark as Lost
                    </>
                  )}

                </button>

              </div>

            </form>

          </div>

        </div>
      )}

    </div>
  )
}


export default LeadDetails