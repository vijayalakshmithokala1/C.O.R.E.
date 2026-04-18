import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()
db_url = os.getenv("DATABASE_URL")
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

print(f"Connecting to {db_url.split('@')[-1]}...")
try:
    conn = psycopg2.connect(db_url)
    print("Successfully connected to the database!")
    conn.close()
except Exception as e:
    print(f"Error: {e}")
