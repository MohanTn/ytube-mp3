const express = require('express');
const settingsService = require('../services/settingsService');
const { ValidationError } = require('../errors');

const router = express.Router();

router.get('/', (req, res) => {
  res.json(settingsService.getSettings());
});

router.put('/', async (req, res, next) => {
  try {
    const updated = await settingsService.updateSettings(req.body || {});
    res.json(updated);
  } catch (err) {
    if (err instanceof ValidationError) {
      return res.status(400).json({ errors: err.fieldErrors });
    }
    next(err);
  }
});

module.exports = router;
