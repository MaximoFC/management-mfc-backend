export const getCurrentEmployee = () => {
    const employee = localStorage.getItem('employee');
    try {
        return employee ? JSON.parse(employee) : null;
    } catch (err) {
        console.error("Error parsing employee: ", err);
        return null;
    }
};

export const getToken = () => {
    return localStorage.getItem('token') || null;
};