const express = require('express');
const router = express.Router();
const parentController = require('../controllers/parentController');

// Tra cứu tiến độ học tập của học sinh (công khai cho phụ huynh tra cứu bằng Mã học sinh)
router.get('/lookup/:code', parentController.lookupStudentProgress);
router.get('/lookup', parentController.lookupStudentProgress);

module.exports = router;
