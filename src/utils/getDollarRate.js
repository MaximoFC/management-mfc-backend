import axios from "axios";

const getDollarBlueRate = async () => {
    try {
        const response = await axios.get('https://api.bluelytics.com.ar/v2/latest', { timeout: 5000 });
        return response.data.blue.value_sell;
    } catch (error) {
        console.error('Error getting dollar rate: ', error.message);
        return 1000;
    }
};

export default getDollarBlueRate;