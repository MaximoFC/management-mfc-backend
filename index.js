import app from './src/app.js';
import './src/jobs/warranties.job.js';

const PORT = process.env.PORT || 3000;

app.listen(PORT, (error) => {
    if (error) {
        console.error("Error starting server: ", error);
        process.exit(1);
    }
    console.log(`Server on port ${PORT}`);
});