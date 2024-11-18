function applyRowStyles(row) {
    const assigned = parseFloat(row.children[1].textContent.replace('$', '').trim()) || 0;
    const activity = parseFloat(row.children[2].textContent.replace('$', '').trim()) || 0;
    const goal = parseFloat(row.children[4].textContent.replace('$', '').trim()) || 0;

    const available = assigned - activity;
    const availableCell = row.querySelector('td.activity');
    availableCell.textContent = `$${available.toFixed(2)}`;

    if (available < 0) {
        availableCell.classList.add('negative');
        availableCell.classList.remove('neutral');
    } else {
        availableCell.classList.add('neutral');
        availableCell.classList.remove('negative');
    }

    const progressCell = document.createElement('td');
    const progressContainer = document.createElement('div');
    progressContainer.classList.add('progress-container');
    
    const progressBar = document.createElement('div');
    progressBar.classList.add('progress-bar');
    
    const progressPercent = (assigned / goal) * 100;
    progressBar.style.width = `${Math.min(Math.max(progressPercent, 0), 100)}%`;

    if (assigned >= goal) {
        progressBar.style.backgroundColor = 'green';
    } else if (available > 0) {
        progressBar.style.backgroundColor = '#fbc02d';
    } else {
        progressBar.style.backgroundColor = 'red';
    }

    progressContainer.appendChild(progressBar);
    progressCell.appendChild(progressContainer);

    row.insertBefore(progressCell, row.children[1]);
}

document.addEventListener("DOMContentLoaded", function() {
    const rows = document.querySelectorAll('.budget-table tbody tr:not(.add-category)');

    rows.forEach(row => {
        applyRowStyles(row);
    });

    const addCategoryRow = document.querySelector('.add-category');
    const popupOverlay = document.getElementById('add-category-popup');
    const addButton = document.getElementById('add-category-confirm');
    const cancelButton = document.getElementById('add-category-cancel');
    const categoryNameInput = document.getElementById('category-name');
    const goalAmountInput = document.getElementById('goal-amount');

    addCategoryRow.addEventListener('click', () => {
        popupOverlay.classList.add('show');
    });

    cancelButton.addEventListener('click', () => {
        popupOverlay.classList.remove('show');
        categoryNameInput.value = '';
        goalAmountInput.value = '';
    });

    addButton.addEventListener('click', () => {
        const newCategory = categoryNameInput.value.trim();
        const goalAmount = parseFloat(goalAmountInput.value.trim());

        if (newCategory && !isNaN(goalAmount)) {
            const newRow = document.createElement('tr');
            
            newRow.innerHTML = `
                <td>
                    <span class="material-symbols-rounded">star</span> ${newCategory}
                </td>
                <td>$0</td>
                <td>$0</td>
                <td class="activity neutral">$0</td>
                <td>$${goalAmount.toFixed(2)}</td>
            `;
            
            document.querySelector('.budget-table tbody').insertBefore(newRow, addCategoryRow);
            
            applyRowStyles(newRow);

            popupOverlay.classList.remove('show');
            categoryName
            popupOverlay.classList.remove('show');
            categoryNameInput.value = '';
            goalAmountInput.value = '';
        }
    });
});