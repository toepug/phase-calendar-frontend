import {
    selectedDayOfYear,
    selectedYear,
    currentUserId,
    API_BASE_URL,
    events,
    setEvents,
    displayedYear,
    showToast,
    showConfirm,
    toggleLoading,
    displayInlineError,
    clearInlineError,
    eventCategories,
    currentCategoryFilter,
    currentSearchTerm,
    isSearchModeActive,
    setCurrentCategoryFilter,
    setCurrentSearchTerm,
    setIsSearchModeActive,
    getNewCalendarDate,
    getDayOfYear,
    phases
} from './utils.js';
import {
    updateCalendarSelection
} from './calendarRenderer.js';


/**
 * Helper function to determine if a day is a CO Day.
 * @param {number} dayOfYear - The day of the year (1-365 or 1-366).
 * @param {number} year - The year.
 * @returns {boolean} True if it's a CO Day, false otherwise.
 */
export function isCODay(dayOfYear, year) { // ADDED EXPORT
    const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
    const daysInYear = isLeapYear ? 366 : 365;

    // Check if the dayOfYear is one of the CO days
    for (let i = 0; i < phases.length; i++) {
        const phase = phases[i];
        let phaseEndDay; // The actual last day of the phase
        if (i < phases.length - 1) {
            phaseEndDay = phases[i + 1].startDay - 1;
        } else {
            phaseEndDay = daysInYear; // Last day of the year for the last phase
        }

        // The CO day is the last day of each phase.
        // The `phases` array uses `startDay` which is the FIRST day of a phase.
        // So, the CO Day for a phase is `phases[i+1].startDay - 1` (if not the last phase)
        // or `daysInYear` (if it's the last phase, Interphase).
        if (dayOfYear === phaseEndDay) {
            return true;
        }
    }
    return false;
}


/**
 * Updates event markers on both traditional and new calendars.
 * This function iterates through all events in the global 'events' object
 * and applies the 'has-events' class to the corresponding day elements.
 */
export function updateCalendarEventMarkers() { // ADDED EXPORT
    // Clear all existing event markers first
    document.querySelectorAll('.day.has-events, .co-day.has-events').forEach(el => {
        el.classList.remove('has-events');
        const tooltip = el.querySelector('.day-tooltip');
        if (tooltip) tooltip.remove(); // Remove old tooltips
    });

    // Iterate through the processed events and add markers
    for (const eventKey in events) {
        const [yearStr, dayStr] = eventKey.split('-');
        const eventYear = parseInt(yearStr);
        const eventDayOfYear = parseInt(dayStr);

        // Filter events for the current displayed year range
        if (eventYear >= displayedYear - 2 && eventYear <= displayedYear + 2) {
            const dayEvents = events[eventKey];

            if (dayEvents && dayEvents.length > 0) {
                // Traditional Calendar
                const traditionalDayElement = document.querySelector(`.traditional-calendar .day[data-year="${eventYear}"][data-day-of-year="${eventDayOfYear}"]`);
                if (traditionalDayElement) {
                    traditionalDayElement.classList.add('has-events');
                    const tooltip = document.createElement('div');
                    tooltip.className = 'day-tooltip';
                    tooltip.innerHTML = dayEvents.map(e => e.description).join('<br>');
                    traditionalDayElement.appendChild(tooltip);
                }

                // New Calendar (main days and CO days)
                const newCalendarDayElement = document.querySelector(`.new-calendar .day[data-year="${eventYear}"][data-day-of-year="${eventDayOfYear}"], .new-calendar .co-day[data-year="${eventYear}"][data-day-of-year="${eventDayOfYear}"]`);
                if (newCalendarDayElement) {
                    newCalendarDayElement.classList.add('has-events');
                    const tooltip = document.createElement('div');
                    tooltip.className = 'day-tooltip';
                    tooltip.innerHTML = dayEvents.map(e => e.description).join('<br>');
                    newCalendarDayElement.appendChild(tooltip);
                }
            }
        }
    }
}


/**
 * Populates a given select element with event categories.
 * @param {HTMLSelectElement} selectElement - The select element to populate.
 * @param {string} selectedValue - The value to mark as selected.
 * @param {boolean} includeAllOption - Whether to include an 'All' option.
 */
export function populateCategorySelect(selectElement, selectedValue = 'General', includeAllOption = false) {
    selectElement.innerHTML = ''; // Clear existing options

    if (includeAllOption) {
        const allOption = document.createElement('option');
        allOption.value = 'All';
        allOption.textContent = 'All Categories';
        selectElement.appendChild(allOption);
    }

    eventCategories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.name;
        option.textContent = category.name;
        option.style.backgroundColor = category.color;
        option.style.color = 'white'; // Ensure text is visible
        selectElement.appendChild(option);
    });

    selectElement.value = selectedValue;
}

/**
 * Renders the list of events for the currently selected day, applying filters and search terms.
 * This function now uses the global filter/search state and handles exceptions/modifications.
 */
export function renderEventsForSelectedDay() {
    const eventListElement = document.getElementById('eventList');
    const addEventForm = document.getElementById('addEventForm');
    const editEventForm = document.getElementById('editEventForm');
    const newEventCategorySelect = document.getElementById('newEventCategory');
    const editEventCategorySelect = document.getElementById('editEventCategory');
    const newEventFields = document.getElementById('newEventFields');
    const addEventBtn = document.getElementById('addEventBtn');
    const eventPanelDate = document.getElementById('eventPanelDate');

    eventListElement.innerHTML = '';
    editEventForm.classList.add('hidden');
    populateCategorySelect(newEventCategorySelect, 'General');
    populateCategorySelect(editEventCategorySelect, 'General');

    const editRecurrencePatternSelect = document.getElementById('editRecurrencePattern');
    const editNumberOfRepeatsInput = document.getElementById('editNumberOfRepeats');
    const editNumberOfRepeatsContainer = document.getElementById('editNumberOfRepeatsContainer');


    if (currentUserId === null || selectedDayOfYear === null || selectedYear === null) {
        addEventForm.classList.add('hidden');
    } else {
        addEventForm.classList.remove('hidden');
        newEventFields.classList.add('hidden');
        addEventBtn.textContent = 'Add Event';
        document.getElementById('newEventText').value = '';
        document.getElementById('newEventNotesTextarea').value = '';
        clearInlineError(document.getElementById('newEventText'));
        document.getElementById('newEventCategory').value = 'General';
        // Reset recurrence fields for add form
        document.getElementById('newRecurrencePattern').value = 'none';
        document.getElementById('newNumberOfRepeats').value = '';
        document.getElementById('newNumberOfRepeatsContainer').classList.add('hidden');

        const newRecurrencePatternSelect = document.getElementById('newRecurrencePattern');
        if (newRecurrencePatternSelect) {
            newRecurrencePatternSelect.innerHTML = ''; // Clear existing options
            const noneOption = document.createElement('option');
            noneOption.value = 'none';
            noneOption.textContent = 'None';
            newRecurrencePatternSelect.appendChild(noneOption);

            if (selectedDayOfYear !== null && selectedYear !== null && isCODay(selectedDayOfYear, selectedYear)) {
                const phaselyOption = document.createElement('option');
                phaselyOption.value = 'phasely';
                phaselyOption.textContent = 'Phasely';
                newRecurrencePatternSelect.appendChild(phaselyOption);

                const yearlyOption = document.createElement('option');
                yearlyOption.value = 'yearly';
                yearlyOption.textContent = 'Yearly';
                newRecurrencePatternSelect.appendChild(yearlyOption);
            } else {
                const weeklyOption = document.createElement('option');
                weeklyOption.value = 'weekly';
                weeklyOption.textContent = 'Weekly';
                newRecurrencePatternSelect.appendChild(weeklyOption);

                const subphaselyOption = document.createElement('option');
                subphaselyOption.value = 'subphasely';
                subphaselyOption.textContent = 'Subphasely';
                newRecurrencePatternSelect.appendChild(subphaselyOption);

                const phaselyOption = document.createElement('option');
                phaselyOption.value = 'phasely';
                phaselyOption.textContent = 'Phasely';
                newRecurrencePatternSelect.appendChild(phaselyOption);

                const yearlyOption = document.createElement('option');
                yearlyOption.value = 'yearly';
                yearlyOption.textContent = 'Yearly';
                newRecurrencePatternSelect.appendChild(yearlyOption);
            }
        }
    }

    let filteredEvents = [];
    let panelTitle = '';

    // Events are now stored with keys like "2025-1", and their values are arrays of event objects.
    // Each event object might be a master event, a generated instance, or a modified instance.
    // The `fetchAndRenderEvents` function is responsible for populating `events` with the correctly
    // filtered and modified set for the `displayedYear` (and surrounding years for recurrence expansion).

    if (isSearchModeActive) {
        panelTitle = `Search Results for "${currentSearchTerm}"`;
        const lowerCaseSearchTerm = currentSearchTerm.toLowerCase();

        // Iterate through all "expanded" events
        for (const eventKey in events) {
            const [yearStr] = eventKey.split('-');
            const eventYear = parseInt(yearStr);

            // If a user is logged in, only search events within the displayed year.
            // If guest, search all expanded events (which would be for the displayed year by default unless modified).
            // For search mode, we include events from any year that have been expanded.
            if (currentUserId !== null) { // If logged in, search only events related to displayed year for performance
                 if (eventYear >= displayedYear -2 && eventYear <= displayedYear + 2) { // Search expanded range
                    events[eventKey].forEach(eventObj => {
                        const matchesCategory = (currentCategoryFilter === 'All' || eventObj.category === currentCategoryFilter);
                        const matchesSearch = (
                            (eventObj.description || '').toLowerCase().includes(lowerCaseSearchTerm) ||
                            (eventObj.notes || '').toLowerCase().includes(lowerCaseSearchTerm)
                        );
                        if (matchesCategory && matchesSearch) {
                            filteredEvents.push({ ...eventObj, displayDate: getNewCalendarDate(parseInt(eventKey.split('-')[1]), eventYear) });
                        }
                    });
                 }
            } else { // Guest mode, only events generated for current year will be in 'events'
                events[eventKey].forEach(eventObj => {
                    const matchesCategory = (currentCategoryFilter === 'All' || eventObj.category === currentCategoryFilter);
                    const matchesSearch = (
                        (eventObj.description || '').toLowerCase().includes(lowerCaseSearchTerm) ||
                        (eventObj.notes || '').toLowerCase().includes(lowerCaseSearchTerm)
                    );
                    if (matchesCategory && matchesSearch) {
                        filteredEvents.push({ ...eventObj, displayDate: getNewCalendarDate(parseInt(eventKey.split('-')[1]), eventYear) });
                    }
                });
            }
        }
        filteredEvents.sort((a, b) => {
            const dateA = new Date(parseInt(a.event_key.split('-')[0]), 0);
            dateA.setDate(parseInt(a.event_key.split('-')[1]));
            const dateB = new Date(parseInt(b.event_key.split('-')[0]), 0);
            dateB.setDate(parseInt(b.event_key.split('-')[1]));
            return dateA - dateB;
        });

    } else if (selectedDayOfYear !== null && selectedYear !== null) {
        // Normal day selection mode: Filter events for the selected day
        const tempDate = new Date(selectedYear, 0);
        tempDate.setDate(selectedDayOfYear);
        panelTitle = `Events for ${getNewCalendarDate(selectedDayOfYear, selectedYear)}`;

        const eventKey = `${selectedYear}-${selectedDayOfYear}`;
        let dayEvents = events[eventKey] || [];

        const lowerCaseSearchTerm = currentSearchTerm.toLowerCase(); // Apply search/filter even in day view
        dayEvents = dayEvents.filter(eventObj => {
            const matchesCategory = (currentCategoryFilter === 'All' || eventObj.category === currentCategoryFilter);
            const matchesSearch = (
                (eventObj.description || '').toLowerCase().includes(lowerCaseSearchTerm) ||
                (eventObj.notes || '').toLowerCase().includes(lowerCaseSearchTerm)
            );
            return matchesCategory && matchesSearch;
        });
        filteredEvents = dayEvents;

    } else {
        eventListElement.innerHTML = '<li class="no-events">No date selected.</li>';
        eventPanelDate.textContent = 'Select a date to view events';
        return;
    }

    eventPanelDate.textContent = panelTitle;

    if (filteredEvents.length === 0) {
        if (currentUserId !== null) {
            eventListElement.innerHTML = '<li class="no-events">No events for this date. Click "Add Event" below to create one!</li>';
            if (isSearchModeActive) {
                eventListElement.innerHTML = `<li class="no-events">No events found matching your criteria.</li>`;
            }
        } else {
            eventListElement.innerHTML = '<li class="no-events">No events for this date.</li>';
            const loginPrompt = document.createElement('li');
            loginPrompt.className = 'no-events login-prompt-message';
            loginPrompt.innerHTML = 'Please <a id="eventPanelLoginLink" style="cursor:pointer; text-decoration:underline;">login</a> to add and view your events.';
            eventListElement.appendChild(loginPrompt);
            document.getElementById('eventPanelLoginLink').addEventListener('click', () => {
                document.getElementById('appContent').classList.add('hidden');
                document.getElementById('authSection').classList.remove('hidden');
                document.getElementById('loginFormContainer').classList.remove('hidden');
                document.getElementById('signupFormContainer').classList.add('hidden');
            });
        }
    } else {
        filteredEvents.forEach(eventObj => {
            const listItem = document.createElement('li');
            listItem.className = 'event-item';
            // NEW: Use eventObj.id for master, or eventObj.tempInstanceId for modified instances
            // This is crucial for distinguishing between master and modified instances in the UI
            // and linking back to the correct backend endpoint.
            listItem.dataset.eventId = eventObj.id; // Master event ID OR Modification ID
            listItem.dataset.eventKey = eventObj.event_key; // For instance-specific actions

            const eventHeaderRow = document.createElement('div');
            eventHeaderRow.className = 'event-header-row';

            const titleElement = document.createElement('p');
            titleElement.innerHTML = `<strong>${eventObj.description}</strong>` +
                                     (eventObj.displayDate ? `<span class="event-date-in-search"> (${eventObj.displayDate})</span>` : '');
            titleElement.style.cursor = 'pointer';

            if (isSearchModeActive) {
                titleElement.addEventListener('click', () => {
                    const [yearStr, dayStr] = eventObj.event_key.split('-');
                    updateCalendarSelection(parseInt(dayStr), parseInt(yearStr));
                });
            } else {
                titleElement.addEventListener('click', () => {
                    const inlineNotesDiv = listItem.querySelector('.event-notes-inline');
                    if (inlineNotesDiv) {
                        inlineNotesDiv.classList.toggle('hidden');
                    }
                });
            }
            eventHeaderRow.appendChild(titleElement);

            if (eventObj.category) {
                const categoryTag = document.createElement('span');
                categoryTag.className = `event-category-tag category-${eventObj.category.replace(/\s/g, '')}`;
                categoryTag.textContent = eventObj.category;
                titleElement.appendChild(categoryTag);
            }

            // Display recurrence pattern if not 'none' and not in search mode
            if (eventObj.recurrence_pattern && eventObj.recurrence_pattern !== 'none') {
                const recurrenceTag = document.createElement('span');
                recurrenceTag.className = 'event-category-tag category-Recurrence';
                recurrenceTag.textContent = `Repeats: ${eventObj.recurrence_pattern}`;
                if (eventObj.number_of_repeats) {
                    recurrenceTag.textContent += ` (${eventObj.number_of_repeats} times)`;
                }
                titleElement.appendChild(recurrenceTag);

                // Add a visual indicator for recurring instances
                if (eventObj.isRecurringInstance) {
                    const instanceIndicator = document.createElement('i');
                    instanceIndicator.className = 'fa-solid fa-arrows-rotate recurring-instance-icon';
                    instanceIndicator.title = 'Recurring Event Instance';
                    titleElement.appendChild(instanceIndicator);
                }
            }
            // NEW: Indicator for Modified Instances
            if (eventObj.isModifiedInstance) {
                const modifiedIndicator = document.createElement('i');
                modifiedIndicator.className = 'fa-solid fa-pencil-ruler modified-instance-icon'; // A different icon for modification
                modifiedIndicator.title = 'Modified Event Instance';
                titleElement.appendChild(modifiedIndicator);
            }


            // Conditionally create and append action buttons (view/edit/delete)
            if (!isSearchModeActive) {
                const actionsDiv = document.createElement('div');
                actionsDiv.className = 'event-actions';

                const viewIcon = document.createElement('i');
                viewIcon.className = 'fa-solid fa-eye view-event-icon';
                viewIcon.title = 'View Notes Inline';
                viewIcon.style.cursor = 'pointer';
                actionsDiv.appendChild(viewIcon);

                viewIcon.addEventListener('click', () => {
                    const inlineNotesDiv = listItem.querySelector('.event-notes-inline');
                    if (inlineNotesDiv) {
                        inlineNotesDiv.classList.toggle('hidden');
                    }
                });

                const editIcon = document.createElement('i');
                editIcon.className = 'fa-solid fa-pen-to-square edit-event-icon';
                editIcon.title = 'Edit Event'; // More general title
                editIcon.style.cursor = 'pointer';

                // Pass all necessary data for editing, including flags for master vs. instance
                editIcon.dataset.originalEventId = eventObj.originalEventId || eventObj.id; // Master ID
                editIcon.dataset.eventKey = eventObj.event_key; // Current instance's event key
                editIcon.dataset.isRecurringMaster = eventObj.isRecurringMaster ? 'true' : 'false';
                editIcon.dataset.isRecurringInstance = eventObj.isRecurringInstance ? 'true' : 'false';
                editIcon.dataset.isModifiedInstance = eventObj.isModifiedInstance ? 'true' : 'false';

                editIcon.dataset.eventTitle = eventObj.description;
                editIcon.dataset.eventNotes = eventObj.notes || '';
                editIcon.dataset.eventCategory = eventObj.category || 'General';
                editIcon.dataset.recurrencePattern = eventObj.recurrence_pattern || 'none'; // Only relevant for master
                editIcon.dataset.numberOfRepeats = eventObj.number_of_repeats || ''; // Only relevant for master

                editIcon.addEventListener('click', function() {
                    // Decide which edit function to call based on event type
                    const isMaster = this.dataset.isRecurringMaster === 'true' && this.dataset.isRecurringInstance === 'false';
                    const isModified = this.dataset.isModifiedInstance === 'true';

                    if (isMaster) {
                        // Editing the master event, will affect all future occurrences
                        showToast('Editing this master event will update all its recurring occurrences.', 'info');
                        showEditMasterEvent(
                            parseInt(this.dataset.originalEventId),
                            this.dataset.eventNotes,
                            this.dataset.eventTitle,
                            this.dataset.eventCategory,
                            this.dataset.recurrencePattern,
                            this.dataset.numberOfRepeats
                        );
                    } else if (isModified) {
                         // Editing an already modified instance, just update its modification
                        showToast('You are editing a single modified instance.', 'info');
                        showEditSingleInstance(
                            parseInt(this.dataset.originalEventId),
                            this.dataset.eventKey,
                            this.dataset.eventNotes,
                            this.dataset.eventTitle,
                            this.dataset.eventCategory
                        );
                    } else {
                        // Editing a regular recurring instance (not yet modified)
                        // This will create a new modification for this specific instance
                        showToast('Editing this recurring event instance will create a single-day modification.', 'info');
                        showEditSingleInstance(
                            parseInt(this.dataset.originalEventId),
                            this.dataset.eventKey,
                            this.dataset.eventNotes, // Pass the current notes of the instance
                            this.dataset.eventTitle, // Pass the current description of the instance
                            this.dataset.eventCategory // Pass the current category of the instance
                        );
                    }
                });
                actionsDiv.appendChild(editIcon);

                const deleteButton = document.createElement('button');
                deleteButton.className = 'delete-event';
                deleteButton.textContent = 'x';
                deleteButton.title = 'Delete Event';

                deleteButton.dataset.originalEventId = eventObj.originalEventId || eventObj.id;
                deleteButton.dataset.eventKey = eventObj.event_key;
                deleteButton.dataset.isRecurringMaster = eventObj.isRecurringMaster ? 'true' : 'false';
                deleteButton.dataset.isRecurringInstance = eventObj.isRecurringInstance ? 'true' : 'false';
                deleteButton.dataset.isModifiedInstance = eventObj.isModifiedInstance ? 'true' : 'false';

                deleteButton.addEventListener('click', async (event) => {
                    event.preventDefault();
                    const isMaster = deleteButton.dataset.isRecurringMaster === 'true';
                    const isInstance = deleteButton.dataset.isRecurringInstance === 'true';
                    const isModified = deleteButton.dataset.isModifiedInstance === 'true';

                    if (isMaster) {
                        await deleteMasterEvent(
                            parseInt(deleteButton.dataset.originalEventId),
                            deleteButton
                        );
                    } else if (isInstance || isModified) {
                        // Both regular instances and modified instances are deleted as exceptions
                        await deleteRecurringInstance(
                            parseInt(deleteButton.dataset.originalEventId),
                            deleteButton.dataset.eventKey,
                            deleteButton
                        );
                    }
                });
                actionsDiv.appendChild(deleteButton);

                eventHeaderRow.appendChild(actionsDiv);
            }

            listItem.appendChild(eventHeaderRow);

            const inlineNotesDiv = document.createElement('div');
            inlineNotesDiv.className = 'event-notes-inline hidden';
            inlineNotesDiv.textContent = eventObj.notes || 'No notes available for this event.';
            listItem.appendChild(inlineNotesDiv);

            eventListElement.appendChild(listItem);
        });
    }
}


/**
 * Displays the edit master event form.
 * This is for editing the *series* of a recurring event, or a single non-recurring event.
 * @param {number} eventId - The ID of the master event.
 * @param {string} currentNotes
 * @param {string} currentDescription
 * @param {string} currentCategory
 * @param {string} currentRecurrencePattern
 * @param {number|null} currentNumberOfRepeats
 */
function showEditMasterEvent(eventId, currentNotes, currentDescription, currentCategory, currentRecurrencePattern, currentNumberOfRepeats) {
    if (currentUserId === null) {
        showToast('Please log in to edit event notes.', 'info');
        return;
    }

    document.getElementById('addEventForm').classList.add('hidden');
    document.getElementById('editEventForm').classList.remove('hidden');

    document.getElementById('editingEventIdDisplay').innerHTML = `Edit Event: "<strong>${currentDescription}</strong>"`;
    document.getElementById('editEventDescription').value = currentDescription;
    document.getElementById('eventNotesTextarea').value = currentNotes;
    populateCategorySelect(document.getElementById('editEventCategory'), currentCategory);

    // Show recurrence options for master events
    document.getElementById('editRecurrenceOptionsContainer').classList.remove('hidden');

    const editRecurrencePatternSelect = document.getElementById('editRecurrencePattern');
    const editNumberOfRepeatsInput = document.getElementById('editNumberOfRepeats');
    const editNumberOfRepeatsContainer = document.getElementById('editNumberOfRepeatsContainer');

    // Dynamically adjust recurrence options based on whether original event day is a CO day
    if (editRecurrencePatternSelect) {
        editRecurrencePatternSelect.innerHTML = ''; // Clear existing options
        const noneOption = document.createElement('option');
        noneOption.value = 'none';
        noneOption.textContent = 'None';
        editRecurrencePatternSelect.appendChild(noneOption);

        let originalEventInState = null;
        for (const key in events) {
            const foundEvent = events[key].find(e => e.id === eventId && e.isRecurringMaster); // Find the actual master event
            if (foundEvent) {
                originalEventInState = foundEvent;
                break;
            }
        }

        let eventDayToDetermineType = null;
        let eventYearToDetermineType = null;

        if (originalEventInState) {
            const [yearStr, dayStr] = originalEventInState.event_key.split('-');
            eventYearToDetermineType = parseInt(yearStr);
            eventDayToDetermineType = parseInt(dayStr);
        } else {
            // Fallback: if original event not found in current events cache, use selected day
            eventDayToDetermineType = selectedDayOfYear;
            eventYearToDetermineType = selectedYear;
        }

        if (eventDayToDetermineType !== null && eventYearToDetermineType !== null && isCODay(eventDayToDetermineType, eventYearToDetermineType)) {
            const phaselyOption = document.createElement('option');
            phaselyOption.value = 'phasely';
            phaselyOption.textContent = 'Phasely';
            editRecurrencePatternSelect.appendChild(phaselyOption);

            const yearlyOption = document.createElement('option');
            yearlyOption.value = 'yearly';
            yearlyOption.textContent = 'Yearly';
            editRecurrencePatternSelect.appendChild(yearlyOption);
        } else {
            const weeklyOption = document.createElement('option');
            weeklyOption.value = 'weekly';
            weeklyOption.textContent = 'Weekly';
            editRecurrencePatternSelect.appendChild(weeklyOption);

            const subphaselyOption = document.createElement('option');
            subphaselyOption.value = 'subphasely';
            subphaselyOption.textContent = 'Subphasely';
            editRecurrencePatternSelect.appendChild(subphaselyOption);

            const phaselyOption = document.createElement('option');
            phaselyOption.value = 'phasely';
            phaselyOption.textContent = 'Phasely';
            editRecurrencePatternSelect.appendChild(phaselyOption);

            const yearlyOption = document.createElement('option');
            yearlyOption.value = 'yearly';
            yearlyOption.textContent = 'Yearly';
            editRecurrencePatternSelect.appendChild(yearlyOption);
        }
    }

    editRecurrencePatternSelect.value = currentRecurrencePattern || 'none';
    editNumberOfRepeatsInput.value = currentNumberOfRepeats || '';

    if (currentRecurrencePattern && currentRecurrencePattern !== 'none') {
        editNumberOfRepeatsContainer.classList.remove('hidden');
    } else {
        editNumberOfRepeatsContainer.classList.add('hidden');
    }

    document.getElementById('editEventDescription').focus();

    const saveNotesBtn = document.getElementById('saveNotesBtn');
    const cancelNotesBtn = document.getElementById('cancelNotesBtn');

    // Set dataset for save button to know it's a master event save
    saveNotesBtn.dataset.saveMode = 'master';
    saveNotesBtn.dataset.eventId = eventId;
    saveNotesBtn.onclick = async () => {
        await saveEventNotes(saveNotesBtn);
    };
    cancelNotesBtn.onclick = hideEditEventNotes;
}

/**
 * Displays the edit form for a *single instance* of a recurring event.
 * This will create a modification entry in the database.
 * @param {number} originalEventId - The ID of the original recurring master event.
 * @param {string} eventKey - The YYYY-DDD key of the specific instance being modified.
 * @param {string} currentNotes - The current notes content for this instance.
 * @param {string} currentDescription - The current description for this instance.
 * @param {string} currentCategory - The current category for this instance.
 */
function showEditSingleInstance(originalEventId, eventKey, currentNotes, currentDescription, currentCategory) {
    if (currentUserId === null) {
        showToast('Please log in to edit event notes.', 'info');
        return;
    }

    document.getElementById('addEventForm').classList.add('hidden');
    document.getElementById('editEventForm').classList.remove('hidden');

    document.getElementById('editingEventIdDisplay').innerHTML = `Edit Instance: "<strong>${currentDescription}</strong>" on ${getNewCalendarDate(parseInt(eventKey.split('-')[1]), parseInt(eventKey.split('-')[0]))}`;
    document.getElementById('editEventDescription').value = currentDescription;
    document.getElementById('eventNotesTextarea').value = currentNotes;
    populateCategorySelect(document.getElementById('editEventCategory'), currentCategory);

    // Hide recurrence options for instance edits
    document.getElementById('editRecurrenceOptionsContainer').classList.add('hidden');

    document.getElementById('editEventDescription').focus();

    const saveNotesBtn = document.getElementById('saveNotesBtn');
    const cancelNotesBtn = document.getElementById('cancelNotesBtn');

    // Set dataset for save button to know it's an instance save
    saveNotesBtn.dataset.saveMode = 'instance';
    saveNotesBtn.dataset.originalEventId = originalEventId;
    saveNotesBtn.dataset.eventKey = eventKey;
    saveNotesBtn.onclick = async () => {
        await saveEventNotes(saveNotesBtn);
    };
    cancelNotesBtn.onclick = hideEditEventNotes;
}

/**
 * Hides the edit notes form and re-displays the add event form.
 * Clears the textarea and removes temporary event listeners.
 */
function hideEditEventNotes() {
    document.getElementById('editEventForm').classList.add('hidden');
    if (currentUserId !== null) {
        document.getElementById('addEventForm').classList.remove('hidden');
    }
    document.getElementById('editEventDescription').value = '';
    clearInlineError(document.getElementById('editEventDescription'));
    document.getElementById('eventNotesTextarea').value = '';
    document.getElementById('editingEventIdDisplay').textContent = '';
    document.getElementById('editEventCategory').value = 'General';
    // Reset recurrence fields for edit form, and hide the container
    document.getElementById('editRecurrencePattern').value = 'none';
    document.getElementById('editNumberOfRepeats').value = '';
    document.getElementById('editNumberOfRepeatsContainer').classList.add('hidden');
    document.getElementById('editRecurrenceOptionsContainer').classList.remove('hidden'); // Ensure visible for next master edit

    // Clear save mode and event data from button
    const saveNotesBtn = document.getElementById('saveNotesBtn');
    delete saveNotesBtn.dataset.saveMode;
    delete saveNotesBtn.dataset.eventId;
    delete saveNotesBtn.dataset.originalEventId;
    delete saveNotesBtn.dataset.eventKey;

    saveNotesBtn.onclick = null;
    document.getElementById('cancelNotesBtn').onclick = null;
}

/**
 * Saves event details to the backend via API, handling both master events and single instances.
 * @param {HTMLElement} buttonElement - The button element that triggered the save (for loading state).
 */
export async function saveEventNotes(buttonElement) {
    const saveMode = buttonElement.dataset.saveMode; // 'master' or 'instance'

    const description = document.getElementById('editEventDescription').value.trim();
    const notes = document.getElementById('eventNotesTextarea').value.trim();
    const category = document.getElementById('editEventCategory').value;

    clearInlineError(document.getElementById('editEventDescription'));

    if (currentUserId === null) {
        showToast('You must be logged in to edit events.', 'info');
        return;
    }
    if (!description || description.length < 1 || description.length > 255) {
        displayInlineError(document.getElementById('editEventDescription'), 'Description must be between 1 and 255 characters.');
        return;
    }
    if (notes.length > 1000) {
        showToast('Notes cannot exceed 1000 characters.', 'error');
        return;
    }

    let url;
    let payload;
    let successMessage;
    let errorMessage;

    if (saveMode === 'master') {
        const eventIdToSave = parseInt(buttonElement.dataset.eventId);
        if (isNaN(eventIdToSave)) {
            showToast('No master event selected for editing.', 'error');
            return;
        }
        const recurrencePattern = document.getElementById('editRecurrencePattern').value;
        const numberOfRepeatsInput = document.getElementById('editNumberOfRepeats');
        const numberOfRepeats = recurrencePattern !== 'none' ? parseInt(numberOfRepeatsInput.value) : null;

        if (recurrencePattern !== 'none' && (isNaN(numberOfRepeats) || numberOfRepeats < 1)) {
            displayInlineError(numberOfRepeatsInput, 'Number of repeats must be a positive number.');
            return;
        }

        url = `${API_BASE_URL}/events/${eventIdToSave}`;
        payload = {
            userId: currentUserId,
            description: description,
            notes: notes,
            category: category,
            recurrencePattern: recurrencePattern,
            numberOfRepeats: numberOfRepeats
        };
        successMessage = 'Master event saved successfully!';
        errorMessage = 'Failed to save master event:';

    } else if (saveMode === 'instance') {
        const originalEventId = parseInt(buttonElement.dataset.originalEventId);
        const eventKey = buttonElement.dataset.eventKey; // YYYY-DDD
        if (isNaN(originalEventId) || !eventKey) {
            showToast('No event instance selected for editing.', 'error');
            return;
        }

        url = `${API_BASE_URL}/events/instance/${originalEventId}/${eventKey}`;
        payload = {
            userId: currentUserId,
            description: description,
            notes: notes,
            category: category
        };
        successMessage = 'Event instance saved successfully!';
        errorMessage = 'Failed to save event instance:';

    } else {
        showToast('Invalid save mode.', 'error');
        return;
    }

    toggleLoading(buttonElement, true, 'Save Changes');

    try {
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (response.ok) {
            showToast(data.message || successMessage, 'success');
            hideEditEventNotes();
            await fetchAndRenderEvents(displayedYear);
        } else {
            showToast(`${errorMessage} ${data.message || 'Unknown error'}`, 'error');
        }
    } catch (error) {
        console.error('Error saving changes:', error);
        showToast('An error occurred while saving the changes. Check backend server connection.', 'error');
    } finally {
        toggleLoading(buttonElement, false);
    }
}

/**
 * Adds a new event to the backend via API. This always creates a master event.
 * @returns {Promise<boolean>} True if the event was added successfully, false otherwise.
 */
export async function addEvent() {
    const newEventTextInput = document.getElementById('newEventText');
    const newEventNotesTextarea = document.getElementById('newEventNotesTextarea');
    const newEventCategorySelect = document.getElementById('newEventCategory');
    const newRecurrencePatternSelect = document.getElementById('newRecurrencePattern');
    const newNumberOfRepeatsInput = document.getElementById('newNumberOfRepeats');

    const description = newEventTextInput.value.trim();
    const notes = newEventNotesTextarea.value.trim();
    const category = newEventCategorySelect.value;
    const recurrencePattern = newRecurrencePatternSelect.value;
    const numberOfRepeats = recurrencePattern !== 'none' ? parseInt(newNumberOfRepeatsInput.value) : null;

    clearInlineError(newEventTextInput);

    if (currentUserId === null) {
        showToast('You must be logged in to add events.', 'info');
        return false;
    }

    if (!description) {
        displayInlineError(newEventTextInput, 'Event name is required.');
        return false;
    }
    if (description.length > 255) {
        displayInlineError(newEventTextInput, 'Event name cannot exceed 255 characters.');
        return false;
    }
    if (notes.length > 1000) {
        showToast('Notes cannot exceed 1000 characters.', 'error');
        return false;
    }
    if (recurrencePattern !== 'none' && (isNaN(numberOfRepeats) || numberOfRepeats < 1)) {
        displayInlineError(newNumberOfRepeatsInput, 'Number of repeats must be a positive number.');
        return false;
    }

    if (selectedDayOfYear === null || selectedYear === null) {
        showToast('Please select a date on the calendar first.', 'error');
        return false;
    }

    const eventKey = `${selectedYear}-${selectedDayOfYear}`;

    const payload = {
        userId: currentUserId,
        eventKey: eventKey,
        description: description,
        notes: notes,
        category: category,
        recurrencePattern: recurrencePattern,
        numberOfRepeats: numberOfRepeats
    };

    let success = false;
    try {
        const response = await fetch(`${API_BASE_URL}/events`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (response.ok) {
            showToast(data.message || 'Event added successfully!', 'success');
            // Re-fetch and re-render events to include the new event and its potential occurrences
            await fetchAndRenderEvents(displayedYear);
            success = true;
        } else {
            showToast(data.message || 'Failed to add event.', 'error');
            success = false;
        }
    } catch (error) {
        console.error("Error adding event:", error);
        showToast('An error occurred while adding the event. Check backend server connection.', 'error');
        success = false;
    }
    return success;
}


/**
 * Deletes a master event from the backend via API.
 * This will delete the event and all its recurring instances, exceptions, and modifications.
 * @param {number} eventId - The ID of the master event to delete.
 * @param {HTMLElement} buttonElement - The button element that triggered the deletion.
 */
export async function deleteMasterEvent(eventId, buttonElement) {
    if (currentUserId === null) {
        showToast('Please log in to delete events.', 'info');
        return;
    }
    if (isNaN(eventId)) {
        console.error('Invalid eventId:', eventId);
        showToast('Invalid event data. Please try again.', 'error');
        return;
    }

    const confirmed = await showConfirm('Are you sure you want to delete this master event and ALL its recurring occurrences/modifications? This cannot be undone.');
    if (!confirmed) {
        toggleLoading(buttonElement, false, 'x');
        return;
    }

    showToast('Deleting event series...', 'info');
    toggleLoading(buttonElement, true, 'x');

    try {
        const response = await fetch(`${API_BASE_URL}/events/${eventId}?userId=${currentUserId}`, {
            method: 'DELETE',
            headers: {
                'Accept': 'application/json'
            }
        });
        let data = {};
        let responseText = '';
        try {
            responseText = await response.text();
            data = JSON.parse(responseText);
        } catch (jsonError) {
            console.error('Error parsing JSON response:', jsonError, 'Response text:', responseText.slice(0, 200));
            data = { message: 'Invalid response from server' };
        }
        if (response.ok) {
            showToast(data.message || 'Event series deleted successfully!', 'success');
            await fetchAndRenderEvents(displayedYear);
        } else {
            console.error('Failed to delete master event:', {
                status: response.status,
                statusText: response.statusText,
                body: responseText.slice(0, 200)
            });
            showToast(`Failed to delete master event: ${data.message || response.statusText || 'Unknown error'}`, 'error');
        }
    } catch (error) {
        console.error('Error deleting master event:', error);
        showToast('An error occurred while deleting the master event. Check backend server connection.', 'error');
    } finally {
        toggleLoading(buttonElement, false, 'x');
    }
}

/**
 * Deletes a specific recurring event instance by adding it as an exception.
 * @param {number} originalEventId - The ID of the master recurring event.
 * @param {string} eventKey - The YYYY-DDD key of the instance to delete/exclude.
 * @param {HTMLElement} buttonElement - The button element that triggered the deletion.
 */
export async function deleteRecurringInstance(originalEventId, eventKey, buttonElement) {
    if (currentUserId === null) {
        showToast('Please log in to delete events.', 'info');
        return;
    }
    if (isNaN(originalEventId) || !eventKey) {
        console.error('Invalid originalEventId or eventKey:', { originalEventId, eventKey });
        showToast('Invalid event data. Please try again.', 'error');
        return;
    }

    const confirmed = await showConfirm('Are you sure you want to delete ONLY this occurrence of the recurring event? It will no longer appear on this date.');
    if (!confirmed) {
        toggleLoading(buttonElement, false, 'x');
        return;
    }

    showToast('Deleting event occurrence...', 'info');
    toggleLoading(buttonElement, true, 'x');

    try {
        const response = await fetch(`${API_BASE_URL}/events/instance/${originalEventId}/${eventKey}?userId=${currentUserId}`, {
            method: 'DELETE',
            headers: {
                'Accept': 'application/json'
            }
        });
        let data = {};
        let responseText = '';
        try {
            responseText = await response.text();
            data = JSON.parse(responseText);
        } catch (jsonError) {
            console.error('Error parsing JSON response for instance deletion:', jsonError, 'Response text:', responseText.slice(0, 200));
            data = { message: 'Invalid response from server' };
        }
        if (response.ok) {
            showToast(data.message || 'Event occurrence deleted successfully!', 'success');
            await fetchAndRenderEvents(displayedYear);
        } else {
            console.error('Failed to delete event instance:', {
                status: response.status,
                statusText: response.statusText,
                body: responseText.slice(0, 200)
            });
            showToast(`Failed to delete event occurrence: ${data.message || response.statusText || 'Unknown error'}`, 'error');
        }
    } catch (error) {
        console.error('Error deleting event instance:', error);
        showToast('An error occurred while deleting the event occurrence. Check backend server connection.', 'error');
    } finally {
        toggleLoading(buttonElement, false, 'x');
    }
}

/**
 * Calculates the next occurrence of a recurring event.
 * @param {Date} currentDate The date of the current event occurrence.
 * @param {string} recurrencePattern The recurrence pattern ('weekly', 'subphasely', 'phasely', 'yearly').
 * @param {string} originalEventKey The original event key (e.g., '2025-1'). This is used for context like original phase/subphase.
 * @returns {Date|null} The date of the next occurrence, or null if no next occurrence.
 */
function calculateNextOccurrence(currentDate, recurrencePattern, originalEventKey) {
    let nextDate = new Date(currentDate);
    const currentDayOfYear = getDayOfYear(currentDate);
    const currentYear = currentDate.getFullYear();
    const isLeapYear = (currentYear % 4 === 0 && currentYear % 100 !== 0) || (currentYear % 400 === 0);
    const daysInCurrentYear = isLeapYear ? 366 : 365;

    const [originalYear, originalDayOfYear] = originalEventKey.split('-').map(Number);

    let originalPhaseInfo = null;
    let originalPhaseIndex = -1;
    let originalDayOffsetInPhase = 0;

    for (let i = 0; i < phases.length; i++) {
        const phase = phases[i];
        let phaseLogicalEndDay;
        if (i < phases.length - 1) {
            phaseLogicalEndDay = phases[i + 1].startDay - 1;
        } else {
            phaseLogicalEndDay = isLeapYear ? 366 : 365;
        }

        if (originalDayOfYear >= phase.startDay && originalDayOfYear <= phaseLogicalEndDay) {
            originalPhaseInfo = phase;
            originalPhaseIndex = i;
            originalDayOffsetInPhase = originalDayOfYear - phase.startDay;
            break;
        }
    }

    switch (recurrencePattern) {
        case 'weekly':
            nextDate.setDate(currentDate.getDate() + 6);
            break;

        case 'subphasely':
            if (!originalPhaseInfo) {
                return null;
            }

            let originalSubphaseType = -1;
            if (originalDayOffsetInPhase < 36) {
                originalSubphaseType = 0; // Early subphase
            } else if (originalDayOffsetInPhase >= 36 && originalDayOffsetInPhase < 72) {
                originalSubphaseType = 1; // Late subphase
            } else {
                return null; // Original event was on a CO day or invalid for subphasely recurrence
            }

            const dayOffsetInOriginalSubphase = originalDayOffsetInPhase - (originalSubphaseType * 36);

            let currentIterationPhaseIndex = -1;
            let currentIterationSubphaseType = -1;

            for (let i = 0; i < phases.length; i++) {
                const phase = phases[i];
                let phaseEndDayThisYear;
                if (i < phases.length - 1) {
                    phaseEndDayThisYear = phases[i + 1].startDay - 1;
                } else {
                    phaseEndDayThisYear = daysInCurrentYear;
                }
                if (currentDayOfYear >= phase.startDay && currentDayOfYear <= phaseEndDayThisYear) {
                    currentIterationPhaseIndex = i;
                    const dayInCurrentIterationPhaseOffset = currentDayOfYear - phase.startDay;
                    if (dayInCurrentIterationPhaseOffset < 36) {
                        currentIterationSubphaseType = 0;
                    } else if (dayInCurrentIterationPhaseOffset >= 36 && dayInCurrentIterationPhaseOffset < 72) {
                        currentIterationSubphaseType = 1;
                    }
                    break;
                }
            }
            if (currentIterationPhaseIndex === -1 || currentIterationSubphaseType === -1) {
                 return null;
            }


            let nextPhaseIndexForSubphasely = currentIterationPhaseIndex;
            let nextTargetDayOfYear;
            let targetYear = currentDate.getFullYear();


            if (currentIterationSubphaseType === 0) {
                nextTargetDayOfYear = phases[currentIterationPhaseIndex].startDay + 36 + dayOffsetInOriginalSubphase;
                const potentialCurrentPhaseEndDay = (currentIterationPhaseIndex < phases.length - 1) ? phases[currentIterationPhaseIndex + 1].startDay - 1 : daysInCurrentYear;
                if (nextTargetDayOfYear > potentialCurrentPhaseEndDay) {
                    nextPhaseIndexForSubphasely = (currentIterationPhaseIndex + 1) % phases.length;
                    if (nextPhaseIndexForSubphasely === 0) { targetYear++; }
                    nextTargetDayOfYear = phases[nextPhaseIndexForSubphasely].startDay + dayOffsetInOriginalSubphase;
                }
            } else {
                nextPhaseIndexForSubphasely = (currentIterationPhaseIndex + 1) % phases.length;
                if (nextPhaseIndexForSubphasely === 0) {
                    targetYear++;
                }
                nextTargetDayOfYear = phases[nextPhaseIndexForSubphasely].startDay + dayOffsetInOriginalSubphase;
            }

            nextDate = new Date(targetYear, 0);
            nextDate.setDate(nextTargetDayOfYear);

            if (nextDate.getFullYear() !== targetYear || getDayOfYear(nextDate) !== nextTargetDayOfYear) {
                return null;
            }
            break;

        case 'phasely':
            let currentPhaseOfOccurrenceIndex = -1;
            for (let i = 0; i < phases.length; i++) {
                const phase = phases[i];
                 let phaseEndDayThisYear;
                if (i < phases.length - 1) {
                    phaseEndDayThisYear = phases[i + 1].startDay - 1;
                } else {
                    phaseEndDayThisYear = daysInCurrentYear;
                }

                if (currentDayOfYear >= phase.startDay && currentDayOfYear <= phaseEndDayThisYear) {
                    currentPhaseOfOccurrenceIndex = i;
                    break;
                }
            }

            if (currentPhaseOfOccurrenceIndex === -1) {
                for (let i = 0; i < phases.length; i++) {
                    if (i < phases.length - 1 && currentDayOfYear === (phases[i+1].startDay - 1)) {
                        currentPhaseOfOccurrenceIndex = i;
                        break;
                    } else if (i === phases.length - 1 && currentDayOfYear === daysInCurrentYear) {
                        currentPhaseOfOccurrenceIndex = i;
                        break;
                    }
                }
                if (currentPhaseOfOccurrenceIndex === -1) return null;
            }

            let nextTargetPhaseIndex = (currentPhaseOfOccurrenceIndex + 1) % phases.length;
            let nextPhaseStartDay = phases[nextTargetPhaseIndex].startDay;
            let targetYearForPhasely = currentDate.getFullYear();

            if (nextTargetPhaseIndex === 0) {
                 targetYearForPhasely++;
            }

            const newDayOfYearForPhasely = nextPhaseStartDay + originalDayOffsetInPhase;
            nextDate = new Date(targetYearForPhasely, 0);
            nextDate.setDate(newDayOfYearForPhasely);

            const calculatedDayOfYearCheck = getDayOfYear(nextDate);
            const targetYearForCheck = nextDate.getFullYear();
            const isTargetLeapYear = (targetYearForCheck % 4 === 0 && targetYearForCheck % 100 !== 0) || (targetYearForCheck % 400 === 0);
            const daysInTargetYear = isTargetLeapYear ? 366 : 365;

            if (calculatedDayOfYearCheck !== newDayOfYearForPhasely || newDayOfYearForPhasely > daysInTargetYear) {
                return null;
            }
            if (nextDate.getTime() <= currentDate.getTime()) {
                return null;
            }
            break;

        case 'yearly':
            const originalDateForYearly = new Date(originalYear, 0);
            originalDateForYearly.setDate(originalDayOfYear);

            let nextYearForYearly = currentDate.getFullYear() + 1;
            let nextMonthForYearly = originalDateForYearly.getMonth();
            let nextDayForYearly = originalDateForYearly.getDate();

            if (nextMonthForYearly === 1 && nextDayForYearly === 29) {
                const isNextYearLeap = (nextYearForYearly % 4 === 0 && nextYearForYearly % 100 !== 0) || (nextYearForYearly % 400 === 0);
                if (!isNextYearLeap) {
                    nextDayForYearly = 28;
                }
            }
            nextDate = new Date(nextYearForYearly, nextMonthForYearly, nextDayForYearly);

            if (nextDate.getFullYear() !== nextYearForYearly) {
                return null;
            }
            break;

        default:
            return null;
    }

    const finalYear = nextDate.getFullYear();
    const finalIsLeap = (finalYear % 4 === 0 && finalYear % 100 !== 0) || (finalYear % 400 === 0);
    const finalDaysInYear = finalIsLeap ? 366 : 365;
    const nextDayOfYearCalculated = getDayOfYear(nextDate);

    if (nextDayOfYearCalculated > finalDaysInYear && recurrencePattern !== 'yearly') {
        return null;
    }

    if (nextDate.getTime() <= currentDate.getTime()) {
        return null;
    }

    return nextDate;
}

/**
 * Fetches all events for the current user from the backend and updates the global 'events' object.
 * Then triggers rendering of calendar markers and the event list for the selected day.
 * This function now also "expands" recurring events, applying exceptions and modifications.
 * @param {number} year - The year for which events are primarily being fetched.
 */
export async function fetchAndRenderEvents(year) {
    const eventPanel = document.querySelector('.event-panel');
    const traditionalCalendar = document.querySelector('.traditional-calendar');
    const newCalendar = document.querySelector('.new-calendar');

    traditionalCalendar.classList.add('loading-overlay');
    newCalendar.classList.add('loading-overlay');
    eventPanel.classList.add('loading-overlay');

    if (currentUserId === null) {
        setEvents({}); // Clear all events for guest
        updateCalendarEventMarkers();
        renderEventsForSelectedDay();
        traditionalCalendar.classList.remove('loading-overlay');
        newCalendar.classList.remove('loading-overlay');
        eventPanel.classList.remove('loading-overlay');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/events?userId=${currentUserId}`);
        const { masterEvents, exceptions, modifications } = await response.json();

        if (response.ok) {
            const newEvents = {}; // This will store the expanded and modified events
            const exceptionSet = new Set(exceptions.flatMap(([id, keys]) => keys)); // Flatten and create set for quick lookup
            const modificationMap = new Map(modifications.map(([id, mods]) => [id, new Map(mods)])); // original_event_id -> Map(event_key -> mod_details)

            masterEvents.forEach(eventObj => {
                const {
                    id,
                    event_key, // This is the event_key of the master event
                    description,
                    notes,
                    category,
                    recurrence_pattern,
                    number_of_repeats
                } = eventObj;

                // Add the original master event occurrence
                if (!newEvents[event_key]) {
                    newEvents[event_key] = [];
                }

                // Check for a modification for the master event's original date
                const masterModification = modificationMap.has(id) ? modificationMap.get(id).get(event_key) : null;
                const masterIsExcepted = exceptionSet.has(`${id},${event_key}`); // Check if master event's original date is explicitly excluded

                if (!masterIsExcepted) { // Only add if not explicitly excluded
                    newEvents[event_key].push({
                        id: id, // Master event ID
                        description: masterModification ? masterModification.description : description,
                        event_key: event_key,
                        notes: masterModification ? masterModification.notes : notes || '',
                        category: masterModification ? masterModification.category : category || 'General',
                        recurrence_pattern: recurrence_pattern || 'none',
                        number_of_repeats: number_of_repeats || null,
                        isRecurringMaster: true, // Mark as master event
                        isModifiedInstance: !!masterModification // Mark if the master's own date is modified
                    });
                }


                // Handle recurring events expansion
                if (recurrence_pattern && recurrence_pattern !== 'none' && number_of_repeats !== null && number_of_repeats > 0) {
                    let currentRecurrenceDate = new Date(parseInt(event_key.split('-')[0]), 0);
                    currentRecurrenceDate.setDate(parseInt(event_key.split('-')[1]));

                    let generatedCount = 0;
                    const maxIterationsSafety = 5 * 366; // Safety limit
                    let iterationCounter = 0;

                    while (generatedCount < number_of_repeats && iterationCounter < maxIterationsSafety) {
                        const nextOccurrence = calculateNextOccurrence(currentRecurrenceDate, recurrence_pattern, event_key);

                        if (!nextOccurrence) break;

                        const nextDayOfYear = getDayOfYear(nextOccurrence);
                        const nextYear = nextOccurrence.getFullYear();
                        const nextEventKey = `${nextYear}-${nextDayOfYear}`;

                        // Check for exceptions or modifications for this specific occurrence
                        const isExcepted = exceptionSet.has(`${id},${nextEventKey}`);
                        const modification = modificationMap.has(id) ? modificationMap.get(id).get(nextEventKey) : null;

                        if (!isExcepted) { // Only add if not explicitly excepted
                            if (!newEvents[nextEventKey]) {
                                newEvents[nextEventKey] = [];
                            }
                            newEvents[nextEventKey].push({
                                id: id, // Original master event ID
                                description: modification ? modification.description : eventObj.description,
                                event_key: nextEventKey, // This event_key is for the specific occurrence
                                notes: modification ? modification.notes : eventObj.notes || '',
                                category: modification ? modification.category : eventObj.category || 'General',
                                isRecurringInstance: true, // Mark as an instance
                                isModifiedInstance: !!modification, // Mark if this instance is modified
                                originalEventId: eventObj.id, // Link back to the original database event ID
                                originalEventKey: event_key, // Link back to the original event's day key
                                recurrence_pattern: recurrence_pattern,
                                number_of_repeats: number_of_repeats
                            });
                        }
                        currentRecurrenceDate = nextOccurrence;
                        generatedCount++;
                        iterationCounter++;
                    }
                }
            });
            setEvents(newEvents);

            updateCalendarEventMarkers();
            renderEventsForSelectedDay();
        } else {
            console.error('Failed to fetch events:', data.message || 'Unknown error');
            showToast('Failed to load events. Please try logging in again.', 'error');
            setEvents({});
            updateCalendarEventMarkers();
            renderEventsForSelectedDay();
        }
    } catch (error) {
        console.error('Error fetching events:', error);
        showToast('An error occurred while loading events. Check backend server connection.', 'error');
        setEvents({});
        updateCalendarEventMarkers();
        renderEventsForSelectedDay();
    } finally {
        traditionalCalendar.classList.remove('loading-overlay');
        newCalendar.classList.remove('loading-overlay');
        eventPanel.classList.remove('loading-overlay');
    }
}

/**
 * Sets up event listeners for recurrence pattern selection in both new and edit event forms.
 * It toggles the visibility of the "number of repeats" input based on the selected pattern.
 */
export function setupRecurrenceListeners() {
    const newRecurrencePatternSelect = document.getElementById('newRecurrencePattern');
    const newNumberOfRepeatsContainer = document.getElementById('newNumberOfRepeatsContainer');
    const editRecurrencePatternSelect = document.getElementById('editRecurrencePattern');
    const editNumberOfRepeatsContainer = document.getElementById('editNumberOfRepeatsContainer');

    if (newRecurrencePatternSelect && newNumberOfRepeatsContainer) {
        newRecurrencePatternSelect.addEventListener('change', () => {
            if (newRecurrencePatternSelect.value === 'none') {
                newNumberOfRepeatsContainer.classList.add('hidden');
            } else {
                newNumberOfRepeatsContainer.classList.remove('hidden');
            }
        });
    }

    if (editRecurrencePatternSelect && editNumberOfRepeatsContainer) {
        editRecurrencePatternSelect.addEventListener('change', () => {
            if (editRecurrencePatternSelect.value === 'none') {
                editNumberOfRepeatsContainer.classList.add('hidden');
            } else {
                editNumberOfRepeatsContainer.classList.remove('hidden');
            }
        });
    }
}