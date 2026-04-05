from __future__ import annotations

import asyncio
import json
from datetime import datetime, timezone
from math import ceil
from pathlib import Path
from urllib.parse import parse_qs
from typing import Any, Literal, Optional

from fastapi import BackgroundTasks, FastAPI, HTTPException, Request, Response
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field


RequestCategory = Literal["food", "medical", "rescue", "shelter", "baby_care", "women_care", "water", "emergency_help"]
RequestStatus = Literal["pending", "assigned", "completed"]
RequestSource = Literal["web", "ivr", "whatsapp", "missed_call", "drone"]
VolunteerAvailability = Literal["available", "busy", "inactive"]


class RequestIn(BaseModel):
    name: str
    phone: str
    category: RequestCategory
    family_size: int = Field(alias="people", ge=1)
    location: str
    zone: str
    lat: Optional[float] = None
    lng: Optional[float] = None
    source: RequestSource = "web"


class AssignIn(BaseModel):
    request_id: str
    volunteer_id: str


class CompleteIn(BaseModel):
    request_id: str

class MissionStartIn(BaseModel):
    request_id: str
    volunteer_id: str


class PriorityIn(BaseModel):
    request_id: str
    priority: int


class VolunteerIn(BaseModel):
    name: str
    phone: str
    skills: list[str] = Field(default_factory=list)
    vehicle: bool = False
    zone: str = "Ranchi"
    availability: VolunteerAvailability = "available"
    lat: Optional[float] = None
    lng: Optional[float] = None
    image: Optional[str] = None
    id_card: Optional[str] = Field(default=None, alias="idCard")


class VolunteerStatusIn(BaseModel):
    volunteer_id: str
    availability: Literal["available", "busy", "inactive"]


class IVRIn(BaseModel):
    phone: str
    digit: str
    location: str | None = None
    zone: str | None = None


class WhatsAppIn(BaseModel):
    phone: str
    message: str
    location: str | None = None
    zone: str | None = None


class MissedCallIn(BaseModel):
    phone: str | None = None
    location: str | None = None
    zone: str | None = None


class DroneDetectionIn(BaseModel):
    id: str | None = None
    lat: float | None = None
    lng: float | None = None
    persons: int = 1
    flag: Literal["red", "yellow", "green"] = "red"
    area: str | None = None
    zone: str | None = None


class AlertIn(BaseModel):
    message: str
    channels: list[Literal["sms", "ivr", "whatsapp"]] = Field(default_factory=lambda: ["sms", "ivr", "whatsapp"])


app = FastAPI(title="SahayakNet Backend", version="1.1.0")

app.add_middleware(GZipMiddleware, minimum_size=500)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


ZONE_COORDS: dict[str, tuple[float, float]] = {
    "Ranchi": (23.3441, 85.3096),
    "Dhanbad": (23.7957, 86.4304),
    "Jamshedpur": (22.8046, 86.2029),
}

CATEGORIES: list[RequestCategory] = ["food", "medical", "rescue", "shelter", "baby_care", "women_care", "water", "emergency_help"]

requests: list[dict[str, Any]] = []
volunteers: list[dict[str, Any]] = []
missions: list[dict[str, Any]] = []
resources: list[dict[str, Any]] = []
alerts: list[str] = []
camps: list[dict[str, Any]] = []
request_counter = 1
volunteer_counter = 1
mission_counter = 1
dashboard_cache_full: dict[str, Any] = {}
dashboard_cache_compact: dict[str, Any] = {}
dashboard_cache_updated_at = ""
duplicate_request_index: dict[str, str] = {}
cache_refresh_task: asyncio.Task[None] | None = None
WHATSAPP_DATA_FILE = Path(__file__).with_name("whatsapp_requests.json")
FRONTEND_HTML_FILE = Path(__file__).with_name("frontend.html")


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def load_whatsapp_data() -> list[dict[str, Any]]:
    if not WHATSAPP_DATA_FILE.exists():
        WHATSAPP_DATA_FILE.write_text("[]", encoding="utf-8")

    try:
        content = WHATSAPP_DATA_FILE.read_text(encoding="utf-8").strip()
        data = json.loads(content) if content else []
        return data if isinstance(data, list) else []
    except (OSError, json.JSONDecodeError):
        return []


def save_whatsapp_data(records: list[dict[str, Any]]) -> None:
    WHATSAPP_DATA_FILE.write_text(json.dumps(records, indent=2), encoding="utf-8")


def append_whatsapp_request(phone: str, request_type: str) -> dict[str, str]:
    record = {"phone": phone, "type": request_type, "time": now_iso()}
    records = load_whatsapp_data()
    records.insert(0, record)
    save_whatsapp_data(records)
    return record


def twilio_response(message: str) -> str:
    escaped = message.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    return f'<?xml version="1.0" encoding="UTF-8"?><Response><Message>{escaped}</Message></Response>'


def normalize_location(value: str) -> str:
    return " ".join(value.strip().lower().split())


def duplicate_key(category: RequestCategory, location: str) -> str:
    return f"{category}|{normalize_location(location)}"


def compute_priority(category: RequestCategory, family_size: int, created_at: str) -> int:
    severity_map = {
        "medical": 60,
        "emergency_help": 58,
        "rescue": 55,
        "baby_care": 52,
        "women_care": 50,
        "water": 42,
        "food": 35,
        "shelter": 25,
    }
    waiting_hours = max(0, int((datetime.now(timezone.utc) - datetime.fromisoformat(created_at)).total_seconds() // 3600))
    waiting_score = min(waiting_hours * 2, 30)
    return severity_map[category] + family_size + waiting_score


def calculate_resources(category: RequestCategory, family_size: int) -> dict[str, int]:
    return {
        "food_packets": family_size * 3 if category in {"food", "emergency_help"} else (family_size * 2 if category == "shelter" else 0),
        "water_liters": family_size * 5 if category in {"food", "water", "baby_care", "women_care", "emergency_help"} else 0,
        "water_supply": family_size * 5 if category in {"food", "water", "baby_care", "women_care", "emergency_help"} else 0,
        "medicine_kits": ceil(family_size / 2) if category == "medical" else (1 if category == "emergency_help" else 0),
        "shelter_units": ceil(family_size / 4) if category == "shelter" else 0,
        "baby_care_kits": ceil(family_size / 2) if category == "baby_care" else 0,
        "women_care_kits": ceil(family_size / 2) if category == "women_care" else 0,
        "rescue_boats": 1 if category == "rescue" else 0,
        "emergency_essentials": max(1, ceil(family_size / 2)) if category in {"rescue", "emergency_help"} else 0,
    }


def priority_reason(category: RequestCategory, family_size: int) -> str:
    reason_map = {
        "medical": "medical emergency",
        "rescue": "rescue need",
        "shelter": "shelter shortage",
        "baby_care": "infant support need",
        "women_care": "women care shortage",
        "water": "water shortage",
        "emergency_help": "critical emergency",
        "food": "food shortage",
    }
    base = reason_map[category]
    return f"High priority due to {base} + {family_size} member{'s' if family_size > 1 else ''}."


def resource_summary(category: RequestCategory, family_size: int) -> str:
    if category == "medical":
        return f"Medicine kits needed: {max(1, ceil(family_size / 2))} units"
    if category == "rescue":
        return f"Rescue support needed for {family_size} people"
    if category == "shelter":
        return f"Shelter units needed: {max(1, ceil(family_size / 4))}"
    if category == "baby_care":
        return f"Baby care kits needed: {max(1, ceil(family_size / 2))} units"
    if category == "women_care":
        return f"Women care kits needed: {max(1, ceil(family_size / 2))} units"
    if category == "water":
        return f"Water supply needed: {family_size * 5} liters"
    if category == "emergency_help":
        return f"Emergency essentials needed for {family_size} people"
    return f"Food needed: {family_size * 2} units"


def detect_duplicate(category: RequestCategory, location: str) -> dict[str, Any] | None:
    idx_key = duplicate_key(category, location)
    existing_id = duplicate_request_index.get(idx_key)
    if existing_id:
        existing = find_request(existing_id)
        if existing and existing.get("status") != "completed":
            return existing

    payload_location = normalize_location(location)
    for existing in requests:
        if existing["category"] == category and normalize_location(existing["location"]) == payload_location and existing["status"] != "completed":
            duplicate_request_index[idx_key] = existing["id"]
            return existing
    return None


def infer_zone(zone: str | None, lat: float | None, lng: float | None) -> tuple[str, float, float]:
    if zone and zone in ZONE_COORDS:
        base_lat, base_lng = ZONE_COORDS[zone]
        return zone, lat if lat is not None else base_lat, lng if lng is not None else base_lng

    if lat is not None and lng is not None:
        closest_zone = min(ZONE_COORDS.items(), key=lambda item: (item[1][0] - lat) ** 2 + (item[1][1] - lng) ** 2)[0]
        return closest_zone, lat, lng

    return "Ranchi", ZONE_COORDS["Ranchi"][0], ZONE_COORDS["Ranchi"][1]


def build_request(
    *,
    name: str,
    phone: str,
    category: RequestCategory,
    family_size: int,
    location: str,
    zone: str | None,
    source: RequestSource,
    lat: float | None = None,
    lng: float | None = None,
) -> dict[str, Any]:
    global request_counter

    inferred_zone, resolved_lat, resolved_lng = infer_zone(zone, lat, lng)
    created_at = now_iso()

    duplicate = detect_duplicate(category, location)
    if duplicate:
        duplicate["family_size"] += family_size
        duplicate["people"] = duplicate["family_size"]
        duplicate["priority"] = compute_priority(category, duplicate["family_size"], duplicate["createdAt"])
        duplicate["resourcesNeeded"] = calculate_resources(category, duplicate["family_size"])
        duplicate["duplicateOf"] = duplicate["id"]
        duplicate["mergedCount"] = duplicate.get("mergedCount", 1) + 1
        duplicate["priorityReason"] = priority_reason(category, duplicate["family_size"])
        duplicate["resourceSummary"] = resource_summary(category, duplicate["family_size"])
        duplicate_request_index[duplicate_key(category, location)] = duplicate["id"]
        return duplicate

    request_id = f"REQ-{request_counter:04}"
    request_counter += 1
    request = {
        "id": request_id,
        "name": name,
        "phone": phone,
        "category": category,
        "family_size": family_size,
        "people": family_size,
        "location": location,
        "zone": inferred_zone,
        "lat": resolved_lat,
        "lng": resolved_lng,
        "priority": compute_priority(category, family_size, created_at),
        "createdAt": created_at,
        "status": "pending",
        "source": source,
        "sourceLabel": source.replace("_", " ").title(),
        "resourcesNeeded": calculate_resources(category, family_size),
        "resourceSummary": resource_summary(category, family_size),
        "priorityReason": priority_reason(category, family_size),
        "mergedCount": 1,
        "assignedVolunteerId": None,
        "assignedVolunteerName": None,
        "eta": None,
    }
    requests.insert(0, request)
    duplicate_request_index[duplicate_key(category, location)] = request_id
    return request


def find_request(request_id: str) -> dict[str, Any] | None:
    return next((item for item in requests if item["id"] == request_id), None)


def find_volunteer(volunteer_id: str) -> dict[str, Any] | None:
    return next((item for item in volunteers if item["id"] == volunteer_id), None)


def compact_request(item: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": item.get("id"),
        "name": item.get("name"),
        "phone": item.get("phone"),
        "category": item.get("category"),
        "people": item.get("people"),
        "family_size": item.get("family_size"),
        "location": item.get("location"),
        "zone": item.get("zone"),
        "lat": item.get("lat"),
        "lng": item.get("lng"),
        "priority": item.get("priority"),
        "createdAt": item.get("createdAt"),
        "status": item.get("status"),
        "executionStatus": item.get("executionStatus"),
        "source": item.get("source"),
        "sourceLabel": item.get("sourceLabel"),
        "resourcesNeeded": item.get("resourcesNeeded"),
        "resourceSummary": item.get("resourceSummary"),
        "priorityReason": item.get("priorityReason"),
        "mergedCount": item.get("mergedCount"),
        "assignedVolunteerId": item.get("assignedVolunteerId"),
        "assignedVolunteerName": item.get("assignedVolunteerName"),
        "eta": item.get("eta"),
    }


def compact_volunteer(item: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": item.get("id"),
        "name": item.get("name"),
        "phone": item.get("phone"),
        "skills": item.get("skills"),
        "vehicle": item.get("vehicle"),
        "availability": item.get("availability"),
        "zone": item.get("zone"),
        "image": item.get("image"),
        "idCard": item.get("idCard"),
        "age": item.get("age"),
        "lat": item.get("lat"),
        "lng": item.get("lng"),
        "tasksCompleted": item.get("tasksCompleted"),
    }


def compact_resource(item: dict[str, Any]) -> dict[str, Any]:
    return {
        "name": item.get("name"),
        "total": item.get("total"),
        "available": item.get("available"),
        "unit": item.get("unit"),
        "dailyConsumption": item.get("dailyConsumption"),
    }


def build_dashboard_payload(compact: bool) -> dict[str, Any]:
    if compact:
        return {
            "summary": update_summary(),
            "resources": [compact_resource(item) for item in resources],
            "alerts": alerts[:20],
            "volunteers": [compact_volunteer(item) for item in volunteers],
            "requests": [compact_request(item) for item in requests],
            "missions": missions[-120:],
            "camps": camps,
            "updatedAt": dashboard_cache_updated_at,
            "lastUpdated": dashboard_cache_updated_at,
        }

    return {
        "summary": update_summary(),
        "resources": resources,
        "alerts": alerts,
        "volunteers": volunteers,
        "requests": requests,
        "missions": missions,
        "camps": camps,
        "updatedAt": dashboard_cache_updated_at,
        "lastUpdated": dashboard_cache_updated_at,
    }


def refresh_dashboard_cache() -> None:
    global dashboard_cache_full, dashboard_cache_compact, dashboard_cache_updated_at
    dashboard_cache_updated_at = now_iso()
    dashboard_cache_full = build_dashboard_payload(compact=False)
    dashboard_cache_compact = build_dashboard_payload(compact=True)


def apply_request_post_processing(request_id: str) -> None:
    # Keep request-response path lightweight while guaranteeing derived fields stay fresh.
    request = find_request(request_id)
    if not request:
        return

    category = request["category"]
    family_size = request.get("family_size", request.get("people", 1))
    request["priority"] = compute_priority(category, family_size, request["createdAt"])
    request["resourcesNeeded"] = calculate_resources(category, family_size)
    request["priorityReason"] = priority_reason(category, family_size)

    if category == "food":
        request["resourceSummary"] = resource_summary(category, family_size)
    elif category == "medical":
        request["resourceSummary"] = resource_summary(category, family_size)
    elif category == "rescue":
        request["resourceSummary"] = resource_summary(category, family_size)
    else:
        request["resourceSummary"] = resource_summary(category, family_size)

    if request.get("status") == "completed":
        request["executionStatus"] = "completed"
    elif request.get("status") == "assigned" and request.get("executionStatus") not in {"on_the_way", "completed"}:
        request["executionStatus"] = "assigned"
    elif request.get("status") == "pending":
        request["executionStatus"] = "pending"

    refresh_dashboard_cache()


def schedule_cache_refresh(background_tasks: BackgroundTasks | None) -> None:
    if background_tasks is None:
        refresh_dashboard_cache()
    else:
        background_tasks.add_task(refresh_dashboard_cache)


async def cache_refresh_loop() -> None:
    while True:
        await asyncio.sleep(5)
        refresh_dashboard_cache()


def consume_inventory_for_request(request: dict[str, Any]) -> None:
    if request.get("inventoryUpdated"):
        return

    needed = request.get("resourcesNeeded", {})
    for resource in resources:
        if resource["name"] == "Food Packets":
            resource["available"] = max(0, resource["available"] - int(needed.get("food_packets", 0)))
        elif resource["name"] == "Medical Kits":
            resource["available"] = max(0, resource["available"] - int(needed.get("medicine_kits", 0)))
        elif resource["name"] == "Shelter Units":
            resource["available"] = max(0, resource["available"] - int(needed.get("shelter_units", 0)))
        elif resource["name"] == "Baby Care Kits":
            resource["available"] = max(0, resource["available"] - int(needed.get("baby_care_kits", 0)))
        elif resource["name"] == "Women Care Kits":
            resource["available"] = max(0, resource["available"] - int(needed.get("women_care_kits", 0)))
        elif resource["name"] == "Water Supply":
            resource["available"] = max(0, resource["available"] - int(needed.get("water_supply", needed.get("water_liters", 0))))
        elif resource["name"] == "Emergency Essentials":
            resource["available"] = max(0, resource["available"] - int(needed.get("emergency_essentials", 0)))

    request["inventoryUpdated"] = True


def nearest_volunteer(request: dict[str, Any]) -> dict[str, Any] | None:
    available = [item for item in volunteers if item["availability"] == "available"]
    if not available:
        return None
    return min(
        available,
        key=lambda item: (item["lat"] - request["lat"]) ** 2 + (item["lng"] - request["lng"]) ** 2,
    )


def update_summary() -> dict[str, Any]:
    active = 0
    completed = 0
    critical = 0
    for item in requests:
        if item["status"] == "completed":
            completed += 1
            continue
        active += 1
        if item["priority"] >= 60:
            critical += 1

    volunteers_available = 0
    for item in volunteers:
        if item["availability"] == "available":
            volunteers_available += 1

    return {
        "totalRequests": len(requests),
        "activeRequests": active,
        "criticalRequests": critical,
        "completedRequests": completed,
        "volunteersAvailable": volunteers_available,
    }


def seed_data() -> None:
    global request_counter, volunteer_counter

    zone_cycle = ["Dhanbad", "Dhanbad", "Dhanbad", "Ranchi", "Jamshedpur"]
    volunteer_skill_sets = [
        ["First Aid", "Swimming"],
        ["Boat Operation", "Navigation"],
        ["Medical", "CPR"],
        ["Cooking", "Logistics"],
        ["Search & Rescue", "Rope Rescue"],
        ["Driving", "Coordination"],
        ["Communication", "Ham Radio"],
        ["Doctor", "Emergency Medicine"],
        ["Water Purification", "Sanitation"],
        ["Counselling", "Language"],
    ]

    for i in range(25):
        zone = zone_cycle[i % len(zone_cycle)]
        volunteers.append(
            {
                "id": f"VOL-{volunteer_counter:03}",
                "name": f"Volunteer {i + 1}",
                "phone": f"900000{i + 1:03}",
                "skills": volunteer_skill_sets[i % len(volunteer_skill_sets)],
                "vehicle": i % 3 != 0,
                "availability": "available" if i < 12 else ("busy" if i < 18 else "inactive"),
                "zone": zone,
                "image": f"/volunteers/{'m' if i < 20 else 'f'}{(i % 20) + 1 if i < 20 else (i - 20) + 1}.jpg",
                "idCard": f"JH-NDMA-{i + 1:04}",
                "age": 22 + (i % 13),
                "lat": ZONE_COORDS[zone][0] + (i % 4) * 0.04,
                "lng": ZONE_COORDS[zone][1] + (i % 4) * 0.04,
                "tasksCompleted": i % 8,
            }
        )
        volunteer_counter += 1

    categories = ["food", "medical", "rescue", "shelter", "baby_care", "women_care", "water", "emergency_help", "food", "medical"]
    sources: list[RequestSource] = ["web", "ivr", "whatsapp", "missed_call", "drone", "web"]
    for i in range(65):
        zone = zone_cycle[i % len(zone_cycle)]
        lat, lng = ZONE_COORDS[zone]
        created_at = now_iso()
        family_size = (i % 9) + 2
        category: RequestCategory = categories[i % len(categories)]  # type: ignore[assignment]
        source: RequestSource = sources[i % len(sources)]
        status = "pending" if i < 42 else ("assigned" if i < 56 else "completed")
        request = {
            "id": f"REQ-{request_counter:04}",
            "name": f"Citizen {i + 1}",
            "phone": f"98{10000000 + i}",
            "category": category,
            "family_size": family_size,
            "people": family_size,
            "location": f"Flood Pocket {zone} Sector {i % 12 + 1}",
            "zone": zone,
            "lat": round(lat + ((i % 5) - 2) * 0.03, 5),
            "lng": round(lng + ((i % 4) - 1) * 0.03, 5),
            "priority": compute_priority(category, family_size, created_at),
            "createdAt": created_at,
            "status": status,
            "executionStatus": "completed" if status == "completed" else ("assigned" if status == "assigned" else "pending"),
            "source": source,
            "sourceLabel": source.replace("_", " ").title(),
            "resourcesNeeded": calculate_resources(category, family_size),
            "resourceSummary": resource_summary(category, family_size),
            "priorityReason": priority_reason(category, family_size),
            "mergedCount": 1 if i % 5 else (2 + (i % 3)),
            "assignedVolunteerId": None,
            "assignedVolunteerName": None,
            "eta": None,
            "inventoryUpdated": status == "completed",
        }
        if request["status"] != "pending":
            volunteer = volunteers[i % len(volunteers)]
            request["assignedVolunteerId"] = volunteer["id"]
            request["assignedVolunteerName"] = volunteer["name"]
            request["eta"] = f"{15 + (i % 6) * 5} mins"
            if volunteer["availability"] != "inactive":
                volunteer["availability"] = "busy"
        if request["status"] == "completed":
            volunteer = volunteers[i % len(volunteers)]
            volunteer["tasksCompleted"] += 1
        requests.append(request)
        request_counter += 1


seed_data()

resources = [
    {"name": "Food Packets", "total": 2500, "available": 480, "unit": "packets", "dailyConsumption": 410},
    {"name": "Medical Kits", "total": 800, "available": 260, "unit": "kits", "dailyConsumption": 110},
    {"name": "Shelter Units", "total": 400, "available": 190, "unit": "units", "dailyConsumption": 32},
    {"name": "Baby Care Kits", "total": 300, "available": 92, "unit": "kits", "dailyConsumption": 24},
    {"name": "Women Care Kits", "total": 260, "available": 80, "unit": "kits", "dailyConsumption": 18},
    {"name": "Water Supply", "total": 5000, "available": 1460, "unit": "liters", "dailyConsumption": 480},
    {"name": "Emergency Essentials", "total": 600, "available": 175, "unit": "kits", "dailyConsumption": 60},
]

camps = [
    {"id": "CAMP-01", "name": "Dhanbad Relief Camp A", "zone": "Dhanbad", "capacity": 300, "occupied": 248},
    {"id": "CAMP-02", "name": "Dhanbad Relief Camp B", "zone": "Dhanbad", "capacity": 220, "occupied": 201},
    {"id": "CAMP-03", "name": "Ranchi Transit Camp", "zone": "Ranchi", "capacity": 180, "occupied": 96},
]

alerts = [
    "Flood emergency declared in Dhanbad low-lying zones",
    "Food shortage risk in 24-36 hours if inflow not increased",
    "Evacuation advisory issued for river-adjacent settlements",
]

refresh_dashboard_cache()


@app.on_event("startup")
async def startup_event() -> None:
    global cache_refresh_task
    if cache_refresh_task is None or cache_refresh_task.done():
        cache_refresh_task = asyncio.create_task(cache_refresh_loop())


@app.on_event("shutdown")
async def shutdown_event() -> None:
    global cache_refresh_task
    if cache_refresh_task:
        cache_refresh_task.cancel()
        try:
            await cache_refresh_task
        except asyncio.CancelledError:
            pass
        cache_refresh_task = None


@app.get("/")
async def root() -> FileResponse:
    return FileResponse(FRONTEND_HTML_FILE)


@app.get("/data")
async def get_data() -> list[dict[str, Any]]:
    return load_whatsapp_data()


@app.post("/request")
async def create_request(payload: RequestIn, background_tasks: BackgroundTasks):
    request = build_request(
        name=payload.name,
        phone=payload.phone,
        category=payload.category,
        family_size=payload.family_size,
        location=payload.location,
        zone=payload.zone,
        source=payload.source,
        lat=payload.lat,
        lng=payload.lng,
    )
    background_tasks.add_task(apply_request_post_processing, request["id"])
    schedule_cache_refresh(background_tasks)
    return request


@app.post("/requests")
async def create_request_legacy(payload: RequestIn, background_tasks: BackgroundTasks):
    return await create_request(payload, background_tasks)


@app.get("/requests")
async def get_requests() -> list[dict[str, Any]]:
    return requests


@app.get("/request/{request_id}")
async def get_request(request_id: str) -> dict[str, Any]:
    request = find_request(request_id)
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    return request


@app.post("/assign")
async def assign_request(payload: AssignIn, background_tasks: BackgroundTasks):
    global mission_counter
    request = find_request(payload.request_id)
    volunteer = find_volunteer(payload.volunteer_id)
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    if not volunteer:
        raise HTTPException(status_code=404, detail="Volunteer not found")
    if request["status"] == "completed":
        raise HTTPException(status_code=400, detail="Completed request cannot be assigned")
    if volunteer["availability"] == "inactive":
        raise HTTPException(status_code=400, detail="Inactive volunteer cannot be assigned")

    request["status"] = "assigned"
    request["executionStatus"] = "assigned"
    request["assignedVolunteerId"] = volunteer["id"]
    request["assignedVolunteerName"] = volunteer["name"]
    eta_minutes = 15 + int(abs(request["lat"] - volunteer["lat"]) * 100)
    request["eta"] = f"{eta_minutes} mins"
    volunteer["availability"] = "busy"

    mission_id = f"MIS-{mission_counter:04}"
    missions.append(
        {
            "id": mission_id,
            "requestId": request["id"],
            "volunteerId": volunteer["id"],
            "status": "assigned",
            "createdAt": now_iso(),
            "completedAt": None,
        }
    )
    mission_counter += 1
    schedule_cache_refresh(background_tasks)
    return {"success": True, "request": request, "missionId": mission_id}


@app.post("/mission/start")
async def start_mission(payload: MissionStartIn, background_tasks: BackgroundTasks):
    request = find_request(payload.request_id)
    volunteer = find_volunteer(payload.volunteer_id)
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    if not volunteer:
        raise HTTPException(status_code=404, detail="Volunteer not found")
    if request.get("assignedVolunteerId") != volunteer.get("id"):
        raise HTTPException(status_code=400, detail="Volunteer is not assigned to this request")
    if request.get("status") == "completed":
        raise HTTPException(status_code=400, detail="Completed request cannot be started")

    request["status"] = "assigned"
    request["executionStatus"] = "on_the_way"
    volunteer["availability"] = "busy"

    if not request.get("eta"):
        eta_minutes = 15 + int(abs(request["lat"] - volunteer["lat"]) * 100)
        request["eta"] = f"{eta_minutes} mins"

    schedule_cache_refresh(background_tasks)
    return {"success": True, "request": request}


@app.post("/complete")
async def complete_request(payload: CompleteIn, background_tasks: BackgroundTasks):
    request = find_request(payload.request_id)
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")

    request["status"] = "completed"
    request["executionStatus"] = "completed"
    consume_inventory_for_request(request)
    volunteer_id = request.get("assignedVolunteerId")
    if volunteer_id:
        volunteer = find_volunteer(volunteer_id)
        if volunteer:
            volunteer["availability"] = "available"
            volunteer["tasksCompleted"] += 1

    mission = next((item for item in missions if item["requestId"] == request["id"]), None)
    if mission:
        mission["status"] = "completed"
        mission["completedAt"] = now_iso()

    if request.get("category") and request.get("location"):
        duplicate_request_index.pop(duplicate_key(request["category"], request["location"]), None)

    schedule_cache_refresh(background_tasks)
    return {"success": True, "request": request}


@app.get("/volunteers")
async def get_volunteers() -> list[dict[str, Any]]:
    return volunteers


@app.post("/volunteer")
async def create_volunteer(payload: VolunteerIn, background_tasks: BackgroundTasks):
    global volunteer_counter
    zone = payload.zone if payload.zone in ZONE_COORDS else "Ranchi"
    lat = payload.lat if payload.lat is not None else ZONE_COORDS[zone][0]
    lng = payload.lng if payload.lng is not None else ZONE_COORDS[zone][1]
    volunteer = {
        "id": f"VOL-{volunteer_counter:03}",
        "name": payload.name,
        "phone": payload.phone,
        "skills": payload.skills,
        "vehicle": payload.vehicle,
        "availability": payload.availability,
        "zone": zone,
        "image": payload.image or f"https://i.pravatar.cc/150?img={(volunteer_counter % 70) + 1}",
        "idCard": payload.id_card or f"JH-NDMA-{volunteer_counter:04}",
        "lat": lat,
        "lng": lng,
        "tasksCompleted": 0,
    }
    volunteers.append(volunteer)
    volunteer_counter += 1
    schedule_cache_refresh(background_tasks)
    return volunteer


@app.post("/volunteer/status")
async def update_volunteer_status(payload: VolunteerStatusIn, background_tasks: BackgroundTasks):
    volunteer = find_volunteer(payload.volunteer_id)
    if not volunteer:
        raise HTTPException(status_code=404, detail="Volunteer not found")
    volunteer["availability"] = payload.availability
    schedule_cache_refresh(background_tasks)
    return {"success": True, "volunteer": volunteer}


@app.post("/alerts")
async def create_alert(payload: AlertIn, background_tasks: BackgroundTasks):
    message = payload.message.strip()
    if not message:
        raise HTTPException(status_code=400, detail="Message is required")

    sent_to = 1200 + (len(alerts) * 37)
    channels = [channel.upper() for channel in payload.channels]
    feed_line = f"{message} | Message sent to {sent_to} users via {'/'.join(channels)}"
    alerts.insert(0, feed_line)

    schedule_cache_refresh(background_tasks)

    return {
        "success": True,
        "message": message,
        "meta": {
            "sentTo": sent_to,
            "channels": channels,
            "delivery": "Delivered via SMS / IVR / WhatsApp",
        },
        "feed": feed_line,
    }


@app.post("/ivr")
async def ivr_create(payload: IVRIn, background_tasks: BackgroundTasks):
    digit_map = {"1": "food", "2": "medical", "3": "rescue", "4": "shelter", "5": "baby_care", "6": "women_care", "7": "water", "8": "emergency_help"}
    category = digit_map.get(payload.digit, "food")
    zone = payload.zone or "Ranchi"
    location = payload.location or f"{zone} IVR Input"
    request = build_request(
        name="IVR Caller",
        phone=payload.phone,
        category=category,  # type: ignore[arg-type]
        family_size=1,
        location=location,
        zone=zone,
        source="ivr",
    )
    background_tasks.add_task(apply_request_post_processing, request["id"])
    schedule_cache_refresh(background_tasks)
    return request


@app.post("/whatsapp")
async def whatsapp_create(request: Request):
    content_type = request.headers.get("content-type", "")
    phone = ""
    body = ""

    if "application/json" in content_type:
        payload = await request.json()
        phone = str(payload.get("From", "")).strip()
        body = str(payload.get("Body", "")).strip()
    else:
        raw = (await request.body()).decode("utf-8", errors="ignore")
        form = parse_qs(raw)
        phone = form.get("From", [""])[0].strip()
        body = form.get("Body", [""])[0].strip()

    choice_map = {
        "1": "Medical",
        "2": "Food",
        "3": "Rescue",
        "4": "Water & Shelter",
    }

    selected_type = choice_map.get(body)
    if selected_type and phone:
        append_whatsapp_request(phone, selected_type)
        reply_text = f"Your request for {selected_type} has been received. Our team will contact you soon."
    else:
        reply_text = (
            "Namaste / Hello\n"
            "Please choose a service:\n"
            "1 Medical Help\n"
            "2 Food Support\n"
            "3 Rescue\n"
            "4 Water & Shelter\n\n"
            "कृपया सेवा चुनें:\n"
            "1 चिकित्सा\n"
            "2 भोजन\n"
            "3 बचाव\n"
            "4 पानी"
        )

    return Response(content=twilio_response(reply_text), media_type="application/xml")


@app.post("/missed-call")
async def missed_call_create(payload: MissedCallIn, background_tasks: BackgroundTasks):
    zone = payload.zone or "Dhanbad"
    phone = payload.phone or f"98{datetime.now().strftime('%H%M%S')}"
    location = payload.location or f"{zone} Missed Call Signal"
    request = build_request(
        name="Unknown Caller",
        phone=phone,
        category="rescue",
        family_size=1,
        location=location,
        zone=zone,
        source="missed_call",
    )
    background_tasks.add_task(apply_request_post_processing, request["id"])
    schedule_cache_refresh(background_tasks)
    return request


@app.post("/drone")
async def drone_create(payload: DroneDetectionIn, background_tasks: BackgroundTasks):
    zone = payload.zone or payload.area or "Ranchi"
    location = payload.area or f"{zone} Drone Detection"
    category: RequestCategory = "rescue" if payload.flag == "red" else "food"
    lat = payload.lat
    lng = payload.lng
    if lat is None or lng is None:
        lat = ZONE_COORDS["Ranchi"][0]
        lng = ZONE_COORDS["Ranchi"][1]
    request = build_request(
        name=f"Drone Target {payload.id or 'AUTO'}",
        phone="0000000000",
        category=category,
        family_size=max(1, payload.persons),
        location=location,
        zone=zone,
        source="drone",
        lat=lat,
        lng=lng,
    )
    background_tasks.add_task(apply_request_post_processing, request["id"])
    schedule_cache_refresh(background_tasks)
    return request


@app.post("/priority")
async def update_priority(payload: PriorityIn, background_tasks: BackgroundTasks):
    request = find_request(payload.request_id)
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    request["priority"] = payload.priority
    schedule_cache_refresh(background_tasks)
    return {"success": True, "request": request}


@app.get("/dashboard")
async def get_dashboard(
    request: Request,
    response: Response,
    compact: bool = False,
    last_updated: str | None = None,
) -> Any:
    # Default behavior remains full payload for compatibility.
    payload = dashboard_cache_compact if compact else dashboard_cache_full

    etag = f'W/"{dashboard_cache_updated_at}"'
    response.headers["ETag"] = etag
    response.headers["Cache-Control"] = "no-cache"

    if request.headers.get("if-none-match") == etag:
        return Response(status_code=304, headers={"ETag": etag, "Cache-Control": "no-cache"})

    if last_updated and last_updated == dashboard_cache_updated_at:
        return {
            "summary": payload.get("summary", {}),
            "resources": payload.get("resources", []),
            "alerts": [],
            "volunteers": [],
            "requests": [],
            "missions": [],
            "camps": payload.get("camps", []),
            "updatedAt": dashboard_cache_updated_at,
            "lastUpdated": dashboard_cache_updated_at,
        }

    return payload
