export const commaNum = (val) => {
    return val ? val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") : '';
};
