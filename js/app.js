import * as DOM from './dom.js';
import { state, transactions, setTransactions } from './state.js';
import {
    addTransactionDOM,
    updateValues,
    updateChart,
    showEditModal as showEditModalUI,
    showAddTxModal,
    closeAddTxModal,
    closeEditModal,
    showDeleteModal,
    closeDeleteModal,
    // We don't need to import show/close for clearAll, we'll handle it here.
    populateFilters as populateFiltersUI,
    switchTheme as switchThemeUI,
    renderUI
} from './ui.js';


// --- Functions ---

/**
 * Add a new transaction from the form
 * @param {Event} e 
 */
function addTransaction(e) {
    e.preventDefault();
    if (DOM.addText.value.trim() === '' || DOM.addAmount.value.trim() === '' || DOM.addCategory.value === '') {
        alert('Please fill in all fields');
        return false;
    } else {
        const transaction = {
            id: generateID(),
            category: DOM.addCategory.value,
            date: new Date().toISOString(), // Add current date
            text: DOM.addText.value,
            amount: +DOM.addAmount.value
        };
        
        setTransactions([...transactions, transaction]);
        updateLocalStorage();
        // Clear form fields
        DOM.addText.value = '';
        DOM.addAmount.value = '';
        DOM.addCategory.selectedIndex = 0; // Reset dropdown
        return true;
    }
}

/**
 * Generate a random ID for a transaction
 * @returns {number}
 */
function generateID() {
    return Math.floor(Math.random() * 100000000);
}

// Make functions global so inline onclick handlers can find them
window.showEditModal = (id) => {
    const transaction = transactions.find(tx => tx.id === id);
    if (transaction) {
        showEditModalUI(transaction);
    }
}

/**
 * Update a transaction after editing
 * @param {Event} e 
 */
function updateTransaction(e) {
    e.preventDefault(); // Prevent form from submitting and reloading the page
    const transactionId = +DOM.editId.value;
    
    const updatedTransactions = transactions.map(tx => {
        if (tx.id === transactionId) {
            return {
                id: transactionId,
                date: new Date().toISOString(), // Update the date on edit
                text: DOM.editText.value,
                category: DOM.editCategory.value,
                amount: +DOM.editAmount.value
            };
        }
        return tx;
    });
    setTransactions(updatedTransactions);
    updateLocalStorage();
    closeEditModal();
    render(); // Re-render with updated data
}

/**
 * Remove a transaction by its ID
 * @param {number} id 
 */
window.removeTransaction = (id) => {
    showDeleteModal(id);
}

function confirmDelete() {
    if (state.transactionToDelete !== null) {
        const newTransactions = transactions.filter(transaction => transaction.id !== state.transactionToDelete);
        setTransactions(newTransactions);
        updateLocalStorage();
        render();
    }
    closeDeleteModal();
}

function showClearAllModal() {
    DOM.clearAllModal.style.display = 'block';
}

function closeClearAllModal() {
    DOM.clearAllModal.style.display = 'none';
}

function confirmClearAll() {
    setTransactions([]);
    updateLocalStorage();
    populateFiltersUI(transactions);
    render();
    closeClearAllModal();
}

/**
 * Update transactions in local storage
 */
function updateLocalStorage() {
    localStorage.setItem('transactions', JSON.stringify(transactions));
}

/**
 * Gathers currently filtered and sorted data and initiates CSV download.
 */
function exportToCSV() {
    let filteredTransactions = [...transactions];

    // Apply filters (same logic as in render function)
    const categoryFilterValue = DOM.filterCategory.value;
    if (categoryFilterValue && categoryFilterValue !== 'all') {
        filteredTransactions = filteredTransactions.filter(tx => tx.category === categoryFilterValue);
    }
    const startDateValue = DOM.filterDateStart.value;
    if (startDateValue) {
        const startDate = new Date(startDateValue);
        startDate.setUTCHours(0, 0, 0, 0);
        filteredTransactions = filteredTransactions.filter(tx => new Date(tx.date) >= startDate);
    }

    // Apply sorting (same logic as in render function)
    filteredTransactions = sortTransactions(filteredTransactions, state.sortOrder);

    // Convert data to CSV format
    const csvHeader = "ID,Date,Description,Category,Amount\n";
    const csvRows = filteredTransactions.map(tx => { // Use the filtered and sorted list
        const date = new Date(tx.date).toLocaleDateString();
        // Escape commas in description to prevent breaking CSV format
        const description = `"${tx.text.replace(/"/g, '""')}"`; 
        return [tx.id, date, description, tx.category, tx.amount].join(',');
    }).join('\n');

    const csvContent = csvHeader + csvRows;

    // Create a Blob and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "transactions.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * Sorts an array of transactions based on the sort order.
 * @param {Array<object>} transactionsToSort 
 * @param {string} sortOrder 
 * @returns {Array<object>} The sorted array.
 */
function sortTransactions(transactionsToSort, sortOrder) {
    return transactionsToSort.sort((a, b) => {
        if (sortOrder === 'date-asc') {
            return new Date(a.date) - new Date(b.date);
        } else { // 'date-desc'
            return new Date(b.date) - new Date(a.date);
        }
    });
}

/**
 * Applies all active filters and re-renders the UI
 */
function render() {    
    // Start with all transactions
    let filteredTransactions = [...transactions];

    // Apply category filter
    const categoryFilterValue = DOM.filterCategory.value;
    if (categoryFilterValue && categoryFilterValue !== 'all') {
        filteredTransactions = filteredTransactions.filter(tx => tx.category === categoryFilterValue);
    }

    // Apply date filter
    const startDateValue = DOM.filterDateStart.value;
    if (startDateValue) {
        // Set time to 00:00:00 to include the whole day
        const startDate = new Date(startDateValue);
        startDate.setUTCHours(0, 0, 0, 0);
        filteredTransactions = filteredTransactions.filter(tx => new Date(tx.date) >= startDate);
    }

    // Apply sorting
    filteredTransactions = sortTransactions(filteredTransactions, state.sortOrder);

    // --- Pagination Logic ---
    const totalItems = filteredTransactions.length;
    const totalPages = Math.ceil(totalItems / state.itemsPerPage);
    state.currentPage = Math.min(state.currentPage, totalPages) || 1;

    const startIndex = (state.currentPage - 1) * state.itemsPerPage;
    const endIndex = startIndex + state.itemsPerPage;
    const paginatedTransactions = filteredTransactions.slice(startIndex, endIndex);

    // Update summary and chart with filtered (but not paginated) data
    updateValues(filteredTransactions);
    updateChart(filteredTransactions);

    // Update the list and pagination controls
    renderUI(paginatedTransactions, totalPages);
}

/**
 * Initialize the application
 */
function init() {
    populateFiltersUI(transactions);
    render();
}

// --- Theme Switcher Logic ---
function switchTheme(e) {
    switchThemeUI(e.target.checked);
    // Re-render chart with new theme colors
    if (state.expenseChart) {
        state.expenseChart.destroy();
        state.expenseChart = null; // Important to nullify
        render();
    }
}

// --- Event Listeners ---
DOM.form.addEventListener('submit', (e) => {
    const success = addTransaction(e);
    if (success) {
        state.currentPage = 1; // Go to first page to show new item
        populateFiltersUI(transactions); // Repopulate in case a new category was added
        closeAddTxModal();
        render();
    }
});
DOM.editForm.addEventListener('submit', updateTransaction);

DOM.showAddTxModalBtn.addEventListener('click', showAddTxModal);
DOM.addTxModal.querySelector('.close-btn').addEventListener('click', closeAddTxModal);

DOM.themeToggle.addEventListener('change', switchTheme);

DOM.editModal.querySelector('.close-btn').addEventListener('click', closeEditModal);

DOM.confirmDeleteBtn.addEventListener('click', confirmDelete);
DOM.cancelDeleteBtn.addEventListener('click', closeDeleteModal);

DOM.clearAllBtn.addEventListener('click', showClearAllModal);
DOM.confirmClearAllBtn.addEventListener('click', confirmClearAll);
DOM.cancelClearAllBtn.addEventListener('click', closeClearAllModal);

window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (DOM.editModal.style.display === 'block') closeEditModal();
        if (DOM.addTxModal.style.display === 'block') closeAddTxModal();
        if (DOM.deleteModal.style.display === 'block') closeDeleteModal();
        if (DOM.clearAllModal.style.display === 'block') closeClearAllModal();
    }
});
window.addEventListener('click', (e) => { // Close modal on outside click
    if (e.target === DOM.editModal || e.target === DOM.addTxModal || e.target === DOM.deleteModal || e.target === DOM.clearAllModal) {
        closeEditModal();
        closeAddTxModal();
        closeDeleteModal();
        closeClearAllModal();
    }
});
DOM.filterCategory.addEventListener('change', () => { state.currentPage = 1; render(); });
DOM.filterDateStart.addEventListener('change', () => { state.currentPage = 1; render(); });
DOM.sortBtn.addEventListener('click', () => {
    state.sortOrder = state.sortOrder === 'date-desc' ? 'date-asc' : 'date-desc';
    state.currentPage = 1;
    render();
});
DOM.exportCsvBtn.addEventListener('click', exportToCSV);
DOM.resetFiltersBtn.addEventListener('click', () => {
    state.currentPage = 1;
    state.sortOrder = 'date-desc'; // Reset sort order
    DOM.filterCategory.value = 'all';
    DOM.filterDateStart.value = '';
    render();
});
DOM.prevBtn.addEventListener('click', () => {
    if (state.currentPage > 1) {
        state.currentPage--;
        render();
    }
});
DOM.nextBtn.addEventListener('click', () => {
    state.currentPage++;
    render();
});
// Custom event listener for chart clicks
document.addEventListener('render', () => render());

// --- Initial Load ---
const currentTheme = localStorage.getItem('theme');
if (currentTheme === 'dark') {
    switchThemeUI(true);
    DOM.themeToggle.checked = true;
}

init();
