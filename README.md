# Guest House Room Allocation System

A simple, modern web application for managing guest house room bookings with calendar views, CRUD operations, and image sharing capabilities.

## Features

- **Booking Management**
  - Create, read, update, and delete bookings
  - Booking fields: Date, Guest Name, Number of Rooms (1-3), Remarks
  - Automatic room assignment and availability validation
  - Prevents overbooking (maximum 3 rooms total)

- **Calendar Views with Color Coding**
  - **Monthly View**: Grid layout showing all days with booking indicators
    - **No booking**: Default white background
    - **1 room booked**: Light green background
    - **2 rooms booked**: Light blue background
    - **3 rooms booked**: Light red background
  - **Weekly View**: 7-day view with room columns showing booking timeline
    - Day headers show total bookings with color coding
  - Navigate between months/weeks
  - Click on dates with bookings to view details
  - Click on empty dates to set date in booking form

- **Share as Image**
  - Export monthly calendar view as PNG image
  - Export weekly calendar view as PNG image
  - Export individual booking details as PNG image

- **Manage Menu**
  - **Settings**: Customize room names and colors
  - **Bookings Management**: 
    - View all bookings in table format
    - Filter bookings by date range
    - Bulk delete selected bookings
    - Export bookings as JSON or CSV

- **Data Persistence & Spreadsheet Integration**
  - Bookings are stored in a local SQLite database via the Node.js API (`server.js`)
  - Room settings persist in browser localStorage
  - API responses power the calendar, manage view, and exports
  - Manual exports: CSV (Excel/Sheets friendly) & JSON
  - Google Sheets import workflow included (export CSV → import into Sheets)

## Usage

1. Install dependencies: `npm install`
2. Start the backend (and static hosting): `npm start`
3. Visit [http://localhost:4000](http://localhost:4000) in a modern browser
4. Fill in the booking form to create a new booking
5. Use the calendar views to see booking status
6. Click on bookings in the calendar to view/edit/delete
7. Use the "Manage" button to access settings and bookings management
8. Use the "Share as Image" button to export calendar views

## Technical Details

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: Node.js (Express) + SQLite database (`server.js`)
- **Data Persistence**: SQLite for bookings, localStorage for room settings
- **Image Export**: html2canvas library (loaded via CDN)
- **Exports**: CSV/JSON generated client-side

## Browser Compatibility

Works best in modern browsers (Chrome, Firefox, Edge, Safari) that support:
- ES6 JavaScript features
- localStorage API
- CSS Grid and Flexbox

## File Structure

```
/
├── index.html          # Main HTML structure
├── styles.css          # Styling and responsive design
├── script.js           # Frontend logic (consumes API)
├── server.js           # Express + SQLite API server
├── package.json        # Backend dependencies & scripts
├── bookings.db         # SQLite database file (auto-created)
└── README.md           # This file
```

## Room Management

The system supports 3 rooms by default. You can customize:
- Room names (e.g., "Room 1", "Deluxe Suite", etc.)
- Room colors (for visual identification in calendar views)

Access room settings through the "Manage" menu → "Settings" tab.

## Booking Validation

- Maximum 3 rooms can be booked on any given date
- System automatically assigns available rooms
- Prevents double-booking of the same room
- Shows clear error messages when rooms are unavailable

## API Server

- Start: `npm install` then `npm start` (runs on `http://localhost:4000`)
- Endpoints:
  - `GET /api/health` – quick status check
  - `GET /api/bookings` – list bookings (JSON)
  - `POST /api/bookings` – create booking
  - `PUT /api/bookings/:id` – update booking
  - `DELETE /api/bookings/:id` – remove booking
- Data is stored in `bookings.db` (SQLite). Delete the file to reset.

## Export Options

- **Image Export**: PNG format for calendar views and booking details
- **JSON Export**: Complete booking data via Manage → Bookings or Settings
- **CSV Export**: Booking data in CSV format for Excel/Google Sheets/databases

## Spreadsheet Integration

All bookings live in the SQLite database. When you need spreadsheet access:

1. **Export CSV**  
   - Open Manage → Settings  
   - Click `Export CSV` (or `Download CSV for Sheets`)  
   - Import the downloaded file into Excel or Google Sheets (File → Import → Upload)

2. **Export JSON**  
   - For integrations or backups, use the JSON export button

3. **Google Sheets Workflow**  
   - Export CSV  
   - Open Google Sheets → File → Import → Upload → Select CSV  
   - Choose “Replace current sheet” or “Insert new sheet”

4. **Databases / Reporting Tools**  
   - CSV/JSON files can be ingested into MySQL, PostgreSQL, Power BI, etc.



