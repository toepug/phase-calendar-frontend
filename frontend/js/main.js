import {
    setupAuthListeners
} from './auth.js';
import {
    renderCalendars,
    updateCalendarSelection
} from './calendarRenderer.js';
import {
    addEvent,
    fetchAndRenderEvents,
    populateCategorySelect,
    setupRecurrenceListeners // NEW: Import the new setup function
    renderEventsForSelectedDay
} from './eventManager.js';
import {
    displayedYear,
    setDisplayedYear,
    currentCategoryFilter,
    currentSearchTerm,
    isSearchModeActive,
    setCurrentCategoryFilter,
    setCurrentSearchTerm,
    setIsSearchModeActive,
    toggleLoading, // Ensure toggleLoading is imported
    clearInlineError, // NEW: Import clearInlineError
    showToast // NEW: Import showToast
} from './utils.js';

document.addEventListener("DOMContentLoaded", async () => {
    // Setup authentication listeners
    setupAuthListeners();

    // Get about button and modal elements
    const aboutBtn = document.getElementById('aboutBtn');
    const aboutModal = document.getElementById('about-modal');
    const aboutCloseBtn = document.getElementById('about-close-btn');

    // Get elements for the new event form toggle
    let addEventBtn = document.getElementById('addEventBtn');
    const newEventFields = document.getElementById('newEventFields');

    // Get global filter and search elements (now in top-left-buttons)
    const eventCategoryFilter = document.getElementById('eventCategoryFilter');
    const eventSearchInput = document.getElementById('eventSearchInput');
    const eventPanel = document.querySelector('.event-panel'); // Get event panel for visibility toggle
    const eventListElement = document.getElementById('eventList'); // Get the event list element


    // Populate the category filter dropdown (includes 'All' option)
    populateCategorySelect(eventCategoryFilter, 'All', true);


    // Initial fetch of events BEFORE rendering calendars
    await fetchAndRenderEvents(displayedYear);

    // Initial render of calendars for the current displayed year (guest mode)
    renderCalendars(displayedYear);

    // Event listeners for year navigation buttons
    document.getElementById("prevYearBtn").addEventListener("click", async () => {
        setDisplayedYear(displayedYear - 1);
        await fetchAndRenderEvents(displayedYear);
        renderCalendars(displayedYear);
    });

    document.getElementById("nextYearBtn").addEventListener("click", async () => {
        setDisplayedYear(displayedYear + 1);
        await fetchAndRenderEvents(displayedYear);
        renderCalendars(displayedYear);
    });

    document.getElementById("todayBtn").addEventListener("click", async () => {
        setDisplayedYear(new Date().getFullYear());
        await fetchAndRenderEvents(displayedYear);
        renderCalendars(displayedYear);
    });

    // Event listener for the Add Event button
    if (addEventBtn && newEventFields) {
        const newAddEventBtn = addEventBtn.cloneNode(true);
        addEventBtn.parentNode.replaceChild(newAddEventBtn, addEventBtn);
        addEventBtn = newAddEventBtn;

        let isProcessing = false;
        let lastClickTime = 0;
        const debounceDelay = 300;

        addEventBtn.addEventListener("click", async (event) => {
            event.preventDefault();
            const currentTime = Date.now();
            if (isProcessing || (currentTime - lastClickTime < debounceDelay)) {
                return;
            }
            lastClickTime = currentTime;

            if (newEventFields.classList.contains('hidden')) {
                // When showing the new event fields, clear the "No events" message
                eventListElement.innerHTML = ''; // Clear the list
                newEventFields.classList.remove('hidden');
                addEventBtn.textContent = 'Save Event';
                document.getElementById('newEventText').focus();
            } else {
                isProcessing = true;
                // Start loading, but don't restore text in finally for this button
                toggleLoading(addEventBtn, true, 'Save Event');

                try {
                    const success = await addEvent(); // addEvent now returns true/false for success/failure
                    if (success) {
                        // On success, reset UI fields and explicitly set button text
                        newEventFields.classList.add('hidden');
                        document.getElementById('newEventText').value = '';
                        document.getElementById('newEventCategory').value = 'General';
                        clearInlineError(document.getElementById('newEventText'));
                        addEventBtn.textContent = 'Add Event'; // Explicitly set to 'Add Event' on success
                        // NEW: Reset recurrence fields for add form after successful save
                        document.getElementById('newRecurrencePattern').value = 'none';
                        document.getElementById('newNumberOfRepeats').value = ''; // Changed ID
                        document.getElementById('newNumberOfRepeatsContainer').classList.add('hidden'); // Changed ID
                    } else {
                        // On failure, keep fields visible, restore 'Save Event' text
                        addEventBtn.textContent = 'Save Event'; // Restore 'Save Event' on failure
                    }
                } catch (error) {
                    console.error("Error during addEvent process:", error);
                    showToast('An unexpected error occurred.', 'error');
                    addEventBtn.textContent = 'Save Event'; // Restore on unexpected error
                } finally {
                    // This finally block only removes the loading spinner and re-enables the button.
                    // The text content is handled in the try/catch blocks.
                    toggleLoading(addEventBtn, false); // Turn off spinner and enable button
                    isProcessing = false;
                }
            }
        });
    } else {
        console.error('Add Event button or fields container not found in DOM.');
    }

    document.getElementById("toggleTraditionalBtn").addEventListener("click", () => {
        const cal = document.querySelector(".traditional-calendar");
        if (cal.classList.contains("hidden")) {
            cal.classList.remove("hidden");
            document.getElementById("toggleTraditionalBtn").textContent = "Hide Calendar";
        } else {
            cal.classList.add("hidden");
            document.getElementById("toggleTraditionalBtn").textContent = "Show Calendar";
        }
    });

    document.getElementById("toggleEventsBtn").addEventListener("click", () => {
        const panel = document.querySelector(".event-panel");
        if (panel.classList.contains("hidden")) {
            panel.classList.remove("hidden");
            document.getElementById("toggleEventsBtn").textContent = "Hide Events";
        } else {
            panel.classList.add("hidden");
            document.getElementById("toggleEventsBtn").textContent = "View Events";
        }
    });

    // Event listeners for global filter and search inputs
    eventCategoryFilter.addEventListener('change', () => {
        setCurrentCategoryFilter(eventCategoryFilter.value);
        setCurrentSearchTerm(eventSearchInput.value);
        setIsSearchModeActive(true);
        eventPanel.classList.remove('hidden');
        document.getElementById("toggleEventsBtn").textContent = "Hide Events";
        renderEventsForSelectedDay();
    });

    eventSearchInput.addEventListener('input', () => {
        setCurrentSearchTerm(eventSearchInput.value);
        setCurrentCategoryFilter(eventCategoryFilter.value);
        setIsSearchModeActive(true);
        eventPanel.classList.remove('hidden');
        document.getElementById("toggleEventsBtn").textContent = "Hide Events";
        renderEventsForSelectedDay();
    });

    // About Modal Event Listeners
    if (aboutBtn && aboutModal && aboutCloseBtn) {
        aboutBtn.addEventListener('click', () => {
            aboutModal.classList.remove('hidden');
        });

        aboutCloseBtn.addEventListener('click', () => {
            aboutModal.classList.add('hidden');
        });

        aboutModal.addEventListener('click', (event) => {
            if (event.target === aboutModal) {
                aboutModal.classList.add('hidden');
            }
        });
    }

    // NEW: Setup recurrence listeners after all elements are available
    setupRecurrenceListeners();
});
