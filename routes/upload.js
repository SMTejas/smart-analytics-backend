const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { authenticateToken } = require('../middleware/auth');
const { uploadFile, getUserFiles, getFileData, deleteFile } = require('../controllers/uploadController');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

// All routes require authentication
router.use(authenticateToken);

// Upload file
router.post('/upload', upload.single('file'), uploadFile);

// Get user's files
router.get('/files', getUserFiles);

// Get specific file data
router.get('/files/:fileId', getFileData);

// Delete file
router.delete('/files/:fileId', deleteFile);

module.exports = router;
