const fs = require('fs');
const csv = require('csv-parser');
const XLSX = require('xlsx');

class FileProcessor {
  static async processCSV(filePath) {
    return new Promise((resolve, reject) => {
      console.log('Processing CSV file at path:', filePath);
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        console.error('File does not exist:', filePath);
        return reject(new Error(`File does not exist: ${filePath}`));
      }
      
      const results = [];
      const columns = new Set();
      
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => {
          results.push(data);
          // Track all column names
          Object.keys(data).forEach(key => columns.add(key));
        })
        .on('end', () => {
          const processedData = {
            data: results,
            columns: Array.from(columns).map(col => ({
              name: col,
              type: this.detectColumnType(results, col)
            })),
            rowCount: results.length
          };
          resolve(processedData);
        })
        .on('error', (error) => {
          reject(error);
        });
    });
  }

  static async processExcel(filePath) {
    try {
      console.log('Processing Excel file at path:', filePath);
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        console.error('File does not exist:', filePath);
        throw new Error(`File does not exist: ${filePath}`);
      }
      
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      
      if (jsonData.length === 0) {
        throw new Error('Excel file is empty or has no data');
      }
      
      // Get columns
      const columns = Object.keys(jsonData[0]).map(col => ({
        name: col,
        type: this.detectColumnType(jsonData, col)
      }));
      
      return {
        data: jsonData,
        columns: columns,
        rowCount: jsonData.length
      };
    } catch (error) {
      throw new Error(`Error processing Excel file: ${error.message}`);
    }
  }

  static detectColumnType(data, columnName) {
    if (!data || data.length === 0) return 'string';
    
    const sampleSize = Math.min(10, data.length);
    const sample = data.slice(0, sampleSize);
    
    let numberCount = 0;
    let dateCount = 0;
    let booleanCount = 0;
    
    for (const row of sample) {
      const value = row[columnName];
      if (value === null || value === undefined || value === '') continue;
      
      // Check for number
      if (!isNaN(Number(value)) && !isNaN(parseFloat(value))) {
        numberCount++;
      }
      // Check for date
      else if (this.isValidDate(value)) {
        dateCount++;
      }
      // Check for boolean
      else if (typeof value === 'boolean' || value.toLowerCase() === 'true' || value.toLowerCase() === 'false') {
        booleanCount++;
      }
    }
    
    const totalValid = sampleSize - (sampleSize - numberCount - dateCount - booleanCount);
    
    if (numberCount / totalValid > 0.7) return 'number';
    if (dateCount / totalValid > 0.7) return 'date';
    if (booleanCount / totalValid > 0.7) return 'boolean';
    return 'string';
  }

  static isValidDate(dateString) {
    // Check for common date formats
    const datePatterns = [
      /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
      /^\d{2}\/\d{2}\/\d{4}$/, // MM/DD/YYYY
      /^\d{2}-\d{2}-\d{4}$/, // MM-DD-YYYY
      /^\d{4}\/\d{2}\/\d{2}$/ // YYYY/MM/DD
    ];
    
    // Check if it matches any date pattern
    const matchesPattern = datePatterns.some(pattern => pattern.test(dateString));
    if (!matchesPattern) return false;
    
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
  }

  static getFileType(fileName) {
    const ext = fileName.split('.').pop().toLowerCase();
    return ext;
  }

  static async cleanupFile(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.error('Error cleaning up file:', error);
    }
  }
}

module.exports = FileProcessor;
