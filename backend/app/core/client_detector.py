from pydantic import BaseModel
from fastapi import Request
from user_agents import parse

class ClientMeta(BaseModel):
    ip_address: str
    browser_name: str
    browser_version: str
    device_type: str
    os_name: str
    user_agent: str

def extract_client_ip(request: Request) -> str:
    cf_ip = request.headers.get("CF-Connecting-IP")
    if cf_ip:
        return cf_ip.strip()

    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        parts = forwarded_for.split(",")
        if parts:
            return parts[0].strip()

    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip.strip()

    if request.client and request.client.host:
        return request.client.host

    return "127.0.0.1"

def parse_client_meta(request: Request) -> ClientMeta:
    ip_address = extract_client_ip(request)
    ua_string = request.headers.get("User-Agent", "Unknown")
    user_agent_obj = parse(ua_string)

    if user_agent_obj.is_mobile:
        device_type = "Mobile"
    elif user_agent_obj.is_tablet:
        device_type = "Tablet"
    elif user_agent_obj.is_pc:
        device_type = "Desktop"
    elif user_agent_obj.is_bot:
        device_type = "Bot"
    else:
        device_type = "Other"

    browser_family = user_agent_obj.browser.family or "Unknown"
    browser_version = user_agent_obj.browser.version_string or "Unknown"
    os_family = user_agent_obj.os.family or "Unknown"
    os_version = user_agent_obj.os.version_string or ""
    os_name = f"{os_family} {os_version}".strip() if os_version else os_family

    return ClientMeta(
        ip_address=ip_address,
        browser_name=browser_family,
        browser_version=browser_version,
        device_type=device_type,
        os_name=os_name,
        user_agent=ua_string
    )
