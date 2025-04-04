// بيانات التطبيق - سيتم تخزينها في localStorage
let branches = JSON.parse(localStorage.getItem('branches')) || [];
let distributions = JSON.parse(localStorage.getItem('distributions')) || [];

// عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    // تحديد الصفحة الحالية
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    
    // تعيين التاريخ الحالي في حقول التاريخ
    const today = new Date().toISOString().split('T')[0];
    const dateInputs = document.querySelectorAll('input[type="date"]');
    dateInputs.forEach(input => {
        if (input.id === 'startDate') {
            // تعيين تاريخ بداية الأسبوع الحالي (الأحد)
            const startOfWeek = new Date();
            startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
            input.value = startOfWeek.toISOString().split('T')[0];
        } else if (input.id === 'endDate') {
            input.value = today;
        } else {
            input.value = today;
        }
    });
    
    // تنفيذ الوظائف المناسبة حسب الصفحة الحالية
    if (currentPage === 'index.html' || currentPage === '') {
        loadBranchesIntoSelect();
        loadDistributions();
        setupDistributionForm();
    } else if (currentPage === 'branches.html') {
        loadBranches();
        setupBranchForm();
        setupEditBranchModal();
    } else if (currentPage === 'reports.html') {
        loadBranchesIntoSelect();
        setupReportForm();
        setupReportTypeChange();
    }
});

// وظائف الصفحة الرئيسية (index.html)
function loadBranchesIntoSelect() {
    const branchSelect = document.getElementById('branchSelect');
    const reportBranch = document.getElementById('reportBranch');
    
    if (branchSelect) {
        branchSelect.innerHTML = '<option value="" selected disabled>اختر الفرع</option>';
        branches.forEach(branch => {
            const option = document.createElement('option');
            option.value = branch.id;
            option.textContent = branch.name;
            branchSelect.appendChild(option);
        });
    }
    
    if (reportBranch) {
        // الإبقاء على خيار "جميع الفروع"
        reportBranch.innerHTML = '<option value="all" selected>جميع الفروع</option>';
        branches.forEach(branch => {
            const option = document.createElement('option');
            option.value = branch.id;
            option.textContent = branch.name;
            reportBranch.appendChild(option);
        });
    }
}

function loadDistributions() {
    const tableBody = document.getElementById('distributionsTableBody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    // ترتيب التوزيعات بتاريخ تنازلي (الأحدث أولاً)
    const sortedDistributions = [...distributions].sort((a, b) => 
        new Date(b.date) - new Date(a.date)
    );
    
    // عرض آخر 10 توزيعات فقط
    const recentDistributions = sortedDistributions.slice(0, 10);
    
    if (recentDistributions.length === 0) {
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = '<td colspan="5" class="text-center">لا توجد توزيعات مسجلة بعد</td>';
        tableBody.appendChild(emptyRow);
        return;
    }
    
    recentDistributions.forEach(dist => {
        const branch = branches.find(b => b.id === dist.branchId);
        const branchName = branch ? branch.name : 'غير معروف';
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${branchName}</td>
            <td>${dist.quantity}</td>
            <td>${formatDateArabic(dist.date)}</td>
            <td>${dist.notes || '-'}</td>
            <td>
                <button class="btn btn-sm btn-danger delete-distribution" data-id="${dist.id}">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });
    
    // إضافة مستمعي الأحداث لأزرار الحذف
    document.querySelectorAll('.delete-distribution').forEach(button => {
        button.addEventListener('