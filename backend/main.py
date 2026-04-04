from __future__ import annotations

from datetime import datetime, timezone
from math import ceil
from typing import Any, Literal, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


RequestCategory = Literal["food", "medical", "rescue", "shelter"]
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

CATEGORIES: list[RequestCategory] = ["food", "medical", "rescue", "shelter"]

requests: list[dict[str, Any]] = []
volunteers: list[dict[str, Any]] = []
missions: list[dict[str, Any]] = []
resources: list[dict[str, Any]] = []
alerts: list[str] = []
camps: list[dict[str, Any]] = []
request_counter = 1
volunteer_counter = 1
mission_counter = 1


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def normalize_location(value: str) -> str:
    return " ".join(value.strip().lower().split())


def compute_priority(category: RequestCategory, family_size: int, created_at: str) -> int:
    severity_map = {"medical": 55, "rescue": 50, "food": 35, "shelter": 25}
    waiting_hours = max(0, int((datetime.now(timezone.utc) - datetime.fromisoformat(created_at)).total_seconds() // 3600))
    waiting_score = min(waiting_hours * 2, 30)
    return severity_map[category] + family_size + waiting_score


def calculate_resources(category: RequestCategory, family_size: int) -> dict[str, int]:
    return {
        "food_packets": family_size * 3,
        "water_liters": family_size * 5,
        "medicine_kits": ceil(family_size / 2) if category == "medical" else 0,
        "shelter_units": ceil(family_size / 4) if category == "shelter" else 0,
        "rescue_boats": 1 if category == "rescue" else 0,
    }


def priority_reason(category: RequestCategory, family_size: int) -> str:
    if category == "medical":
        base = "injury"
    elif category == "rescue":
        base = "rescue need"
    elif category == "shelter":
        base = "shelter shortage"
    else:
        base = "food shortage"
    return f"High priority due to {base} + {family_size} member{'s' if family_size > 1 else ''}."


def detect_duplicate(category: RequestCategory, location: str) -> dict[str, Any] | None:
    payload_location = normalize_location(location)
    for existing in requests:
        if existing["category"] == category and normalize_location(existing["location"]) == payload_location and existing["status"] != "completed":
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
        duplicate["resourceSummary"] = f"Food needed: {duplicate['family_size'] * 2} units"
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
        "resourceSummary": f"Food needed: {family_size * 2} units" if category == "food" else (
            f"Medicine kits needed: {max(1, ceil(family_size / 2))} units" if category == "medical" else (
                f"Rescue support needed for {family_size} people" if category == "rescue" else f"Shelter units needed: {max(1, ceil(family_size / 4))}"
            )
        ),
        "priorityReason": priority_reason(category, family_size),
        "mergedCount": 1,
        "assignedVolunteerId": None,
        "assignedVolunteerName": None,
        "eta": None,
    }
    requests.insert(0, request)
    return request


def find_request(request_id: str) -> dict[str, Any] | None:
    return next((item for item in requests if item["id"] == request_id), None)


def find_volunteer(volunteer_id: str) -> dict[str, Any] | None:
    return next((item for item in volunteers if item["id"] == volunteer_id), None)


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
    active = len([item for item in requests if item["status"] != "completed"])
    completed = len([item for item in requests if item["status"] == "completed"])
    critical = len([item for item in requests if item["priority"] >= 60 and item["status"] != "completed"])
    return {
        "totalRequests": len(requests),
        "activeRequests": active,
        "criticalRequests": critical,
        "completedRequests": completed,
        "volunteersAvailable": len([item for item in volunteers if item["availability"] == "available"]),
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
                "image": f"https://i.pravatar.cc/150?img={(i % 70) + 1}",
                "idCard": f"JH-NDMA-{i + 1:04}",
                "age": 22 + (i % 13),
                "lat": ZONE_COORDS[zone][0] + (i % 4) * 0.04,
                "lng": ZONE_COORDS[zone][1] + (i % 4) * 0.04,
                "tasksCompleted": i % 8,
            }
        )
        volunteer_counter += 1

    categories = ["food", "medical", "rescue", "shelter", "food", "food", "medical", "rescue"]
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
            "source": source,
            "sourceLabel": source.replace("_", " ").title(),
            "resourcesNeeded": calculate_resources(category, family_size),
            "resourceSummary": f"Food needed: {family_size * 2} units" if category == "food" else (
                f"Medicine kits needed: {max(1, ceil(family_size / 2))} units" if category == "medical" else (
                    f"Rescue support needed for {family_size} people" if category == "rescue" else f"Shelter units needed: {max(1, ceil(family_size / 4))}"
                )
            ),
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
    {"name": "Rescue Boats", "total": 40, "available": 28, "unit": "boats", "dailyConsumption": 0},
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


@app.get("/")
def root() -> dict[str, Any]:
    return {"service": "SahayakNet API", "status": "ok"}


@app.post("/request")
def create_request(payload: RequestIn):
    return build_request(
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


@app.post("/requests")
def create_request_legacy(payload: RequestIn):
    return create_request(payload)


@app.get("/requests")
def get_requests() -> list[dict[str, Any]]:
    return requests


@app.get("/request/{request_id}")
def get_request(request_id: str) -> dict[str, Any]:
    request = find_request(request_id)
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    return request


@app.post("/assign")
def assign_request(payload: AssignIn):
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
    return {"success": True, "request": request, "missionId": mission_id}


@app.post("/complete")
def complete_request(payload: CompleteIn):
    request = find_request(payload.request_id)
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")

    request["status"] = "completed"
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

    return {"success": True, "request": request}


@app.get("/volunteers")
def get_volunteers() -> list[dict[str, Any]]:
    return volunteers


@app.post("/volunteer")
def create_volunteer(payload: VolunteerIn):
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
    return volunteer


@app.post("/volunteer/status")
def update_volunteer_status(payload: VolunteerStatusIn):
    volunteer = find_volunteer(payload.volunteer_id)
    if not volunteer:
        raise HTTPException(status_code=404, detail="Volunteer not found")
    volunteer["availability"] = payload.availability
    return {"success": True, "volunteer": volunteer}


@app.post("/alerts")
def create_alert(payload: AlertIn):
    message = payload.message.strip()
    if not message:
        raise HTTPException(status_code=400, detail="Message is required")

    sent_to = 1200 + (len(alerts) * 37)
    channels = [channel.upper() for channel in payload.channels]
    feed_line = f"{message} | Message sent to {sent_to} users via {'/'.join(channels)}"
    alerts.insert(0, feed_line)

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
def ivr_create(payload: IVRIn):
    digit_map = {"1": "food", "2": "medical", "3": "rescue", "4": "shelter"}
    category = digit_map.get(payload.digit, "food")
    zone = payload.zone or "Ranchi"
    location = payload.location or f"{zone} IVR Input"
    return build_request(
        name="IVR Caller",
        phone=payload.phone,
        category=category,  # type: ignore[arg-type]
        family_size=1,
        location=location,
        zone=zone,
        source="ivr",
    )


@app.post("/whatsapp")
def whatsapp_create(payload: WhatsAppIn):
    text = payload.message.lower()
    category: RequestCategory = "food"
    if any(token in text for token in ["medical", "doctor", "medicine", "hospital"]):
        category = "medical"
    elif any(token in text for token in ["rescue", "trapped", "stuck", "help"]):
        category = "rescue"
    elif any(token in text for token in ["shelter", "house", "roof", "camp"]):
        category = "shelter"

    number = 1
    for token in payload.message.split():
        if token.isdigit():
            number = max(1, min(20, int(token)))
            break

    zone = payload.zone or "Jamshedpur"
    location = payload.location or f"{zone} WhatsApp Input"
    return build_request(
        name="WhatsApp User",
        phone=payload.phone,
        category=category,
        family_size=number,
        location=location,
        zone=zone,
        source="whatsapp",
    )


@app.post("/missed-call")
def missed_call_create(payload: MissedCallIn):
    zone = payload.zone or "Dhanbad"
    phone = payload.phone or f"98{datetime.now().strftime('%H%M%S')}"
    location = payload.location or f"{zone} Missed Call Signal"
    return build_request(
        name="Unknown Caller",
        phone=phone,
        category="rescue",
        family_size=1,
        location=location,
        zone=zone,
        source="missed_call",
    )


@app.post("/drone")
def drone_create(payload: DroneDetectionIn):
    zone = payload.zone or payload.area or "Ranchi"
    location = payload.area or f"{zone} Drone Detection"
    category: RequestCategory = "rescue" if payload.flag == "red" else "food"
    lat = payload.lat
    lng = payload.lng
    if lat is None or lng is None:
        lat = ZONE_COORDS["Ranchi"][0]
        lng = ZONE_COORDS["Ranchi"][1]
    return build_request(
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


@app.post("/priority")
def update_priority(payload: PriorityIn):
    request = find_request(payload.request_id)
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    request["priority"] = payload.priority
    return {"success": True, "request": request}


@app.get("/dashboard")
def get_dashboard() -> dict[str, Any]:
    return {
        "summary": update_summary(),
        "resources": resources,
        "alerts": alerts,
        "volunteers": volunteers,
        "requests": requests,
        "missions": missions,
        "camps": camps,
    }
