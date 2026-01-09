/**
 * Google Apps Script for Visiting Card Scanner Mobile App
 * 
 * DEPLOYMENT INSTRUCTIONS:
 * 1. Open your Google Sheet: https://docs.google.com/spreadsheets/d/1sOYLSNJ9EFkpX2mc3zvQ6uCPjuLTJpGuWRvu0SPoag0
 * 2. Go to Extensions → Apps Script
 * 3. Delete any existing code
 * 4. Copy this entire file and paste it into the Apps Script editor
 * 5. Save the project (give it a name like "Visiting Card API")
 * 6. Click "Deploy" → "New Deployment"
 * 7. Click the gear icon next to "Select type" and choose "Web app"
 * 8. Configure:
 *    - Description: "Visiting Card Scanner API"
 *    - Execute as: "Me"
 *    - Who has access: "Anyone"
 * 9. Click "Deploy"
 * 10. Authorize the script when prompted
 * 11. Copy the "Web app URL"
 * 12. Paste this URL in the mobile app Settings screen
 * 
 * SHEET STRUCTURE:
 * The script expects these columns in order:
 * A: SL No
 * B: Channel (Organization Type)
 * C: Organization Name (column header is "UNIVERSITY")
 * D: Location
 * E: Point Person
 * F: Department
 * G: Contact Number
 * H: Contact Email
 * I: Address (unused)
 * J: URL (unused)
 * K: Remark (unused)
 */

function doGet(e) {
  const action = e.parameter.action;
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Sheet1');
  
  if (action === 'getAll') {
    // Get all data from the sheet
    const data = sheet.getDataRange().getValues();
    return ContentService.createTextOutput(JSON.stringify(data))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  if (action === 'getNextSlNo') {
    // Get the next serial number
    const lastRow = sheet.getLastRow();
    const slNo = lastRow > 1 ? parseInt(sheet.getRange(lastRow, 1).getValue()) + 1 : 1;
    return ContentService.createTextOutput(JSON.stringify({ slNo: slNo }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  // Default response for unknown actions
  return ContentService.createTextOutput(JSON.stringify({ error: 'Invalid action' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const action = e.parameter.action;
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Sheet1');
  const data = JSON.parse(e.postData.contents);
  
  if (action === 'checkDuplicate') {
    // Check if a card with similar data already exists
    const allData = sheet.getDataRange().getValues();
    
    // Start from row 2 (skip header)
    for (let i = 1; i < allData.length; i++) {
      const row = allData[i];
      
      // Extract existing values (handle empty cells)
      const existingPerson = row[4] ? row[4].toString().toLowerCase().trim() : '';
      const existingNumber = row[6] ? row[6].toString().toLowerCase().trim() : '';
      const existingEmail = row[7] ? row[7].toString().toLowerCase().trim() : '';
      
      // Extract new values
      const newPerson = data.pointPerson ? data.pointPerson.toLowerCase().trim() : '';
      const newNumber = data.contactNumber ? data.contactNumber.toLowerCase().trim() : '';
      const newEmail = data.contactEmail ? data.contactEmail.toLowerCase().trim() : '';
      
      // Check for matches
      if ((newPerson && existingPerson && newPerson === existingPerson) ||
          (newNumber && existingNumber && newNumber === existingNumber) ||
          (newEmail && existingEmail && newEmail === existingEmail)) {
        return ContentService.createTextOutput(JSON.stringify({
          isDuplicate: true,
          rowIndex: i + 1
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    // No duplicate found
    return ContentService.createTextOutput(JSON.stringify({ isDuplicate: false }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  if (action === 'append') {
    // Append a new card to the sheet
    try {
      const lastRow = sheet.getLastRow();
      const slNo = lastRow > 1 ? parseInt(sheet.getRange(lastRow, 1).getValue()) + 1 : 1;
      
      // Append the row with all fields
      sheet.appendRow([
        slNo,                           // A: SL No
        data.channel || '',             // B: Channel
        data.organizationName || '',    // C: Organization Name
        data.location || '',            // D: Location
        data.pointPerson || '',         // E: Point Person
        data.department || '',          // F: Department
        data.contactNumber || '',       // G: Contact Number
        data.contactEmail || '',        // H: Contact Email
        '',                             // I: Address (blank)
        '',                             // J: URL (blank)
        ''                              // K: Remark (blank)
      ]);
      
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        slNo: slNo
      })).setMimeType(ContentService.MimeType.JSON);
    } catch (error) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: error.toString()
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }
  
  // Default response for unknown actions
  return ContentService.createTextOutput(JSON.stringify({ error: 'Invalid action' }))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * TESTING THE WEB APP:
 * 
 * After deployment, you can test the Web App using these URLs:
 * 
 * 1. Get Next Serial Number:
 *    YOUR_WEB_APP_URL?action=getNextSlNo
 * 
 * 2. Get All Data:
 *    YOUR_WEB_APP_URL?action=getAll
 * 
 * 3. Check Duplicate (POST):
 *    Use a tool like Postman or curl to send POST request:
 *    URL: YOUR_WEB_APP_URL?action=checkDuplicate
 *    Body: {"pointPerson": "John Doe", "contactNumber": "1234567890", "contactEmail": "john@example.com"}
 * 
 * 4. Append Data (POST):
 *    URL: YOUR_WEB_APP_URL?action=append
 *    Body: {
 *      "channel": "BUSINESS",
 *      "organizationName": "ABC Corp",
 *      "location": "Mumbai",
 *      "pointPerson": "John Doe",
 *      "department": "Manager",
 *      "contactNumber": "1234567890",
 *      "contactEmail": "john@example.com"
 *    }
 */
