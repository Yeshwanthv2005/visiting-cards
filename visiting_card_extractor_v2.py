import os
from PIL import Image
import gspread
from oauth2client.service_account import ServiceAccountCredentials
from pathlib import Path
from dotenv import load_dotenv
import time
import shutil
import re
import requests
import base64
import json

# Load environment variables
load_dotenv()

# Base paths
BASE_DIR = Path(__file__).resolve().parent
INPUT_FOLDER = BASE_DIR / "visiting_cards"
PROCESSED_FOLDER = BASE_DIR / "visiting_cards_processed"
ERROR_LOG = BASE_DIR / "errors.txt"

# Config
GOOGLE_SHEET_ID = os.getenv('GOOGLE_SHEET_ID')
CREDENTIALS_FILE = os.getenv('CREDENTIALS_FILE', 'credentials.json')

# Ollama Config
OLLAMA_BASE_URL = os.getenv('OLLAMA_BASE_URL', 'http://localhost:11434')
OLLAMA_MODEL = os.getenv('OLLAMA_STRUCTURING_MODEL', 'gemma4:31b-cloud')

# Channel keyword mapping
CHANNEL_KEYWORDS = {
    'university': ['university', 'college', '.edu', 'educational institution', 'professor',
                   'dean', 'faculty', 'student affairs', 'campus', 'academic'],
    'business': ['pvt ltd', 'private limited', 'inc', 'corporation', 'ceo', 'director',
                 'sales', 'marketing', 'manager', 'executive', 'enterprise', 'bank'],
    'consultancy': ['consulting', 'consultancy', 'advisory', 'consultant', 'advisor',
                    'solutions', 'services'],
    'ngo': ['ngo', 'non-profit', 'foundation', 'trust', 'charitable', 'welfare',
            'social work', 'humanitarian'],
    'startup': ['startup', 'co-founder', 'founder', 'tech', 'innovation lab'],
    'government': ['government', 'ministry', 'municipal', 'public sector', 'bureaucrat',
                   'ias', 'ips', 'commissioner']
}

# Common cities/states/countries to help trim address
COMMON_LOCATIONS = [
    'bangalore', 'bengaluru', 'mumbai', 'delhi', 'new delhi', 'chennai', 'hyderabad',
    'pune', 'kolkata', 'jaipur', 'ahmedabad', 'coimbatore', 'indore', 'noida',
    'gurgaon', 'kochi', 'trivandrum',
    'london', 'new york', 'singapore', 'kuala lumpur',
    'malaysia', 'dubai', 'uae', 'qatar', 'canada', 'australia', 'usa', 'uk'
]


# ============================================================
# Extraction via Ollama (gemma4:31b-cloud)
# ============================================================

def check_ollama_running():
    try:
        resp = requests.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=5)
        resp.raise_for_status()
        return True
    except Exception:
        return False

def extract_card_data(image_path: Path):
    try:
        with open(image_path, "rb") as f:
            image_b64 = base64.b64encode(f.read()).decode("utf-8")

        prompt = """
        Read the visiting card image and extract the following information into a structured JSON format.
        
        REQUIRED FIELDS:
        1. organization_name: Full name of the company, university, or institution.
        2. point_person: Full name of the person on the card.
        3. department: Designation, job title, or department.
        4. location: City, State, or Country only (not full address).
        5. contact_number: Phone or mobile number.
        6. contact_email: Email address.
        7. organization_type: One of [university, business, consultancy, NGO, startup, government].
        
        Respond STRICTLY with a valid JSON object. Do not include any preamble or extra text.
        """

        payload = {
            "model": OLLAMA_MODEL,
            "prompt": prompt,
            "stream": False,
            "images": [image_b64],
            "format": "json"
        }

        print(f"   🔄 Sending to Ollama ({OLLAMA_MODEL}): {image_path.name}", flush=True)
        response = requests.post(
            f"{OLLAMA_BASE_URL}/api/generate",
            json=payload,
            timeout=300
        )
        response.raise_for_status()

        result = response.json()
        extracted_text = result.get("response", "").strip()
        if extracted_text.startswith("```json"):
            extracted_text = extracted_text[7:]
        if extracted_text.startswith("```"):
            extracted_text = extracted_text[3:]
        if extracted_text.endswith("```"):
            extracted_text = extracted_text[:-3]
        extracted_text = extracted_text.strip()
        
        data = json.loads(extracted_text)
        
        mapped_data = {
            "CHANNEL": data.get("organization_type", "").upper() if data.get("organization_type") else "",
            "UNIVERSITY": data.get("organization_name", ""),
            "LOCATION": extract_city_state(data.get("location", "")),
            "POINT PERSON": data.get("point_person", ""),
            "DEPARTMENT": data.get("department", ""),
            "CONTACT NUMBER": data.get("contact_number", ""),
            "CONTACT EMAIL": data.get("contact_email", "")
        }
        
        if not mapped_data["CHANNEL"]:
            ch = categorize_channel(json.dumps(data))
            if ch:
                mapped_data["CHANNEL"] = ch
                
        return mapped_data, None

    except Exception as e:
        return None, str(e)


# ============================================================
# Google Sheets functions (unchanged)
# ============================================================

def initialize_google_sheet():
    """Connect to Google Sheet"""
    if not GOOGLE_SHEET_ID:
        raise ValueError("GOOGLE_SHEET_ID not found in .env file!")
    cred_path = BASE_DIR / CREDENTIALS_FILE
    if not cred_path.exists():
        raise ValueError(f"{cred_path} not found in project folder!")
    scope = [
        "https://spreadsheets.google.com/feeds",
        "https://www.googleapis.com/auth/drive"
    ]
    creds = ServiceAccountCredentials.from_json_keyfile_name(str(cred_path), scope)
    client = gspread.authorize(creds)
    sheet = client.open_by_key(GOOGLE_SHEET_ID).sheet1
    return sheet


def get_next_sl_no(sheet):
    """Get the next SL No based on last row"""
    try:
        all_values = sheet.get_all_values()
        if len(all_values) <= 1:
            return 1
        last_sl = all_values[-1][0]
        try:
            return int(last_sl) + 1
        except Exception:
            return len(all_values)
    except Exception:
        return 1


def check_duplicate(sheet, person_name, contact_number, contact_email):
    """Check if entry already exists"""
    if not person_name and not contact_number and not contact_email:
        return False, None
    try:
        all_values = sheet.get_all_values()
        for row_idx, row in enumerate(all_values[1:], start=2):
            if len(row) < 8:
                continue
            existing_person = row[4].strip().lower() if len(row) > 4 else ""
            existing_number = row[6].strip().lower() if len(row) > 6 else ""
            existing_email = row[7].strip().lower() if len(row) > 7 else ""

            if person_name and existing_person:
                if person_name.strip().lower() == existing_person:
                    return True, row_idx

            if contact_number and existing_number:
                clean_new = "".join(filter(str.isdigit, contact_number))
                clean_existing = "".join(filter(str.isdigit, existing_number))
                if clean_new and clean_existing and clean_new == clean_existing:
                    return True, row_idx

            if contact_email and existing_email:
                if contact_email.strip().lower() == existing_email:
                    return True, row_idx
        return False, None
    except Exception:
        return False, None


def categorize_channel(text: str):
    """Categorize based on keywords"""
    text_lower = text.lower()
    for channel, keywords in CHANNEL_KEYWORDS.items():
        if any(keyword in text_lower for keyword in keywords):
            return channel.upper()
    return None


def extract_city_state(location_text: str) -> str:
    """Extract only city/state/country from full address"""
    if not location_text:
        return ""
    loc_lower = location_text.lower()

    # First: match known locations
    for loc in COMMON_LOCATIONS:
        if loc in loc_lower:
            return " ".join(part.capitalize() for part in loc.split())

    # Second: try to detect capitalized city-like word
    match = re.search(r"\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b", location_text)
    if match:
        return match.group().strip()

    # Fallback: short trimmed version
    return location_text.strip()[:30]


def get_image_files(folder: Path):
    """Get all image files from folder"""
    folder.mkdir(parents=True, exist_ok=True)
    print(f"   📁 Scanning folder: {folder}")
    extensions = ["*.jpg", "*.jpeg", "*.png", "*.heic", "*.JPG", "*.JPEG", "*.PNG"]
    image_files = set()  # Use set to avoid duplicates on case-insensitive systems
    for ext in extensions:
        image_files.update(folder.glob(ext))
    print(f"   🔍 Found {len(image_files)} image(s).")
    return sorted(image_files)


def append_to_google_sheet(sheet, sl_no, data):
    """Append data to Google Sheet with SL No"""
    row = [
        sl_no,
        data["CHANNEL"],          # CHANNEL
        data["UNIVERSITY"],       # ORGANIZATION NAME (column header is still 'UNIVERSITY' in sheet)
        data["LOCATION"],         # CITY/STATE/COUNTRY
        data["POINT PERSON"],
        data["DEPARTMENT"],
        data["CONTACT NUMBER"],
        data["CONTACT EMAIL"],
        "",                       # ADDRESS (blank)
        "",                       # URL (blank)
        ""                        # REMARK (blank)
    ]
    sheet.append_row(row)


def move_to_processed(image_path: Path):
    """Move processed image to processed folder"""
    PROCESSED_FOLDER.mkdir(parents=True, exist_ok=True)
    destination = PROCESSED_FOLDER / image_path.name
    if destination.exists():
        timestamp = time.strftime("%Y%m%d_%H%M%S")
        destination = PROCESSED_FOLDER / f"{image_path.stem}_{timestamp}{image_path.suffix}"
    shutil.move(str(image_path), str(destination))


def log_error(image_file, error):
    """Log errors to file"""
    with open(ERROR_LOG, "a", encoding="utf-8") as f:
        f.write(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] {image_file}: {error}\n")


# ============================================================
# Main
# ============================================================

def main():
    print("🚀 Starting Visiting Card Extractor (Offline OCR + Cloud Structuring)...")
    print("=" * 60)

    # Check Ollama
    if not check_ollama_running():
        print("❌ Ollama server is not running!", flush=True)
        print("   Please start Ollama first (it should be running in the background).", flush=True)
        return
    print(f"✅ Ollama connected at {OLLAMA_BASE_URL}", flush=True)
    print(f"   Extraction model: {OLLAMA_MODEL}", flush=True)

    # Connect to Google Sheet
    try:
        sheet = initialize_google_sheet()
        print("✅ Connected to Google Sheet", flush=True)
        current_rows = len(sheet.get_all_values())
        print(f"   Current entries: {current_rows}", flush=True)
        print("   ✅ Duplicate detection enabled", flush=True)
    except Exception as e:
        print(f"❌ Google Sheet error: {e}", flush=True)
        return

    print("-" * 60, flush=True)
    image_files = get_image_files(INPUT_FOLDER)
    
    if not image_files:
        print(f"❌ No images found in '{INPUT_FOLDER}'", flush=True)
        return

    success_count = 0
    duplicate_count = 0
    error_count = 0
    
    total_files = len(image_files)
    print(f"\n🚀 Processing {total_files} images...", flush=True)
    print(f"   Pipeline: Image → Ollama ({OLLAMA_MODEL}) → Google Sheet", flush=True)

    for idx, image_path in enumerate(image_files, 1):
        print(f"\n{'─' * 60}", flush=True)
        print(f"[{idx}/{total_files}] Processing: {image_path.name}", flush=True)

        if not image_path.exists():
            print("   ⚠️  File not found (maybe already moved). Skipping.", flush=True)
            continue

        data, error = extract_card_data(image_path)

        if error:
            print(f"   ❌ ERROR: {error}", flush=True)
            log_error(image_path.name, error)
            error_count += 1
            continue

        # Print extracted data summary
        print(f"   📋 Extracted:", flush=True)
        for key, val in data.items():
            if val:
                print(f"      {key}: {val}", flush=True)

        # Check for duplicates
        is_dup, dup_row = check_duplicate(
            sheet, data["POINT PERSON"], data["CONTACT NUMBER"], data["CONTACT EMAIL"]
        )

        if is_dup:
            print(f"   ⚠️  DUPLICATE (row {dup_row}) - skipping", flush=True)
            duplicate_count += 1
            move_to_processed(image_path)
            continue

        # Append to sheet
        sl_no = get_next_sl_no(sheet)
        try:
            append_to_google_sheet(sheet, sl_no, data)
            print(
                f"   ✅ SL {sl_no} | Org: {data['UNIVERSITY'][:25]} | "
                f"Person: {data['POINT PERSON'][:20]} | Loc: {data['LOCATION'] or '(none)'}",
                flush=True
            )
            move_to_processed(image_path)
            success_count += 1
        except Exception as e:
            print(f"   ❌ Sheet Append Error: {e}", flush=True)
            error_count += 1

        if idx < total_files:
            time.sleep(2)

    print("\n" + "=" * 60, flush=True)
    print("📊 COMPLETION REPORT", flush=True)
    print(f"✅ Success: {success_count}", flush=True)
    print(f"⚠️  Duplicates: {duplicate_count}", flush=True)
    print(f"❌ Errors: {error_count}", flush=True)
    print(f"📁 Processed folder: {PROCESSED_FOLDER}", flush=True)
    print(f"🔗 Sheet: https://docs.google.com/spreadsheets/d/{GOOGLE_SHEET_ID}", flush=True)
    print("=" * 60, flush=True)

if __name__ == "__main__":
    main()