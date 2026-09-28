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
  const response = await API.post(
    `/follow-ups/lead/${leadId}`,
    {
      follow_up_type: followUpType,
      scheduled_at: scheduledAt,
      action,
      reason,
    }
  )
const handleAIWhatsApp = async () => {
  if (!lead?.phone) return

  const message =
    copilot?.whatsapp_message ||
    generatedMessage?.message ||
    ""

  openWhatsApp(message)

  try {
    await createLeadActivity(
      lead.id,
      "AI_WHATSAPP_SENT",
      "AI-generated WhatsApp message opened for lead communication."
    )

    const updatedActivities =
      await getLeadActivities(lead.id)

    setActivities(updatedActivities)

  } catch (error) {
    console.error(
      "Failed to record AI WhatsApp activity:",
      error
    )
  }
}
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
// AI SALES ASSISTANT / COPILOT
// ===============================

export const getSalesCopilot = async (leadId) => {
  const response = await API.get(
    `/sales-assistant/${leadId}`
  )

  return response.data?.result || response.data
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


// ============================================================
// SALES ANALYTICS
// ============================================================

export const getSalesAnalytics = async () => {
  const response = await API.get(
    "/dashboard/sales-analytics"
  )

  return response.data
}


// ============================================================
// STEP 31 - SOURCE PERFORMANCE
// ============================================================

export const getSourcePerformance = async () => {
  const response = await API.get(
    "/dashboard/source-performance"
  )

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


// ============================================================
// STEP 37 - LEAD INTELLIGENCE
// ============================================================

export const getLeadIntelligence = async () => {
  const response = await API.get(
    "/dashboard/lead-intelligence"
  )

  return response.data
}


// ============================================================
// STEP 38 - FOLLOW-UP INTELLIGENCE
// ============================================================

export const getFollowUpIntelligence = async () => {
  const response = await API.get(
    "/dashboard/follow-up-intelligence"
  )

  return response.data
}


// ============================================================
// STEP 39 - REVENUE FORECAST
// ============================================================

export const getRevenueForecast = async () => {
  const response = await API.get(
    "/dashboard/revenue-forecast"
  )

  return response.data
}


// ============================================================
// STEP 40 - SALES PRODUCTIVITY
// ============================================================

export const getSalesProductivity = async () => {
  const response = await API.get(
    "/dashboard/sales-productivity"
  )

  return response.data
}


// ============================================================
// STEP 41 - LEAD FILTER OPTIONS
// ============================================================

export const getLeadFilterOptions = async () => {
  const response = await API.get(
    "/dashboard/lead-filter-options"
  )

  return response.data
}
const handleAICall = async () => {
  if (!lead?.phone) return

  const cleanPhone = String(
    lead.phone
  ).replace(/\D/g, "")

  window.location.href = `tel:${cleanPhone}`

  try {
    await createLeadActivity(
      lead.id,
      "AI_CALL_INITIATED",
      "Call initiated from AI recommended sales action."
    )

    const updatedActivities =
      await getLeadActivities(lead.id)

    setActivities(updatedActivities)

  } catch (error) {
    console.error(
      "Failed to record AI call activity:",
      error
    )
  }
}
// ============================================================
// AUTOMATION
// ============================================================

export const runLeadAutomation = async (leadId) => {
  const response = await API.post(
    `/automation/lead/${leadId}/run`
  )

  return response.data
}


export const getAutomationRules = async () => {
  const response = await API.get(
    "/automation/rules"
  )

  return response.data
}
export const getAutomationStats = async () => {
  const response = await API.get(
    "/automation/stats"
  )

  return response.data
}
// ============================================================
// DEFAULT API
// ============================================================
export const initializeAutomation = async () => {
  const response = await api.post("/automation/initialize");
  return response.data;
};

export const getAutomationRules = async () => {
  const response = await api.get("/automation/rules");
  return response.data;
};

export const updateAutomationRule = async (ruleId, isActive) => {
  const response = await api.patch(
    `/automation/rules/${ruleId}`,
    null,
    {
      params: {
        is_active: isActive,
      },
    }
  );

  return response.data;
};

export const runLeadAutomation = async (
  leadId,
  eventType = "LEAD_CREATED"
) => {
  const response = await api.post(
    `/automation/leads/${leadId}/run`,
    null,
    {
      params: {
        event_type: eventType,
      },
    }
  );

  return response.data;
};

export const getAutomationLogs = async (leadId = null) => {
  const params = {};

  if (leadId) {
    params.lead_id = leadId;
  }

  const response = await api.get(
    "/automation/logs",
    { params }
  );

  return response.data;
};

export const generateAIFollowUp = async (leadId) => {
  const response = await api.post(
    `/automation/leads/${leadId}/ai-follow-up`
  );

  return response.data;
};
export default API