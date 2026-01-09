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


def initialize_gemini():
    """Initialize Gemini API"""
    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY not found in .env file!")
    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel("models/gemini-2.0-flash")
    model = genai.GenerativeModel("models/gemini-2.5-flash")
    print("   Using model: models/gemini-2.5-flash")
    return model


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
            # Normalize casing: first letter upper, rest lower
            return " ".join(part.capitalize() for part in loc.split())

    # Second: try to detect capitalized city-like word
    match = re.search(r"\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b", location_text)
    if match:
        return match.group().strip()

    # Fallback: short trimmed version
    return location_text.strip()[:30]


def extract_card_data(model, image_path: Path):
    """Extract structured data from visiting card using Gemini"""
    try:
        img = Image.open(image_path)

        prompt = """
        Analyze this visiting card image and extract structured information.

        FIELDS (leave BLANK if not found):

        1. ORGANIZATION NAME:
           - Full name of the organization (university, college, bank, company, consultancy, NGO, startup, government dept, etc.)
           - Examples: "HDFC Bank", "University of Mumbai", "ABC Technologies Pvt Ltd"

        2. POINT PERSON:
           - Full name of the individual on the card.

        3. DEPARTMENT:
           - Job title / designation / position OR department name.
           - Examples: "Chief Technology Officer", "Deputy Vice Chancellor", "Professor", "Sales Manager", "Software Engineer".

        4. LOCATION (CITY/STATE/COUNTRY ONLY):
           - Only the city/state/country, NOT full postal address.
           - Examples:
             - "Bangalore"
             - "Mumbai"
             - "New Delhi"
             - "London"
             - "USA"
           - If the card says "123 MG Road, Bangalore 560001", output only "Bangalore".
           - If unsure, give the best single city/state/country guess.

        5. CONTACT NUMBER:
           - Main phone number (mobile or office).

        6. CONTACT EMAIL:
           - Email address.

        7. ORGANIZATION TYPE:
           - One of: university, business, consultancy, NGO, startup, government
           - Choose the closest match based on the card.

        RESPOND EXACTLY IN THIS FORMAT (one field per line):
        ORGANIZATION NAME: [org or BLANK]
        POINT PERSON: [name or BLANK]
        DEPARTMENT: [designation or department or BLANK]
        LOCATION: [city/state/country only or BLANK]
        CONTACT NUMBER: [phone or BLANK]
        CONTACT EMAIL: [email or BLANK]
        ORGANIZATION TYPE: [type or BLANK]
        """

        print(f"   🔄 Sending to Gemini: {image_path.name}")
        response = model.generate_content([prompt, img])
        print(f"   ✅ Gemini responded for: {image_path.name}")
        extracted_text = response.text or ""

        data = {
            "CHANNEL": "",
            "UNIVERSITY": "",     # will hold organization name for all cards
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
                data["UNIVERSITY"] = value  # store organization name here
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
                channel = categorize_channel(extracted_text)
                if channel:
                    data["CHANNEL"] = channel
                else:
                    data["CHANNEL"] = value.upper() if value else ""

        # Fallback: if organization name ended up under "UNIVERSITY" key in some models
        if not data["UNIVERSITY"]:
            uni_match = re.search(r"UNIVERSITY:\s*(.+)", extracted_text, re.IGNORECASE)
            if uni_match:
                val = uni_match.group(1).strip()
                if val.upper() != "BLANK":
                    data["UNIVERSITY"] = val

        if not data["CHANNEL"]:
            ch = categorize_channel(extracted_text)
            if ch:
                data["CHANNEL"] = ch

        return data, None

    except Exception as e:
        return None, str(e)


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


def main():
    print("🚀 Starting Visiting Card Extractor (Org + City Edition)...")
    print("=" * 60)

    model = initialize_gemini()
    print("✅ Gemini API initialized")

    try:
        sheet = initialize_google_sheet()
        print("✅ Connected to Google Sheet")
        current_rows = len(sheet.get_all_values())
        print(f"   Current entries: {current_rows}")
        print("   ✅ City/state extraction enabled")
        print("   ✅ Org name stored in column 3")
        print("   ✅ Duplicate detection enabled")
    except Exception as e:
        print(f"❌ Google Sheet error: {e}")
        return

    image_files = get_image_files(INPUT_FOLDER)
    if not image_files:
        print(f"❌ No images in '{INPUT_FOLDER}'")
        return

    success_count = 0
    duplicate_count = 0
    error_count = 0

    for idx, image_path in enumerate(image_files, 1):
        print(f"\n[{idx}/{len(image_files)}] {image_path.name}")

        if not image_path.exists():
            print("   ⚠️  File not found (maybe already moved). Skipping.")
            continue

        data, error = extract_card_data(model, image_path)

        if error:
            print(f"   ❌ ERROR: {error}")
            log_error(image_path.name, error)
            error_count += 1
            continue

        is_dup, dup_row = check_duplicate(
            sheet, data["POINT PERSON"], data["CONTACT NUMBER"], data["CONTACT EMAIL"]
        )

        if is_dup:
            print(f"   ⚠️  DUPLICATE (row {dup_row}) - skipping")
            duplicate_count += 1
            move_to_processed(image_path)
        else:
            sl_no = get_next_sl_no(sheet)
            append_to_google_sheet(sheet, sl_no, data)
            print(
                f"   ✅ SL {sl_no} | Org: {data['UNIVERSITY'][:25]} | "
                f"Person: {data['POINT PERSON'][:20]} | Loc: {data['LOCATION'] or '(none)'}"
            )
            move_to_processed(image_path)
            success_count += 1

        if idx < len(image_files):
            time.sleep(4)

    print("\n" + "=" * 60)
    print("📊 COMPLETE")
    print(f"✅ New entries: {success_count}")
    print(f"⚠️  Duplicates skipped: {duplicate_count}")
    print(f"❌ Errors: {error_count}")
    print(f"📁 Processed images: {PROCESSED_FOLDER}")
    print(f"🔗 Sheet: https://docs.google.com/spreadsheets/d/{GOOGLE_SHEET_ID}")
    print("=" * 60)

if __name__ == "__main__":
    main()