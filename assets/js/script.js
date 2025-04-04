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
        button.addEventListener('click', function() {
            const distId = this.getAttribute('data-id');
            deleteDistribution(distId);
        });
    });
}

function setupDistributionForm() {
    const form = document.getElementById('distributionForm');
    if (!form) return;
    
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const branchId = document.getElementById('branchSelect').value;
        const quantity = document.getElementById('quantity').value;
        const date = document.getElementById('distributionDate').value;
        const notes = document.getElementById('notes').value;
        
        if (!branchId || !quantity || !date) {
            alert('يرجى ملء جميع الحقول المطلوبة');
            return;
        }
        
        // إضافة توزيع جديد
        const newDistribution = {
            id: generateId(),
            branchId: branchId,
            quantity: parseInt(quantity),
            date: date,
            notes: notes
        };
        
        distributions.push(newDistribution);
        saveDistributions();
        
        // تحديث حساب الفرع
        updateBranchBalance(branchId, parseInt(quantity));
        
        // إعادة تعيين النموذج وتحديث القائمة
        form.reset();
        document.getElementById('distributionDate').value = new Date().toISOString().split('T')[0];
        loadDistributions();
        
        alert('تم إضافة التوزيع بنجاح');
    });
    
    // زر تحديث التوزيعات
    const refreshBtn = document.getElementById('refreshDistributions');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadDistributions);
    }
}

function deleteDistribution(id) {
    if (confirm('هل أنت متأكد من حذف هذا التوزيع؟')) {
        const distIndex = distributions.findIndex(d => d.id === id);
        if (distIndex !== -1) {
            const dist = distributions[distIndex];
            
            // عكس تأثير التوزيع على رصيد الفرع (طرح الكمية)
            updateBranchBalance(dist.branchId, -dist.quantity);
            
            // حذف التوزيع
            distributions.splice(distIndex, 1);
            saveDistributions();
            loadDistributions();
            
            alert('تم حذف التوزيع بنجاح');
        }
    }
}

// وظائف صفحة الفروع (branches.html)
function loadBranches() {
    const tableBody = document.getElementById('branchesTableBody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    if (branches.length === 0) {
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = '<td colspan="5" class="text-center">لا توجد فروع مسجلة بعد</td>';
        tableBody.appendChild(emptyRow);
        return;
    }
    
    branches.forEach(branch => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${branch.name}</td>
            <td>${branch.location}</td>
            <td>${branch.contact || '-'}</td>
            <td>${branch.balance || 0} رغيف</td>
            <td>
                <button class="btn btn-sm btn-warning edit-branch" data-id="${branch.id}">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-danger delete-branch" data-id="${branch.id}">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });
    
    // إضافة مستمعي الأحداث لأزرار التعديل والحذف
    document.querySelectorAll('.edit-branch').forEach(button => {
        button.addEventListener('click', function() {
            const branchId = this.getAttribute('data-id');
            openEditBranchModal(branchId);
        });
    });
    
    document.querySelectorAll('.delete-branch').forEach(button => {
        button.addEventListener('click', function() {
            const branchId = this.getAttribute('data-id');
            deleteBranch(branchId);
        });
    });
}

function setupBranchForm() {
    const form = document.getElementById('branchForm');
    if (!form) return;
    
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const name = document.getElementById('branchName').value;
        const location = document.getElementById('branchLocation').value;
        const contact = document.getElementById('branchContact').value;
        
        if (!name || !location) {
            alert('يرجى ملء حقول الاسم والعنوان');
            return;
        }
        
        // إضافة فرع جديد
        const newBranch = {
            id: generateId(),
            name: name,
            location: location,
            contact: contact,
            balance: 0 // رصيد مبدئي صفر
        };
        
        branches.push(newBranch);
        saveBranches();
        
        // إعادة تعيين النموذج وتحديث القائمة
        form.reset();
        loadBranches();
        
        alert('تم إضافة الفرع بنجاح');
    });
}

function setupEditBranchModal() {
    const form = document.getElementById('editBranchForm');
    const saveBtn = document.getElementById('saveBranchEdit');
    
    if (!form || !saveBtn) return;
    
    saveBtn.addEventListener('click', function() {
        const branchId = document.getElementById('editBranchId').value;
        const name = document.getElementById('editBranchName').value;
        const location = document.getElementById('editBranchLocation').value;
        const contact = document.getElementById('editBranchContact').value;
        
        if (!name || !location) {
            alert('يرجى ملء حقول الاسم والعنوان');
            return;
        }
        
        // تحديث بيانات الفرع
        const branchIndex = branches.findIndex(b => b.id === branchId);
        if (branchIndex !== -1) {
            branches[branchIndex].name = name;
            branches[branchIndex].location = location;
            branches[branchIndex].contact = contact;
            
            saveBranches();
            loadBranches();
            
            // إغلاق النافذة المنبثقة
            const modal = bootstrap.Modal.getInstance(document.getElementById('editBranchModal'));
            modal.hide();
            
            alert('تم تحديث بيانات الفرع بنجاح');
        }
    });
}

function openEditBranchModal(branchId) {
    const branch = branches.find(b => b.id === branchId);
    if (!branch) return;
    
    document.getElementById('editBranchId').value = branch.id;
    document.getElementById('editBranchName').value = branch.name;
    document.getElementById('editBranchLocation').value = branch.location;
    document.getElementById('editBranchContact').value = branch.contact || '';
    
    // فتح النافذة المنبثقة
    const modal = new bootstrap.Modal(document.getElementById('editBranchModal'));
    modal.show();
}

function deleteBranch(id) {
    // التحقق من وجود توزيعات مرتبطة بالفرع
    const hasDistributions = distributions.some(dist => dist.branchId === id);
    
    if (hasDistributions) {
        alert('لا يمكن حذف هذا الفرع لأنه يوجد توزيعات مرتبطة به. قم بحذف التوزيعات أولاً.');
        return;
    }
    
    if (confirm('هل أنت متأكد من حذف هذا الفرع؟')) {
        const branchIndex = branches.findIndex(b => b.id === id);
        if (branchIndex !== -1) {
            branches.splice(branchIndex, 1);
            saveBranches();
            loadBranches();
            alert('تم حذف الفرع بنجاح');
        }
    }
}

// وظائف صفحة التقارير (reports.html)
function setupReportForm() {
    const form = document.getElementById('reportForm');
    if (!form) return;
    
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const reportType = document.getElementById('reportType').value;
        const branchId = document.getElementById('reportBranch').value;
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        
        if (!startDate || !endDate) {
            alert('يرجى تحديد فترة التقرير');
            return;
        }
        
        generateReport(reportType, branchId, startDate, endDate);
    });
    
    // زر طباعة التقرير
    const printBtn = document.getElementById('printReport');
    if (printBtn) {
        printBtn.addEventListener('click', function() {
            window.print();
        });
    }
}

function setupReportTypeChange() {
    const reportType = document.getElementById('reportType');
    if (!reportType) return;
    
    reportType.addEventListener('change', function() {
        const today = new Date();
        const startDateInput = document.getElementById('startDate');
        
        if (this.value === 'weekly') {
            // تعيين بداية الأسبوع الحالي (الأحد)
            const startOfWeek = new Date(today);
            startOfWeek.setDate(today.getDate() - today.getDay());
            startDateInput.value = startOfWeek.toISOString().split('T')[0];
        } else if (this.value === 'monthly') {
            // تعيين بداية الشهر الحالي
            const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            startDateInput.value = startOfMonth.toISOString().split('T')[0];
        }
        // لا تغيير في حالة custom
    });
}

function generateReport(type, branchId, startDate, endDate) {
    // تحويل التواريخ إلى كائنات Date للمقارنة
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59); // تعيين نهاية اليوم
    
    // فلترة التوزيعات حسب الفترة المحددة والفرع
    let filteredDistributions = distributions.filter(dist => {
        const distDate = new Date(dist.date);
        return distDate >= start && distDate <= end;
    });
    
    // فلترة حسب الفرع إذا تم تحديد فرع محدد
    if (branchId !== 'all') {
        filteredDistributions = filteredDistributions.filter(dist => dist.branchId === branchId);
    }
    
    // ترتيب التوزيعات حسب التاريخ
    filteredDistributions.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // إنشاء محتوى التقرير
    const reportContent = document.getElementById('reportContent');
    const reportPeriod = document.getElementById('reportPeriod');
    const reportResults = document.getElementById('reportResults');
    
    if (!reportContent || !reportPeriod || !reportResults) return;
    
    // عرض فترة التقرير
    reportPeriod.textContent = `${formatDateArabic(startDate)} - ${formatDateArabic(endDate)}`;
    
    // إنشاء محتوى التقرير
    let html = '';
    if (filteredDistributions.length === 0) {
        html = '<div class="alert alert-info">لا توجد بيانات توزيع خلال الفترة المحددة</div>';
    } else {
        // إحصائيات عامة
        const totalQuantity = filteredDistributions.reduce((sum, dist) => sum + dist.quantity, 0);
        const branchesCount = new Set(filteredDistributions.map(dist => dist.branchId)).size;
        
        html = `
            <div class="row mb-4">
                <div class="col-md-4">
                    <div class="card bg-primary text-white">
                        <div class="card-body text-center">
                            <h3 class="card-title">إجمالي الكمية</h3>
                            <p class="display-5">${totalQuantity} رغيف</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card bg-success text-white">
                        <div class="card-body text-center">
                            <h3 class="card-title">عدد التوزيعات</h3>
                            <p class="display-5">${filteredDistributions.length}</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card bg-info text-white">
                        <div class="card-body text-center">
                            <h3 class="card-title">عدد الفروع</h3>
                            <p class="display-5">${branchesCount}</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // جدول التوزيعات
        html += `
            <div class="table-responsive">
                <table class="table table-striped">
                    <thead class="bg-light">
                        <tr>
                            <th>التاريخ</th>
                            <th>الفرع</th>
                            <th>الكمية</th>
                            <th>ملاحظات</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        filteredDistributions.forEach(dist => {
            const branch = branches.find(b => b.id === dist.branchId);
            const branchName = branch ? branch.name : 'غير معروف';
            
            html += `
                <tr>
                    <td>${formatDateArabic(dist.date)}</td>
                    <td>${branchName}</td>
                    <td>${dist.quantity} رغيف</td>
                    <td>${dist.notes || '-'}</td>
                </tr>
            `;
        });
        
        html += `
                    </tbody>
                </table>
            </div>
        `;
        
        // إذا كان التقرير لفرع واحد، أضف ملخص حساب الفرع
        if (branchId !== 'all') {
            const branch = branches.find(b => b.id === branchId);
            if (branch) {
                html += `
                    <div class="card mt-4 border-primary">
                        <div class="card-header bg-primary text-white">
                            <h4 class="mb-0">ملخص حساب الفرع: ${branch.name}</h4>
                        </div>
                        <div class="card-body">
                            <div class="row">
                                <div class="col-md-6">
                                    <p class="lead">إجمالي التوزيعات: ${totalQuantity} رغيف</p>
                                </div>
                                <div class="col-md-6">
                                    <p class="lead">الرصيد الحالي: ${branch.balance || 0} رغيف</p>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }
        }
        
        // تمكين زر الطباعة
        document.getElementById('printReport').classList.remove('disabled');
        document.getElementById('printReport').disabled = false;
    }
    
    reportContent.innerHTML = html;
    reportResults.style.display = 'block';
}

// وظائف مساعدة
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function updateBranchBalance(branchId, quantity) {
    const branchIndex = branches.findIndex(b => b.id === branchId);
    if (branchIndex !== -1) {
        // إنشاء أو تحديث حقل الرصيد
        if (typeof branches[branchIndex].balance === 'undefined') {
            branches[branchIndex].balance = quantity;
        } else {
            branches[branchIndex].balance += quantity;
        }
        saveBranches();
    }
}

function formatDateArabic(dateString) {
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('ar-EG', options);
}

function saveBranches() {
    localStorage.setItem('branches', JSON.stringify(branches));
}

function saveDistributions() {
    localStorage.setItem('distributions', JSON.stringify(distributions));
}