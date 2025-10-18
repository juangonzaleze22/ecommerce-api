const express = require('express');
const router = express.Router();

// Ruta de bienvenida
router.get('/', (req, res) => {
  res.json({
    mensaje: '¡Bienvenido a tuEstadoApi!',
    estado: 'online',
    version: '1.0.0'
  });
});

module.exports = router; 