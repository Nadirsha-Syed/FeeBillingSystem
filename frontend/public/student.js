document.addEventListener('DOMContentLoaded', () => {
    // Ensure the main app logic runs first to check for token/role
    if (localStorage.getItem('role') === 'Student') {
        loadStudentFees();
    }
});

// Fetches the fee data from the backend API
async function loadStudentFees() {
    const token = localStorage.getItem('token');
    const tableBody = document.getElementById('fees-table-body');
    const loadingMsg = document.getElementById('loading-message');
    let totalDue = 0;

    tableBody.innerHTML = '';
    loadingMsg.style.display = 'block';

    try {
        const response = await fetch(`${API_URL}/fees/student`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        loadingMsg.style.display = 'none';

        if (response.ok && data.length > 0) {
            data.forEach(fee => {
                const row = document.createElement('tr');
                let statusColor = '';

                // Calculate total due (Pending fees)
                if (fee.status === 'Pending' || fee.status === 'Overdue') {
                    totalDue += fee.amount;
                }
                
                // Color Coding as required by the document: Green=Paid, Yellow=Pending, Red=Overdue
                if (fee.status === 'Paid') {
                    statusColor = 'style="color: green; font-weight: bold;"';
                } else if (fee.status === 'Pending') {
                    statusColor = 'style="color: orange; font-weight: bold;"';
                } else if (fee.status === 'Overdue') {
                    statusColor = 'style="color: red; font-weight: bold;"';
                }

                // Determine Action Button
                let actionCellContent = '';
                if (fee.status === 'Pending') {
                    actionCellContent = `<button onclick="handlePayment('${fee._id}')">Pay Now</button>`;
                } else {
                    actionCellContent = fee.transactionId ? `<button onclick="showReceipt('${fee.transactionId}', ${fee.amount})">View Receipt</button>` : 'N/A';
                }

                row.innerHTML = `
                    <td>${fee.feeName}</td>
                    <td>$${fee.amount.toFixed(2)}</td>
                    <td>${new Date(fee.dueDate).toLocaleDateString()}</td>
                    <td ${statusColor}>${fee.status}</td>
                    <td>${actionCellContent}</td>
                `;
                tableBody.appendChild(row);
            });
            document.getElementById('fee-summary').textContent = `Total Pending/Overdue: $${totalDue.toFixed(2)}`;

        } else if (data.msg) {
             tableBody.innerHTML = `<tr><td colspan="5">${data.msg}</td></tr>`;
        } else {
             tableBody.innerHTML = `<tr><td colspan="5">Failed to load fees.</td></tr>`;
        }

    } catch (error) {
        console.error('Error loading fees:', error);
        loadingMsg.textContent = 'Error: Could not connect to API.';
    }
}

// Handles the simulated payment button click
async function handlePayment(assignmentId) {
    if (!confirm('Simulate payment for this fee?')) return;

    const token = localStorage.getItem('token');

    try {
        const response = await fetch(`${API_URL}/fees/simulate/${assignmentId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (response.ok) {
            // Display Receipt
            showReceipt(data.receipt.transactionId, data.receipt.amount);
            // Refresh the fee list to show the 'Paid' status
            loadStudentFees(); 
        } else {
            alert(data.msg || 'Payment simulation failed.');
        }

    } catch (error) {
        console.error('Payment error:', error);
        alert('An error occurred during payment.');
    }
}

// Displays a simulated receipt
function showReceipt(txnId, amount) {
    document.getElementById('receipt-txn-id').textContent = txnId;
    document.getElementById('receipt-amount').textContent = amount.toFixed(2);
    document.getElementById('receipt-area').style.display = 'block';
}

// Attach functions to the global window object for HTML access
window.loadStudentFees = loadStudentFees;
window.handlePayment = handlePayment;
window.showReceipt = showReceipt;