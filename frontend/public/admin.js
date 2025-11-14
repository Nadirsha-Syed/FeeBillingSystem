// NOTE: API_URL must be defined globally in app.js

document.addEventListener('DOMContentLoaded', () => {
    // Ensure the main app logic runs first to check for token/role
    if (localStorage.getItem('role') === 'Admin') {
        loadAdminData();
    }
    
    const assignmentForm = document.getElementById('fee-assignment-form');
    if (assignmentForm) {
        assignmentForm.addEventListener('submit', handleFeeAssignment);
    }
});

// Fetches summary data and pending fees on page load
function loadAdminData() {
    // *** FIX FOR RACE CONDITION ***
    // We add a short timeout to ensure the token is fully accessible from localStorage 
    // after the browser redirect completes.
    setTimeout(() => {
        if (typeof API_URL !== 'undefined') {
            fetchTotalStudents();    // Fetch Total Student Count
            fetchReportSummary();    // Fetch summary metrics and draw chart
            fetchPendingFees();      // NEW: Fetch detailed list for the table
        }
    }, 100); 
    // *** END FIX ***
}

// ----------------------------------------------------
// 1. Fee Assignment (POST /api/fees/assign)
// ----------------------------------------------------
async function handleFeeAssignment(e) {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const messageElement = document.getElementById('admin-message');
    
    const studentId = document.getElementById('studentId').value;
    const feeName = document.getElementById('feeName').value;
    const amount = parseFloat(document.getElementById('amount').value);
    const dueDate = document.getElementById('dueDate').value;

    messageElement.textContent = 'Assigning fee...';
    messageElement.style.color = 'blue';

    try {
        const response = await fetch(`${API_URL}/fees/assign`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ studentId, feeName, amount, dueDate })
        });

        const data = await response.json();
        
        if (response.ok) {
            messageElement.textContent = data.msg;
            messageElement.style.color = 'green';
            document.getElementById('fee-assignment-form').reset(); 
            
            // Reload all data after successful assignment
            fetchReportSummary(); 
            fetchTotalStudents();
            fetchPendingFees();
        } else {
            messageElement.textContent = data.msg || 'Fee assignment failed.';
            messageElement.style.color = 'red';
        }

    } catch (error) {
        console.error('Assignment error:', error);
        messageElement.textContent = 'Network error during assignment.';
        messageElement.style.color = 'red';
    }
}

// ----------------------------------------------------
// 2. Reporting (GET /api/fees/reports/summary)
// ----------------------------------------------------
async function fetchReportSummary() {
    const token = localStorage.getItem('token');
    const messageElement = document.getElementById('admin-message'); 

    try {
        const response = await fetch(`${API_URL}/fees/reports/summary`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        // Handle 401 Unauthorized errors specifically
        if (response.status === 401) {
            messageElement.textContent = 'No token, authorization denied.';
            messageElement.style.color = 'red';
            return;
        }

        const chartData = await response.json();

        if (response.ok) {
            // Update metrics display
            document.getElementById('total-collected').textContent = `$${chartData.totalCollected.toFixed(2)}`;
            document.getElementById('total-remaining').textContent = `$${chartData.totalRemaining.toFixed(2)}`;
            
            // Draw Chart
            drawStatusChart(chartData);
        } else {
            messageElement.textContent = 'Error loading reports.';
        }
    } catch (error) {
        console.error('Report fetch error:', error);
        messageElement.textContent = 'Network error during report fetch.';
    }
}


// ----------------------------------------------------
// 3. NEW: Fetch Total Students Count (Section 6 API)
// ----------------------------------------------------
async function fetchTotalStudents() {
    const token = localStorage.getItem('token');

    try {
        const response = await fetch(`${API_URL}/fees/total-students`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();

        if (response.ok) {
            document.getElementById('total-students').textContent = data.count;
        } else {
            document.getElementById('total-students').textContent = 'N/A';
        }
    } catch (error) {
        console.error('Student count error:', error);
        document.getElementById('total-students').textContent = 'Error';
    }
}

// ----------------------------------------------------
// 4. NEW: Fetch Detailed Pending List (Section 7 API)
// ----------------------------------------------------
async function fetchPendingFees() {
    const token = localStorage.getItem('token');
    const tableBody = document.getElementById('pending-fees-table-body');

    try {
        const response = await fetch(`${API_URL}/fees/pending-list`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const pendingFees = await response.json();

        // Clear the loading message
        tableBody.innerHTML = ''; 

        if (response.ok && pendingFees.length > 0) {
            pendingFees.forEach(fee => {
                const row = document.createElement('tr');
                // Color coding based on status
                const statusColor = (fee.status === 'Overdue') ? 'style="color: red; font-weight: bold;"' : 'style="color: orange; font-weight: bold;"';

                row.innerHTML = `
                    <td>${fee.studentName} (${fee.studentId.slice(-4)})</td> 
                    <td>${fee.feeName}</td>
                    <td>$${fee.amount.toFixed(2)}</td>
                    <td ${statusColor}>${fee.status}</td>
                `;
                tableBody.appendChild(row);
            });
        } else {
            // Display clean message if list is empty (balance is zero)
            tableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: green; font-weight: bold;">No pending or overdue fees! 🎉</td></tr>';
        }
    } catch (error) {
        console.error('Pending list fetch error:', error);
        tableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: red;">Error loading pending data.</td></tr>';
    }
}


// Draws the doughnut chart using Chart.js
function drawStatusChart(chartData) {
    const ctx = document.getElementById('statusChart');
    
    // Destroy previous chart instance if it exists
    if (window.feeStatusChart) {
        window.feeStatusChart.destroy();
    }

    window.feeStatusChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: chartData.labels, // ['Total Paid', 'Total Pending', 'Total Overdue']
            datasets: [{
                data: chartData.amounts,
                backgroundColor: [
                    '#4CAF50', // Green for Paid
                    '#FFC107', // Yellow/Orange for Pending
                    '#F44336'  // Red for Overdue
                ],
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'top' },
                title: { display: true, text: 'Fee Collection Status Summary' }
            }
        }
    });
}
