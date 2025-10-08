import {
    createDayElement,
    getDayOfYear,
    formatTraditionalDate,
    getNewCalendarDate,
    scrollToElement,
    selectedDayOfYear,
    selectedYear,
    setSelectedDayOfYear,
    setSelectedYear,
    displayedYear,
    dayNames,
    phases,
    rowLabels,
    rowColors,
    events,
    setCurrentCategoryFilter, // NEW: Import setter
    setCurrentSearchTerm,     // NEW: Import setter
    setIsSearchModeActive     // NEW: Import setter
} from './utils.js';
import {
    fetchAndRenderEvents,
    renderEventsForSelectedDay,
    updateCalendarEventMarkers
} from './eventManager.js';

// Central function to update selection across both calendars and display the selected date
export function updateCalendarSelection(dayOfYearToSelect, yearToSelect, triggeredByElement = null) {
    // NEW: When a day is selected, clear any active search/filter
    setCurrentCategoryFilter('All');
    setCurrentSearchTerm('');
    setIsSearchModeActive(false);
    document.getElementById('eventCategoryFilter').value = 'All'; // Reset dropdown
    document.getElementById('eventSearchInput').value = ''; // Clear search input

    setSelectedDayOfYear(dayOfYearToSelect);
    setSelectedYear(yearToSelect);

    document.querySelectorAll('.selected-day').forEach(el => {
        el.classList.remove('selected-day');
    });

    // 1. Apply selection to Traditional Calendar
    let traditionalTargetElement = null;
    const traditionalCalendarContainer = document.querySelector('.traditional-calendar');
    const traditionalDays = document.querySelectorAll('.traditional-calendar .day[data-year][data-month][data-day]');

    traditionalDays.forEach(dayElement => {
        const dayDate = new Date(
            parseInt(dayElement.dataset.year),
            parseInt(dayElement.dataset.month),
            parseInt(dayElement.dataset.day)
        );
        const calculatedDayOfYear = getDayOfYear(dayDate);

        if (calculatedDayOfYear === dayOfYearToSelect && parseInt(dayElement.dataset.year) === yearToSelect) {
            dayElement.classList.add('selected-day');
            traditionalTargetElement = dayElement;
        }
    });

    // 2. Apply selection to New Calendar
    let newCalendarTargetElement = null;
    const newCalendarContainer = document.querySelector('.new-calendar');
    const newCalendarElements = document.querySelectorAll('.new-calendar .day[data-day-of-year], .new-calendar .co-day[data-day-of-year]');

    newCalendarElements.forEach(element => {
        if (parseInt(element.dataset.dayOfYear) === dayOfYearToSelect && parseInt(element.dataset.year) === yearToSelect) {
            element.classList.add('selected-day');
            newCalendarTargetElement = element;
        }
    });

    // 3. Scroll the appropriate calendar to bring the selected element into view
    if (traditionalTargetElement && triggeredByElement !== traditionalCalendarContainer) {
        scrollToElement(traditionalCalendarContainer, traditionalTargetElement);
    }
    if (newCalendarTargetElement && triggeredByElement !== newCalendarContainer) {
        scrollToElement(newCalendarContainer, newCalendarTargetElement);
    }

    // 4. Update the displayed dates at the top of the screen
    updateDisplayedSelectedDate();

    // 5. Render events for the newly selected day (will now use updated 'events' object)
    renderEventsForSelectedDay(); // This call will now use the updated global state (not search mode)
}


// Function to update the date strings displayed at the top
function updateDisplayedSelectedDate() {
    const selectedTraditionalDateSpan = document.getElementById('selectedTraditionalDate');
    const selectedNewCalendarDateSpan = document.getElementById('selectedNewCalendarDate');
    const eventPanelDate = document.getElementById('eventPanelDate');

    if (selectedDayOfYear !== null && selectedYear !== null) {
        // CORRECTED LINE: This now correctly creates the date from the day of the year.
        const tempDate = new Date(selectedYear, 0, selectedDayOfYear);

        selectedTraditionalDateSpan.textContent = formatTraditionalDate(tempDate);
        const newCalFormat = getNewCalendarDate(selectedDayOfYear, selectedYear);
        selectedNewCalendarDateSpan.textContent = newCalFormat;
        eventPanelDate.textContent = `Events for ${newCalFormat}`;
    } else {
        selectedTraditionalDateSpan.textContent = '';
        selectedNewCalendarDateSpan.textContent = '';
        eventPanelDate.textContent = 'Select a date to view events';
    }
}


// Function to render both calendars for a given year
export function renderCalendars(year) {
    document.querySelector('.traditional-calendar').innerHTML = '';
    document.querySelector('.new-calendar').innerHTML = '';

    document.getElementById('currentYearDisplay').textContent = year;

    generateTraditionalCalendar(year);
    generateNewCalendar(year);

    const today = new Date();
    const dayOfYearForToday = getDayOfYear(today);

    if (year === today.getFullYear()) {
        updateCalendarSelection(dayOfYearForToday, year);
    } else {
        setSelectedDayOfYear(null);
        setSelectedYear(null);
        document.querySelectorAll('.selected-day').forEach(el => el.classList.remove('selected-day'));
        updateDisplayedSelectedDate();
        renderEventsForSelectedDay();
    }
}


// Traditional Calendar - now includes day of week headers
function generateTraditionalCalendar(year) {
    const container = document.querySelector('.traditional-calendar');
    const today = new Date();

    const grid = document.createElement('div');
    grid.className = 'traditional-grid';

    for (let month = 0; month < 12; month++) {
        const monthDiv = document.createElement('div');
        monthDiv.className = 'month';

        const monthName = new Date(year, month, 1)
            .toLocaleString('default', {
                month: 'long'
            });
        monthDiv.innerHTML = `<h3>${monthName}</h3>`;

        const daysGrid = document.createElement('div');
        daysGrid.className = 'month-grid';

        dayNames.forEach(dayName => {
            const header = document.createElement('div');
            header.className = 'day-of-week-header';
            header.textContent = dayName;
            daysGrid.appendChild(header);
        });


        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay();

        for (let i = 0; i < firstDay; i++) {
            daysGrid.appendChild(createDayElement(''));
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const dayElement = createDayElement(day);
            dayElement.dataset.year = year;
            dayElement.dataset.month = month;
            dayElement.dataset.day = day;
            const tempDate = new Date(year, month, day);
            dayElement.dataset.dayOfYear = getDayOfYear(tempDate);

            // Add tooltip for events
            const eventKey = `${year}-${dayElement.dataset.dayOfYear}`;
            if (events[eventKey] && events[eventKey].length > 0) {
                dayElement.classList.add('has-events');
                const tooltip = document.createElement('div');
                tooltip.className = 'day-tooltip';
                tooltip.innerHTML = events[eventKey].map(e => e.description).join('<br>');
                dayElement.appendChild(tooltip);
            }


            dayElement.addEventListener('click', function() {
                const clickedDate = new Date(
                    parseInt(this.dataset.year),
                    parseInt(this.dataset.month),
                    parseInt(this.dataset.day)
                );
                const dayOfYearClicked = getDayOfYear(clickedDate);
                updateCalendarSelection(dayOfYearClicked, parseInt(this.dataset.year), container);
            });

            if (month === today.getMonth() && day === today.getDate() && year === today.getFullYear()) {
                dayElement.classList.add('highlight');
            }
            daysGrid.appendChild(dayElement);
        }

        monthDiv.appendChild(daysGrid);
        grid.appendChild(monthDiv);
    }

    container.appendChild(grid);
}

// New Calendar
function generateNewCalendar(year) {
    const container = document.querySelector('.new-calendar');
    const today = new Date();

    let currentDayCounter = 1;

    phases.forEach((phase) => {
        const phaseGroup = document.createElement('div');
        phaseGroup.className = 'phase-group';

        const header = document.createElement('div');
        header.className = 'phase-header';
        header.textContent = `${phase.name} (${phase.short})`;
        phaseGroup.appendChild(header);

        const phaseRow = document.createElement('div');
        phaseRow.className = 'phase-row';

        const labelToColorNameMap = {
            'R': 'red', 'G': 'green', 'B': 'blue',
            'C': 'cyan', 'Y': 'yellow', 'V': 'violet'
        };

        ['Early', 'Late'].forEach(monthType => {
            const monthContainer = document.createElement('div');
            monthContainer.className = 'new-month-container';

            const monthShortName = (monthType === 'Early' ? 'E' : 'L') + phase.short;
            const title = document.createElement('div');
            title.className = 'month-title';
            title.textContent = `${monthType} ${phase.name} (${monthShortName})`;
            monthContainer.appendChild(title);

            const monthGrid = document.createElement('div');
            monthGrid.className = 'new-month';

            for (let i = 0; i < 6; i++) {
                const currentRowLabel = rowLabels[i];
                const backgroundColor = rowColors[currentRowLabel];

                const rowLabel = createDayElement(currentRowLabel);
                rowLabel.style.fontWeight = 'bold';
                rowLabel.style.border = 'none';
                rowLabel.style.backgroundColor = backgroundColor;
                monthGrid.appendChild(rowLabel);

                const rowColorName = labelToColorNameMap[currentRowLabel];

                for (let day = 1; day <= 6; day++) {
                    const dayElement = createDayElement(day);

                    if (rowColorName) {
                        dayElement.classList.add(`row-color-${rowColorName}`);
                    }

                    dayElement.dataset.dayOfYear = currentDayCounter;
                    dayElement.dataset.year = year;

                    const eventKey = `${year}-${dayElement.dataset.dayOfYear}`;
                    if (events[eventKey] && events[eventKey].length > 0) {
                        dayElement.classList.add('has-events');
                        const tooltip = document.createElement('div');
                        tooltip.className = 'day-tooltip';
                        tooltip.innerHTML = events[eventKey].map(e => e.description).join('<br>');
                        dayElement.appendChild(tooltip);
                    }

                    dayElement.addEventListener('click', function() {
                        const dayOfYearClicked = parseInt(this.dataset.dayOfYear);
                        const clickedYear = parseInt(this.dataset.year);
                        updateCalendarSelection(dayOfYearClicked, clickedYear, container);
                    });

                    if (currentDayCounter === getDayOfYear(today) && year === today.getFullYear()) {
                        dayElement.classList.add('highlight');
                    }
                    currentDayCounter++;
                    monthGrid.appendChild(dayElement);
                }
            }

            monthContainer.appendChild(monthGrid);
            phaseRow.appendChild(monthContainer);
        });

        phaseGroup.appendChild(phaseRow);
        container.appendChild(phaseGroup);

        const coContainer = document.createElement('div');
        coContainer.className = 'co-day-container';

        const coDay = createDayElement(phase.co);
        coDay.className = 'co-day';
        coDay.dataset.dayOfYear = currentDayCounter;
        coDay.dataset.year = year;

        const eventKey = `${year}-${coDay.dataset.dayOfYear}`;
        if (events[eventKey] && events[eventKey].length > 0) {
            coDay.classList.add('has-events');
            const tooltip = document.createElement('div');
            tooltip.className = 'day-tooltip';
            tooltip.innerHTML = events[eventKey].map(e => e.description).join('<br>');
            coDay.appendChild(tooltip);
        }

        coDay.addEventListener('click', function() {
            const dayOfYearClicked = parseInt(this.dataset.dayOfYear);
            const clickedYear = parseInt(this.dataset.year);
            updateCalendarSelection(dayOfYearClicked, clickedYear, container);
        });

        if (currentDayCounter === getDayOfYear(today) && year === today.getFullYear()) {
            coDay.classList.add('highlight');
        }
        currentDayCounter++;

        coContainer.appendChild(coDay);
        container.appendChild(coContainer);
    });

    // --- NEW CODE BLOCK TO HANDLE LEAP YEAR ---
    const isLeap = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
    if (isLeap) {
        const leapDayContainer = document.createElement('div');
        leapDayContainer.className = 'co-day-container';

        const leapDay = createDayElement('ICD');
        leapDay.className = 'co-day';
        leapDay.dataset.dayOfYear = 366;
        leapDay.dataset.year = year;

        leapDay.addEventListener('click', function() {
            const dayOfYearClicked = parseInt(this.dataset.dayOfYear);
            const clickedYear = parseInt(this.dataset.year);
            updateCalendarSelection(dayOfYearClicked, clickedYear, container);
        });

        const eventKey = `${year}-366`;
        if (events[eventKey] && events[eventKey].length > 0) {
            leapDay.classList.add('has-events');
            const tooltip = document.createElement('div');
            tooltip.className = 'day-tooltip';
            tooltip.innerHTML = events[eventKey].map(e => e.description).join('<br>');
            leapDay.appendChild(tooltip);
        }

        if (getDayOfYear(today) === 366 && year === today.getFullYear()) {
            leapDay.classList.add('highlight');
        }

        leapDayContainer.appendChild(leapDay);
        container.appendChild(leapDayContainer);
    }
}
