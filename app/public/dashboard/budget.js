function applyRowStyles(row) {
    const assigned = parseFloat(row.children[1].textContent.replace('$', '').trim()) || 0;
    const activity = parseFloat(row.children[2].textContent.replace('$', '').trim()) || 0;
    const goal = parseFloat(row.children[4].textContent.replace('$', '').trim()) || 0;

    const available = assigned - activity;
    const availableCell = row.querySelector('td.activity');
    availableCell.textContent = `$${available.toFixed(2)}`;

    // Update available cell styles
    if (available < 0) {
        availableCell.classList.add('negative');
        availableCell.classList.remove('neutral');
    } else {
        availableCell.classList.add('neutral');
        availableCell.classList.remove('negative');
    }

    // Update or create progress bar
    let progressCell = row.querySelector('.progress-cell');
    if (!progressCell) {
        progressCell = document.createElement('td');
        progressCell.classList.add('progress-cell');
        row.insertBefore(progressCell, row.children[1]);
    }
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
    progressCell.innerHTML = '';
    progressCell.appendChild(progressContainer);

    let editButtonCell = row.querySelector('.edit-category-btn-cell');
    if (!editButtonCell) {
        editButtonCell = document.createElement('td');
        editButtonCell.classList.add('edit-category-btn-cell');
        row.appendChild(editButtonCell);
    }
    let editButton = editButtonCell.querySelector('.edit-category-btn');
    if (!editButton) {
        editButton = document.createElement('button');
        editButton.textContent = 'Edit';
        editButton.classList.add('edit-category-btn');
        editButtonCell.appendChild(editButton);
    }

    // Edit button click handler
    editButton.addEventListener('click', () => {
        openEditPopup(row);
    });
}

function openEditPopup(row) {
    const popupOverlay = document.getElementById('edit-category-popup');
    const categoryNameInput = document.getElementById('edit-category-name');
    const assignedAmountInput = document.getElementById('edit-assigned-amount');
    const confirmButton = document.getElementById('edit-category-confirm');
    const deleteButton = document.getElementById('edit-category-delete');

    const categoryCell = row.children[0];
    const categoryName = categoryCell.textContent.trim();
    console.log(row.children[2].textContent);
    const assignedAmount = parseFloat(row.children[2].textContent.replace('$', '').trim());

    categoryNameInput.value = categoryName;
    assignedAmountInput.value = assignedAmount;

    popupOverlay.classList.add('show');

    confirmButton.onclick = () => {
        const updatedAssignedAmount = parseFloat(assignedAmountInput.value.trim());
        if (!isNaN(updatedAssignedAmount)) {
            row.children[2].textContent = `$${updatedAssignedAmount.toFixed(2)}`;
            updateProgressBar(row);
            popupOverlay.classList.remove('show');
        } else {
            alert("Please enter a valid assigned amount.");
        }
    };

    deleteButton.onclick = () => {
        if (confirm(`Are you sure you want to delete the "${categoryName}" category?`)) {
            row.remove();
            popupOverlay.classList.remove('show');
        }
    };

    const cancelButton = document.getElementById('edit-category-cancel');
    cancelButton.onclick = () => {
        popupOverlay.classList.remove('show');
    };
}

document.addEventListener("DOMContentLoaded", function() {
    const rows = document.querySelectorAll('.budget-table tbody tr:not(.add-category)');
    rows.forEach(row => {
        applyRowStyles(row);
    });

    const iconFolderPath = '/resources/categoryIcons/';
    let selectedIcon = null;

    const iconSelector = document.getElementById("icon-selector");
    iconSelector.innerHTML = '';

    fetch('/icons')
        .then(response => response.json())
        .then(icons => {
            icons.forEach(icon => {
                const iconElement = document.createElement("img");
                iconElement.src = `${iconFolderPath}${icon}`;
                iconElement.alt = icon;
                iconElement.classList.add("icon-item");
                iconElement.dataset.iconName = icon;

                iconElement.addEventListener("click", function () {
                    document.querySelectorAll(".icon-item").forEach(item => item.classList.remove("selected"));
                    iconElement.classList.add("selected");
                    selectedIcon = iconElement.dataset.iconName;
                });

                iconSelector.appendChild(iconElement);
            });
        })
        .catch(error => {
            console.error("Error fetching icons:", error);
            alert("Failed to load icons.");
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
        const assignedAmount = parseFloat(document.getElementById('assigned-amount').value.trim());

        if (!selectedIcon) {
            alert("Please select an icon for the category.");
            return;
        }

        if (newCategory && !isNaN(goalAmount)) {
            const newRow = document.createElement('tr');
            
            newRow.innerHTML = ` 
                <td>
                    <img src="${iconFolderPath}${selectedIcon}" alt="${selectedIcon}" class="material-symbols-rounded"> ${newCategory}
                </td>
                <td>$${assignedAmount.toFixed(2)}</td>
                <td>$0</td>
                <td class="activity neutral">$0</td>
                <td>$${goalAmount.toFixed(2)}</td>
            `;
            
            document.querySelector('.budget-table tbody').insertBefore(newRow, addCategoryRow);
            
            applyRowStyles(newRow);

            popupOverlay.classList.remove('show');
            categoryNameInput.value = '';
            goalAmountInput.value = '';
            selectedIcon = null;
        }
    });
});

function updateProgressBar(row) {
    const assigned = parseFloat(row.children[2].textContent.replace('$', '').trim()) || 0;
    const goal = parseFloat(row.children[5].textContent.replace('$', '').trim()) || 0;

    console.log(assigned, goal);

    const progressCell = row.querySelector('.progress-cell');
    const progressBar = progressCell.querySelector('.progress-bar');

    const progressPercent = (assigned / goal) * 100;
    progressBar.style.width = `${Math.min(Math.max(progressPercent, 0), 100)}%`;

    if (assigned >= goal) {
        progressBar.style.backgroundColor = 'green';
    } else if (assigned > 0) {
        progressBar.style.backgroundColor = '#fbc02d';
    } else {
        progressBar.style.backgroundColor = 'red';
    }
}