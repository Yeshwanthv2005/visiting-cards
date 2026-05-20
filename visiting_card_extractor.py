import os
import google.generativeai as genai
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
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
GOOGLE_SHEET_ID = os.getenv('GOOGLE_SHEET_ID')
CREDENTIALS_FILE = os.getenv('CREDENTIALS_FILE', 'credentials.json')

# Ollama Config
OLLAMA_BASE_URL = os.getenv('OLLAMA_BASE_URL', 'http://localhost:11434')
OLLAMA_MODEL = os.getenv('OLLAMA_MODEL', 'moondream')
OLLAMA_FALLBACK_MODEL = os.getenv('OLLAMA_FALLBACK_MODEL', 'gemma3:4b')
OLLAMA_STRUCTURING_MODEL = os.getenv('OLLAMA_STRUCTURING_MODEL', 'gemma4:31b-cloud')

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
# STAGE 1: Offline OCR via Ollama (local models)
# ============================================================

def check_ollama_running():
    """Check if Ollama server is running"""
    try:
        resp = requests.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=5)
        resp.raise_for_status()
        return True
    except Exception:
        return False


def extract_text_ollama(image_path: Path, model_name: str = None):
    """
    Stage 1: Extract raw text from visiting card image using local Ollama model.
    Returns (raw_text, error_string).
    """
    if model_name is None:
        model_name = OLLAMA_MODEL

    try:
        # Read and encode image to base64
        with open(image_path, "rb") as f:
            image_b64 = base64.b64encode(f.read()).decode("utf-8")

        prompt = (
            "Read ALL the text visible on this business/visiting card image. "
            "Return every single word, name, number, email address, phone number, "
            "website URL, designation, company name, and address exactly as shown on the card. "
            "Do NOT skip any text. Do NOT add any interpretation or formatting. "
            "Just output all the raw text you can see, line by line."
        )

        payload = {
            "model": model_name,
            "prompt": prompt,
            "stream": False,
            "images": [image_b64]
        }

        print(f"   🔄 [Stage 1] Sending to Ollama ({model_name}): {image_path.name}", flush=True)
        response = requests.post(
            f"{OLLAMA_BASE_URL}/api/generate",
            json=payload,
            timeout=300  # vision models can take time, especially gemma3
        )
        response.raise_for_status()

        result = response.json()
        raw_text = result.get("response", "").strip()

        if not raw_text:
            return None, "Ollama returned empty response"

        print(f"   ✅ [Stage 1] OCR extracted ({len(raw_text)} chars)", flush=True)
        return raw_text, None

    except requests.exceptions.ConnectionError:
        return None, "Ollama server not reachable. Is it running?"
    except requests.exceptions.Timeout:
        return None, f"Ollama timeout with model {model_name}"
    except requests.exceptions.HTTPError as e:
        error_text = ""
        try:
            error_text = e.response.json().get("error", "")
        except Exception:
            error_text = str(e)
        return None, f"Ollama HTTP error: {error_text}"
    except Exception as e:
        return None, f"Ollama error: {str(e)}"


def extract_text_with_fallback(image_path: Path):
    """
    Try primary model (gemma3), fall back to moondream if it fails.
    Returns (raw_text, error_string).
    """
    # Try primary model
    raw_text, error = extract_text_ollama(image_path, OLLAMA_MODEL)
    if raw_text:
        return raw_text, None

    # Fallback to lighter model
    if OLLAMA_FALLBACK_MODEL and OLLAMA_FALLBACK_MODEL != OLLAMA_MODEL:
        print(f"   ⚠️  Primary model failed ({error}). Trying fallback: {OLLAMA_FALLBACK_MODEL}", flush=True)
        raw_text, fallback_error = extract_text_ollama(image_path, OLLAMA_FALLBACK_MODEL)
        if raw_text:
            return raw_text, None
        return None, f"Primary: {error} | Fallback: {fallback_error}"

    return None, error


# ============================================================
# STAGE 2: Structured extraction via Ollama cloud / Gemini
# ============================================================

# Gemini models to try as fallback (in order of preference)
GEMINI_MODELS = ["models/gemini-2.0-flash", "models/gemini-2.0-flash-lite"]
MAX_RETRIES = 3
RETRY_BASE_DELAY = 5  # seconds


def initialize_gemini():
    """Initialize Gemini API as fallback for structuring"""
    if not GEMINI_API_KEY:
        print("   ⚠️  GEMINI_API_KEY not found — Gemini fallback disabled", flush=True)
        return None
    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel(GEMINI_MODELS[0])
    print(f"   Gemini fallback: {GEMINI_MODELS[0]}", flush=True)
    return model


def _build_structuring_prompt(raw_text: str) -> str:
    """Build the prompt used for Stage 2 structuring (shared by Ollama and Gemini)."""
    return f"""You are an expert at reading visiting/business cards.
Below is the RAW TEXT extracted from a visiting card image using OCR.
The OCR may have minor errors, missing spaces, or jumbled ordering.
Your job is to intelligently parse this text and extract structured information.

RAW OCR TEXT:
---
{raw_text}
---

EXTRACT THESE FIELDS (leave BLANK if not found):

1. ORGANIZATION NAME:
   - Full name of the organization (university, college, bank, company, consultancy, NGO, startup, government dept, etc.)
   - Examples: "HDFC Bank", "University of Mumbai", "ABC Technologies Pvt Ltd"

2. POINT PERSON:
   - Full name of the individual on the card.

3. DEPARTMENT:
   - Job title / designation / position OR department name.
   - Examples: "Chief Technology Officer", "Professor", "Sales Manager"

4. LOCATION (CITY/STATE/COUNTRY ONLY):
   - Only the city/state/country, NOT full postal address.
   - If the text says "123 MG Road, Bangalore 560001", output only "Bangalore".

5. CONTACT NUMBER:
   - Main phone number (mobile or office). Include country code if present.

6. CONTACT EMAIL:
   - Email address.

7. ORGANIZATION TYPE:
   - One of: university, business, consultancy, NGO, startup, government
   - Choose the closest match.

RESPOND EXACTLY IN THIS FORMAT (one field per line):
ORGANIZATION NAME: [value or BLANK]
POINT PERSON: [value or BLANK]
DEPARTMENT: [value or BLANK]
LOCATION: [value or BLANK]
CONTACT NUMBER: [value or BLANK]
CONTACT EMAIL: [value or BLANK]
ORGANIZATION TYPE: [value or BLANK]
"""


def _parse_structured_response(extracted_text: str, raw_text: str) -> dict:
    """Parse the structured key: value response into a data dict."""
    data = {
        "CHANNEL": "",
        "UNIVERSITY": "",
        "LOCATION": "",
        "POINT PERSON": "",
        "DEPARTMENT": "",
        "CONTACT NUMBER": "",
        "CONTACT EMAIL": ""
    }

    for line in extracted_text.split("\n"):
        line = line.strip()
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        key = key.strip().upper()
        value = value.strip()
        if value.upper() == "BLANK" or not value:
            value = ""

        if "ORGANIZATION NAME" in key:
            data["UNIVERSITY"] = value
        elif "POINT PERSON" in key:
            data["POINT PERSON"] = value
        elif "DEPARTMENT" in key:
            data["DEPARTMENT"] = value
        elif "LOCATION" in key:
            data["LOCATION"] = extract_city_state(value)
        elif "CONTACT NUMBER" in key or "PHONE" in key:
            data["CONTACT NUMBER"] = value
        elif "EMAIL" in key:
            data["CONTACT EMAIL"] = value
        elif "ORGANIZATION TYPE" in key or key == "TYPE":
            channel = categorize_channel(raw_text)
            if channel:
                data["CHANNEL"] = channel
            else:
                data["CHANNEL"] = value.upper() if value else ""

    # Fallback channel detection from raw text
    if not data["CHANNEL"]:
        ch = categorize_channel(raw_text)
        if ch:
            data["CHANNEL"] = ch

    return data


def structure_with_ollama(raw_text: str):
    """
    Stage 2 (Primary): Use gemma4:31b-cloud via Ollama to structure raw text.
    No API quota issues — runs through Ollama's cloud integration.
    Returns (data_dict, error_string).
    """
    try:
        prompt = _build_structuring_prompt(raw_text)
        payload = {
            "model": OLLAMA_STRUCTURING_MODEL,
            "prompt": prompt,
            "stream": False
        }

        print(f"   🔄 [Stage 2] Sending to Ollama ({OLLAMA_STRUCTURING_MODEL}) for structuring...", flush=True)
        response = requests.post(
            f"{OLLAMA_BASE_URL}/api/generate",
            json=payload,
            timeout=120
        )
        response.raise_for_status()

        result = response.json()
        extracted_text = result.get("response", "").strip()

        if not extracted_text:
            return None, "Ollama structuring returned empty response"

        print(f"   ✅ [Stage 2] Ollama ({OLLAMA_STRUCTURING_MODEL}) structured the data", flush=True)
        data = _parse_structured_response(extracted_text, raw_text)
        return data, None

    except requests.exceptions.Timeout:
        return None, f"Ollama structuring timeout ({OLLAMA_STRUCTURING_MODEL})"
    except requests.exceptions.HTTPError as e:
        error_text = ""
        try:
            error_text = e.response.json().get("error", "")
        except Exception:
            error_text = str(e)
        return None, f"Ollama structuring HTTP error: {error_text}"
    except Exception as e:
        return None, f"Ollama structuring error: {str(e)}"


def structure_with_gemini(gemini_model, raw_text: str):
    """
    Stage 2 (Fallback): Use Gemini API for structuring when Ollama cloud fails.
    Returns (data_dict, error_string).
    """
    if gemini_model is None:
        return None, "Gemini not configured (no API key)"

    try:
        prompt = _build_structuring_prompt(raw_text)
        print(f"   🔄 [Stage 2 Fallback] Sending to Gemini for structuring...", flush=True)

        # Retry logic with backoff for rate limits
        extracted_text = ""
        current_model = gemini_model
        for attempt in range(MAX_RETRIES):
            try:
                response = current_model.generate_content(prompt)
                extracted_text = response.text or ""
                print(f"   ✅ [Stage 2] Gemini structured the data", flush=True)
                break
            except Exception as retry_err:
                err_str = str(retry_err)
                if "429" in err_str or "quota" in err_str.lower():
                    for fallback_name in GEMINI_MODELS[1:]:
                        try:
                            print(f"   ⚠️  Rate limited. Trying: {fallback_name}", flush=True)
                            current_model = genai.GenerativeModel(fallback_name)
                            response = current_model.generate_content(prompt)
                            extracted_text = response.text or ""
                            print(f"   ✅ [Stage 2] Gemini ({fallback_name}) structured the data", flush=True)
                            break
                        except Exception:
                            continue
                    if extracted_text:
                        break
                    delay = RETRY_BASE_DELAY * (2 ** attempt)
                    print(f"   ⏳ Rate limited. Retrying in {delay}s (attempt {attempt + 1}/{MAX_RETRIES})...", flush=True)
                    time.sleep(delay)
                else:
                    raise retry_err

        if not extracted_text:
            return None, "Gemini returned empty response after retries"

        data = _parse_structured_response(extracted_text, raw_text)
        return data, None

    except Exception as e:
        return None, f"Gemini error: {str(e)}"


# ============================================================
# Combined extraction: Stage 1 → Stage 2
# ============================================================

def extract_card_data(gemini_model, image_path: Path):
    """
    Full pipeline:
    1. Extract raw text from image using Ollama (offline OCR)
    2. Structure text using gemma4:31b-cloud via Ollama (primary)
    3. Fall back to Gemini API if Ollama structuring fails
    """
    # Stage 1: Offline OCR
    raw_text, ocr_error = extract_text_with_fallback(image_path)
    if ocr_error:
        return None, f"OCR failed: {ocr_error}"

    print(f"   📝 Raw OCR text preview: {raw_text[:100]}...", flush=True)

    # Stage 2: Try Ollama cloud model first (no quota issues)
    data, ollama_error = structure_with_ollama(raw_text)
    if data:
        return data, None

    # Stage 2 Fallback: Try Gemini API
    print(f"   ⚠️  Ollama structuring failed ({ollama_error}). Trying Gemini fallback...", flush=True)
    data, gemini_error = structure_with_gemini(gemini_model, raw_text)
    if data:
        return data, None

    return None, f"All structuring failed — Ollama: {ollama_error} | Gemini: {gemini_error}"


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
    print(f"   Primary OCR model: {OLLAMA_MODEL}", flush=True)
    print(f"   Structuring model: {OLLAMA_STRUCTURING_MODEL}", flush=True)

    # Initialize Gemini (as fallback)
    gemini_model = initialize_gemini()

    print("✅ Gemini API initialized (text-only structuring mode)", flush=True)

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
    print(f"   Pipeline: Image → Ollama (OCR) → Gemini (structure) → Google Sheet", flush=True)

    for idx, image_path in enumerate(image_files, 1):
        print(f"\n{'─' * 60}", flush=True)
        print(f"[{idx}/{total_files}] Processing: {image_path.name}", flush=True)

        if not image_path.exists():
            print("   ⚠️  File not found (maybe already moved). Skipping.", flush=True)
            continue

        data, error = extract_card_data(gemini_model, image_path)

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