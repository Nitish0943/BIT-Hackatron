import os
import json
import urllib.request
import urllib.error

MSG91_URL = "https://control.msg91.com/api/v5/flow/"
MSG91_AUTH_KEY = os.getenv("MSG91_API_KEY", "")

def send_emergency_sms(phone: str, message: str, requester_name: str = "Citizen") -> dict:
    """
    Delivers SMS via MSG91 API using a template (flow) approach.
    Fallbacks to 'not_required' if no API key is configured.
    """
    if not MSG91_AUTH_KEY:
        print(f"[MSG91] Simulation (No API Key). SMS would be sent to {phone}: {message}")
        return {"status": "simulated", "message_id": "sim-msg-1234"}

    try:
        # Strip out any formatting from phone to pure digits
        clean_phone = ''.join(filter(str.isdigit, phone))
        if len(clean_phone) == 10:
            clean_phone = f"91{clean_phone}"

        # Standard MSG91 flow payload DLT compliant
        payload = {
            "template_id": os.getenv("MSG91_FLOW_ID", "default_emergency_alert"),
            "short_url": "0",
            "recipients": [
                {
                    "mobiles": clean_phone,
                    "name": requester_name,
                    "message": message,
                }
            ]
        }
        
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(MSG91_URL, data=data)
        req.add_header('Authkey', MSG91_AUTH_KEY)
        req.add_header('Content-Type', 'application/json')
        
        with urllib.request.urlopen(req, timeout=5) as response:
            response_data = json.loads(response.read().decode())
            return {"status": "sent", "message_id": response_data.get("message", "unknown")}
            
    except urllib.error.URLError as e:
        print(f"[MSG91 Error] {e}")
        return {"status": "failed", "error": str(e)}
    except Exception as e:
        print(f"[MSG91 Error] Unexpected failure: {e}")
        return {"status": "failed", "error": "Internal error"}
