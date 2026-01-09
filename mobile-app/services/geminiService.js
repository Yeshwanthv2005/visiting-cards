import { GoogleGenerativeAI } from '@google/generative-ai';
import { GEMINI_API_KEY, EXTRACTION_PROMPT } from '../config';

class GeminiService {
    constructor() {
        this.genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    }

    /**
     * Extract data from visiting card image
     * @param {string} imageBase64 - Base64 encoded image
     * @returns {Promise<Object>} - Extracted card data
     */
    async extractCardData(imageBase64) {
        try {
            const imagePart = {
                inlineData: {
                    data: imageBase64,
                    mimeType: 'image/jpeg',
                },
            };

            const result = await this.model.generateContent([EXTRACTION_PROMPT, imagePart]);
            const response = await result.response;
            const text = response.text();

            // Parse the response
            const data = this.parseResponse(text);
            return { success: true, data };
        } catch (error) {
            console.error('Gemini extraction error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Parse Gemini response into structured data
     * @param {string} text - Raw response text
     * @returns {Object} - Structured card data
     */
    parseResponse(text) {
        const data = {
            channel: '',
            organizationName: '',
            location: '',
            pointPerson: '',
            department: '',
            contactNumber: '',
            contactEmail: '',
        };

        const lines = text.split('\n');
        for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine.includes(':')) continue;

            const [key, ...valueParts] = trimmedLine.split(':');
            const value = valueParts.join(':').trim();

            if (value.toUpperCase() === 'BLANK' || !value) continue;

            const keyUpper = key.trim().toUpperCase();

            if (keyUpper.includes('ORGANIZATION NAME')) {
                data.organizationName = value;
            } else if (keyUpper.includes('POINT PERSON')) {
                data.pointPerson = value;
            } else if (keyUpper.includes('DEPARTMENT')) {
                data.department = value;
            } else if (keyUpper.includes('LOCATION')) {
                data.location = this.extractCityState(value);
            } else if (keyUpper.includes('CONTACT NUMBER') || keyUpper.includes('PHONE')) {
                data.contactNumber = value;
            } else if (keyUpper.includes('EMAIL')) {
                data.contactEmail = value;
            } else if (keyUpper.includes('ORGANIZATION TYPE') || keyUpper === 'TYPE') {
                data.channel = value.toUpperCase();
            }
        }

        // Auto-categorize if channel not detected
        if (!data.channel) {
            data.channel = this.categorizeChannel(text);
        }

        return data;
    }

    /**
     * Extract city/state from location text
     * @param {string} locationText - Full location text
     * @returns {string} - City/state only
     */
    extractCityState(locationText) {
        if (!locationText) return '';

        const commonLocations = [
            'bangalore', 'bengaluru', 'mumbai', 'delhi', 'new delhi', 'chennai', 'hyderabad',
            'pune', 'kolkata', 'jaipur', 'ahmedabad', 'coimbatore', 'indore', 'noida',
            'gurgaon', 'kochi', 'trivandrum', 'london', 'new york', 'singapore',
            'kuala lumpur', 'malaysia', 'dubai', 'uae', 'qatar', 'canada', 'australia', 'usa', 'uk'
        ];

        const lowerText = locationText.toLowerCase();

        for (const loc of commonLocations) {
            if (lowerText.includes(loc)) {
                return loc.split(' ').map(word =>
                    word.charAt(0).toUpperCase() + word.slice(1)
                ).join(' ');
            }
        }

        // Return first 30 characters if no match
        return locationText.substring(0, 30).trim();
    }

    /**
     * Categorize organization based on keywords
     * @param {string} text - Response text
     * @returns {string} - Category name
     */
    categorizeChannel(text) {
        const textLower = text.toLowerCase();

        const categories = {
            UNIVERSITY: ['university', 'college', '.edu', 'educational', 'professor', 'dean', 'faculty', 'campus', 'academic'],
            BUSINESS: ['pvt ltd', 'private limited', 'inc', 'corporation', 'ceo', 'director', 'sales', 'marketing', 'manager', 'executive', 'enterprise', 'bank'],
            CONSULTANCY: ['consulting', 'consultancy', 'advisory', 'consultant', 'advisor', 'solutions', 'services'],
            NGO: ['ngo', 'non-profit', 'foundation', 'trust', 'charitable', 'welfare', 'social work', 'humanitarian'],
            STARTUP: ['startup', 'co-founder', 'founder', 'tech', 'innovation lab'],
            GOVERNMENT: ['government', 'ministry', 'municipal', 'public sector', 'bureaucrat', 'ias', 'ips', 'commissioner'],
        };

        for (const [category, keywords] of Object.entries(categories)) {
            if (keywords.some(keyword => textLower.includes(keyword))) {
                return category;
            }
        }

        return '';
    }
}

export default new GeminiService();
