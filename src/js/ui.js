import * as DOM from './dom.js';
import { state } from './state.js';

/**
 * Add a transaction to the DOM list
 * @param {object} transaction 
 */
export function addTransactionDOM(transaction) {
    const sign = transaction.amount < 0 ? '-' : '+';
    const item = document.createElement('li');

    // Add animation class if it's the newest item being added
    if (state.currentPage === 1 && state.sortOrder === 'date-desc') {
        item.classList.add('new-item-animation');
    }

    item.classList.add(transaction.amount < 0 ? 'minus' : 'plus');

    item.innerHTML = `
        <button class="edit-btn" aria-label="Edit transaction for ${transaction.text}" onclick="showEditModal(${transaction.id})">✎</button>
        ${transaction.text} <span class="category-label">[${transaction.category}]</span> <span>${sign}${Math.abs(transaction.amount).toFixed(2)}</span>
        <button class="delete-btn" aria-label="Delete transaction for ${transaction.text}" onclick="removeTransaction(${transaction.id})">x</button>
    `;

    DOM.list.appendChild(item);
}

/**
 * Update the balance, income, and expense
 */
export function updateValues(filteredTransactions) {
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

    DOM.balance.innerText = `$${total}`;
    DOM.money_plus.innerText = `+$${income}`;
    DOM.money_minus.innerText = `-$${expense}`;
}

/**
 * Updates the expense pie chart
 */
export function updateChart(filteredTransactions) {
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

    if (state.expenseChart) {
        // If chart exists, update its data
        state.expenseChart.data.labels = labels;
        state.expenseChart.data.datasets[0].data = data;
        state.expenseChart.update();
    } else {
        // Otherwise, create a new chart
        state.expenseChart = new Chart(DOM.chartCanvas, {
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
                        const category = state.expenseChart.data.labels[clickedElementIndex];
                        
                        // Update the filter dropdown and re-render
                        DOM.filterCategory.value = category;
                        // This is a bit tricky, we need to call render from app.js
                        // We'll dispatch a custom event
                        document.dispatchEvent(new CustomEvent('render'));
                    }
                },
                responsive: true,
            }
        });
    }
}

/**
 * Show the modal and populate it with transaction data
 * @param {object} transaction 
 */
export function showEditModal(transaction) {
    // Populate category dropdown in modal
    DOM.editCategory.innerHTML = DOM.addCategory.innerHTML;

    DOM.editId.value = transaction.id;
    DOM.editText.value = transaction.text;
    DOM.editCategory.value = transaction.category;
    DOM.editAmount.value = transaction.amount;

    DOM.editModal.style.display = 'block';
    DOM.editText.focus(); // Set focus to the first input in the modal
}

export function showAddTxModal() {
    DOM.addTxModal.style.display = 'block';
    DOM.addText.focus();
}

export function closeAddTxModal() {
    DOM.addTxModal.style.display = 'none';
}

export function closeEditModal() {
    DOM.editModal.style.display = 'none';
}

export function showDeleteModal(id) {
    state.transactionToDelete = id;
    DOM.deleteModal.style.display = 'block';
}

export function closeDeleteModal() {
    state.transactionToDelete = null;
    DOM.deleteModal.style.display = 'none';
}

/**
 * Populate filter dropdowns
 */
export function populateFilters(transactions) {
    // Category filter
    const categories = [...new Set(transactions.map(tx => tx.category))];
    DOM.filterCategory.innerHTML = '<option value="all">All Categories</option>';
    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat.charAt(0).toUpperCase() + cat.slice(1);
        DOM.filterCategory.appendChild(option);
    });
}

export function switchTheme(isDark) {
    if (isDark) {
        document.body.classList.add('dark-mode');
        localStorage.setItem('theme', 'dark');
    } else {
        document.body.classList.remove('dark-mode');
        localStorage.setItem('theme', 'light');
    }
}

export function renderUI(paginatedTransactions, totalPages) {
    DOM.spinner.style.display = 'flex';
    DOM.noTransactionsMessage.style.display = 'none';
    DOM.list.innerHTML = '';
    DOM.paginationContainer.style.display = 'none';

    setTimeout(() => {
        // Re-populate the list with paginated transactions
        paginatedTransactions.forEach(addTransactionDOM);

        // Update pagination UI
        if (totalPages > 1) {
            DOM.paginationContainer.style.display = 'flex';
            DOM.pageInfo.textContent = `${state.currentPage}/${totalPages}`;
            DOM.prevBtn.disabled = state.currentPage === 1;
            DOM.nextBtn.disabled = state.currentPage === totalPages;
        }

        if (paginatedTransactions.length === 0) {
            DOM.noTransactionsMessage.style.display = 'block';
        }
        DOM.spinner.style.display = 'none';
    }, 200); // 200ms delay
}