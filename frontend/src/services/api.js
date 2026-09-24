import axios from "axios"

const API = axios.create({
  baseURL: "http://127.0.0.1:8000/api/v1",
})


// ===============================
// DASHBOARD
// ===============================

export const getDashboardStats = async () => {
  const response = await API.get("/dashboard/stats")
  return response.data
}

export const getSourceAnalytics = async () => {
  const response = await API.get("/dashboard/source-analytics")
  return response.data
}

export const getDashboardFollowUps = async () => {
  const response = await API.get("/dashboard/follow-ups")
  return response.data
}


// ===============================
// LEADS
// ===============================

export const getLeads = async () => {
  const response = await API.get("/leads/")

  if (Array.isArray(response.data)) {
    return response.data
  }

  return response.data.items || []
}

export const getLead = async (leadId) => {
  const response = await API.get(`/leads/${leadId}`)
  return response.data
}

export const createLead = async (leadData) => {
  const response = await API.post("/leads/", leadData)
  return response.data
}

export const updateLead = async (leadId, leadData) => {
  const response = await API.patch(
    `/leads/${leadId}`,
    leadData
  )

  return response.data
}

export const qualifyLead = async (leadId, message) => {
  const response = await API.post(
    `/leads/${leadId}/qualify`,
    {
      message,
    }
  )

  return response.data
}


// ===============================
// ACTIVITIES
// ===============================

export const createLeadActivity = async (
  leadId,
  activityType,
  description
) => {
  const response = await API.post("/activities/", {
    lead_id: leadId,
    activity_type: activityType,
    description,
  })

  return response.data
}

export const getLeadActivities = async (leadId) => {
  const response = await API.get(
    `/activities/lead/${leadId}`
  )

  return response.data
}


// ===============================
// FOLLOW UPS
// ===============================

export const getLeadFollowUps = async (leadId) => {
  const response = await API.get(
    `/follow-ups/lead/${leadId}`
  )

  return response.data
}

export const completeFollowUp = async (followUpId) => {
  const response = await API.patch(
    `/follow-ups/${followUpId}/complete`
  )

  return response.data
}
export const createManualFollowUp = async (
  leadId,
  followUpType,
  scheduledAt,
  action,
  reason
) => {
  const response = await API.post(`/follow-ups/lead/${leadId}`, {
    follow_up_type: followUpType,
    scheduled_at: scheduledAt,
    action,
    reason,
  })

  return response.data
}


// ===============================
// NEXT BEST ACTION
// ===============================

export const getLeadNextAction = async (leadId) => {
  const response = await API.get(
    `/next-actions/lead/${leadId}`
  )

  return response.data
}


// ===============================
// AI SALES COPILOT
// ===============================

export const getSalesCopilot = async (leadId) => {
  const response = await API.get(
    `/leads/${leadId}/sales-copilot`
  )

  return response.data
}


// ===============================
// AI MESSAGE GENERATOR
// ===============================

export const generateLeadMessage = async (
  leadId,
  messageType
) => {
  const response = await API.post(
    `/leads/${leadId}/generate-message`,
    null,
    {
      params: {
        message_type: messageType,
      },
    }
  )

  return response.data
}


// ===============================
// WHATSAPP
// ===============================

export const getWhatsAppUrl = (
  phone,
  message = ""
) => {
  const cleanPhone = String(phone || "").replace(
    /\D/g,
    ""
  )

  const normalizedPhone =
    cleanPhone.length === 10
      ? `91${cleanPhone}`
      : cleanPhone

  const encodedMessage =
    encodeURIComponent(message)

  return `https://wa.me/${normalizedPhone}?text=${encodedMessage}`
}
export async function getSalesAnalytics() {
  const response = await api.get(
    "/api/v1/dashboard/sales-analytics"
  )

  return response.data
}

// ===============================
// DEFAULT API
// ===============================



export const getSourcePerformance = async () => {
  const response = await API.get("/dashboard/source-performance")
  return response.data
}
// ============================================================
// STEP 32 - REVENUE TREND
// ============================================================

export const getRevenueTrend = async () => {
  const response = await API.get(
    "/dashboard/revenue-trend"
  )

  return response.data
}


// ============================================================
// STEP 33 - CONVERSION FUNNEL
// ============================================================

export const getConversionFunnel = async () => {
  const response = await API.get(
    "/dashboard/conversion-funnel"
  )

  return response.data
}


// ============================================================
// STEP 34 - LEAD AGING
// ============================================================

export const getLeadAging = async () => {
  const response = await API.get(
    "/dashboard/lead-aging"
  )

  return response.data
}


// ============================================================
// STEP 35 - SALES ALERTS
// ============================================================

export const getSalesAlerts = async () => {
  const response = await API.get(
    "/dashboard/sales-alerts"
  )

  return response.data
}
export const getLeadIntelligence = async () => {
  const response = await API.get("/dashboard/lead-intelligence")
  return response.data
}

export const getFollowUpIntelligence = async () => {
  const response = await API.get("/dashboard/follow-up-intelligence")
  return response.data
}

export const getRevenueForecast = async () => {
  const response = await API.get("/dashboard/revenue-forecast")
  return response.data
}

export const getSalesProductivity = async () => {
  const response = await API.get("/dashboard/sales-productivity")
  return response.data
}

export const getLeadFilterOptions = async () => {
  const response = await API.get("/dashboard/lead-filter-options")
  return response.data
}
export default API