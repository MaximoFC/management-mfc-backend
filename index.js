import app from './src/app.js';
import './src/jobs/warranties.job.js';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server on port ${PORT}`);
});