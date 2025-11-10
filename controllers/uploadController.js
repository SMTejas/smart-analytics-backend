const FileData = require('../models/FileData');
const FileProcessor = require('../utils/fileProcessor');
const path = require('path');

// Upload and process file
const uploadFile = async (req, res) => {
  try {
    console.log('Upload request received:', {
      hasFile: !!req.file,
      fileInfo: req.file ? {
        originalname: req.file.originalname,
        filename: req.file.filename,
        path: req.file.path,
        size: req.file.size
      } : null,
      userId: req.user?._id
    });

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const userId = req.user._id;
    const filePath = req.file.path;
    const fileName = req.file.filename;
    const originalName = req.file.originalname;
    const fileSize = req.file.size;
    const fileType = FileProcessor.getFileType(originalName);

    console.log('Processing file:', { filePath, fileName, originalName, fileType });

    let processedData;

    // Process file based on type
    try {
      if (fileType === 'csv') {
        console.log('Processing CSV file...');
        processedData = await FileProcessor.processCSV(filePath);
      } else if (['xlsx', 'xls'].includes(fileType)) {
        console.log('Processing Excel file...');
        processedData = await FileProcessor.processExcel(filePath);
      } else {
        return res.status(400).json({
          success: false,
          message: 'Unsupported file type'
        });
      }
      console.log('File processed successfully:', { 
        rowCount: processedData.rowCount, 
        columnsCount: processedData.columns.length,
        columns: processedData.columns
      });
    } catch (processError) {
      console.error('File processing error:', processError);
      return res.status(500).json({
        success: false,
        message: 'Error processing file: ' + processError.message
      });
    }

    // Save to database
    console.log('Saving to database with columns:', JSON.stringify(processedData.columns, null, 2));
    console.log('Columns type:', typeof processedData.columns);
    console.log('Is array:', Array.isArray(processedData.columns));
    console.log('Columns length:', processedData.columns.length);
    
    // Create a deep copy of columns to avoid any reference issues
    const columnsCopy = JSON.parse(JSON.stringify(processedData.columns));
    console.log('Columns copy:', JSON.stringify(columnsCopy, null, 2));
    
    // Validate columns structure
    if (!Array.isArray(columnsCopy)) {
      throw new Error('Columns must be an array');
    }
    
    for (let i = 0; i < columnsCopy.length; i++) {
      const col = columnsCopy[i];
      if (!col || typeof col !== 'object' || !col.name || !col.type) {
        throw new Error(`Invalid column structure at index ${i}: ${JSON.stringify(col)}`);
      }
    }
    
    console.log('Columns validation passed');
    
    const fileData = new FileData({
      userId: userId,
      fileName: fileName,
      originalName: originalName,
      fileType: fileType,
      fileSize: fileSize,
      data: processedData.data,
      columns: columnsCopy,
      rowCount: processedData.rowCount,
      isProcessed: true
    });

    console.log('FileData object before save:', {
      columns: fileData.columns,
      columnsType: typeof fileData.columns,
      columnsLength: fileData.columns.length
    });

    await fileData.save();

    // Clean up uploaded file
    await FileProcessor.cleanupFile(filePath);

    res.status(201).json({
      success: true,
      message: 'File uploaded and processed successfully',
      data: {
        fileId: fileData._id,
        fileName: originalName,
        fileType: fileType,
        rowCount: processedData.rowCount,
        columns: processedData.columns,
        uploadDate: fileData.uploadDate
      }
    });

  } catch (error) {
    console.error('Upload error:', error);
    
    // Clean up file on error
    if (req.file && req.file.path) {
      await FileProcessor.cleanupFile(req.file.path);
    }

    res.status(500).json({
      success: false,
      message: 'Error processing file',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get user's uploaded files
const getUserFiles = async (req, res) => {
  try {
    const userId = req.user._id;
    const files = await FileData.find({ userId })
      .select('originalName fileType rowCount uploadDate isProcessed')
      .sort({ uploadDate: -1 });

    res.status(200).json({
      success: true,
      data: files
    });
  } catch (error) {
    console.error('Get files error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching files',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get specific file data
const getFileData = async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.user._id;

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

    res.status(200).json({
      success: true,
      data: fileData
    });
  } catch (error) {
    console.error('Get file data error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching file data',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Delete file
const deleteFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.user._id;

    const fileData = await FileData.findOneAndDelete({ 
      _id: fileId, 
      userId 
    });

    if (!fileData) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting file',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

module.exports = {
  uploadFile,
  getUserFiles,
  getFileData,
  deleteFile
};
