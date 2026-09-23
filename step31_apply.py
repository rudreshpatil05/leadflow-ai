from pathlib import Path

ROOT = Path(r"C:\leadflow-ai")
DASH = ROOT / "backend" / "app" / "api" / "v1" / "dashboard.py"
API = ROOT / "frontend" / "src" / "services" / "api.js"
PAGE = ROOT / "frontend" / "src" / "pages" / "Dashboard.jsx"

# ---------- Backend ----------
backend = DASH.read_text(encoding="utf-8")

endpoint = r'''


@router.get("/source-performance")
def get_source_performance(
    db: Session = Depends(get_db),
):
    leads = (
        db.query(Lead)
        .order_by(Lead.source.asc(), Lead.created_at.desc())
        .all()
    )

    grouped = {}

    for lead in leads:
        source = str(lead.source or "UNKNOWN").strip() or "UNKNOWN"
        source_key = source.upper()

        if source_key not in grouped:
            grouped[source_key] = {
                "source": source_key,
                "total_leads": 0,
                "converted_leads": 0,
                "lost_leads": 0,
                "total_deal_value": 0.0,
            }

        item = grouped[source_key]
        item["total_leads"] += 1

        status = str(lead.status or "").strip().upper()

        if status == "CONVERTED":
            item["converted_leads"] += 1
            item["total_deal_value"] += float(lead.deal_value or 0)
        elif status == "LOST":
            item["lost_leads"] += 1

    sources = []

    for item in grouped.values():
        converted = item["converted_leads"]
        total = item["total_leads"]
        revenue = item["total_deal_value"]

        item["conversion_rate"] = round(
            (converted / total) * 100 if total else 0,
            2,
        )

        item["average_deal_value"] = round(
            revenue / converted if converted else 0,
            2,
        )

        item["total_deal_value"] = round(revenue, 2)

        sources.append(item)

    sources.sort(
        key=lambda item: (
            item["total_deal_value"],
            item["converted_leads"],
            item["total_leads"],
        ),
        reverse=True,
    )

    return {"sources": sources}
'''

if '@router.get("/source-performance")' not in backend:
    DASH.write_text(
        backend.rstrip() + endpoint + "\n",
        encoding="utf-8"
    )
    print("Added backend /dashboard/source-performance endpoint")
else:
    print("Backend source-performance endpoint already exists")


# ---------- Frontend API ----------
api = API.read_text(encoding="utf-8")

api_fn = r'''

export const getSourcePerformance = async () => {
  const response = await API.get("/dashboard/source-performance")
  return response.data
}
'''

if "getSourcePerformance" not in api:
    marker = "export default API"

    if marker not in api:
        raise SystemExit(
            "Could not find 'export default API' in api.js"
        )

    api = api.replace(
        marker,
        api_fn + "\n" + marker,
        1
    )

    API.write_text(
        api,
        encoding="utf-8"
    )

    print("Added getSourcePerformance() to api.js")

else:
    print("getSourcePerformance() already exists")


# ---------- Dashboard ----------
page = PAGE.read_text(encoding="utf-8")


# Import
old_import = '''  getSourceAnalytics,
  getDashboardFollowUps,'''

new_import = '''  getSourceAnalytics,
  getSourcePerformance,
  getDashboardFollowUps,'''

if "getSourcePerformance," not in page:
    if old_import not in page:
        raise SystemExit(
            "Could not find dashboard import block"
        )

    page = page.replace(
        old_import,
        new_import,
        1
    )


# State
old_state = '''  const [sourceAnalytics, setSourceAnalytics] = useState([])
  const [leads, setLeads] = useState([])'''

new_state = '''  const [sourceAnalytics, setSourceAnalytics] = useState([])
  const [sourcePerformance, setSourcePerformance] = useState([])
  const [leads, setLeads] = useState([])'''

if "const [sourcePerformance, setSourcePerformance]" not in page:
    if old_state not in page:
        raise SystemExit(
            "Could not find sourceAnalytics state"
        )

    page = page.replace(
        old_state,
        new_state,
        1
    )


# Promise.all
old_promise = '''        getSalesAnalytics(),
        getSourceAnalytics(),
        getDashboardFollowUps(),'''

new_promise = '''        getSalesAnalytics(),
        getSourceAnalytics(),
        getSourcePerformance(),
        getDashboardFollowUps(),'''

if "        getSourcePerformance()," not in page:
    if old_promise not in page:
        raise SystemExit(
            "Could not find Promise.all analytics block"
        )

    page = page.replace(
        old_promise,
        new_promise,
        1
    )


# Destructure response
old_destructure = '''        salesAnalyticsResponse,
        sourceResponse,
        followUpsResponse,'''

new_destructure = '''        salesAnalyticsResponse,
        sourceResponse,
        sourcePerformanceResponse,
        followUpsResponse,'''

if "        sourcePerformanceResponse," not in page:
    if old_destructure not in page:
        raise SystemExit(
            "Could not find dashboard response destructuring"
        )

    page = page.replace(
        old_destructure,
        new_destructure,
        1
    )


# Set source performance state
anchor = '''      } else {
        setSourceAnalytics([])
      }

      if (Array.isArray(followUpsResponse)) {'''

replacement = '''      } else {
        setSourceAnalytics([])
      }

      if (Array.isArray(sourcePerformanceResponse?.sources)) {
        setSourcePerformance(sourcePerformanceResponse.sources)
      } else if (Array.isArray(sourcePerformanceResponse)) {
        setSourcePerformance(sourcePerformanceResponse)
      } else {
        setSourcePerformance([])
      }

      if (Array.isArray(followUpsResponse)) {'''

if "setSourcePerformance(sourcePerformanceResponse.sources)" not in page:
    if anchor not in page:
        raise SystemExit(
            "Could not find source analytics state setter block"
        )

    page = page.replace(
        anchor,
        replacement,
        1
    )


# Replace old SOURCE ANALYTICS section
start_marker = '        {/* SOURCE ANALYTICS */}'
end_marker = '        {/* FOLLOW-UP MANAGEMENT */}'

start = page.find(start_marker)
end = page.find(end_marker, start)

if start == -1 or end == -1:
    raise SystemExit(
        "Could not locate SOURCE ANALYTICS section boundaries"
    )


section = r'''        {/* STEP 31 - SALES SOURCE PERFORMANCE */}
        <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Sales by Source
              </h2>

              <p className="text-sm text-gray-500">
                Compare lead quality, conversions and revenue across acquisition sources.
              </p>
            </div>

            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Source Performance
            </span>
          </div>

          {analyticsLoading ? (
            <div className="py-8 text-center text-sm text-gray-500">
              Loading source performance...
            </div>
          ) : sourcePerformance.length === 0 ? (
            <div className="rounded-xl bg-gray-50 p-6 text-center text-sm text-gray-500">
              No source performance data available.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left">
                <thead className="border-b bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Source
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Total Leads
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Converted
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Lost
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Conversion
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Revenue
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Avg Deal
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {sourcePerformance.map((item) => {
                    const itemSource = String(item.source || "UNKNOWN")
                    const total = Number(item.total_leads || 0)
                    const converted = Number(item.converted_leads || 0)
                    const lost = Number(item.lost_leads || 0)
                    const conversionRate = Number(item.conversion_rate || 0)
                    const revenue = Number(item.total_deal_value || 0)
                    const averageDeal = Number(item.average_deal_value || 0)
                    const isSelected = source === itemSource

                    return (
                      <tr
                        key={itemSource}
                        className={`border-b last:border-b-0 ${
                          isSelected ? "bg-gray-50" : "hover:bg-gray-50"
                        }`}
                      >
                        <td className="px-4 py-4">
                          <button
                            type="button"
                            onClick={() =>
                              setSource(isSelected ? "ALL" : itemSource)
                            }
                            className={`font-semibold hover:underline ${
                              isSelected ? "text-gray-900" : "text-gray-700"
                            }`}
                          >
                            {itemSource}
                          </button>
                        </td>

                        <td className="px-4 py-4 text-sm font-semibold text-gray-900">
                          {total}
                        </td>

                        <td className="px-4 py-4 text-sm font-semibold text-gray-900">
                          {converted}
                        </td>

                        <td className="px-4 py-4 text-sm font-semibold text-gray-900">
                          {lost}
                        </td>

                        <td className="px-4 py-4">
                          <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
                            {conversionRate.toFixed(2)}%
                          </span>
                        </td>

                        <td className="px-4 py-4 text-sm font-semibold text-gray-900">
                          ₹{revenue.toLocaleString("en-IN")}
                        </td>

                        <td className="px-4 py-4 text-sm font-semibold text-gray-900">
                          ₹{averageDeal.toLocaleString("en-IN")}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {source !== "ALL" && (
            <div className="mt-4 flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
              <p className="text-sm text-gray-600">
                Showing leads from <span className="font-semibold text-gray-900">{source}</span>
              </p>

              <button
                type="button"
                onClick={() => setSource("ALL")}
                className="text-sm font-semibold text-gray-700 hover:text-gray-900"
              >
                Clear source
              </button>
            </div>
          )}
        </section>


'''

page = page[:start] + section + page[end:]

PAGE.write_text(
    page,
    encoding="utf-8"
)

print("Updated Dashboard.jsx for Step 31")