const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');

const queueRoutes = require('./routes/queue');
const settingsRoutes = require('./routes/settings');
const systemRoutes = require('./routes/system');
const eventsRoutes = require('./routes/events');

function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.use('/api/queue', queueRoutes);
  app.use('/api/settings', settingsRoutes);
  app.use('/api/system', systemRoutes);
  app.use('/api/events', eventsRoutes);

  const clientDist = path.join(__dirname, '..', 'client', 'dist');
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get(/^\/(?!api).*/, (req, res) => {
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

module.exports = { createApp };
