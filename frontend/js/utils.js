// Global state variables
export let selectedDayOfYear = null;
export let selectedYear = null;
export let displayedYear = new Date().getFullYear();
export let events = {}; // { "event_key": [{ id, userId, event_key, description, notes, category, recurrence_pattern, number_of_repeats }] } // Updated comment
export let currentUserId = null;
export let currentUsername = null;

// NEW: Global state for event filtering and search
export let currentCategoryFilter = 'All'; // Default to 'All' categories
export let currentSearchTerm = ''; // Default to empty search term
export let isSearchModeActive = false; // Flag to indicate if search results are being displayed


export const API_BASE_URL = 'https://phase-calendar-api.onrender.com/api';
export const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Phase Calendar Definitions
export const phases = [ // Ensure 'phases' is exported
    { name: 'Prophase', short: 'P', startDay: 1, co: 'PMCO', colorClass: 'red' },
    { name: 'Metaphase', short: 'M', startDay: 74, co: 'MACO', colorClass: 'green' },
    { name: 'Anaphase', short: 'A', startDay: 147, co: 'ATCO', colorClass: 'blue' },
    { name: 'Telophase', short: 'T', startDay: 220, co: 'TICO', colorClass: 'cyan' },
    { name: 'Interphase', short: 'I', startDay: 293, co: 'IPCO', colorClass: 'yellow' }
];

export const rowLabels = ['R', 'G', 'B', 'C', 'Y', 'V'];

export const rowColors = {
    'R': '#FFEEEE', 'G': '#EEFFEE', 'B': '#ECF0FC',
    'C': '#EEFFFF', 'Y': '#FFFFEE', 'V': '#f5e8fd'
};

// Event Categories and their associated colors
export const eventCategories = [
    { name: 'General', color: '#6c757d' }, // Grey
    { name: 'Work', color: '#007bff' },    // Blue
    { name: 'Personal', color: '#28a745' }, // Green
    { name: 'Important', color: '#dc3545' }, // Red
    { name: 'Holiday', color: '#ffc107' },  // Yellow/Orange
    { name: 'Appointment', color: '#6f42c1' } // Purple
];


export function createDayElement(text) {
    const div = document.createElement('div');
    div.className = 'day';
    div.textContent = text;
    return div;
}

export function getDayOfYear(date) {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date - start + ((start.getTimezoneOffset() - date.getTimezoneOffset()) * 60 * 1000);
    return Math.floor(diff / (1000 * 60 * 60 * 24));
}

// Helper function for ordinal suffixes (st, nd, rd, th)
function getOrdinalSuffix(day) {
    // Handles 11th, 12th, 13th
    if (day > 3 && day < 21) return 'th';
    switch (day % 10) {
        case 1:  return "st";
        case 2:  return "nd";
        case 3:  return "rd";
        default: return "th";
    }
}

export function formatTraditionalDate(date) {
    const weekday = date.toLocaleDateString('default', { weekday: 'long' });
    const month = date.toLocaleDateString('default', { month: 'long' });
    const day = date.getDate();
    const suffix = getOrdinalSuffix(day);

    return `${weekday}, ${month} ${day}${suffix}`;
}

// Rewritten to return custom phase calendar date string (e.g., LAR5)
export function getNewCalendarDate(dayOfYear, year) {
    const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
    if (isLeapYear && dayOfYear === 366) {
        return 'ICD';
    }

    const daysInYear = isLeapYear ? 366 : 365;

    if (dayOfYear < 1 || dayOfYear > daysInYear) {
        return `Day ${dayOfYear} (Invalid)`;
    }

    for (let i = 0; i < phases.length; i++) {
        const phase = phases[i];
        let phaseLength;

        if (i < phases.length - 1) {
            phaseLength = phases[i + 1].startDay - phase.startDay;
        } else {
            phaseLength = daysInYear - phase.startDay + 1;
        }

        if (dayOfYear >= phase.startDay && dayOfYear < phase.startDay + phaseLength) {
            const dayInPhase = dayOfYear - phase.startDay + 1;

            // --- CORRECTED LOGIC FOR CO DAY DETECTION ---
            let isCoDay = false;
            // Special case for the last phase in a leap year
            if (isLeapYear && i === phases.length - 1) {
                // IPCO is now the second-to-last day of the phase
                if (dayInPhase === phaseLength - 1) {
                    isCoDay = true;
                }
            } else {
                // Original logic for non-leap years and all other phases
                if (dayInPhase === phaseLength) {
                    isCoDay = true;
                }
            }

            if (isCoDay) {
                return phase.co;
            } else {
                const daysPerMonthSection = 36;
                let monthTypePrefix = '';
                let dayWithinSection = dayInPhase;

                if (dayInPhase <= daysPerMonthSection) {
                    monthTypePrefix = 'E';
                } else {
                    monthTypePrefix = 'L';
                    dayWithinSection = dayInPhase - daysPerMonthSection;
                }

                const row = Math.ceil(dayWithinSection / 6);
                const col = (dayWithinSection - 1) % 6 + 1;
                const rowLetter = rowLabels[row - 1];

                return `${monthTypePrefix}${phase.short}${rowLetter}${col}`;
            }
        }
    }
    return `Day ${dayOfYear} of ${year}`;
}
/**
 * Scrolls the parent container to bring the target element into the middle of the view.
 * @param {HTMLElement} container The scrollable parent element.
 * @param {HTMLElement} element The element to scroll into view.
 */
export function scrollToElement(container, element) {
    if (!container || !element) return;

    const containerRect = container.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();

    const scrollPosition = element.offsetTop - container.offsetTop -
        (containerRect.height / 2) + (elementRect.height / 2);

    container.scrollTo({
        top: scrollPosition,
        behavior: 'smooth'
    });
}

// Functions to update global state
export function setSelectedDayOfYear(value) {
    selectedDayOfYear = value;
}

export function setSelectedYear(value) {
    selectedYear = value;
}

export function setDisplayedYear(value) {
    displayedYear = value;
}

export function setEvents(newEvents) {
    events = newEvents;
}

export function setCurrentUserId(value) {
    currentUserId = value;
}

export function setCurrentUsername(value) {
    currentUsername = value;
}

// NEW: Functions to update global state for filtering/search
export function setCurrentCategoryFilter(value) {
    currentCategoryFilter = value;
}

export function setCurrentSearchTerm(value) {
    currentSearchTerm = value;
}

export function setIsSearchModeActive(value) {
    isSearchModeActive = value;
}


// --- UI Feedback Functions ---

/**
 * Displays a non-blocking toast notification.
 * @param {string} message The message to display.
 * @param {'success'|'error'|'info'} type The type of toast (for styling).
 */
export function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        console.warn('Toast container not found!');
        return;
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;

    toastContainer.appendChild(toast);

    // Remove the toast after animation
    toast.addEventListener('animationend', () => {
        toast.remove();
    });
}

/**
 * Displays a custom confirmation modal.
 * @param {string} message The message to display in the confirmation dialog.
 * @returns {Promise<boolean>} A promise that resolves to true if confirmed, false otherwise.
 */
export function showConfirm(message) {
    return new Promise((resolve) => {
        const modalOverlay = document.getElementById('custom-confirm-modal');
        const confirmMessage = document.getElementById('confirm-message');
        const confirmYesBtn = document.getElementById('confirm-yes');
        const confirmNoBtn = document.getElementById('confirm-no');

        if (!modalOverlay || !confirmMessage || !confirmYesBtn || !confirmNoBtn) {
            console.error('Confirmation modal elements not found!');
            resolve(false); // Default to false if elements are missing
            return;
        }

        confirmMessage.textContent = message;
        modalOverlay.classList.remove('hidden');

        // Ensure listeners are clean to prevent multiple calls
        const handleConfirm = () => {
            modalOverlay.classList.add('hidden');
            confirmYesBtn.removeEventListener('click', handleConfirm);
            confirmNoBtn.removeEventListener('click', handleCancel);
            resolve(true);
        };

        const handleCancel = () => {
            modalOverlay.classList.add('hidden');
            confirmYesBtn.removeEventListener('click', handleConfirm);
            confirmNoBtn.removeEventListener('click', handleCancel);
            resolve(false);
        };

        // Add event listeners (ensure they are not duplicated if called multiple times)
        // Using .onclick = null before adding ensures only one listener is active.
        confirmYesBtn.onclick = handleConfirm;
        confirmNoBtn.onclick = handleCancel;
    });
}

/**
 * Toggles a loading spinner and disables a button.
 * @param {HTMLElement} buttonElement The button element to modify.
 * @param {boolean} isLoading True to show spinner and disable.
 * @param {string} [originalText] The original text of the button (optional, for restoring).
 * @param {string} [finalText] The text to set when loading is false, overrides originalText (optional).
 */
export function toggleLoading(buttonElement, isLoading, originalText = null, finalText = null) {
    if (!buttonElement) return;

    if (isLoading) {
        // Save original text only when starting loading
        if (!buttonElement.dataset.originalText) {
            buttonElement.dataset.originalText = originalText || buttonElement.textContent;
        }
        buttonElement.textContent = ''; // Clear text
        buttonElement.classList.add('loading');
        buttonElement.disabled = true;
    } else {
        // Restore text based on finalText or originalText
        buttonElement.textContent = finalText || buttonElement.dataset.originalText || '';
        buttonElement.classList.remove('loading');
        buttonElement.disabled = false;
        // Clear originalText from dataset once loading is completely off
        if (finalText || (buttonElement.dataset.originalText === buttonElement.textContent)) {
            delete buttonElement.dataset.originalText;
        }
    }
}

/**
 * Displays an inline error message next to an input field.
 * @param {HTMLElement} inputElement The input element.
 * @param {string} message The error message to display.
 */
export function displayInlineError(inputElement, message) {
    const errorSpanId = inputElement.id + 'Error';
    const errorSpan = document.getElementById(errorSpanId);
    if (errorSpan) {
        errorSpan.textContent = message;
        inputElement.classList.add('input-error'); // Add class for styling (e.g., red border)
    }
}

/**
 * Clears an inline error message for an input field.
 * @param {HTMLElement} inputElement The input element.
 */
export function clearInlineError(inputElement) {
    const errorSpanId = inputElement.id + 'Error';
    const errorSpan = document.getElementById(errorSpanId);
    if (errorSpan) {
        errorSpan.textContent = '';
        inputElement.classList.remove('input-error'); // Remove styling class
    }
}
