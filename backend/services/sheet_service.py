import gspread
from oauth2client.service_account import ServiceAccountCredentials
from pathlib import Path
import os
from dotenv import load_dotenv

load_dotenv()

class SheetService:
    def __init__(self, credentials_file, sheet_id):
        self.credentials_file = credentials_file
        self.sheet_id = sheet_id
        self.scope = [
            "https://spreadsheets.google.com/feeds",
            "https://www.googleapis.com/auth/drive"
        ]
        self.sheet = None

    def _connect(self):
        if not self.sheet:
            try:
                # Resolve path relative to backend or current working directory
                base_dir = Path(__file__).resolve().parent.parent.parent
                cred_path = base_dir / self.credentials_file
                
                creds = ServiceAccountCredentials.from_json_keyfile_name(str(cred_path), self.scope)
                client = gspread.authorize(creds)
                self.sheet = client.open_by_key(self.sheet_id).sheet1
            except Exception as e:
                raise Exception(f"Failed to connect to Google Sheets: {str(e)}")

    def get_next_sl_no(self):
        self._connect()
        try:
            all_values = self.sheet.get_all_values()
            if len(all_values) <= 1:
                return 1
            last_sl = all_values[-1][0]
            try:
                return int(last_sl) + 1
            except:
                return len(all_values)
        except:
            return 1

    def append_card(self, data):
        """
        Appends extracted card data to the Google Sheet.
        Expects data keys matching the Gemini output.
        """
        self._connect()
        sl_no = self.get_next_sl_no()
        
        row = [
            sl_no,
            data.get("organization_type", "").upper(),
            data.get("organization_name", ""),
            data.get("location", ""),
            data.get("point_person", ""),
            data.get("department", ""),
            data.get("contact_number", ""),
            data.get("contact_email", ""),
            "", # Address
            "", # URL
            "API-Upload" # Remark
        ]
        
        try:
            self.sheet.append_row(row)
            return sl_no
        except Exception as e:
            raise Exception(f"Failed to append row: {str(e)}")
