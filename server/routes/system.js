const express = require('express');
const { getSystemStatus } = require('../services/startupChecks');

const router = express.Router();

router.get('/status', (req, res) => {
  res.json(getSystemStatus());
});

module.exports = router;
