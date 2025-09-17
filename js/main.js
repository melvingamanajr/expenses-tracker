// --- DOM Elements ---
const balance = document.getElementById('balance');
const money_plus = document.getElementById('money-plus');
const money_minus = document.getElementById('money-minus');
const list = document.getElementById('list');
const form = document.getElementById('form'); // The form in the "Add" modal
const addText = document.getElementById('add-text');
const addAmount = document.getElementById('add-amount');
const addCategory = document.getElementById('add-category');

// --- Modal DOM Elements ---
const addTxModal = document.getElementById('add-tx-modal');
const showAddTxModalBtn = document.getElementById('show-add-tx-modal-btn');
const closeAddTxModalBtn = addTxModal.querySelector('.close-btn');
const modal = document.getElementById('edit-modal');
const closeModalBtn = modal.querySelector('.close-btn');
const editForm = document.getElementById('edit-form');
const editId = document.getElementById('edit-id');
const editText = document.getElementById('edit-text');
const editCategory = document.getElementById('edit-category');
const editAmount = document.getElementById('edit-amount');

// --- Delete Modal Elements ---
const deleteModal = document.getElementById('delete-modal');
const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
// --- Filter Elements ---
const filterCategory = document.getElementById('filter-category');
const filterDateStart = document.getElementById('filter-date-start');
const sortBtn = document.getElementById('sort-btn');
const resetFiltersBtn = document.getElementById('reset-filters-btn');
const exportCsvBtn = document.getElementById('export-csv-btn');

// --- Pagination Elements ---
const paginationContainer = document.getElementById('pagination-container');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const pageInfo = document.getElementById('page-info');

// --- Chart Elements ---
const chartCanvas = document.getElementById('expense-chart');
let expenseChart; // To hold the chart instance

// --- UI Elements ---
const spinner = document.getElementById('spinner');

// --- Theme Elements ---
const themeToggle = document.getElementById('theme-toggle');

// --- App State ---
const state = {
    currentPage: 1,
    itemsPerPage: 5,
    sortOrder: 'date-desc', // 'date-desc' or 'date-asc'
    transactionToDelete: null
};
const localStorageTransactions = JSON.parse(localStorage.getItem('transactions'));
let transactions = localStorage.getItem('transactions') !== null ? localStorageTransactions : [];


// --- Functions ---

/**
 * Add a new transaction from the form
 * @param {Event} e 
 */
function addTransaction(e) {
    e.preventDefault();

    if (addText.value.trim() === '' || addAmount.value.trim() === '' || addCategory.value === '') {
        alert('Please fill in all fields');
        return false;
    } else {
        const transaction = {
            id: generateID(),
            category: addCategory.value,
            date: new Date().toISOString(), // Add current date
            text: addText.value,
            amount: +addAmount.value
        };

        transactions.push(transaction);
        updateLocalStorage();
        // Clear form fields
        addText.value = '';
        addAmount.value = '';
        addCategory.selectedIndex = 0; // Reset dropdown
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

/**
 * Add a transaction to the DOM list
 * @param {object} transaction 
 */
function addTransactionDOM(transaction) {
    const sign = transaction.amount < 0 ? '-' : '+';
    const item = document.createElement('li');

    // Add animation class if it's the newest item being added
    // We check if we are on the first page and sorting by newest first
    if (state.currentPage === 1 && state.sortOrder === 'date-desc') {
        item.classList.add('new-item-animation');
    }

    item.classList.add(transaction.amount < 0 ? 'minus' : 'plus');

    item.innerHTML = `
        <button class="edit-btn" aria-label="Edit transaction for ${transaction.text}" onclick="showEditModal(${transaction.id})">✎</button>
        ${transaction.text} <span class="category-label">[${transaction.category}]</span> <span>${sign}${Math.abs(transaction.amount).toFixed(2)}</span>
        <button class="delete-btn" aria-label="Delete transaction for ${transaction.text}" onclick="removeTransaction(${transaction.id})">x</button>
    `;

    list.appendChild(item);
}

/**
 * Update the balance, income, and expense
 */
function updateValues(filteredTransactions) {
    const amounts = filteredTransactions.map(transaction => transaction.amount);

    const total = amounts.reduce((acc, item) => acc + item, 0).toFixed(2);

    const income = amounts
        .filter(item => item > 0)
        .reduce((acc, item) => (acc += item), 0)
        .toFixed(2);

    const expense = (amounts
        .filter(item => item < 0)
        .reduce((acc, item) => (acc += item), 0) * -1)
        .toFixed(2);

    balance.innerText = `$${total}`;
    money_plus.innerText = `+$${income}`;
    money_minus.innerText = `-$${expense}`;
}

/**
 * Updates the expense pie chart
 */
function updateChart(filteredTransactions) {
    const expenseCategories = filteredTransactions
        .filter(tx => tx.amount < 0)
        .reduce((acc, tx) => {
            const category = tx.category;
            const amount = Math.abs(tx.amount);
            if (!acc[category]) {
                acc[category] = 0;
            }
            acc[category] += amount;
            return acc;
        }, {});

    const labels = Object.keys(expenseCategories);
    const data = Object.values(expenseCategories);

    if (expenseChart) {
        // If chart exists, update its data
        expenseChart.data.labels = labels;
        expenseChart.data.datasets[0].data = data;
        expenseChart.update();
    } else {
        // Otherwise, create a new chart
        expenseChart = new Chart(chartCanvas, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Expenses by Category',
                    data: data,
                    backgroundColor: [
                        '#c0392b', '#e74c3c', '#d35400', '#f39c12',
                        '#8e44ad', '#9b59b6', '#2980b9', '#3498db'
                    ],
                    hoverOffset: 4
                }]
            },
            options: {
                plugins: {
                    legend: {
                        labels: {
                            color: getComputedStyle(document.body).getPropertyValue('--font-color')
                        }
                    }
                },
                onClick: (e, elements) => {
                    if (elements.length > 0) {
                        const clickedElementIndex = elements[0].index;
                        const category = expenseChart.data.labels[clickedElementIndex];
                        
                        // Update the filter dropdown and re-render
                        filterCategory.value = category;
                        render();
                    }
                },
                responsive: true,
            }
        });
    }
}

/**
 * Show the modal and populate it with transaction data
 * @param {number} id 
 */
function showEditModal(id) {
    const transaction = transactions.find(tx => tx.id === id);
    if (!transaction) return;

    // Populate category dropdown in modal
    editCategory.innerHTML = addCategory.innerHTML;

    editId.value = transaction.id;
    editText.value = transaction.text;
    editCategory.value = transaction.category;
    editAmount.value = transaction.amount;

    modal.style.display = 'block';
    editText.focus(); // Set focus to the first input in the modal
}

function showAddTxModal() {
    addTxModal.style.display = 'block';
    addText.focus();
}

function closeAddTxModal() {
    addTxModal.style.display = 'none';
}
/**
 * Close the edit modal
 */
function closeEditModal() {
    // We need to find which edit button was clicked to return focus. This is an advanced topic.
    modal.style.display = 'none';
}

/**
 * Update a transaction after editing
 * @param {Event} e 
 */
function updateTransaction(e) {
    e.preventDefault(); // Prevent form from submitting and reloading the page
    const transactionId = +editId.value;
    
    transactions = transactions.map(tx => {
        if (tx.id === transactionId) {
            return {
                id: transactionId,
                date: new Date().toISOString(), // Update the date on edit
                text: editText.value,
                category: editCategory.value,
                amount: +editAmount.value
            };
        }
        return tx;
    });

    updateLocalStorage();
    closeEditModal();
    render(); // Re-render with updated data
}

/**
 * Remove a transaction by its ID
 * @param {number} id 
 */
function removeTransaction(id) {
    state.transactionToDelete = id;
    deleteModal.style.display = 'block';
}

function confirmDelete() {
    if (state.transactionToDelete !== null) {
        transactions = transactions.filter(transaction => transaction.id !== state.transactionToDelete);
        updateLocalStorage();
        render();
    }
    closeDeleteModal();
}
function closeDeleteModal() {
    state.transactionToDelete = null;
    deleteModal.style.display = 'none';
}

/**
 * Update transactions in local storage
 */
function updateLocalStorage() {
    localStorage.setItem('transactions', JSON.stringify(transactions));
}

/**
 * Populate filter dropdowns
 */
function populateFilters() {
    // Category filter
    const categories = [...new Set(transactions.map(tx => tx.category))];
    filterCategory.innerHTML = '<option value="all">All Categories</option>';
    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat.charAt(0).toUpperCase() + cat.slice(1);
        filterCategory.appendChild(option);
    });
}

/**
 * Gathers currently filtered and sorted data and initiates CSV download.
 */
function exportToCSV() {
    let filteredTransactions = [...transactions];

    // Apply filters (same logic as in render function)
    const categoryFilterValue = filterCategory.value;
    if (categoryFilterValue && categoryFilterValue !== 'all') {
        filteredTransactions = filteredTransactions.filter(tx => tx.category === categoryFilterValue);
    }
    const startDateValue = filterDateStart.value;
    if (startDateValue) {
        const startDate = new Date(startDateValue);
        startDate.setUTCHours(0, 0, 0, 0);
        filteredTransactions = filteredTransactions.filter(tx => new Date(tx.date) >= startDate);
    }

    // Apply sorting (same logic as in render function)
    const sorted = sortTransactions(filteredTransactions, state.sortOrder);
    

    // Convert data to CSV format
    const csvHeader = "ID,Date,Description,Category,Amount\n";
    const csvRows = filteredTransactions.map(tx => {
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
    spinner.style.display = 'flex';
    list.innerHTML = '';
    paginationContainer.style.display = 'none';

    // Simulate a short delay to make the spinner visible
    setTimeout(() => {
        // Start with all transactions
        let filteredTransactions = [...transactions];

        // Apply category filter
        const categoryFilterValue = filterCategory.value;
        if (categoryFilterValue && categoryFilterValue !== 'all') {
            filteredTransactions = filteredTransactions.filter(tx => tx.category === categoryFilterValue);
        }

        // Apply date filter
        const startDateValue = filterDateStart.value;
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

        // Re-populate the list with paginated transactions
        paginatedTransactions.forEach(addTransactionDOM);

        // Update summary and chart with filtered data
        updateValues(filteredTransactions);
        updateChart(filteredTransactions);

        // Update pagination UI
        if (totalPages > 1) {
            paginationContainer.style.display = 'flex';
            pageInfo.textContent = `${state.currentPage}/${totalPages}`;
            prevBtn.disabled = state.currentPage === 1;
            nextBtn.disabled = state.currentPage === totalPages;
        }

        spinner.style.display = 'none';
    }, 200); // 200ms delay
}

/**
 * Initialize the application
 */
function init() {
    populateFilters();
    render();
}

// --- Theme Switcher Logic ---
function switchTheme(e) {
    if (e.target.checked) {
        document.body.classList.add('dark-mode');
        localStorage.setItem('theme', 'dark');
    } else {
        document.body.classList.remove('dark-mode');
        localStorage.setItem('theme', 'light');
    }
    // Re-render chart with new theme colors
    if (expenseChart) {
        expenseChart.destroy();
        expenseChart = null; // Important to nullify
        render();
    }
}

// --- Event Listeners ---
form.addEventListener('submit', (e) => {
    const success = addTransaction(e);
    if (success) {
        state.currentPage = 1; // Go to first page to show new item
        populateFilters(); // Repopulate in case a new category was added
        closeAddTxModal();
        render();
    }
});
editForm.addEventListener('submit', updateTransaction);

showAddTxModalBtn.addEventListener('click', showAddTxModal);
closeAddTxModalBtn.addEventListener('click', closeAddTxModal);

themeToggle.addEventListener('change', switchTheme);

closeModalBtn.addEventListener('click', closeEditModal); // For Edit Modal

confirmDeleteBtn.addEventListener('click', confirmDelete);
cancelDeleteBtn.addEventListener('click', closeDeleteModal);

window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (modal.style.display === 'block') closeEditModal();
        if (addTxModal.style.display === 'block') closeAddTxModal();
    }
});
window.addEventListener('click', (e) => { // Close modal on outside click
    if (e.target === modal || e.target === addTxModal || e.target === deleteModal) {
        closeEditModal();
        closeAddTxModal();
        closeDeleteModal();
    }
});
filterCategory.addEventListener('change', () => { state.currentPage = 1; render(); });
filterDateStart.addEventListener('change', () => { state.currentPage = 1; render(); });
sortBtn.addEventListener('click', () => {
    state.sortOrder = state.sortOrder === 'date-desc' ? 'date-asc' : 'date-desc';
    state.currentPage = 1;
    render();
});
exportCsvBtn.addEventListener('click', exportToCSV);
resetFiltersBtn.addEventListener('click', () => {
    state.currentPage = 1;
    state.sortOrder = 'date-desc'; // Reset sort order
    filterCategory.value = 'all';
    filterDateStart.value = '';
    render();
});
prevBtn.addEventListener('click', () => {
    if (state.currentPage > 1) {
        state.currentPage--;
        render();
    }
});
nextBtn.addEventListener('click', () => {
    state.currentPage++;
    render();
});


// --- Initial Load ---
const currentTheme = localStorage.getItem('theme');
if (currentTheme === 'dark') {
    document.body.classList.add('dark-mode');
    themeToggle.checked = true;
}

init();
