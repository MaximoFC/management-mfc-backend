// Las variables se cargan con --env-file (npm run dev / npm start) antes de importar nada
const REQUIRED_ENV = ['MONGODB_URI', 'JWT_SECRET', 'CORS_ORIGIN', 'RESEND_API_KEY', 'FRONTEND_URL'];
const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missing.length) {
    console.error(`Faltan variables de entorno: ${missing.join(', ')}`);
    process.exit(1);
}

const { default: app } = await import('./src/app.js');
const { default: mongoose } = await import('mongoose');
await import('./src/jobs/warranties.job.js');

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, (error) => {
    if (error) {
        console.error("Error starting server: ", error);
        process.exit(1);
    }
    console.log(`Server on port ${PORT}`);
});

// Railway manda SIGTERM al redeployar: terminar los pedidos en curso antes de cortar
const shutdown = (signal) => {
    console.log(`${signal} recibido, cerrando servidor...`);
    server.close(async () => {
        await mongoose.disconnect();
        process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
    console.error('Unhandled rejection:', reason);
});
