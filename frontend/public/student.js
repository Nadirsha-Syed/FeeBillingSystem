// NOTE: API_URL must be defined globally, likely in app.js

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
    
    // --- NEW TOTALS DECLARATION ---
    let totalAssigned = 0;
    let totalPaid = 0;
    let totalPending = 0;
    // ------------------------------

    tableBody.innerHTML = '';
    
    // Check if the loading element exists (it doesn't in the new HTML structure, 
    // but keep it safe for now, though we'll assume the table loading is visible)
    if (loadingMsg) loadingMsg.style.display = 'block';

    try {
        const response = await fetch(`${API_URL}/fees/student`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        if (loadingMsg) loadingMsg.style.display = 'none';

        if (response.ok && data.length > 0) {
            data.forEach(fee => {
                const row = document.createElement('tr');
                let statusColor = '';

                // --- NEW TOTALS CALCULATION INSIDE LOOP ---
                totalAssigned += fee.amount;
                if (fee.status === 'Paid') {
                    totalPaid += fee.amount;
                } else {
                    totalPending += fee.amount;
                }
                // ------------------------------------------
                
                // Color Coding as required by the document: Green=Paid, Yellow=Pending, Red=Overdue
                if (fee.status === 'Paid') {
                    statusColor = 'style="color: green; font-weight: bold;"';
                } else if (fee.status === 'Pending') {
                    statusColor = 'style="color: orange; font-weight: bold;"';
                } else if (fee.status === 'Overdue') {
                    statusColor = 'style="color: red; font-weight: bold;"';
                }

                // Determine Action Button (Updated for Download)
                let actionCellContent = '';
                if (fee.status === 'Pending') {
                    actionCellContent = `<button onclick="handlePayment('${fee._id}')">Pay Now</button>`;
                } else if (fee.status === 'Paid') { 
                    // Show Download Button using the fee._id
                    actionCellContent = `<button onclick="downloadReceipt('${fee._id}')">Download</button>`;
                } else {
                    actionCellContent = 'N/A';
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
            
            // --- NEW: UPDATE KPI CARDS AFTER LOOP ---
            document.getElementById('total-assigned-fees').textContent = `$${totalAssigned.toFixed(2)}`;
            document.getElementById('total-paid-fees').textContent = `$${totalPaid.toFixed(2)}`;
            document.getElementById('total-pending-fees').textContent = `$${totalPending.toFixed(2)}`;
            // ----------------------------------------

        } else if (data.msg) {
             tableBody.innerHTML = `<tr><td colspan="5">${data.msg}</td></tr>`;
        } else {
             tableBody.innerHTML = `<tr><td colspan="5">Failed to load fees.</td></tr>`;
        }

    } catch (error) {
        console.error('Error loading fees:', error);
        if (loadingMsg) loadingMsg.textContent = 'Error: Could not connect to API.';
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
            // Refresh the fee list and KPIs to show the 'Paid' status
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

// ----------------------------------------------------
// NEW: Download Receipt Functionality
// ----------------------------------------------------
async function downloadReceipt(paymentId) {
    const token = localStorage.getItem('token');
    
    try {
        // 1. Fetch the full payment record from the new API endpoint
        const response = await fetch(`${API_URL}/fees/receipt/${paymentId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const receiptData = await response.json();
        
        if (response.ok) {
            // 2. Generate printable HTML content
            const printContent = `
                <div style="padding: 20px; border: 1px solid black; font-family: Arial, sans-serif;">
                <h2 style="color: #007bff;">OFFICIAL FEE PAYMENT RECEIPT</h2>
                <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
                <p><strong>Transaction ID:</strong> ${receiptData.transactionId}</p>
                <hr>
                <p><strong>Fee Name:</strong> ${receiptData.feeName}</p>
                <p><strong>Amount Paid:</strong> <b>$${receiptData.amount.toFixed(2)}</b></p>
                <p><strong>Payment Mode:</strong> ${receiptData.paymentMode}</p>
                <p><strong>Status:</strong> <span style="color: green;">${receiptData.status}</span></p>
                <hr>
                <p>Thank you for your payment.</p>
                </div>
            `;
            
            // 3. Open a new window, write the content, and trigger print dialog
            const printWindow = window.open('', '_blank', 'height=600,width=800');
            printWindow.document.write('<html><head><title>Receipt</title></head><body>');
            printWindow.document.write(printContent);
            printWindow.document.write('<script>window.onload = function() { window.print(); };</script>');
            printWindow.document.write('</body></html>');
            printWindow.document.close();
            
        } else {
            alert(receiptData.msg || 'Could not retrieve receipt data for download.');
        }

    } catch (error) {
        console.error('Download error:', error);
        alert('A network error occurred while generating the receipt.');
    }
}


// Attach functions to the global window object for HTML access
window.loadStudentFees = loadStudentFees;
window.handlePayment = handlePayment;
window.showReceipt = showReceipt;
window.downloadReceipt = downloadReceipt; // Make the new function globally accessible