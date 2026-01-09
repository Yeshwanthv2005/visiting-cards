// Configuration for the Visiting Card Scanner app

export const GEMINI_API_KEY = 'AIzaSyBA28Gud0vpGHNhAbTvisjdM94qCa2GnxM';
export const GOOGLE_SHEET_ID = '1sOYLSNJ9EFkpX2mc3zvQ6uCPjuLTJpGuWRvu0SPoag0';

// Channel keyword mapping
export const CHANNEL_KEYWORDS = {
    university: [
        'university', 'college', '.edu', 'educational institution', 'professor',
        'dean', 'faculty', 'student affairs', 'campus', 'academic'
    ],
    business: [
        'pvt ltd', 'private limited', 'inc', 'corporation', 'ceo', 'director',
        'sales', 'marketing', 'manager', 'executive', 'enterprise', 'bank'
    ],
    consultancy: [
        'consulting', 'consultancy', 'advisory', 'consultant', 'advisor',
        'solutions', 'services'
    ],
    ngo: [
        'ngo', 'non-profit', 'foundation', 'trust', 'charitable', 'welfare',
        'social work', 'humanitarian'
    ],
    startup: ['startup', 'co-founder', 'founder', 'tech', 'innovation lab'],
    government: [
        'government', 'ministry', 'municipal', 'public sector', 'bureaucrat',
        'ias', 'ips', 'commissioner'
    ]
};

// Common cities/states/countries
export const COMMON_LOCATIONS = [
    'bangalore', 'bengaluru', 'mumbai', 'delhi', 'new delhi', 'chennai', 'hyderabad',
    'pune', 'kolkata', 'jaipur', 'ahmedabad', 'coimbatore', 'indore', 'noida',
    'gurgaon', 'kochi', 'trivandrum',
    'london', 'new york', 'singapore', 'kuala lumpur',
    'malaysia', 'dubai', 'uae', 'qatar', 'canada', 'australia', 'usa', 'uk'
];

// Gemini prompt for card extraction
export const EXTRACTION_PROMPT = `
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
`;
