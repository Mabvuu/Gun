// backend/src/routes/applications.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const authorizePhase = require('../middleware/authorizePhase');
const applicationController = require('../controllers/applicationController');

// list and get (public to authenticated users)
router.get('/', auth, applicationController.list);
router.get('/:id', auth, applicationController.get);

// advance - only authenticated + authorized for the app's current phase
router.post('/:id/advance', auth, authorizePhase, applicationController.advance);

module.exports = router;
