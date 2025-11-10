class DataAnalyzer {
  /**
   * Generate summary statistics from file data
   * @param {Array} data - Array of data objects
   * @param {Array} columns - Array of column definitions with name and type
   * @returns {Object} Summary statistics object
   */
  static generateSummaryStats(data, columns) {
    if (!data || data.length === 0) {
      return {
        rowCount: 0,
        columnCount: columns.length,
        columns: [],
        numericStats: {},
        categoricalStats: {},
        dateStats: {}
      };
    }

    const stats = {
      rowCount: data.length,
      columnCount: columns.length,
      columns: columns.map(col => ({
        name: col.name,
        type: col.type
      })),
      numericStats: {},
      categoricalStats: {},
      dateStats: {}
    };

    // Process each column
    columns.forEach(column => {
      const { name, type } = column;
      const values = data
        .map(row => row[name])
        .filter(val => val !== null && val !== undefined && val !== '');

      if (values.length === 0) {
        stats[`${type}Stats`][name] = { nullCount: data.length };
        return;
      }

      if (type === 'number') {
        const numericValues = values
          .map(val => {
            const num = parseFloat(val);
            return isNaN(num) ? null : num;
          })
          .filter(val => val !== null);

        if (numericValues.length > 0) {
          const sorted = [...numericValues].sort((a, b) => a - b);
          stats.numericStats[name] = {
            count: numericValues.length,
            nullCount: data.length - numericValues.length,
            min: sorted[0],
            max: sorted[sorted.length - 1],
            sum: numericValues.reduce((a, b) => a + b, 0),
            mean: numericValues.reduce((a, b) => a + b, 0) / numericValues.length,
            median: sorted.length % 2 === 0
              ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
              : sorted[Math.floor(sorted.length / 2)]
          };
        }
      } else if (type === 'string') {
        // Categorical statistics
        const valueCounts = {};
        values.forEach(val => {
          const key = String(val).trim();
          valueCounts[key] = (valueCounts[key] || 0) + 1;
        });

        const sortedCounts = Object.entries(valueCounts)
          .sort((a, b) => b[1] - a[1]);

        stats.categoricalStats[name] = {
          uniqueValues: sortedCounts.length,
          totalCount: values.length,
          nullCount: data.length - values.length,
          topValues: sortedCounts.slice(0, 5).map(([value, count]) => ({
            value,
            count,
            percentage: ((count / values.length) * 100).toFixed(2)
          })),
          mostFrequent: sortedCounts[0] ? sortedCounts[0][0] : null
        };
      } else if (type === 'date') {
        const dateValues = values
          .map(val => {
            const date = new Date(val);
            return isNaN(date.getTime()) ? null : date;
          })
          .filter(val => val !== null);

        if (dateValues.length > 0) {
          const timestamps = dateValues.map(d => d.getTime());
          const sorted = [...timestamps].sort((a, b) => a - b);
          
          stats.dateStats[name] = {
            count: dateValues.length,
            nullCount: data.length - dateValues.length,
            earliest: new Date(sorted[0]).toISOString(),
            latest: new Date(sorted[sorted.length - 1]).toISOString(),
            span: Math.round((sorted[sorted.length - 1] - sorted[0]) / (1000 * 60 * 60 * 24)) // days
          };
        }
      }
    });

    return stats;
  }

  /**
   * Format summary stats for AI prompt
   * @param {Object} summaryStats - Summary statistics object
   * @returns {String} Formatted string for AI analysis
   */
  static formatStatsForAI(summaryStats) {
    let prompt = `Data Summary:\n`;
    prompt += `- Total Rows: ${summaryStats.rowCount}\n`;
    prompt += `- Total Columns: ${summaryStats.columnCount}\n\n`;

    prompt += `Columns:\n`;
    summaryStats.columns.forEach(col => {
      prompt += `- ${col.name} (${col.type})\n`;
    });

    if (Object.keys(summaryStats.numericStats).length > 0) {
      prompt += `\nNumeric Statistics:\n`;
      Object.entries(summaryStats.numericStats).forEach(([col, stats]) => {
        prompt += `${col}:\n`;
        prompt += `  Min: ${stats.min}, Max: ${stats.max}, Mean: ${stats.mean.toFixed(2)}, Median: ${stats.median.toFixed(2)}\n`;
        prompt += `  Count: ${stats.count}, Missing: ${stats.nullCount}\n`;
      });
    }

    if (Object.keys(summaryStats.categoricalStats).length > 0) {
      prompt += `\nCategorical Statistics:\n`;
      Object.entries(summaryStats.categoricalStats).forEach(([col, stats]) => {
        prompt += `${col}:\n`;
        prompt += `  Unique Values: ${stats.uniqueValues}\n`;
        if (stats.mostFrequent) {
          prompt += `  Most Frequent: "${stats.mostFrequent}"\n`;
        }
        if (stats.topValues && stats.topValues.length > 0) {
          prompt += `  Top Values:\n`;
          stats.topValues.forEach(tv => {
            prompt += `    - "${tv.value}": ${tv.count} (${tv.percentage}%)\n`;
          });
        }
      });
    }

    if (Object.keys(summaryStats.dateStats).length > 0) {
      prompt += `\nDate Statistics:\n`;
      Object.entries(summaryStats.dateStats).forEach(([col, stats]) => {
        prompt += `${col}:\n`;
        prompt += `  Earliest: ${stats.earliest}, Latest: ${stats.latest}\n`;
        prompt += `  Span: ${stats.span} days\n`;
      });
    }

    return prompt;
  }
}

module.exports = DataAnalyzer;
