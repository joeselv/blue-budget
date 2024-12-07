const menuItems = document.querySelectorAll('.menu-item');

menuItems.forEach(item => {
    item.addEventListener('click', () => {
        menuItems.forEach(i => i.classList.remove('selected'));
        item.classList.add('selected');

        const pageTitle = document.querySelector('.page-title');
        const pageName = item.querySelector('span:last-child').textContent;
        pageTitle.textContent = pageName;
    });
});

// Logout button event listener
document.getElementById('logout-btn').addEventListener('click', async () => {
    try {
        const response = await fetch('/logout', { method: 'POST' });
        if (response.ok) {
            window.location.href = '/'; 
        } else {
            alert("Failed to log out. Please try again.");
        }
    } catch (error) {
        console.error("Logout error:", error);
        alert("An error occurred while logging out.");
    }
});

function openPopup() {
    const overlay = document.getElementById('popup-overlay');
    overlay.style.visibility = 'visible';
    overlay.style.opacity = '1';

    // Fetch categories when the popup opens
    fetchCategories();
}

async function fetchCategories() {
    const categorySelect = document.getElementById('transaction-category');
    try {
        const response = await fetch('/categories?userID=1&budgetID=1');
        if (!response.ok) {
            throw new Error('Failed to fetch categories');
        }
        const categories = await response.json();
        categorySelect.innerHTML = ''; // Clear existing options
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.category_id;
            option.textContent = category.category_name;

            // Add a custom data attribute for the icon URL
            option.setAttribute(
                'data-icon',
                `/resources/categoryIcons/${category.icon_name}`
            );

            categorySelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error fetching categories:', error);
        categorySelect.innerHTML = '<option value="">Error loading categories</option>';
    }
}

function closePopup() {
    const overlay = document.getElementById('popup-overlay');
    overlay.style.visibility = 'hidden';
    overlay.style.opacity = '0';
    document.getElementById('transaction-category').value = '';
    document.getElementById('transaction-description').value = '';
    document.getElementById('transaction-type').value = '';
    document.getElementById('transaction-date').value = '';
    document.getElementById('transaction-amount').value = '';
    document.getElementById('transaction-name').value = '';
}

async function saveTransaction() {
    const merchantName = document.getElementById('transaction-name').value;
    const amount = parseFloat(document.getElementById('transaction-amount').value);
    const transactionDate = document.getElementById('transaction-date').value;
    const transactionType = document.getElementById('transaction-type').value;
    const transactionDescription = document.getElementById('transaction-description').value;
    const categoryId = document.getElementById('transaction-category').value;
    const accountId = 1; // Hardcoded value

    if (!merchantName || !amount || !transactionDate || !transactionType || !categoryId) {
        alert('Please fill out all required fields.');
        return;
    }

    try {
        const response = await fetch('/api/transactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                merchant_name: merchantName,
                amount,
                transaction_date: transactionDate,
                transaction_type: transactionType,
                transaction_description: transactionDescription,
                account_id: accountId,
                category_id: categoryId
            })
        });

        if (!response.ok) {
            throw new Error('Failed to save transaction');
        }

        alert('Transaction saved successfully!');
        closePopup();
        // Optionally, refresh the table or fetch updated transactions
    } catch (error) {
        console.error('Error saving transaction:', error);
        alert('Error saving transaction.');
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const tableBody = document.getElementById('transactionsTableBody');
    const searchBar = document.getElementById('searchBar');
    let transactions = [];
    let categories = [];

    const userID = "1"; // Replace with actual userID
    const budgetID = "1"; // Replace with actual budgetID

    async function fetchCategories() {
        try {
            const response = await fetch(`/categories?userID=${userID}&budgetID=${budgetID}`);
            if (!response.ok) throw new Error('Failed to fetch categories');
            categories = await response.json();
        } catch (error) {
            console.error('Error fetching categories:', error);
            alert('Failed to load categories. Please try again.');
        }
    }

    async function fetchTransactions() {
        try {
            const response = await fetch(`/api/transactions?timestamp=${Date.now()}`);
            if (!response.ok) throw new Error('Failed to fetch transactions');
            transactions = await response.json();
            renderTable(transactions);
        } catch (error) {
            console.error('Error fetching transactions:', error);
            alert('Failed to load transactions. Please try again.');
        }
    }

    function renderTable(data) {
        tableBody.innerHTML = ''; // Clear existing rows

        data.forEach(transaction => {
            const row = document.createElement('tr');

            row.innerHTML = `
                <td>${transaction.transaction_id}</td>
                <td>${transaction.account_type}</td>
                <td class ="category-cell">
                    <span>${transaction.category_name || 'Uncategorized'}</span>
                    <button class="table-btn edit-btn">
                        <span class="material-symbols-rounded">edit</span>Edit
                    </button>
                </td>
                <td>${new Intl.DateTimeFormat('en-CA').format(new Date(transaction.transaction_date))}</td>
                <td class="${transaction.amount < 0 ? 'negative' : 'positive'}">${transaction.amount}</td>
                <td>${transaction.transaction_type}</td>
                <td>${transaction.merchant_name}</td>
            `;

            const categoryCell = row.children[2];
            const editButton = categoryCell.querySelector('.edit-btn');

            editButton.addEventListener('click', () => {
                const currentCategory = categoryCell.querySelector('span').textContent;

                categoryCell.innerHTML = `
                    <select>
                        ${categories.map(category => `
                            <option value="${category.category_id}" ${category.category_name === currentCategory ? 'selected' : ''}>
                                ${category.category_name}
                            </option>
                        `).join('')}
                    </select>
                    <button class="table-btn save">
                        <span class="material-symbols-rounded">save</span>Save
                    </button>
                `;

                const saveButton = categoryCell.querySelector('.save');
                saveButton.addEventListener('click', async () => {
                    const newCategoryId = categoryCell.querySelector('select').value;

                    try {
                        const updateResponse = await fetch('/api/update-category', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                transactionId: transaction.transaction_id,
                                categoryId: newCategoryId
                            })
                        });

                        if (!updateResponse.ok) throw new Error('Failed to update transaction category');

                        const updatedCategoryName = categories.find(cat => cat.category_id === parseInt(newCategoryId)).category_name;

                        categoryCell.innerHTML = `
                            <span>${updatedCategoryName}</span>
                            <button class="table-btn edit-btn">
                                <span class="material-symbols-rounded">edit</span>Edit
                            </button>
                        `;
                    } catch (error) {
                        console.error('Error updating transaction category:', error);
                        alert('Failed to update category. Please try again.');
                    }
                });
            });


            
            tableBody.appendChild(row);
        });
    }
     // Sorting logic
     function sortTable(column, type) {
        const ascending = !document.querySelector(`th[data-column="${column}"]`).classList.contains('asc');

        // Reset all column headers
        document.querySelectorAll('th').forEach(th => th.classList.remove('asc', 'desc'));

        // Add appropriate sorting class to the clicked column header
        const columnHeader = document.querySelector(`th[data-column="${column}"]`);
        columnHeader.classList.add(ascending ? 'asc' : 'desc');


        const sortedData = [...transactions].sort((a, b) => {
            // Handle column value retrieval
            let valA = a[column];
            let valB = b[column];

            // Special case for category_name: prioritize null or missing category_id
            if (column === 'category_name') {
                const hasCategoryA = a.category_name !== null && a.category_name !== undefined;
                const hasCategoryB = b.category_name !== null && b.category_name !== undefined;
                console.log('travel' > 'eating out');
                // Prioritize rows with no category_id (null or undefined)
                if (!hasCategoryA && hasCategoryB) return ascending ? 1 : -1;
                if (!hasCategoryB && hasCategoryA) return ascending ? -1 : 1;

                 // If both have category_id, sort alphabetically by category_name
                 if (hasCategoryA && hasCategoryB) {
                    const charA = String(a.category_name || '').charAt(0).toLowerCase();
                    const charB = String(b.category_name || '').charAt(0).toLowerCase();
                    console.log(ascending, charA, charB, charA > charB);
                    if (ascending) {
                        return charA > charB ? 1 : -1;
                    } else {
                        return charA < charB ? -1 : 1;
                    }
                }
            }
        
            // General sorting logic
            if (type === 'number') {
                valA = parseFloat(valA) || 0;
                valB = parseFloat(valB) || 0;
            } else if (type === 'date') {
                valA = new Date(valA).getTime();
                valB = new Date(valB).getTime();
            } else {
                valA = String(valA || '').charAt(0).toLowerCase();
                valB = String(valB || '').charAt(0).toLowerCase();
            }
            console.log(typeof valA, typeof valB);
            // Ascending or descending comparison
            if (ascending) {
                return valA > valB ? 1 : -1;
            } else {
                return valA < valB ? 1 : -1;
            }
        });
        renderTable(sortedData);
    }

    // Add event listeners to sortable column headers
    document.querySelectorAll('.sortable').forEach(header => {
        header.addEventListener('click', () => {
            const column = header.dataset.column;
            const type = column == 'amount' ? 'number' : header.dataset.type;
            sortTable(column, type);
        });
    });

    await fetchCategories();
    await fetchTransactions();
});