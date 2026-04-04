from datetime import datetime, timezone
from typing import Literal

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel


RequestCategory = Literal["food", "medical", "rescue", "shelter"]
RequestStatus = Literal["pending", "assigned", "completed"]


class RequestIn(BaseModel):
    name: str
    phone: str
    category: RequestCategory
    people: int
    location: str
    zone: str


class AssignIn(BaseModel):
    request_id: str
    volunteer_id: str


class CompleteIn(BaseModel):
    request_id: str


class PriorityIn(BaseModel):
    request_id: str
    priority: int


app = FastAPI(title="SahayakNet Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def compute_priority(category: RequestCategory, people: int, created_at: str) -> int:
    severity = {"medical": 50, "rescue": 45, "food": 30, "shelter": 20}[category]
    waiting_hours = max(0, int((datetime.now(timezone.utc) - datetime.fromisoformat(created_at)).total_seconds() // 3600))
    waiting_score = min(waiting_hours * 2, 30)
    people_score = max(1, people) * 2
    return severity + people_score + waiting_score


volunteers = [
    {
        "id": f"VOL-{i + 1:03}",
        "name": f"Volunteer {i + 1}",
        "phone": f"900000{i + 1:03}",
        "skills": ["First Aid", "Rescue"] if i % 2 == 0 else ["Logistics", "Food Distribution"],
        "vehicle": i % 3 != 0,
        "availability": "available" if i < 14 else "busy",
        "zone": ["Ranchi", "Dhanbad", "Jamshedpur"][i % 3],
        "image": f"https://i.pravatar.cc/150?img={i + 1}",
        "idCard": f"JH-NDMA-{i + 1:04}",
        "lat": 23.4 + (i % 5) * 0.1,
        "lng": 85.1 + (i % 5) * 0.1,
        "tasksCompleted": i % 7,
    }
    for i in range(20)
]


requests = []
counter = 1


def seed_requests() -> None:
    global counter
    base = [
        ("Ranchi", 23.34, 85.31),
        ("Dhanbad", 23.80, 86.43),
        ("Jamshedpur", 22.80, 86.20),
    ]
    categories = ["food", "medical", "rescue", "shelter"]
    for i in range(30):
        zone, lat, lng = base[i % 3]
        category = categories[i % 4]
        created_at = now_iso()
        req = {
            "id": f"REQ-{counter:04}",
            "name": f"Citizen {i + 1}",
            "phone": f"98{10000000 + i}",
            "category": category,
            "people": (i % 6) + 1,
            "location": f"{zone} Block {i % 10 + 1}",
            "zone": zone,
            "lat": round(lat + ((i % 5) - 2) * 0.03, 5),
            "lng": round(lng + ((i % 4) - 1) * 0.03, 5),
            "status": "pending" if i < 18 else ("assigned" if i < 25 else "completed"),
            "priority": compute_priority(category, (i % 6) + 1, created_at),
            "createdAt": created_at,
            "assignedVolunteerId": None,
            "assignedVolunteerName": None,
        }
        requests.append(req)
        counter += 1


seed_requests()


resources = [
    {"name": "Food Packets", "available": 1600, "total": 2500},
    {"name": "Medical Kits", "available": 420, "total": 800},
    {"name": "Shelter Units", "available": 220, "total": 400},
    {"name": "Rescue Boats", "available": 28, "total": 40},
]

alerts = ["Heavy rainfall warning for Ranchi district", "Relief camp opened near Dhanbad station"]


@app.get("/")
def root():
    return {"service": "SahayakNet API", "status": "ok"}


@app.get("/requests")
def get_requests():
    return requests


@app.post("/requests")
def create_request(payload: RequestIn):
    global counter
    created_at = now_iso()
    req = {
        "id": f"REQ-{counter:04}",
        "name": payload.name,
        "phone": payload.phone,
        "category": payload.category,
        "people": payload.people,
        "location": payload.location,
        "zone": payload.zone,
        "lat": 23.35,
        "lng": 85.33,
        "status": "pending",
        "priority": compute_priority(payload.category, payload.people, created_at),
        "createdAt": created_at,
        "assignedVolunteerId": None,
        "assignedVolunteerName": None,
    }
    requests.insert(0, req)
    counter += 1
    return req


@app.post("/assign")
def assign_request(payload: AssignIn):
    req = next((r for r in requests if r["id"] == payload.request_id), None)
    vol = next((v for v in volunteers if v["id"] == payload.volunteer_id), None)
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    if not vol:
        raise HTTPException(status_code=404, detail="Volunteer not found")
    req["status"] = "assigned"
    req["assignedVolunteerId"] = vol["id"]
    req["assignedVolunteerName"] = vol["name"]
    vol["availability"] = "busy"
    return {"success": True, "request": req}


@app.post("/complete")
def complete_request(payload: CompleteIn):
    req = next((r for r in requests if r["id"] == payload.request_id), None)
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    req["status"] = "completed"
    if req.get("assignedVolunteerId"):
        vol = next((v for v in volunteers if v["id"] == req["assignedVolunteerId"]), None)
        if vol:
            vol["availability"] = "available"
            vol["tasksCompleted"] += 1
    return {"success": True, "request": req}


@app.post("/priority")
def update_priority(payload: PriorityIn):
    req = next((r for r in requests if r["id"] == payload.request_id), None)
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    req["priority"] = payload.priority
    return {"success": True, "request": req}


@app.get("/dashboard")
def get_dashboard():
    active = len([r for r in requests if r["status"] != "completed"])
    critical = len([r for r in requests if r["priority"] >= 60 and r["status"] != "completed"])
    completed = len([r for r in requests if r["status"] == "completed"])
    return {
        "summary": {
            "totalRequests": len(requests),
            "activeRequests": active,
            "criticalRequests": critical,
            "completedRequests": completed,
            "volunteersAvailable": len([v for v in volunteers if v["availability"] == "available"]),
        },
        "resources": resources,
        "alerts": alerts,
        "volunteers": volunteers,
        "requests": requests,
    }