export const getCurrentEmployee = () => {
    const employee = localStorage.getItem('employee');
    return employee ? JSON.parse(employee) : null;
};

export const getToken = () => {
    return localStorage.getItem('token');
};