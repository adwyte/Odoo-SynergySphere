# config.py
# PostgreSQL database configuration for Odoo-SynergySphere backend

import os

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://synergy_user:yourpassword@localhost/synergy_db"
)
