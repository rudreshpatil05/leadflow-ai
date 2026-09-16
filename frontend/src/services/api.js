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


// ===============================
// NEXT BEST ACTION
// ===============================

export const getLeadNextAction = async (leadId) => {
  const response = await API.get(`/next-actions/lead/${leadId}`)
  return response.data
}

export const getSalesCopilot = async (leadId) => {
  const response = await API.get(`/leads/${leadId}/sales-copilot`)
  return response.data
}
export const generateLeadMessage = async (leadId, messageType) => {
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

export default API