import { saveAs } from "file-saver";

/**
 * Save CSV string content to a downloadable file.
 * @param {string} csvString - The CSV data as a string.
 * @param {string} filename - The name of the file to save.
 */
export const saveCSVFile = (csvString, filename = "imali-data.csv") => {
  try {
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8" });
    saveAs(blob, filename);
  } catch (err) {
    console.error("Failed to save CSV file:", err);
    throw err;
  }
};
