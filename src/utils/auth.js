export const getCurrentEmployee = () => {
    const employee = localStorage.getItem('employee');
    try {
        return employee ? JSON.parse(employee) : null;
    } catch {
        return null;
    }
};

export const getToken = () => {
    return localStorage.getItem('token') || null;
};