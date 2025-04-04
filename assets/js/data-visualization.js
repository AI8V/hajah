function setupSmartAlerts() {
    const distributions = JSON.parse(localStorage.getItem('distributions')) || [];
    const branches = JSON.parse(localStorage.getItem('branches')) || [];
    
    if (distributions.length < 7) return; // لا تتوفر بيانات كافية
    
    // ترتيب التوزيعات حسب التاريخ
    const sortedDistributions = [...distributions].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // الحصول على البيانات الأخيرة (آخر 7 أيام)
    const recentData = sortedDistributions.slice(-7);
    
    // حساب متوسط الاستهلاك اليومي
    const dailyAvg = recentData.reduce((sum, dist) => sum + dist.quantity, 0) / recentData.length;
    
    // حساب متوسط السعر اليومي
    const dailyPriceAvg = recentData.reduce((sum, dist) => sum + (dist.price || 0), 0) / recentData.length;
    
    // تحديد يوم الذروة
    const dayTotals = {};
    const dayPrices = {};
    recentData.forEach(dist => {
        const date = new Date(dist.date);
        const day = date.getDay();
        if (!dayTotals[day]) {
            dayTotals[day] = 0;
            dayPrices[day] = 0;
        }
        dayTotals[day] += dist.quantity;
        dayPrices[day] += (dist.price || 0);
    });
    
    let peakDay = 0;
    let peakValue = 0;
    let peakPrice = 0;
    
    for (let day in dayTotals) {
        if (dayTotals[day] > peakValue) {
            peakValue = dayTotals[day];
            peakPrice = dayPrices[day];
            peakDay = parseInt(day);
        }
    }
    
    // تحويل رقم اليوم إلى اسم اليوم بالعربية
    const dayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const peakDayName = dayNames[peakDay];
    
    // تحديد الفروع الأكثر استهلاكًا
    const branchConsumption = {};
    const branchPrices = {};
    recentData.forEach(dist => {
        if (!branchConsumption[dist.branchId]) {
            branchConsumption[dist.branchId] = 0;
            branchPrices[dist.branchId] = 0;
        }
        branchConsumption[dist.branchId] += dist.quantity;
        branchPrices[dist.branchId] += (dist.price || 0);
    });
    
    // ترتيب الفروع حسب الاستهلاك
    const branchRanking = Object.keys(branchConsumption)
        .map(id => ({
            id,
            name: branches.find(b => b.id === id)?.name || 'غير معروف',
            total: branchConsumption[id],
            totalPrice: branchPrices[id]
        }))
        .sort((a, b) => b.total - a.total);
    
    // اكتشاف الشذوذات (الإنحرافات الكبيرة عن المتوسط)
    const recent = recentData.map(dist => dist.quantity);
    const avgConsumption = recent.reduce((sum, val) => sum + val, 0) / recent.length;
    
    // حساب الانحراف المعياري
    const variance = recent.reduce((sum, val) => sum + Math.pow(val - avgConsumption, 2), 0) / recent.length;
    const stdDev = Math.sqrt(variance);
    
    // تحديد الأيام التي تختلف بشكل كبير عن المتوسط (أكثر من انحرافين معياريين)
    const anomalies = recentData.filter(dist => 
        Math.abs(dist.quantity - avgConsumption) > 2 * stdDev
    );
    
    // إنشاء ملخص للتنبيهات
    return {
        dailyAverage: Math.round(dailyAvg),
        dailyPriceAverage: Math.round(dailyPriceAvg),
        peakDay: peakDayName,
        peakValue: Math.round(peakValue / (recentData.length / 7)), // تقسيم على عدد الأسابيع
        peakPrice: Math.round(peakPrice / (recentData.length / 7)),
        topBranches: branchRanking.slice(0, 3),
        anomalies: anomalies.map(dist => ({
            date: dist.date,
            value: dist.quantity,
            price: dist.price || 0,
            percentDiff: Math.round((dist.quantity - avgConsumption) / avgConsumption * 100)
        }))
    };
}

function showSmartAlerts() {
    const alertsData = setupSmartAlerts();
    if (!alertsData) return;
    
    // إنشاء مربع حوار للتنبيهات
    const modalDiv = document.createElement('div');
    modalDiv.className = 'modal fade';
    modalDiv.id = 'smartAlertsModal';
    modalDiv.tabIndex = '-1';
    modalDiv.setAttribute('aria-hidden', 'true');
    
    modalDiv.innerHTML = `
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header bg-primary text-white">
                    <h5 class="modal-title">
                        <i class="fas fa-bell me-2"></i>
                        تنبيهات ذكية وتوصيات
                    </h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <div class="row">
                        <div class="col-md-6">
                            <div class="card mb-3 border-info">
                                <div class="card-header bg-info text-white">
                                    إحصائيات الاستهلاك الرئيسية
                                </div>
                                <div class="card-body">
                                    <p><strong>متوسط الاستهلاك اليومي:</strong> ${alertsData.dailyAverage} كيس عيش (${alertsData.dailyPriceAverage} جنيه)</p>
                                    <p><strong>يوم الذروة:</strong> ${alertsData.peakDay} (${alertsData.peakValue} كيس عيش - ${alertsData.peakPrice} جنيه)</p>
                                    <p><strong>الفروع الأكثر استهلاكًا:</strong></p>
                                    <ol>
                                        ${alertsData.topBranches.map(branch => 
                                            `<li>${branch.name} - ${branch.total} كيس عيش (${branch.totalPrice} جنيه)</li>`
                                        ).join('')}
                                    </ol>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="card mb-3 border-warning">
                                <div class="card-header bg-warning text-dark">
                                    تحليل الشذوذات والانحرافات
                                </div>
                                <div class="card-body">
                                    ${alertsData.anomalies.length > 0 ? `
                                        <p>تم اكتشاف ${alertsData.anomalies.length} حالات غير عادية في الاستهلاك:</p>
                                        <ul>
                                            ${alertsData.anomalies.map(anomaly => 
                                                `<li>${new Date(anomaly.date).toLocaleDateString('ar-EG')}: 
                                                ${anomaly.value} كيس عيش (${anomaly.price} جنيه)
                                                (${anomaly.percentDiff > 0 ? '+' : ''}${anomaly.percentDiff}% عن المتوسط)</li>`
                                            ).join('')}
                                        </ul>
                                    ` : `
                                        <p>لم يتم اكتشاف أي انحرافات كبيرة في الاستهلاك خلال الأسبوع الماضي.</p>
                                    `}
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="card border-success">
                        <div class="card-header bg-success text-white">
                            توصيات وإجراءات مقترحة
                        </div>
                        <div class="card-body">
                            <ol>
                                <li>زيادة مخزون الفروع الثلاثة الأولى بنسبة 10% على الأقل.</li>
                                <li>يوم ${alertsData.peakDay} هو الأكثر استهلاكًا، يفضل زيادة المخزون قبله بيوم.</li>
                                ${alertsData.anomalies.length > 0 ? 
                                    `<li>مراجعة أسباب الانحرافات المكتشفة في الاستهلاك.</li>` : ''}
                                <li>متوسط الاستهلاك اليومي هو ${alertsData.dailyAverage} كيس عيش (${alertsData.dailyPriceAverage} جنيه)، استخدم هذه الأرقام كأساس للتوقعات المستقبلية.</li>
                            </ol>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">إغلاق</button>
                    <button type="button" class="btn btn-primary" onclick="exportAlerts()">
                        <i class="fas fa-file-export me-1"></i> تصدير التقرير
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // إضافة مربع الحوار إلى المستند
    document.body.appendChild(modalDiv);
    
    // عرض مربع الحوار
    const modal = new bootstrap.Modal(document.getElementById('smartAlertsModal'));
    modal.show();
} 