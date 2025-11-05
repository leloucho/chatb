const { initDatabase } = require('./database');

// Script para inicializar la base de datos
initDatabase()
    .then(() => {
        console.log('Base de datos inicializada correctamente');
        process.exit(0);
    })
    .catch((err) => {
        console.error('Error inicializando la base de datos:', err);
        process.exit(1);
    });