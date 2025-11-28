// API & Application State
const DEFAULT_API_BASE =
    window.location.origin && window.location.origin !== 'null'
        ? `${window.location.origin.replace(/\/$/, '')}/api`
        : 'http://localhost:4000/api';
const API_BASE_URL = window.API_BASE_URL || DEFAULT_API_BASE;
let currentView = 'monthly'; // 'monthly' or 'weekly'
let currentDate = new Date();
let editingBookingId = null;
let selectedBookings = new Set();
let bookingsCache = [];

// Room Settings
let roomSettings = [
    { id: 1, name: 'Room 1', color: '#667eea' },
    { id: 2, name: 'Room 2', color: '#f093fb' },
    { id: 3, name: 'Room 3', color: '#4facfe' }
];

// Initialize Application
document.addEventListener('DOMContentLoaded', async () => {
    loadSettings();
    await refreshBookings();
    initializeEventListeners();
    setDefaultDate();
    renderCurrentView();
    checkDatabaseStatus();
});

function setDefaultDate() {
    const today = new Date();
    const dateInput = document.getElementById('bookingDate');
    dateInput.value = formatDate(today);
    dateInput.min = formatDate(today); // Prevent past dates
}

// Initialize Event Listeners
function initializeEventListeners() {
    // Form submission
    document.getElementById('bookingForm').addEventListener('submit', handleFormSubmit);
    document.getElementById('cancelBtn').addEventListener('click', cancelEdit);

    // View toggles
    document.getElementById('monthlyViewBtn').addEventListener('click', () => switchView('monthly'));
    document.getElementById('weeklyViewBtn').addEventListener('click', () => switchView('weekly'));

    // Calendar navigation
    document.getElementById('prevBtn').addEventListener('click', navigatePrevious);
    document.getElementById('nextBtn').addEventListener('click', navigateNext);

    // Manage menu
    document.getElementById('manageBtn').addEventListener('click', openManageMenu);
    document.getElementById('closeManageModal').addEventListener('click', closeManageMenu);
    document.getElementById('shareBtn').addEventListener('click', shareAsImage);

    // Manage tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => switchTab(e.target.dataset.tab));
    });

    // Settings
    document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);
    renderRoomSettings();

    // Database/Spreadsheet
    document.getElementById('checkDbStatusBtn').addEventListener('click', checkDatabaseStatus);
    document.getElementById('exportToCsvBtn').addEventListener('click', exportToCsvNow);
    document.getElementById('exportForSheetsBtn').addEventListener('click', exportToCsvNow);
    document.getElementById('exportToJsonBtn').addEventListener('click', exportJson);

    // Bookings management
    document.getElementById('applyFilterBtn').addEventListener('click', applyFilter);
    document.getElementById('clearFilterBtn').addEventListener('click', clearFilter);
    document.getElementById('exportJsonBtn').addEventListener('click', exportJson);
    document.getElementById('exportCsvBtn').addEventListener('click', exportCsv);
    document.getElementById('bulkDeleteBtn').addEventListener('click', bulkDelete);

    // Booking details modal
    document.getElementById('closeBookingModal').addEventListener('click', closeBookingModal);

    // Close modals on outside click
    document.getElementById('manageModal').addEventListener('click', (e) => {
        if (e.target.id === 'manageModal') closeManageMenu();
    });
    document.getElementById('bookingDetailsModal').addEventListener('click', (e) => {
        if (e.target.id === 'bookingDetailsModal') closeBookingModal();
    });
}

// Data Storage Functions
async function refreshBookings(showToastOnError = true) {
    try {
        const response = await fetch(`${API_BASE_URL}/bookings`);
        if (!response.ok) {
            throw new Error('Failed to load bookings');
        }
        bookingsCache = await response.json();
    } catch (error) {
        console.error('Error fetching bookings:', error);
        if (showToastOnError) {
            showToast('Unable to load bookings from the database.', 'error');
        }
        bookingsCache = [];
    }
}

function loadBookings() {
    return bookingsCache;
}

function loadSettings() {
    const stored = localStorage.getItem('roomSettings');
    if (stored) {
        roomSettings = JSON.parse(stored);
    }
}

function saveSettingsToStorage() {
    localStorage.setItem('roomSettings', JSON.stringify(roomSettings));
}

async function createBookingOnServer(booking) {
    const response = await fetch(`${API_BASE_URL}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(booking)
    });
    if (!response.ok) {
        const error = await safeJson(response);
        throw new Error(error?.message || 'Failed to create booking');
    }
    return response.json();
}

async function updateBookingOnServer(booking) {
    const response = await fetch(`${API_BASE_URL}/bookings/${booking.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(booking)
    });
    if (!response.ok) {
        const error = await safeJson(response);
        throw new Error(error?.message || 'Failed to update booking');
    }
    return response.json();
}

async function safeJson(response) {
    try {
        return await response.json();
    } catch {
        return null;
    }
}

// Booking Functions
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const bookingId = document.getElementById('bookingId').value;
    const date = document.getElementById('bookingDate').value;
    const name = document.getElementById('guestName').value;
    const numRooms = parseInt(document.getElementById('numRooms').value);
    const remarks = document.getElementById('remarks').value;

    if (!date || !name || !numRooms) {
        showError('Please fill in all required fields');
        return;
    }

    const bookings = loadBookings();
    const bookingDate = new Date(date);
    const dateStr = formatDate(bookingDate);

    // Check availability
    if (!bookingId) {
        // New booking
        const existingBookings = bookings.filter(b => b.date === dateStr);
        const totalRoomsBooked = existingBookings.reduce((sum, b) => sum + b.rooms, 0);
        
        if (totalRoomsBooked + numRooms > 3) {
            showError(`Only ${3 - totalRoomsBooked} room(s) available on this date`);
            return;
        }
    } else {
        // Editing booking
        const existingBooking = bookings.find(b => b.id === bookingId);
        const otherBookings = bookings.filter(b => b.id !== bookingId && b.date === dateStr);
        const totalRoomsBooked = otherBookings.reduce((sum, b) => sum + b.rooms, 0);
        
        if (totalRoomsBooked + numRooms > 3) {
            showError(`Only ${3 - totalRoomsBooked} room(s) available on this date`);
            return;
        }
    }

    // Assign room numbers
    const roomNumbers = assignRooms(dateStr, numRooms, bookingId);

    const booking = {
        id: bookingId || generateId(),
        date: dateStr,
        name: name,
        rooms: numRooms,
        roomNumbers: roomNumbers,
        remarks: remarks || ''
    };

    try {
        if (bookingId) {
            await updateBookingOnServer(booking);
        } else {
            await createBookingOnServer(booking);
        }
        await refreshBookings(false);
        clearForm();
        renderCurrentView();
        renderBookingsList();
        showToast('Booking saved successfully!', 'success');
    } catch (error) {
        console.error('Error saving booking:', error);
        showToast(error.message || 'Unable to save booking. Please check the API server.', 'error');
    }
}

function assignRooms(dateStr, numRooms, excludeBookingId) {
    const bookings = loadBookings();
    const dayBookings = bookings.filter(b => b.date === dateStr && b.id !== excludeBookingId);
    const usedRooms = new Set();
    
    dayBookings.forEach(b => {
        b.roomNumbers.forEach(r => usedRooms.add(r));
    });

    const availableRooms = [];
    for (let i = 1; i <= 3; i++) {
        if (!usedRooms.has(i) && availableRooms.length < numRooms) {
            availableRooms.push(i);
        }
    }

    return availableRooms;
}

async function deleteBooking(id, skipConfirm = false, silent = false) {
    if (!skipConfirm && !confirm('Are you sure you want to delete this booking?')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/bookings/${id}`, {
            method: 'DELETE'
        });
        if (!response.ok) {
            throw new Error('Failed to delete booking');
        }
        if (!silent) {
            await refreshBookings(false);
            renderCurrentView();
            renderBookingsList();
            showToast('Booking deleted successfully!', 'success');
        }
    } catch (error) {
        console.error('Error deleting booking:', error);
        showToast('Unable to delete booking. Please check the API server.', 'error');
    }
}

function editBooking(id) {
    const bookings = loadBookings();
    const booking = bookings.find(b => b.id === id);
    
    if (!booking) return;

    editingBookingId = id;
    document.getElementById('bookingId').value = booking.id;
    document.getElementById('bookingDate').value = booking.date;
    document.getElementById('guestName').value = booking.name;
    document.getElementById('numRooms').value = booking.rooms;
    document.getElementById('remarks').value = booking.remarks;
    document.getElementById('formTitle').textContent = 'Edit Booking';
    document.getElementById('cancelBtn').style.display = 'block';

    // Scroll to form
    document.querySelector('.booking-form-section').scrollIntoView({ behavior: 'smooth' });
}

function cancelEdit() {
    clearForm();
}

function clearForm() {
    document.getElementById('bookingForm').reset();
    document.getElementById('bookingId').value = '';
    document.getElementById('formTitle').textContent = 'New Booking';
    document.getElementById('cancelBtn').style.display = 'none';
    document.getElementById('errorMessage').classList.remove('show');
    editingBookingId = null;
}

function showError(message) {
    const errorEl = document.getElementById('errorMessage');
    errorEl.textContent = message;
    errorEl.classList.add('show');
    setTimeout(() => {
        errorEl.classList.remove('show');
    }, 5000);
}

// Calendar Rendering
function renderCurrentView() {
    if (currentView === 'monthly') {
        renderMonthlyView();
    } else {
        renderWeeklyView();
    }
    updatePeriodDisplay();
}

function renderMonthlyView() {
    const calendar = document.getElementById('monthlyCalendar');
    calendar.innerHTML = '';

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // Day headers
    const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayHeaders.forEach(day => {
        const header = document.createElement('div');
        header.className = 'day-header';
        header.textContent = day;
        calendar.appendChild(header);
    });

    // Get first day of month and number of days
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    // Previous month days
    const prevMonth = new Date(year, month, 0);
    const daysInPrevMonth = prevMonth.getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
        const day = daysInPrevMonth - i;
        const cell = createDayCell(day, true, year, month - 1);
        calendar.appendChild(cell);
    }

    // Current month days
    const bookings = loadBookings();
    const today = new Date();
    
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dateStr = formatDate(date);
        const dayBookings = bookings.filter(b => b.date === dateStr);
        const isToday = date.toDateString() === today.toDateString();
        const totalRooms = dayBookings.reduce((sum, b) => sum + b.rooms, 0);
        
        const cell = createDayCell(day, false, year, month);
        if (isToday) {
            cell.classList.add('today');
        }

        // Add color coding based on number of rooms booked
        if (totalRooms > 0) {
            cell.classList.add(`booking-${totalRooms}`);
        }

        // Add booking indicators
        dayBookings.forEach(booking => {
            const indicator = document.createElement('div');
            indicator.className = 'booking-indicator';
            const roomColor = roomSettings[booking.roomNumbers[0] - 1]?.color || '#667eea';
            indicator.style.background = roomColor;
            indicator.textContent = booking.name;
            indicator.title = `${booking.name} - ${booking.rooms} room(s)`;
            indicator.addEventListener('click', (e) => {
                e.stopPropagation();
                showBookingDetails(booking.id);
            });
            cell.appendChild(indicator);
        });

        if (dayBookings.length > 0) {
            const count = document.createElement('div');
            count.className = 'booking-count';
            count.textContent = `${totalRooms}/3 rooms booked`;
            cell.appendChild(count);
        }

        // Only show booking details if there are bookings, otherwise set date in form
        cell.addEventListener('click', () => {
            if (dayBookings.length > 0) {
                // If multiple bookings, show the first one, or show a list
                if (dayBookings.length === 1) {
                    showBookingDetails(dayBookings[0].id);
                } else {
                    showDateBookings(dateStr, dayBookings);
                }
            } else {
                // No bookings - just set the date in the form
                document.getElementById('bookingDate').value = dateStr;
                document.querySelector('.booking-form-section').scrollIntoView({ behavior: 'smooth' });
            }
        });

        calendar.appendChild(cell);
    }

    // Next month days
    const totalCells = calendar.children.length - 7; // Subtract headers
    const remainingCells = 42 - totalCells; // 6 weeks * 7 days
    for (let day = 1; day <= remainingCells && day <= 14; day++) {
        const cell = createDayCell(day, true, year, month + 1);
        calendar.appendChild(cell);
    }
}

function createDayCell(day, otherMonth, year, month) {
    const cell = document.createElement('div');
    cell.className = 'day-cell';
    if (otherMonth) {
        cell.classList.add('other-month');
    }

    const dayNumber = document.createElement('div');
    dayNumber.className = 'day-number';
    dayNumber.textContent = day;
    cell.appendChild(dayNumber);

    return cell;
}

function renderWeeklyView() {
    const calendar = document.getElementById('weeklyCalendar');
    calendar.innerHTML = '';

    // Get week dates
    const weekDates = getWeekDates(currentDate);
    const bookings = loadBookings();
    const today = new Date();

    // Empty cell for room headers
    const emptyHeader = document.createElement('div');
    emptyHeader.className = 'time-header';
    calendar.appendChild(emptyHeader);

    // Day headers with booking count
    weekDates.forEach(date => {
        const header = document.createElement('div');
        header.className = 'day-header';
        const dateStr = formatDate(date);
        const dayBookings = bookings.filter(b => b.date === dateStr);
        const totalRooms = dayBookings.reduce((sum, b) => sum + b.rooms, 0);
        header.textContent = `${date.toLocaleDateString('en-US', { weekday: 'short' })}\n${date.getDate()}/${date.getMonth() + 1}`;
        if (totalRooms > 0) {
            header.classList.add(`booking-${totalRooms}`);
            const count = document.createElement('div');
            count.style.cssText = 'font-size: 11px; margin-top: 4px; font-weight: normal;';
            count.textContent = `${totalRooms}/3`;
            header.appendChild(count);
        }
        calendar.appendChild(header);
    });

    // Room rows
    for (let room = 1; room <= 3; room++) {
        const roomSetting = roomSettings[room - 1];
        const roomHeader = document.createElement('div');
        roomHeader.className = 'room-header';
        roomHeader.textContent = roomSetting.name;
        roomHeader.style.borderLeft = `4px solid ${roomSetting.color}`;
        calendar.appendChild(roomHeader);

        weekDates.forEach(date => {
            const dateStr = formatDate(date);
            const cell = document.createElement('div');
            cell.className = 'day-cell';
            
            if (date.toDateString() === today.toDateString()) {
                cell.classList.add('today');
            }

            // Find bookings for this room and date
            const dayBookings = bookings.filter(b => 
                b.date === dateStr && b.roomNumbers.includes(room)
            );

            dayBookings.forEach(booking => {
                const block = document.createElement('div');
                block.className = 'booking-block';
                block.style.background = roomSetting.color;
                block.textContent = booking.name;
                block.title = `${booking.name} - ${booking.rooms} room(s)`;
                block.addEventListener('click', () => {
                    showBookingDetails(booking.id);
                });
                cell.appendChild(block);
            });

            calendar.appendChild(cell);
        });
    }
}

function getWeekDates(date) {
    const dates = [];
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day; // Sunday
    const sunday = new Date(d.getFullYear(), d.getMonth(), diff);
    
    for (let i = 0; i < 7; i++) {
        const weekDay = new Date(sunday);
        weekDay.setDate(sunday.getDate() + i);
        dates.push(weekDay);
    }
    
    return dates;
}

function switchView(view) {
    currentView = view;
    document.getElementById('monthlyViewBtn').classList.toggle('active', view === 'monthly');
    document.getElementById('weeklyViewBtn').classList.toggle('active', view === 'weekly');
    document.getElementById('monthlyView').classList.toggle('active', view === 'monthly');
    document.getElementById('weeklyView').classList.toggle('active', view === 'weekly');
    renderCurrentView();
}

function navigatePrevious() {
    if (currentView === 'monthly') {
        currentDate.setMonth(currentDate.getMonth() - 1);
    } else {
        currentDate.setDate(currentDate.getDate() - 7);
    }
    renderCurrentView();
}

function navigateNext() {
    if (currentView === 'monthly') {
        currentDate.setMonth(currentDate.getMonth() + 1);
    } else {
        currentDate.setDate(currentDate.getDate() + 7);
    }
    renderCurrentView();
}

function updatePeriodDisplay() {
    const periodEl = document.getElementById('currentPeriod');
    if (currentView === 'monthly') {
        periodEl.textContent = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } else {
        const weekDates = getWeekDates(new Date(currentDate));
        const start = weekDates[0];
        const end = weekDates[6];
        periodEl.textContent = `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
}

// Booking Details Modal
function showBookingDetails(id) {
    const bookings = loadBookings();
    const booking = bookings.find(b => b.id === id);
    
    if (!booking) return;

    const modal = document.getElementById('bookingDetailsModal');
    const content = document.getElementById('bookingDetailsContent');
    
    const roomNames = booking.roomNumbers.map(r => roomSettings[r - 1]?.name || `Room ${r}`).join(', ');
    
    content.innerHTML = `
        <div style="display: grid; gap: 15px;">
            <div><strong>Date:</strong> ${formatDateDisplay(booking.date)}</div>
            <div><strong>Guest Name:</strong> ${booking.name}</div>
            <div><strong>Number of Rooms:</strong> ${booking.rooms}</div>
            <div><strong>Rooms:</strong> ${roomNames}</div>
            <div><strong>Remarks:</strong> ${booking.remarks || 'None'}</div>
            <div style="display: flex; gap: 10px; margin-top: 20px; flex-wrap: wrap;">
                <button class="btn btn-primary" onclick="editBooking('${booking.id}'); closeBookingModal();">Edit</button>
                <button class="btn btn-danger" onclick="deleteBooking('${booking.id}'); closeBookingModal();">Delete</button>
                <button class="btn btn-secondary" onclick="shareBookingAsImage('${booking.id}')">Share as Image</button>
            </div>
        </div>
    `;
    
    modal.classList.add('active');
}

function showDateBookings(dateStr, dayBookings) {
    const modal = document.getElementById('bookingDetailsModal');
    const content = document.getElementById('bookingDetailsContent');
    
    let html = `<h3 style="margin-bottom: 15px;">Bookings for ${formatDateDisplay(dateStr)}</h3>`;
    html += '<div style="display: grid; gap: 15px;">';
    
    dayBookings.forEach(booking => {
        const roomNames = booking.roomNumbers.map(r => roomSettings[r - 1]?.name || `Room ${r}`).join(', ');
        html += `
            <div style="padding: 15px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #667eea;">
                <div><strong>Guest Name:</strong> ${booking.name}</div>
                <div><strong>Number of Rooms:</strong> ${booking.rooms}</div>
                <div><strong>Rooms:</strong> ${roomNames}</div>
                <div><strong>Remarks:</strong> ${booking.remarks || 'None'}</div>
                <div style="display: flex; gap: 10px; margin-top: 10px; flex-wrap: wrap;">
                    <button class="btn btn-primary" style="padding: 6px 12px; font-size: 12px;" onclick="editBooking('${booking.id}'); closeBookingModal();">Edit</button>
                    <button class="btn btn-danger" style="padding: 6px 12px; font-size: 12px;" onclick="deleteBooking('${booking.id}'); closeBookingModal();">Delete</button>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    content.innerHTML = html;
    modal.classList.add('active');
}

function closeBookingModal() {
    document.getElementById('bookingDetailsModal').classList.remove('active');
}

// Share as Image
function shareAsImage() {
    let elementToCapture;
    
    if (currentView === 'monthly') {
        elementToCapture = document.getElementById('monthlyView');
    } else {
        elementToCapture = document.getElementById('weeklyView');
    }

    html2canvas(elementToCapture, {
        backgroundColor: '#ffffff',
        scale: 2
    }).then(canvas => {
        canvas.toBlob(blob => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `guest-house-calendar-${currentView}-${Date.now()}.png`;
            a.click();
            URL.revokeObjectURL(url);
            showToast('Image downloaded successfully!', 'success');
        });
    });
}

function shareBookingAsImage(id) {
    const bookings = loadBookings();
    const booking = bookings.find(b => b.id === id);
    
    if (!booking) return;

    const roomNames = booking.roomNumbers.map(r => roomSettings[r - 1]?.name || `Room ${r}`).join(', ');
    
    const content = document.createElement('div');
    content.style.cssText = 'padding: 30px; background: white; font-family: Arial; max-width: 600px;';
    content.innerHTML = `
        <h2 style="color: #667eea; margin-bottom: 20px;">Guest House Booking</h2>
        <div style="display: grid; gap: 15px; font-size: 16px;">
            <div><strong>Date:</strong> ${formatDateDisplay(booking.date)}</div>
            <div><strong>Guest Name:</strong> ${booking.name}</div>
            <div><strong>Number of Rooms:</strong> ${booking.rooms}</div>
            <div><strong>Rooms:</strong> ${roomNames}</div>
            <div><strong>Remarks:</strong> ${booking.remarks || 'None'}</div>
        </div>
    `;

    html2canvas(content, {
        backgroundColor: '#ffffff',
        scale: 2
    }).then(canvas => {
        canvas.toBlob(blob => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `booking-${booking.name}-${booking.date}.png`;
            a.click();
            URL.revokeObjectURL(url);
            showToast('Image downloaded successfully!', 'success');
        });
    });
}

// Manage Menu
function openManageMenu() {
    document.getElementById('manageModal').classList.add('active');
    renderBookingsList();
    checkDatabaseStatus();
}

function closeManageMenu() {
    document.getElementById('manageModal').classList.remove('active');
}

function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === `${tab}Tab`);
    });
}

// Room Settings
function renderRoomSettings() {
    const container = document.getElementById('roomSettings');
    container.innerHTML = '';
    
    roomSettings.forEach((room, index) => {
        const setting = document.createElement('div');
        setting.className = 'room-setting';
        setting.innerHTML = `
            <div>
                <label>Room Name</label>
                <input type="text" class="room-name" data-room="${index}" value="${room.name}">
            </div>
            <div>
                <label>Room Color</label>
                <input type="color" class="room-color" data-room="${index}" value="${room.color}">
            </div>
        `;
        container.appendChild(setting);
    });
}

function saveSettings() {
    const nameInputs = document.querySelectorAll('.room-name');
    const colorInputs = document.querySelectorAll('.room-color');
    
    nameInputs.forEach(input => {
        const index = parseInt(input.dataset.room);
        roomSettings[index].name = input.value;
    });
    
    colorInputs.forEach(input => {
        const index = parseInt(input.dataset.room);
        roomSettings[index].color = input.value;
    });
    
    saveSettingsToStorage();
    renderCurrentView();
    showToast('Settings saved successfully!', 'success');
}

// Bookings Management
function renderBookingsList(filteredBookings = null) {
    const container = document.getElementById('bookingsList');
    const source = filteredBookings ? [...filteredBookings] : [...loadBookings()];
    
    if (source.length === 0) {
        container.innerHTML = '<p>No bookings found.</p>';
        return;
    }

    // Sort by date
    const bookings = source.sort((a, b) => new Date(a.date) - new Date(b.date));

    container.innerHTML = '';
    selectedBookings.clear();

    bookings.forEach(booking => {
        const item = document.createElement('div');
        item.className = 'booking-item';
        const roomNames = booking.roomNumbers.map(r => roomSettings[r - 1]?.name || `Room ${r}`).join(', ');
        
        item.innerHTML = `
            <input type="checkbox" class="booking-checkbox" data-id="${booking.id}">
            <div class="booking-item-info">
                <strong>${booking.name}</strong>
                <span>${formatDateDisplay(booking.date)}</span>
                <span>${booking.rooms} room(s): ${roomNames}</span>
                ${booking.remarks ? `<span style="color: #999; font-style: italic;">${booking.remarks}</span>` : ''}
            </div>
            <div class="booking-item-actions">
                <button class="btn btn-primary" onclick="editBooking('${booking.id}'); closeManageMenu();">Edit</button>
                <button class="btn btn-danger" onclick="deleteBooking('${booking.id}');">Delete</button>
            </div>
        `;
        
        const checkbox = item.querySelector('.booking-checkbox');
        checkbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                selectedBookings.add(booking.id);
            } else {
                selectedBookings.delete(booking.id);
            }
        });
        
        container.appendChild(item);
    });
}

function applyFilter() {
    const fromDate = document.getElementById('filterFromDate').value;
    const toDate = document.getElementById('filterToDate').value;
    
    if (!fromDate || !toDate) {
        showToast('Please select both from and to dates', 'error');
        return;
    }
    
    const bookings = loadBookings();
    const filtered = bookings.filter(booking => {
        const bookingDate = new Date(booking.date);
        const from = new Date(fromDate);
        const to = new Date(toDate);
        return bookingDate >= from && bookingDate <= to;
    });
    
    renderBookingsList(filtered);
}

function clearFilter() {
    document.getElementById('filterFromDate').value = '';
    document.getElementById('filterToDate').value = '';
    renderBookingsList();
}

function exportJson() {
    const bookings = loadBookings();
    const dataStr = JSON.stringify(bookings, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bookings-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('JSON exported successfully!', 'success');
}

function exportCsv() {
    const bookings = loadBookings();
    exportCsvData(bookings, `bookings-${Date.now()}.csv`);
    showToast('CSV exported successfully!', 'success');
}

function exportToCsvNow() {
    const bookings = loadBookings();
    exportCsvData(bookings, `bookings-${Date.now()}.csv`);
    showToast('CSV exported successfully!', 'success');
}

function exportCsvData(bookings, filename) {
    const headers = ['Date', 'Guest Name', 'Number of Rooms', 'Rooms', 'Remarks'];
    const rows = bookings.map(booking => {
        const roomNames = booking.roomNumbers.map(r => roomSettings[r - 1]?.name || `Room ${r}`).join(', ');
        return [
            booking.date,
            booking.name,
            booking.rooms,
            roomNames,
            booking.remarks || ''
        ];
    });
    
    const csv = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

// Database status helper
async function checkDatabaseStatus(showToastOnError = false) {
    const badge = document.getElementById('dbStatusBadge');
    if (!badge) return;
    setDbStatusBadge('warning', 'Checking...');

    try {
        const response = await fetch(`${API_BASE_URL}/health`);
        if (!response.ok) throw new Error('API offline');
        const data = await response.json();
        const message = data?.status === 'ok' ? 'Connected' : 'Reachable';
        setDbStatusBadge('success', message);
        if (showToastOnError) {
            showToast('Database connection restored.', 'success');
        }
    } catch (error) {
        console.error('API health check failed:', error);
        setDbStatusBadge('error', 'Offline');
        if (showToastOnError) {
            showToast('Unable to reach the API server.', 'error');
        }
    }
}

function setDbStatusBadge(state, text) {
    const badge = document.getElementById('dbStatusBadge');
    if (!badge) return;
    badge.textContent = text;
    badge.classList.remove('success', 'warning', 'error');
    badge.classList.add(state);
}

async function bulkDelete() {
    if (selectedBookings.size === 0) {
        showToast('Please select bookings to delete', 'error');
        return;
    }
    
    if (!confirm(`Are you sure you want to delete ${selectedBookings.size} booking(s)?`)) {
        return;
    }
    
    try {
        await Promise.all(
            Array.from(selectedBookings).map(id => deleteBooking(id, true, true))
        );
        selectedBookings.clear();
        await refreshBookings(false);
        renderBookingsList();
        renderCurrentView();
        showToast('Selected bookings deleted successfully!', 'success');
    } catch (error) {
        console.error('Bulk delete failed:', error);
        showToast('Unable to delete selected bookings.', 'error');
    }
}

// Utility Functions
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatDateDisplay(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Make functions available globally for onclick handlers
window.editBooking = editBooking;
window.deleteBooking = deleteBooking;
window.shareBookingAsImage = shareBookingAsImage;
window.closeBookingModal = closeBookingModal;

