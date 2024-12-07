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

function openPopup() {
    const overlay = document.getElementById('popup-overlay');
    overlay.style.visibility = 'visible';
    overlay.style.opacity = '1';

    // Fetch categories when the popup opens
    fetchCategories();
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
