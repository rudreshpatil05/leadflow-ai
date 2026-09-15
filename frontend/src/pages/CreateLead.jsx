import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft, UserPlus, Sparkles } from "lucide-react"
import { createLead, qualifyLead } from "../services/api"

function CreateLead() {
  const navigate = useNavigate()

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    source: "WEBSITE",
    message: "",
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleChange = (event) => {
    const { name, value } = event.target

    setForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    setLoading(true)
    setError("")

    try {
      // Create lead
      const lead = await createLead({
        name: form.name,
        phone: form.phone,
        email: form.email || null,
        source: form.source,
        message: form.message,
      })

      // Automatically qualify using AI
      await qualifyLead(
        lead.id,
        form.message
      )

      // Open lead details
      navigate(`/leads/${lead.id}`)
    } catch (err) {
      console.error(err)

      setError(
        err.response?.data?.detail ||
        "Failed to create and qualify lead."
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">

      <div className="mx-auto max-w-3xl">

        {/* Header */}
        <div className="mb-6 flex items-center gap-4">

          <button
            onClick={() => navigate("/")}
            className="rounded-lg border border-slate-200 bg-white p-2 hover:bg-slate-50"
          >
            <ArrowLeft size={20} />
          </button>

          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Create New Lead
            </h1>

            <p className="text-sm text-slate-500">
              Add a customer and let AI qualify the lead automatically.
            </p>
          </div>

        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >

          <div className="mb-6 flex items-center gap-3">

            <div className="rounded-xl bg-slate-100 p-3">
              <UserPlus size={22} />
            </div>

            <div>
              <h2 className="font-semibold text-slate-900">
                Customer Information
              </h2>

              <p className="text-sm text-slate-500">
                Enter the basic customer details.
              </p>
            </div>

          </div>

          <div className="grid gap-5 md:grid-cols-2">

            {/* Name */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Customer Name
              </label>

              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Rahul Sharma"
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-slate-500"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Phone *
              </label>

              <input
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="9876543210"
                required
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-slate-500"
              />
            </div>

            {/* Email */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Email
              </label>

              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="customer@example.com"
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-slate-500"
              />
            </div>

            {/* Source */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Lead Source
              </label>

              <select
                name="source"
                value={form.source}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none focus:border-slate-500"
              >
                <option value="WEBSITE">Website</option>
                <option value="FACEBOOK_ADS">Facebook Ads</option>
                <option value="INSTAGRAM">Instagram</option>
                <option value="WHATSAPP">WhatsApp</option>
                <option value="REFERRAL">Referral</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

          </div>

          {/* Message */}
          <div className="mt-6">

            <label className="mb-2 block text-sm font-medium text-slate-700">
              Customer Requirement *
            </label>

            <textarea
              name="message"
              value={form.message}
              onChange={handleChange}
              required
              rows={7}
              placeholder="Example: I am looking for a 2BHK apartment in Thane West with a budget of 1.2 crore. I want to purchase within 3 months for self use. I have 30 lakh for down payment and need home loan financing."
              className="w-full resize-none rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-slate-500"
            />

            <p className="mt-2 text-xs text-slate-500">
              AI will analyze this message to identify property requirements,
              budget, timeline and purchase intent.
            </p>

          </div>

          {/* Error */}
          {error && (
            <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-5 py-3 font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >

            {loading ? (
              <>
                <Sparkles size={18} />
                AI is qualifying the lead...
              </>
            ) : (
              <>
                <Sparkles size={18} />
                Create & Qualify Lead
              </>
            )}

          </button>

        </form>

      </div>

    </div>
  )
}

export default CreateLead