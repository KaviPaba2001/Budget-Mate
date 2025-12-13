// src/utils/dateHelpers.js
// Centralized date handling utilities to ensure consistency across the app

/**
 * Safely converts various date formats to Date object
 * Handles: Date objects, Firestore Timestamps, ISO strings
 */
const toDateObject = (date) => {
    if (!date) return null;
    
    // Already a Date object
    if (date instanceof Date) return date;
    
    // Firestore Timestamp
    if (date.toDate && typeof date.toDate === 'function') {
        return date.toDate();
    }
    
    // ISO string or other string format
    if (typeof date === 'string') {
        const parsed = new Date(date);
        return isNaN(parsed.getTime()) ? null : parsed;
    }
    
    // Unix timestamp (number)
    if (typeof date === 'number') {
        const parsed = new Date(date);
        return isNaN(parsed.getTime()) ? null : parsed;
    }
    
    return null;
};

/**
 * Format date for display in UI
 * Output: "Jan 15, 2024"
 */
export const formatDate = (date) => {
    const d = toDateObject(date);
    if (!d) return 'Unknown date';
    
    return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
};

/**
 * Format date with time
 * Output: "January 15, 2024, 02:30 PM"
 */
export const formatDateTime = (date) => {
    const d = toDateObject(date);
    if (!d) return 'Unknown date';
    
    return d.toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

/**
 * Format date for database storage
 * Output: "2024-01-15"
 */
export const formatDateForDatabase = (date) => {
    const d = toDateObject(date);
    if (!d) return new Date().toISOString().split('T')[0];
    
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Format date for list display
 * Output: "2024-01-15"
 */
export const formatDateForDisplay = formatDateForDatabase;

/**
 * Get relative time string
 * Output: "2 hours ago", "3 days ago", "Just now"
 */
export const getRelativeTime = (date) => {
    const d = toDateObject(date);
    if (!d) return 'Unknown time';
    
    const now = new Date();
    const diffMs = now - d;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffSecs < 60) return 'Just now';
    if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
    if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    if (diffDays < 30) return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
    
    return formatDate(d);
};

/**
 * Check if date is today
 */
export const isToday = (date) => {
    const d = toDateObject(date);
    if (!d) return false;
    
    const today = new Date();
    return d.getDate() === today.getDate() &&
           d.getMonth() === today.getMonth() &&
           d.getFullYear() === today.getFullYear();
};

/**
 * Check if date is in current month
 */
export const isCurrentMonth = (date) => {
    const d = toDateObject(date);
    if (!d) return false;
    
    const now = new Date();
    return d.getMonth() === now.getMonth() &&
           d.getFullYear() === now.getFullYear();
};

/**
 * Check if date is in current year
 */
export const isCurrentYear = (date) => {
    const d = toDateObject(date);
    if (!d) return false;
    
    const now = new Date();
    return d.getFullYear() === now.getFullYear();
};

/**
 * Get month name from date
 * Output: "January"
 */
export const getMonthName = (date) => {
    const d = toDateObject(date);
    if (!d) return '';
    
    return d.toLocaleDateString('en-US', { month: 'long' });
};

/**
 * Get short month name
 * Output: "Jan"
 */
export const getShortMonthName = (date) => {
    const d = toDateObject(date);
    if (!d) return '';
    
    return d.toLocaleDateString('en-US', { month: 'short' });
};

/**
 * Get day of week
 * Output: "Monday"
 */
export const getDayOfWeek = (date) => {
    const d = toDateObject(date);
    if (!d) return '';
    
    return d.toLocaleDateString('en-US', { weekday: 'long' });
};

/**
 * Get date range string
 * Output: "Jan 1 - Jan 7, 2024"
 */
export const formatDateRange = (startDate, endDate) => {
    const start = toDateObject(startDate);
    const end = toDateObject(endDate);
    
    if (!start || !end) return 'Invalid date range';
    
    const sameYear = start.getFullYear() === end.getFullYear();
    const sameMonth = sameYear && start.getMonth() === end.getMonth();
    
    if (sameMonth) {
        return `${getShortMonthName(start)} ${start.getDate()} - ${end.getDate()}, ${start.getFullYear()}`;
    } else if (sameYear) {
        return `${getShortMonthName(start)} ${start.getDate()} - ${getShortMonthName(end)} ${end.getDate()}, ${start.getFullYear()}`;
    } else {
        return `${getShortMonthName(start)} ${start.getDate()}, ${start.getFullYear()} - ${getShortMonthName(end)} ${end.getDate()}, ${end.getFullYear()}`;
    }
};

/**
 * Get start of day (00:00:00)
 */
export const getStartOfDay = (date) => {
    const d = toDateObject(date) || new Date();
    const start = new Date(d);
    start.setHours(0, 0, 0, 0);
    return start;
};

/**
 * Get end of day (23:59:59)
 */
export const getEndOfDay = (date) => {
    const d = toDateObject(date) || new Date();
    const end = new Date(d);
    end.setHours(23, 59, 59, 999);
    return end;
};

/**
 * Get start of month
 */
export const getStartOfMonth = (date) => {
    const d = toDateObject(date) || new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
};

/**
 * Get end of month
 */
export const getEndOfMonth = (date) => {
    const d = toDateObject(date) || new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
};

/**
 * Get start of week (Monday)
 */
export const getStartOfWeek = (date) => {
    const d = toDateObject(date) || new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
    return new Date(d.setDate(diff));
};

/**
 * Get end of week (Sunday)
 */
export const getEndOfWeek = (date) => {
    const start = getStartOfWeek(date);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return end;
};

/**
 * Add days to date
 */
export const addDays = (date, days) => {
    const d = toDateObject(date) || new Date();
    const result = new Date(d);
    result.setDate(result.getDate() + days);
    return result;
};

/**
 * Add months to date
 */
export const addMonths = (date, months) => {
    const d = toDateObject(date) || new Date();
    const result = new Date(d);
    result.setMonth(result.getMonth() + months);
    return result;
};

/**
 * Validate if string is valid date
 */
export const isValidDate = (dateString) => {
    const d = new Date(dateString);
    return !isNaN(d.getTime());
};

/**
 * Get age of date in days
 */
export const getAgeInDays = (date) => {
    const d = toDateObject(date);
    if (!d) return 0;
    
    const now = new Date();
    const diffMs = now - d;
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
};

// Export all functions as default for convenience
export default {
    formatDate,
    formatDateTime,
    formatDateForDatabase,
    formatDateForDisplay,
    getRelativeTime,
    isToday,
    isCurrentMonth,
    isCurrentYear,
    getMonthName,
    getShortMonthName,
    getDayOfWeek,
    formatDateRange,
    getStartOfDay,
    getEndOfDay,
    getStartOfMonth,
    getEndOfMonth,
    getStartOfWeek,
    getEndOfWeek,
    addDays,
    addMonths,
    isValidDate,
    getAgeInDays,
};

/**
 * USAGE EXAMPLES:
 * 
 * import { formatDate, formatDateTime, getRelativeTime } from '../utils/dateHelpers';
 * 
 * // In your component:
 * const displayDate = formatDate(transaction.createdAt);
 * const fullDateTime = formatDateTime(transaction.createdAt);
 * const relative = getRelativeTime(transaction.createdAt); // "2 hours ago"
 * 
 * // For database:
 * import { formatDateForDatabase } from '../utils/dateHelpers';
 * const dbDate = formatDateForDatabase(new Date());
 * 
 * // For date ranges:
 * import { formatDateRange, getStartOfMonth, getEndOfMonth } from '../utils/dateHelpers';
 * const start = getStartOfMonth(new Date());
 * const end = getEndOfMonth(new Date());
 * const range = formatDateRange(start, end); // "Jan 1 - Jan 31, 2024"
 */