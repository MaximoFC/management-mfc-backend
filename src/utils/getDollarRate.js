import axios from "axios";

let cachedRate = null;
let lastFetchTime = 0;

const getDollarBlueRate = async () => {
    const now = Date.now();
    const fifteenMinutes = 15 * 60 * 1000;
    
    if (cachedRate && (now - lastFetchTime < fifteenMinutes)) {
        return cachedRate;
    }

    try {
        const response = await axios.get('https://api.bluelytics.com.ar/v2/latest', { timeout: 5000 });
        cachedRate = response.data.blue.value_sell;
        lastFetchTime = now;
        return cachedRate;
    } catch (error) {
        console.error('Error getting dollar rate: ', error.message);
        return cachedRate || 1445;
    }
};

export default getDollarBlueRate;