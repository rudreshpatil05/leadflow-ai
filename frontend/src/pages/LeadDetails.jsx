
import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import {
  getLead,
  getLeadActivities,
  getLeadFollowUps,
  getLeadNextAction,
} from "../services/api"

function LeadDetails() {
  const { id } = useParams()

  const [lead, setLead] = useState(null)
  const [activities, setActivities] = useState([])
  const [followUps, setFollowUps] = useState([])
  const [nextAction, setNextAction] = useState(null)

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
        console.error("Failed to load lead details:", error)
      }
    }

    loadLeadDetails()
  }, [id])

  if (!lead) {
    return <div className="p-8">Loading lead...</div>
  }

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Header */}
      <header className="border-b bg-white px-8 py-5">
        <h1 className="text-2xl font-bold text-slate-900">
          {lead.name}
        </h1>

        <p className="text-sm text-slate-500">
          Lead #{lead.id}
        </p>
      </header>

      <main className="grid gap-6 p-8 lg:grid-cols-3">

        {/* Lead Information */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">
            Lead Information
          </h2>

          <div className="space-y-3 text-sm">
            <p>
              <strong>Phone:</strong> {lead.phone || "-"}
            </p>

            <p>
              <strong>Email:</strong> {lead.email || "-"}
            </p>

            <p>
              <strong>Source:</strong> {lead.source || "-"}
            </p>

            <p>
              <strong>Score:</strong> {lead.score ?? "-"}
            </p>

            <p>
              <strong>Temperature:</strong>{" "}
              {lead.temperature || "-"}
            </p>
          </div>
        </div>

        {/* Property Requirements */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">
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
                ? `₹${lead.budget_max.toLocaleString()}`
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
          </div>
        </div>

        {/* Next Best Action */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">
            Next Best Action
          </h2>

          {nextAction ? (
            <div className="space-y-3">

              <p>
                <strong>Priority:</strong>{" "}
                {nextAction.priority}
              </p>

              <p>
                <strong>Action:</strong>{" "}
                {nextAction.action}
              </p>

              <p>
                <strong>Channel:</strong>{" "}
                {nextAction.channel}
              </p>

              <p className="text-sm text-slate-500">
                {nextAction.reason}
              </p>

            </div>
          ) : (
            <p className="text-sm text-slate-500">
              No pending action.
            </p>
          )}
        </div>

        {/* AI Qualification */}
        <div className="rounded-xl bg-white p-6 shadow-sm lg:col-span-2">
          <h2 className="mb-4 text-lg font-semibold">
            AI Qualification
          </h2>

          <p className="text-sm text-slate-600">
            {lead.qualification_reasons ||
              "No qualification reasons available."}
          </p>
        </div>

        {/* Follow Ups */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">
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
                  className="border-b pb-3"
                >
                  <p className="font-medium">
                    {followUp.action}
                  </p>

                  <p className="text-sm text-slate-500">
                    {followUp.follow_up_type}
                  </p>

                  <p className="text-sm">
                    {followUp.status}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Activity Timeline */}
        <div className="rounded-xl bg-white p-6 shadow-sm lg:col-span-3">
          <h2 className="mb-4 text-lg font-semibold">
            Activity Timeline
          </h2>

          <div className="space-y-4">
            {activities.length === 0 ? (
              <p className="text-sm text-slate-500">
                No activities available.
              </p>
            ) : (
              activities.map((activity) => (
                <div
                  key={activity.id}
                  className="border-l-2 pl-4"
                >
                  <p className="font-medium">
                    {activity.activity_type}
                  </p>

                  <p className="text-sm text-slate-600">
                    {activity.description}
                  </p>

                  <p className="text-xs text-slate-400">
                    {activity.created_at}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

      </main>
    </div>
  )
}

export default LeadDetails