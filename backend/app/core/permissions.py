from typing import List, Dict

ALL_PERMISSIONS: List[Dict[str, str]] = [
    {"key": "dashboard:view", "name": "View Dashboard", "description": "Can access overview dashboard, real-time analytics & stats"},
    {"key": "admin:manage", "name": "Manage Admins", "description": "Can create and manage admin accounts and permissions"},
    {"key": "audit:view", "name": "View Audit Logs", "description": "Can view system audit logs and login attempts"},
    {"key": "question:view", "name": "View Questions", "description": "Can view questions and browse categories"},
    {"key": "question:create", "name": "Create Questions", "description": "Can create new questions and options"},
    {"key": "question:edit", "name": "Edit Questions", "description": "Can update existing questions and answers"},
    {"key": "question:delete", "name": "Delete Questions", "description": "Can delete questions from the question bank"},
    {"key": "category:manage", "name": "Manage Categories", "description": "Can create, edit, and organize question categories"},
    {"key": "bot:manage", "name": "Manage Telegram Bot", "description": "Can configure bot flow nodes, rate limits, broadcasts, and candidates"},
]
