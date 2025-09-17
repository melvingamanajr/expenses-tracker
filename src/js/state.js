export const state = {
    currentPage: 1,
    itemsPerPage: 5,
    sortOrder: 'date-desc', // 'date-desc' or 'date-asc'
    transactionToDelete: null,
    expenseChart: null, // To hold the chart instance
};

const localStorageTransactions = JSON.parse(localStorage.getItem('transactions'));

export let transactions = localStorage.getItem('transactions') !== null ? localStorageTransactions : [];

export function setTransactions(newTransactions) {
    transactions = newTransactions;
}