const FileData = require('../models/FileData');
const DataAnalyzer = require('../utils/dataAnalyzer');
const { generateAIInsights } = require('../utils/aiProviders');

/**
 * Generate AI insights from uploaded data
 * POST /api/ai/insights
 * Body: { fileId: string }
 */
const generateInsights = async (req, res) => {
  try {
    const { fileId } = req.body;
    const userId = req.user._id;

    if (!fileId) {
      return res.status(400).json({
        success: false,
        message: 'File ID is required'
      });
    }

    // Check if at least one AI provider is configured
    const hasProvider = process.env.HUGGINGFACE_API_KEY || 
                       process.env.GEMINI_API_KEY || 
                       process.env.OPENAI_API_KEY;
    
    if (!hasProvider) {
      return res.status(500).json({
        success: false,
        message: 'No AI provider is configured. Please set at least one of: HUGGINGFACE_API_KEY, GEMINI_API_KEY, or OPENAI_API_KEY in your environment variables.'
      });
    }

    // Fetch file data
    const fileData = await FileData.findOne({ 
      _id: fileId, 
      userId 
    }).select('originalName data columns rowCount fileType uploadDate');

    if (!fileData) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // Generate summary statistics
    const summaryStats = DataAnalyzer.generateSummaryStats(
      fileData.data,
      fileData.columns
    );

    // Format stats for AI
    const statsText = DataAnalyzer.formatStatsForAI(summaryStats);

    // Create AI prompt
    const prompt = `Analyze the following data summary and provide key insights, patterns, and trends.

${statsText}

Please provide:
1. Key insights and observations about the data
2. Notable patterns or trends you've identified
3. Potential outliers or anomalies
4. Recommendations for further analysis

Format your response in a clear, concise manner with bullet points where appropriate.`;

    const systemPrompt = 'You are a helpful data analyst assistant. Provide clear, actionable insights from data summaries.';

    // Call AI provider (with automatic fallback)
    let aiResponse;
    try {
      aiResponse = await generateAIInsights(prompt, systemPrompt);
    } catch (aiError) {
      console.error('AI API error:', aiError);
      return res.status(500).json({
        success: false,
        message: 'Error calling AI API: ' + aiError.message
      });
    }

    res.status(200).json({
      success: true,
      data: {
        fileId: fileData._id,
        fileName: fileData.originalName,
        insights: aiResponse,
        summaryStats: {
          rowCount: summaryStats.rowCount,
          columnCount: summaryStats.columnCount,
          columns: summaryStats.columns
        },
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Generate insights error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating insights',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Get summary statistics for a file (without AI analysis)
 * POST /api/ai/summary
 * Body: { fileId: string }
 */
const getSummaryStats = async (req, res) => {
  try {
    const { fileId } = req.body;
    const userId = req.user._id;

    if (!fileId) {
      return res.status(400).json({
        success: false,
        message: 'File ID is required'
      });
    }

    // Fetch file data
    const fileData = await FileData.findOne({ 
      _id: fileId, 
      userId 
    }).select('originalName data columns rowCount fileType uploadDate');

    if (!fileData) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // Generate summary statistics
    const summaryStats = DataAnalyzer.generateSummaryStats(
      fileData.data,
      fileData.columns
    );

    res.status(200).json({
      success: true,
      data: {
        fileId: fileData._id,
        fileName: fileData.originalName,
        summaryStats: summaryStats
      }
    });

  } catch (error) {
    console.error('Get summary stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating summary statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Chat with AI about uploaded data
 * POST /api/ai/chat
 * Body: { fileId: string, question: string }
 */
const chat = async (req, res) => {
  try {
    const { fileId, question } = req.body;
    const userId = req.user._id;

    if (!fileId) {
      return res.status(400).json({
        success: false,
        message: 'File ID is required'
      });
    }

    if (!question || !question.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Question is required'
      });
    }

    // Check if at least one AI provider is configured
    const hasProvider = process.env.HUGGINGFACE_API_KEY || 
                       process.env.GEMINI_API_KEY || 
                       process.env.OPENAI_API_KEY;
    
    if (!hasProvider) {
      return res.status(500).json({
        success: false,
        message: 'No AI provider is configured. Please set at least one of: HUGGINGFACE_API_KEY, GEMINI_API_KEY, or OPENAI_API_KEY in your environment variables.'
      });
    }

    // Fetch file data
    const fileData = await FileData.findOne({ 
      _id: fileId, 
      userId 
    }).select('originalName data columns rowCount fileType uploadDate');

    if (!fileData) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // Generate summary statistics
    const summaryStats = DataAnalyzer.generateSummaryStats(
      fileData.data,
      fileData.columns
    );

    // Format stats for AI
    const statsText = DataAnalyzer.formatStatsForAI(summaryStats);

    // Include sample data rows for more accurate analysis (up to 20 rows)
    // This helps the AI answer specific questions about actual values
    let sampleDataText = '';
    if (fileData.data && fileData.data.length > 0) {
      const sampleRows = fileData.data.slice(0, 20);
      sampleDataText = '\n\nSample Data (first ' + sampleRows.length + ' rows):\n';
      
      // Create a simple table-like representation
      const headers = fileData.columns.map(col => col.name).join(' | ');
      sampleDataText += headers + '\n';
      sampleDataText += '-'.repeat(Math.min(headers.length, 100)) + '\n';
      
      sampleRows.forEach((row, idx) => {
        const values = fileData.columns.map(col => {
          const val = row[col.name];
          if (val === null || val === undefined) return 'N/A';
          return String(val).substring(0, 30); // Truncate long values
        }).join(' | ');
        sampleDataText += values + '\n';
      });
      
      if (fileData.data.length > 20) {
        sampleDataText += `\n... and ${fileData.data.length - 20} more rows`;
      }
    }

    // Create AI prompt with the user's question
    const prompt = `You are a data analyst assistant. Based on the following data summary and sample data, answer the user's question accurately and helpfully.

Data Summary:
${statsText}${sampleDataText}

User Question: ${question.trim()}

Please analyze the data and provide a clear, concise answer to the question. If the question asks about specific values (like revenue for a particular year), analyze the sample data provided. If the question cannot be answered from the provided data, please explain what information is available and what might be needed to answer the question.`;

    const systemPrompt = 'You are a helpful data analyst assistant. Answer questions about data clearly and accurately based on the provided data summary, Try to answer the question in a way that is easy to understand and follow and in a single sentence.';

    // Call AI provider (with automatic fallback)
    let aiResponse;
    try {
      aiResponse = await generateAIInsights(prompt, systemPrompt);
    } catch (aiError) {
      console.error('AI API error:', aiError);
      return res.status(500).json({
        success: false,
        message: 'Error calling AI API: ' + aiError.message
      });
    }

    res.status(200).json({
      success: true,
      data: {
        fileId: fileData._id,
        fileName: fileData.originalName,
        question: question.trim(),
        answer: aiResponse,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing chat request',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

module.exports = {
  generateInsights,
  getSummaryStats,
  chat
};
