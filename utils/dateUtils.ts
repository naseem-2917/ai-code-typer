/**
 * Formats a date string, timestamp, or Date object to 'dd/mm/yyyy'.
 * @param dateInput The date to format.
 * @returns The formatted date string.
 */
export const formatDate = (dateInput: number | string | Date): string => {
    if (!dateInput) return '';
    const date = new Date(dateInput);
    // invalid date check
    if (isNaN(date.getTime())) return '';

    return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
};

/**
 * Formats a date string, timestamp, or Date object to 'dd/mm/yyyy, HH:mm:ss'.
 * @param dateInput The date to format.
 * @returns The formatted date and time string.
 */
export const formatDateTime = (dateInput: number | string | Date): string => {
    if (!dateInput) return '';
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return '';

    const datePart = formatDate(date);
    const timePart = date.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    });
    return `${datePart}, ${timePart}`;
};

/**
 * Formats a date string, timestamp, or Date object to 'd/m/yy' (e.g., 6/12/25).
 * @param dateInput The date to format.
 * @returns The formatted date string.
 */
export const formatShortDate = (dateInput: number | string | Date): string => {
    if (!dateInput) return '';
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return '';

    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear().toString().slice(-2);
    return `${day}/${month}/${year}`;
};
