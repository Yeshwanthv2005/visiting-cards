import axios from 'axios';
import { GOOGLE_SHEET_ID } from '../config';

// Note: For production, you would use Google's OAuth flow
// This is a simplified version using the Apps Script Web App approach

class SheetsService {
    constructor() {
        // You'll need to create a Google Apps Script Web App that acts as a proxy
        // to your Google Sheet. This is necessary for mobile apps to avoid CORS issues.
        this.webAppUrl = null; // Will be set via settings
    }

    /**
     * Set the Google Apps Script Web App URL
     * @param {string} url - Web App URL
     */
    setWebAppUrl(url) {
        this.webAppUrl = url;
    }

    /**
     * Check if a card is a duplicate
     * @param {Object} cardData - Card data to check
     * @returns {Promise<Object>} - { isDuplicate: boolean, rowIndex: number }
     */
    async checkDuplicate(cardData) {
        if (!this.webAppUrl) {
            console.warn('Web App URL not configured');
            return { isDuplicate: false };
        }

        try {
            const response = await axios.post(`${this.webAppUrl}?action=checkDuplicate`, {
                pointPerson: cardData.pointPerson,
                contactNumber: cardData.contactNumber,
                contactEmail: cardData.contactEmail,
            });

            return response.data;
        } catch (error) {
            console.error('Error checking duplicate:', error);
            return { isDuplicate: false };
        }
    }

    /**
     * Append card data to Google Sheet
     * @param {Object} cardData - Card data to append
     * @returns {Promise<Object>} - Result of append operation
     */
    async appendToSheet(cardData) {
        if (!this.webAppUrl) {
            throw new Error('Web App URL not configured. Please set it in Settings.');
        }

        try {
            // First check for duplicates
            const duplicateCheck = await this.checkDuplicate(cardData);

            if (duplicateCheck.isDuplicate) {
                return {
                    success: false,
                    error: 'Duplicate entry',
                    isDuplicate: true,
                    rowIndex: duplicateCheck.rowIndex,
                };
            }

            // Append to sheet
            const response = await axios.post(`${this.webAppUrl}?action=append`, {
                channel: cardData.channel,
                organizationName: cardData.organizationName,
                location: cardData.location,
                pointPerson: cardData.pointPerson,
                department: cardData.department,
                contactNumber: cardData.contactNumber,
                contactEmail: cardData.contactEmail,
            });

            return {
                success: true,
                data: response.data,
            };
        } catch (error) {
            console.error('Error appending to sheet:', error);
            return {
                success: false,
                error: error.message,
            };
        }
    }

    /**
     * Get all entries from the sheet
     * @returns {Promise<Array>} - All sheet entries
     */
    async getAllEntries() {
        if (!this.webAppUrl) {
            return [];
        }

        try {
            const response = await axios.get(`${this.webAppUrl}?action=getAll`);
            return response.data;
        } catch (error) {
            console.error('Error getting entries:', error);
            return [];
        }
    }

    /**
     * Get the next serial number
     * @returns {Promise<number>} - Next SL No
     */
    async getNextSlNo() {
        if (!this.webAppUrl) {
            return 1;
        }

        try {
            const response = await axios.get(`${this.webAppUrl}?action=getNextSlNo`);
            return response.data.slNo || 1;
        } catch (error) {
            console.error('Error getting SL No:', error);
            return 1;
        }
    }
}

export default new SheetsService();


/*
 * GOOGLE APPS SCRIPT WEB APP CODE
 * 
 * Deploy this as a Web App from your Google Sheet's Extensions > Apps Script
 * Set it to execute as "Me" and accessible by "Anyone"
 * 
 * Copy the Web App URL and paste it in the app settings
 */

/*
function doGet(e) {
  const action = e.parameter.action;
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Sheet1');
  
  if (action === 'getAll') {
    const data = sheet.getDataRange().getValues();
    return ContentService.createTextOutput(JSON.stringify(data))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  if (action === 'getNextSlNo') {
    const lastRow = sheet.getLastRow();
    const slNo = lastRow > 1 ? parseInt(sheet.getRange(lastRow, 1).getValue()) + 1 : 1;
    return ContentService.createTextOutput(JSON.stringify({ slNo: slNo }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  return ContentService.createTextOutput(JSON.stringify({ error: 'Invalid action' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const action = e.parameter.action;
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Sheet1');
  const data = JSON.parse(e.postData.contents);
  
  if (action === 'checkDuplicate') {
    const allData = sheet.getDataRange().getValues();
    
    for (let i = 1; i < allData.length; i++) {
      const row = allData[i];
      const existingPerson = row[4] ? row[4].toString().toLowerCase().trim() : '';
      const existingNumber = row[6] ? row[6].toString().toLowerCase().trim() : '';
      const existingEmail = row[7] ? row[7].toString().toLowerCase().trim() : '';
      
      const newPerson = data.pointPerson ? data.pointPerson.toLowerCase().trim() : '';
      const newNumber = data.contactNumber ? data.contactNumber.toLowerCase().trim() : '';
      const newEmail = data.contactEmail ? data.contactEmail.toLowerCase().trim() : '';
      
      if ((newPerson && existingPerson && newPerson === existingPerson) ||
          (newNumber && existingNumber && newNumber === existingNumber) ||
          (newEmail && existingEmail && newEmail === existingEmail)) {
        return ContentService.createTextOutput(JSON.stringify({
          isDuplicate: true,
          rowIndex: i + 1
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({ isDuplicate: false }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  if (action === 'append') {
    const lastRow = sheet.getLastRow();
    const slNo = lastRow > 1 ? parseInt(sheet.getRange(lastRow, 1).getValue()) + 1 : 1;
    
    sheet.appendRow([
      slNo,
      data.channel || '',
      data.organizationName || '',
      data.location || '',
      data.pointPerson || '',
      data.department || '',
      data.contactNumber || '',
      data.contactEmail || '',
      '', // Address
      '', // URL
      ''  // Remark
    ]);
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      slNo: slNo
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  return ContentService.createTextOutput(JSON.stringify({ error: 'Invalid action' }))
    .setMimeType(ContentService.MimeType.JSON);
}
*/
