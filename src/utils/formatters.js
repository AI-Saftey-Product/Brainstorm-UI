/**
 * Utility functions for formatting data throughout the application
 */

/**
 * Format a timestamp into a human-readable date and time string
 * @param {string} timestamp - ISO timestamp string
 * @returns {string} Formatted date and time
 */
export const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    
    try {
      const date = new Date(timestamp);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (error) {
      console.error('Error formatting timestamp:', error);
      return timestamp;
    }
  };
  
  /**
   * Format a number as a percentage
   * @param {number} value - Value to format (0-1)
   * @param {number} decimals - Number of decimal places
   * @returns {string} Formatted percentage
   */
  export const formatPercentage = (value, decimals = 1) => {
    if (value === undefined || value === null) return 'N/A';
    return `${(value * 100).toFixed(decimals)}%`;
  };
  
  /**
   * Format a number with commas as thousands separators
   * @param {number} value - Value to format
   * @returns {string} Formatted number
   */
  export const formatNumber = (value) => {
    if (value === undefined || value === null) return 'N/A';
    return value.toLocaleString('en-US');
  };
  
  /**
   * Format a duration in milliseconds to a human-readable string
   * @param {number} ms - Duration in milliseconds
   * @returns {string} Formatted duration
   */
  export const formatDuration = (ms) => {
    if (ms === undefined || ms === null) return 'N/A';
    
    if (ms < 1000) {
      return `${ms}ms`;
    } else if (ms < 60000) {
      return `${(ms / 1000).toFixed(2)}s`;
    } else {
      const minutes = Math.floor(ms / 60000);
      const seconds = ((ms % 60000) / 1000).toFixed(1);
      return `${minutes}m ${seconds}s`;
    }
  };
  
  /**
   * Truncate long text with ellipsis
   * @param {string} text - Text to truncate
   * @param {number} maxLength - Maximum length before truncation
   * @returns {string} Truncated text
   */
  export const truncateText = (text, maxLength = 100) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return `${text.substring(0, maxLength)}...`;
  };