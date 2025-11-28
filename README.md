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
  - All data stored in browser localStorage
  - Settings and bookings persist across sessions
  - **Auto-Save to Excel (Always Enabled)**: All bookings are automatically saved to `Guest-House-Bookings.xlsx` whenever you create, update, or delete a booking
  - Excel file includes:
    - Bookings sheet with all booking details
    - Summary sheet with statistics and room usage
  - **Auto-Save to CSV (Optional)**: Optionally also export to CSV file
  - **Manual Export**: Export to Excel, CSV, or JSON format anytime
  - All booking data is automatically saved to spreadsheet format

## Usage

1. Open `index.html` in a modern web browser
2. Fill in the booking form to create a new booking
3. Use the calendar views to see booking status
4. Click on bookings in the calendar to view/edit/delete
5. Use the "Manage" button to access settings and bookings management
6. Use the "Share as Image" button to export calendar views

## Technical Details

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Storage**: localStorage (browser-based)
- **Image Export**: html2canvas library (loaded via CDN)
- **No dependencies**: Pure vanilla JavaScript, no frameworks required

## Browser Compatibility

Works best in modern browsers (Chrome, Firefox, Edge, Safari) that support:
- ES6 JavaScript features
- localStorage API
- CSS Grid and Flexbox

## File Structure

```
/
├── index.html          # Main HTML structure
├── styles.css          # All styling and responsive design
├── script.js           # Application logic and functionality
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

## Export Options

- **Image Export**: PNG format for calendar views and booking details
- **JSON Export**: Complete booking data in JSON format
- **CSV Export**: Booking data in CSV format for spreadsheet applications
- **Auto-Save CSV**: Automatically saves bookings to CSV file whenever data changes (enable in Manage > Settings)

## Spreadsheet Integration

The system automatically saves all booking data to Excel spreadsheets:

1. **Auto-Save to Excel (Always Active)**: 
   - All bookings are automatically saved to `Guest-House-Bookings.xlsx` whenever you:
     - Create a new booking
     - Update an existing booking
     - Delete a booking
   - The Excel file is automatically downloaded to your computer
   - The file includes two sheets:
     - **Bookings**: All booking details with columns (Date, Guest Name, Number of Rooms, Rooms, Remarks)
     - **Summary**: Statistics including total bookings, total rooms booked, and room usage statistics

2. **Manual Export**: 
   - Click "Export to Excel Now" in Manage > Settings to export immediately
   - Export to CSV or JSON formats as needed

3. **Opening the Excel File**:
   - The file `Guest-House-Bookings.xlsx` will be in your browser's default download folder
   - Open it with Microsoft Excel, Google Sheets, or any spreadsheet application
   - The file is updated automatically whenever bookings change

4. **Database Integration**: 
   - The Excel/CSV files can be imported into any database system (MySQL, PostgreSQL, etc.)
   - Use the exported files for backup, reporting, or integration with other systems



