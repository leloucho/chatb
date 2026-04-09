function registerProcessHandlers() {
    // Manejo de cierre graceful
    process.on('SIGINT', () => {
        console.log('\n🛑 Cerrando servidor...');
        process.exit(0);
    });

    process.on('SIGTERM', () => {
        console.log('\n🛑 Cerrando servidor...');
        process.exit(0);
    });
}

module.exports = {
    registerProcessHandlers
};
