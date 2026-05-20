
import os
import gspread
from oauth2client.service_account import ServiceAccountCredentials
from dotenv import load_dotenv
from pathlib import Path

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent
GOOGLE_SHEET_ID = os.getenv('GOOGLE_SHEET_ID')
CREDENTIALS_FILE = os.getenv('CREDENTIALS_FILE', 'credentials.json')

def test_sheet():
    print(f"Testing Sheet ID: {GOOGLE_SHEET_ID}")
    cred_path = BASE_DIR / CREDENTIALS_FILE
    
    if not cred_path.exists():
        print(f"Error: {cred_path} not found")
        return

    try:
        scope = ["https://spreadsheets.google.com/feeds", "https://www.googleapis.com/auth/drive"]
        creds = ServiceAccountCredentials.from_json_keyfile_name(str(cred_path), scope)
        print(f"Service Account Email: {creds.service_account_email}")
        
        client = gspread.authorize(creds)
        sheet = client.open_by_key(GOOGLE_SHEET_ID)
        print("✅ Successfully opened the sheet!")
        print(f"Sheet Title: {sheet.title}")
    except Exception as e:
        print(f"❌ Error Detail: {type(e).__name__}: {str(e)}")

if __name__ == "__main__":
    test_sheet()
