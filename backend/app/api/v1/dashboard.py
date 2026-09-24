from collections import defaultdict

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime
from backend.app.db.database import get_db
from backend.app.models.lead import Lead
from backend.app.models.follow_up import FollowUp

router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"],
)


@router.get("/stats")
def get_dashboard_stats(db: Session = Depends(get_db)):
    total_leads = db.query(Lead).count()

    hot_leads = (
        db.query(Lead)
        .filter(Lead.temperature == "HOT")
        .count()
    )

    warm_leads = (
        db.query(Lead)
        .filter(Lead.temperature == "WARM")
        .count()
    )

    cold_leads = (
        db.query(Lead)
        .filter(Lead.temperature == "COLD")
        .count()
    )

    return {
        "total_leads": total_leads,
        "hot_leads": hot_leads,
        "warm_leads": warm_leads,
        "cold_leads": cold_leads,
    }


@router.get("/source-analytics")
def get_source_analytics(db: Session = Depends(get_db)):
    leads = (
        db.query(Lead)
        .order_by(Lead.created_at.desc())
        .all()
    )

    analytics = defaultdict(
        lambda: {
            "total": 0,
            "hot": 0,
            "warm": 0,
            "cold": 0,
        }
    )

    for lead in leads:
        source = (lead.source or "OTHER").strip().upper()

        if not source:
            source = "OTHER"

        analytics[source]["total"] += 1

        if lead.temperature == "HOT":
            analytics[source]["hot"] += 1

        elif lead.temperature == "WARM":
            analytics[source]["warm"] += 1

        elif lead.temperature == "COLD":
            analytics[source]["cold"] += 1

    return [
        {
            "source": source,
            "total": data["total"],
            "hot": data["hot"],
            "warm": data["warm"],
            "cold": data["cold"],
        }
        for source, data in sorted(
            analytics.items(),
            key=lambda item: item[1]["total"],
            reverse=True,
        )
    ]

@router.get("/follow-ups")
def dashboard_follow_ups(
    db: Session = Depends(get_db),
):
    now = datetime.utcnow()

    rows = (
        db.query(FollowUp, Lead)
        .join(Lead, Lead.id == FollowUp.lead_id)
        .filter(FollowUp.status == "PENDING")
        .order_by(FollowUp.scheduled_at.asc())
        .all()
    )

    result = []

    for follow_up, lead in rows:
        scheduled_at = follow_up.scheduled_at

        timing = "UPCOMING"

        if scheduled_at <= now:
            timing = "DUE"

        result.append(
            {
                "id": follow_up.id,
                "lead_id": lead.id,
                "lead_name": lead.name,
                "phone": lead.phone,
                "temperature": lead.temperature,
                "follow_up_type": follow_up.follow_up_type,
                "scheduled_at": scheduled_at,
                "status": follow_up.status,
                "action": follow_up.action,
                "reason": follow_up.reason,
                "timing": timing,
            }
        )

    return result

@router.get("/sales-analytics")
def get_sales_analytics(
    db: Session = Depends(get_db),
):
    leads = (
        db.query(Lead)
        .order_by(Lead.created_at.desc())
        .all()
    )

    total_leads = len(leads)

    converted_leads = [
        lead
        for lead in leads
        if str(lead.status or "").upper() == "CONVERTED"
    ]

    lost_leads = [
        lead
        for lead in leads
        if str(lead.status or "").upper() == "LOST"
    ]

    active_leads = [
        lead
        for lead in leads
        if str(lead.status or "").upper()
        not in {"CONVERTED", "LOST"}
    ]

    total_deal_value = sum(
        float(lead.deal_value or 0)
        for lead in converted_leads
    )

    average_deal_value = (
        total_deal_value / len(converted_leads)
        if converted_leads
        else 0
    )

    conversion_rate = (
        (len(converted_leads) / total_leads) * 100
        if total_leads
        else 0
    )

    lost_rate = (
        (len(lost_leads) / total_leads) * 100
        if total_leads
        else 0
    )

    pipeline_stages = [
        "NEW",
        "QUALIFIED",
        "CONTACTED",
        "INTERESTED",
        "SITE_VISIT",
        "NEGOTIATION",
        "CONVERTED",
    ]

    pipeline = {}

    for stage in pipeline_stages:
        pipeline[stage] = sum(
            1
            for lead in leads
            if str(lead.status or "").upper() == stage
        )

    pipeline["LOST"] = len(lost_leads)

    return {
        "total_leads": total_leads,
        "active_leads": len(active_leads),
        "converted_leads": len(converted_leads),
        "lost_leads": len(lost_leads),
        "conversion_rate": round(
            conversion_rate,
            2,
        ),
        "lost_rate": round(
            lost_rate,
            2,
        ),
        "total_deal_value": round(
            total_deal_value,
            2,
        ),
        "average_deal_value": round(
            average_deal_value,
            2,
        ),
        "pipeline": pipeline,
    }


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

# ============================================================
# STEP 32 - REVENUE & CONVERSION TREND
# ============================================================

@router.get("/revenue-trend")
def get_revenue_trend(
    db: Session = Depends(get_db),
):
    leads = (
        db.query(Lead)
        .order_by(Lead.created_at.asc())
        .all()
    )

    grouped = {}

    for lead in leads:
        if not lead.created_at:
            continue

        date_key = lead.created_at.strftime("%Y-%m-%d")

        if date_key not in grouped:
            grouped[date_key] = {
                "date": date_key,
                "leads": 0,
                "converted": 0,
                "lost": 0,
                "revenue": 0.0,
            }

        item = grouped[date_key]

        item["leads"] += 1

        status = str(lead.status or "").strip().upper()

        if status == "CONVERTED":
            item["converted"] += 1
            item["revenue"] += float(lead.deal_value or 0)

        elif status == "LOST":
            item["lost"] += 1

    trend = list(grouped.values())

    for item in trend:
        item["revenue"] = round(item["revenue"], 2)

    return {
        "trend": trend
    }


# ============================================================
# STEP 33 - CONVERSION FUNNEL
# ============================================================

@router.get("/conversion-funnel")
def get_conversion_funnel(
    db: Session = Depends(get_db),
):
    leads = db.query(Lead).all()

    stages = [
        "NEW",
        "QUALIFIED",
        "CONTACTED",
        "INTERESTED",
        "SITE_VISIT",
        "NEGOTIATION",
        "CONVERTED",
    ]

    funnel = []

    total_leads = len(leads)

    for index, stage in enumerate(stages):
        count = sum(
            1
            for lead in leads
            if str(lead.status or "").strip().upper() == stage
        )

        previous_count = (
            total_leads
            if index == 0
            else funnel[index - 1]["count"]
        )

        stage_conversion = (
            (count / previous_count) * 100
            if previous_count
            else 0
        )

        overall_percentage = (
            (count / total_leads) * 100
            if total_leads
            else 0
        )

        funnel.append({
            "stage": stage,
            "count": count,
            "stage_conversion": round(stage_conversion, 2),
            "overall_percentage": round(
                overall_percentage,
                2
            ),
        })

    return {
        "total_leads": total_leads,
        "funnel": funnel,
    }


# ============================================================
# STEP 34 - LEAD AGING
# ============================================================

@router.get("/lead-aging")
def get_lead_aging(
    db: Session = Depends(get_db),
):
    from datetime import datetime

    leads = (
        db.query(Lead)
        .order_by(Lead.updated_at.asc())
        .all()
    )

    now = datetime.utcnow()

    aging = {
        "fresh": 0,
        "attention": 0,
        "stale": 0,
        "critical": 0,
    }

    stale_leads = []

    for lead in leads:
        status = str(
            lead.status or ""
        ).strip().upper()

        if status in {"CONVERTED", "LOST"}:
            continue

        last_activity = (
            lead.updated_at
            or lead.created_at
        )

        if not last_activity:
            continue

        age_days = max(
            0,
            (now - last_activity).days
        )

        if age_days <= 2:
            category = "fresh"
            aging["fresh"] += 1

        elif age_days <= 5:
            category = "attention"
            aging["attention"] += 1

        elif age_days <= 7:
            category = "stale"
            aging["stale"] += 1

        else:
            category = "critical"
            aging["critical"] += 1

        if age_days >= 3:
            stale_leads.append({
                "id": lead.id,
                "name": lead.name or "Unnamed Lead",
                "phone": lead.phone,
                "status": status or "NEW",
                "temperature": lead.temperature,
                "score": lead.score,
                "age_days": age_days,
                "category": category,
            })

    stale_leads.sort(
        key=lambda item: item["age_days"],
        reverse=True,
    )

    return {
        "summary": aging,
        "stale_leads": stale_leads[:20],
    }


# ============================================================
# STEP 35 - SALES ALERTS
# ============================================================

@router.get("/sales-alerts")
def get_sales_alerts(
    db: Session = Depends(get_db),
):
    from datetime import datetime

    leads = db.query(Lead).all()

    now = datetime.utcnow()

    hot_count = 0
    stale_count = 0
    due_followups = 0
    converted_count = 0
    total_revenue = 0.0

    for lead in leads:
        status = str(
            lead.status or ""
        ).strip().upper()

        temperature = str(
            lead.temperature or ""
        ).strip().upper()

        if (
            temperature == "HOT"
            and status not in {"CONVERTED", "LOST"}
        ):
            hot_count += 1

        if status not in {"CONVERTED", "LOST"}:
            last_activity = (
                lead.updated_at
                or lead.created_at
            )

            if last_activity:
                age_days = max(
                    0,
                    (now - last_activity).days
                )

                if age_days >= 7:
                    stale_count += 1

        if status == "CONVERTED":
            converted_count += 1
            total_revenue += float(
                lead.deal_value or 0
            )

    # Follow-up model is already part of the project.
    try:
        from backend.app.models.follow_up import FollowUp

        followups = (
            db.query(FollowUp)
            .filter(
                FollowUp.status == "PENDING"
            )
            .all()
        )

        for followup in followups:
            if followup.scheduled_at:
                if followup.scheduled_at <= now:
                    due_followups += 1

    except Exception:
        due_followups = 0

    alerts = []

    if hot_count > 0:
        alerts.append({
            "type": "HOT_LEADS",
            "severity": "HIGH",
            "title": f"{hot_count} HOT lead(s) need attention",
            "description": "Hot leads are active opportunities and should be contacted promptly.",
            "count": hot_count,
        })

    if stale_count > 0:
        alerts.append({
            "type": "STALE_LEADS",
            "severity": "MEDIUM",
            "title": f"{stale_count} lead(s) inactive for 7+ days",
            "description": "These leads have not been updated recently.",
            "count": stale_count,
        })

    if due_followups > 0:
        alerts.append({
            "type": "DUE_FOLLOWUPS",
            "severity": "HIGH",
            "title": f"{due_followups} follow-up(s) are due",
            "description": "Pending follow-ups have reached their scheduled time.",
            "count": due_followups,
        })

    if converted_count > 0:
        alerts.append({
            "type": "REVENUE",
            "severity": "INFO",
            "title": f"{converted_count} deal(s) converted",
            "description": "Converted deals have generated ₹"
            + f"{total_revenue:,.0f}"
            + " in recorded revenue.",
            "count": converted_count,
        })

    return {
        "alerts": alerts,
        "summary": {
            "hot_leads": hot_count,
            "stale_leads": stale_count,
            "due_followups": due_followups,
            "converted_leads": converted_count,
            "total_revenue": round(
                total_revenue,
                2,
            ),
        },
    }

# ============================================================
# STEP 37 - LEAD INTELLIGENCE
# ============================================================

@router.get("/lead-intelligence")
def get_lead_intelligence(
    db: Session = Depends(get_db),
):
    leads = (
        db.query(Lead)
        .order_by(
            Lead.score.desc(),
            Lead.created_at.desc(),
        )
        .all()
    )

    active_leads = [
        lead
        for lead in leads
        if str(lead.status or "").strip().upper()
        not in {"CONVERTED", "LOST"}
    ]

    hot = 0
    warm = 0
    cold = 0

    priority_leads = []

    for lead in active_leads:

        temperature = str(
            lead.temperature or "COLD"
        ).strip().upper()

        if temperature == "HOT":
            hot += 1

        elif temperature == "WARM":
            warm += 1

        else:
            cold += 1

        priority_leads.append({
            "id": lead.id,
            "name": lead.name or "Unnamed Lead",
            "phone": lead.phone,
            "status": str(
                lead.status or "NEW"
            ).upper(),
            "temperature": temperature,
            "score": int(lead.score or 0),
            "budget_max": float(
                lead.budget_max or 0
            ),
            "location": lead.location,
            "timeline": lead.timeline,
        })

    priority_leads.sort(
        key=lambda item: (
            item["score"],
            item["budget_max"],
        ),
        reverse=True,
    )

    return {
        "summary": {
            "hot": hot,
            "warm": warm,
            "cold": cold,
            "total_active": len(active_leads),
        },
        "priority_leads": priority_leads[:10],
    }


# ============================================================
# STEP 38 - FOLLOW-UP INTELLIGENCE
# ============================================================

@router.get("/follow-up-intelligence")
def get_follow_up_intelligence(
    db: Session = Depends(get_db),
):
    now = datetime.utcnow()

    followups = (
        db.query(FollowUp, Lead)
        .join(
            Lead,
            Lead.id == FollowUp.lead_id,
        )
        .order_by(
            FollowUp.scheduled_at.asc()
        )
        .all()
    )

    overdue = []
    today = []
    upcoming = []
    completed = 0

    for follow_up, lead in followups:

        status = str(
            follow_up.status or ""
        ).strip().upper()

        scheduled_at = follow_up.scheduled_at

        if status == "COMPLETED":
            completed += 1
            continue

        if not scheduled_at:
            continue

        item = {
            "id": follow_up.id,
            "lead_id": lead.id,
            "lead_name": lead.name or "Unnamed Lead",
            "phone": lead.phone,
            "temperature": lead.temperature,
            "follow_up_type": follow_up.follow_up_type,
            "scheduled_at": scheduled_at,
            "status": follow_up.status,
            "action": follow_up.action,
            "reason": follow_up.reason,
        }

        if scheduled_at < now:
            overdue.append(item)

        elif scheduled_at.date() == now.date():
            today.append(item)

        else:
            upcoming.append(item)

    total = len(followups)

    completion_rate = (
        (completed / total) * 100
        if total
        else 0
    )

    return {
        "summary": {
            "overdue": len(overdue),
            "today": len(today),
            "upcoming": len(upcoming),
            "completed": completed,
            "completion_rate": round(
                completion_rate,
                2,
            ),
        },
        "followups": (
            overdue +
            today +
            upcoming
        )[:20],
    }


# ============================================================
# STEP 39 - REVENUE FORECAST
# ============================================================

@router.get("/revenue-forecast")
def get_revenue_forecast(
    db: Session = Depends(get_db),
):
    leads = db.query(Lead).all()

    converted_revenue = 0.0
    pipeline_value = 0.0

    qualified_value = 0.0
    interested_value = 0.0
    negotiation_value = 0.0

    for lead in leads:

        status = str(
            lead.status or ""
        ).strip().upper()

        if status == "CONVERTED":

            converted_revenue += float(
                lead.deal_value or 0
            )

            continue

        if status == "LOST":
            continue

        budget = float(
            lead.budget_max or 0
        )

        pipeline_value += budget

        if status == "QUALIFIED":
            qualified_value += budget

        elif status == "INTERESTED":
            interested_value += budget

        elif status == "NEGOTIATION":
            negotiation_value += budget

    forecast_value = (
        qualified_value * 0.20
        + interested_value * 0.40
        + negotiation_value * 0.70
    )

    return {
        "converted_revenue": round(
            converted_revenue,
            2,
        ),
        "pipeline_value": round(
            pipeline_value,
            2,
        ),
        "forecast_value": round(
            forecast_value,
            2,
        ),
        "components": {
            "qualified": round(
                qualified_value,
                2,
            ),
            "interested": round(
                interested_value,
                2,
            ),
            "negotiation": round(
                negotiation_value,
                2,
            ),
        },
    }


# ============================================================
# STEP 40 - SALES PRODUCTIVITY
# ============================================================

@router.get("/sales-productivity")
def get_sales_productivity(
    db: Session = Depends(get_db),
):
    leads = db.query(Lead).all()

    total_leads = len(leads)

    converted_leads = sum(
        1
        for lead in leads
        if str(lead.status or "").strip().upper()
        == "CONVERTED"
    )

    lost_leads = sum(
        1
        for lead in leads
        if str(lead.status or "").strip().upper()
        == "LOST"
    )

    active_leads = (
        total_leads
        - converted_leads
        - lost_leads
    )

    conversion_rate = (
        (converted_leads / total_leads) * 100
        if total_leads
        else 0
    )

    return {
        "total_leads": total_leads,
        "active_leads": active_leads,
        "converted_leads": converted_leads,
        "lost_leads": lost_leads,
        "conversion_rate": round(
            conversion_rate,
            2,
        ),
    }


# ============================================================
# STEP 41 - ADVANCED LEAD FILTER OPTIONS
# ============================================================

@router.get("/lead-filter-options")
def get_lead_filter_options(
    db: Session = Depends(get_db),
):
    leads = db.query(Lead).all()

    statuses = sorted({
        str(lead.status).strip().upper()
        for lead in leads
        if lead.status
    })

    temperatures = sorted({
        str(lead.temperature).strip().upper()
        for lead in leads
        if lead.temperature
    })

    sources = sorted({
        str(lead.source).strip().upper()
        for lead in leads
        if lead.source
    })

    locations = sorted({
        str(lead.location).strip()
        for lead in leads
        if lead.location
    })

    return {
        "statuses": statuses,
        "temperatures": temperatures,
        "sources": sources,
        "locations": locations,
    }