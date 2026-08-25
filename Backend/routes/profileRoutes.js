const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const {
    getMyProfile,
    updateMyPhone,
    uploadDocument,
    deleteDocument
} = require('../controllers/profileController');
const { protect } = require('../middleware/authMiddleware');

// File storage setup
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/documents/');
    },
    filename: function (req, file, cb) {
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});

const fileFilter = (req, file, cb) => {
    const allowed = /jpeg|jpg|png|pdf|doc|docx/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype) || file.mimetype === 'application/msword' || file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.mimetype === 'application/pdf';

    if (ext || mime) {
        cb(null, true);
    } else {
        cb(new Error('Only images and PDF/DOC files are allowed'));
    }
};

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter
});

router.get('/me', protect, getMyProfile);
router.put('/phone', protect, updateMyPhone);
router.post('/documents', protect, upload.single('document'), uploadDocument);
router.delete('/documents/:id', protect, deleteDocument);

module.exports = router;