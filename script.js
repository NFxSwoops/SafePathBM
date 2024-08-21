// Constants
const GIST_URL = 'https://api.github.com/gists/b52212a95a3425e52c07ee1a412284be'; // Replace with your actual Gist ID
const ZIP_CODE = '08015';
const DATE_KEY = getCurrentDate(); // Function to get today's date in MMDDYYYY format
const GIST_URL = `https://api.github.com/gists/${process.env.REACT_APP_API_KEY}`;
// Your GitHub token

// Generate a persistent deviceId using localStorage
function getDeviceId() {
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
        deviceId = generateSessionId(); // Reuse session ID generator function
        localStorage.setItem('deviceId', deviceId);
    }
    return deviceId;
}

// Session ID generation (using timestamp + random number)
function generateSessionId() {
    const timestamp = Date.now().toString();
    const randomNum = Math.floor(Math.random() * 100000).toString();
    return timestamp + '-' + randomNum;
}

// Fetch JSON data from Gist with authentication
async function fetchData() {
    try {
        const response = await fetch(GIST_URL, {
            headers: {
                'Authorization': `token ${ACCESS_TOKEN}`
            }
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        const content = data.files['location_' + ZIP_CODE+'.json']?.content;
        if (!content) {
            throw new Error('Content not found in Gist');
        }
        return JSON.parse(content);
    } catch (error) {
        console.log('Error fetching data:', error.message);
        return {}; // Return an empty object to avoid breaking the script
    }
}

// Add a new report with deviceId and timestamp
async function addReport() {
    const deviceId = getDeviceId();
    const timestamp = getCurrentTime(); // Implement a function to get the current time
    const jsonData = await fetchData();

    if (!jsonData['location_' + ZIP_CODE]) {
        jsonData['location_' + ZIP_CODE] = {}; // Initialize if not present
    }

    if (!jsonData['location_' + ZIP_CODE][DATE_KEY]) {
        jsonData['location_' + ZIP_CODE][DATE_KEY] = [];
    }

    jsonData['location_' + ZIP_CODE][DATE_KEY].push({
        report_id: deviceId,
        timestamp: timestamp
    });

    // Update the Gist with the new data
    await updateGist(jsonData);
}

// Count reports in the last 3 hours
function countReportsInLast3Hours(jsonData) {
    const reports = jsonData['location_' + ZIP_CODE]?.[DATE_KEY] || [];
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);

    const [month, day, year] = [DATE_KEY.substring(0, 2), DATE_KEY.substring(2, 4), DATE_KEY.substring(4, 8)];

    return reports.filter(report => {
        // Reconstruct the report datetime with the correct date and time
        const reportDateTime = new Date(`${year}-${month}-${day}T${report.timestamp}`);

        // Compare report time with three hours ago
        return reportDateTime >= threeHoursAgo;
    }).length;
}



// Determine the police presence level
function calculatePresenceLevel(reportCount) {
    if (reportCount > 5) {
        return 'HIGH';
    } else if (reportCount >= 3) {
        return 'MEDIUM';
    } else {
        return 'LOW';
    }
}

// Update the UI with the current police presence level
async function updateUI() {
    const jsonData = await fetchData();
    const reportCount = countReportsInLast3Hours(jsonData);
    const presenceLevel = calculatePresenceLevel(reportCount);

    // Update the police presence value in the UI
    document.querySelector('#presence-value').textContent = presenceLevel;

}

// Update Gist with new data
async function updateGist(jsonData) {
    try {
        await fetch(GIST_URL, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `token ${ACCESS_TOKEN}`
            },
            body: JSON.stringify({
                files: {
                    ['location_' + ZIP_CODE+'.json']: {
                        content: JSON.stringify(jsonData, null, 2)
                    }
                }
            })
        });
    } catch (error) {
        console.error('Error updating Gist:', error.message);
    }
    updateUI();
}

// Get current date in MMDDYYYY format
function getCurrentDate() {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const year = now.getFullYear();
    return `${month}${day}${year}`;
}

// Get current time in HH:MM format
function getCurrentTime() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
}

// Function to open the mail client
function openMailClient() {
    window.location.href = 'mailto:robertofernandez.business@gmail.com';
}

//Update the date widget
function updateDate() {
    const dateElement = document.querySelector('#date-label'); // Assuming you have a class for the date
    const currentDate = new Date();
    const options = { year: 'numeric', month: 'long', day: 'numeric' }; // Customize date format
    const formattedDate = currentDate.toLocaleDateString(undefined, options);

    if (dateElement) {
        dateElement.textContent = `Today's Date: ${formattedDate}`;
    }
}

// Initialize the program
async function main() {
    updateDate();
    await updateUI();
    
}

// Event listeners for the buttons
document.querySelector('button:first-of-type').addEventListener('click', addReport);
document.querySelector('button:nth-of-type(2)').addEventListener('click', openMailClient);

// Call the main function to update the UI on load
main();
