// src/api/analytics.js

/**
 * Fetches user engagement data from your backend API.
 * The backend must call the Google Analytics Data API.
 */
export async function fetchUserEngagement() {
    try {
      const response = await fetch("/api/user-engagement");
      if (!response.ok) {
        throw new Error("Failed to fetch GA analytics");
      }
  
      const data = await response.json();
  
      // Optional: Format date if needed
      return data.map(item => ({
        ...item,
        day: formatDate(item.day)
      }));
    } catch (error) {
      console.error("Analytics fetch failed:", error.message);
      throw error;
    }
  }
  
  function formatDate(dateStr) {
    // Convert '20240420' → 'Apr 20'
    const year = dateStr.slice(0, 4);
    const month = parseInt(dateStr.slice(4, 6)) - 1;
    const day = dateStr.slice(6, 8);
    return new Date(year, month, day).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric"
    });
  }
  