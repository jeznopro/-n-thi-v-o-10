const express = require('express');
const router = express.Router();
const teacherController = require('../controllers/teacherController');
const { authenticate, requireTeacher } = require('../middlewares/auth');

router.use(authenticate, requireTeacher);

router.get('/', teacherController.getClasses);
router.post('/', teacherController.createClass);
router.put('/:id', teacherController.updateClass);
router.delete('/:id', teacherController.deleteClass);

module.exports = router;
