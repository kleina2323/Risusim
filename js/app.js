// יומן ריסוסים - משק קליין
// ==============================

// אלמנטים מה-DOM
const sprayForm = document.getElementById('spray-form');
const spraysList = document.getElementById('sprays-list');
const emptyState = document.getElementById('empty-state');
const tabBtns = document.querySelectorAll('.tab-btn');
const exportBtn = document.getElementById('export-btn');

// סטטיסטיקות
const totalSpraysEl = document.getElementById('total-sprays');
const thisMonthEl = document.getElementById('this-month');
const lastSprayEl = document.getElementById('last-spray');

// מיפוי ענפים
const branchNames = {
    lychee: '🍒 ליצ\'י',
    olives: '🫒 זיתים',
    avocado: '🥑 אבוקדו'
};

// מיפוי חלקות לפי ענף
const plotsByBranch = {
    lychee: ['אלי', 'עדי', 'אורי', 'בועז'],
    olives: [],
    avocado: []
};

// פילטר נוכחי
let currentFilter = 'all';

// מערך ריסוסים מקומי
let spraysCache = [];

// ===================
// Firebase Functions
// ===================

// טעינת ריסוסים מ-Firebase
async function loadSprays() {
    try {
        const snapshot = await db.collection('sprays').orderBy('date', 'desc').get();
        spraysCache = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        return spraysCache;
    } catch (error) {
        console.error('Error loading sprays:', error);
        return [];
    }
}

// הוספת ריסוס
async function addSpray(sprayData) {
    try {
        await db.collection('sprays').add({
            ...sprayData,
            createdAt: new Date().toISOString()
        });
        await loadAndRender();
    } catch (error) {
        console.error('Error adding spray:', error);
        alert('שגיאה בהוספת ריסוס');
    }
}

// מחיקת ריסוס
async function deleteSpray(sprayId) {
    if (confirm('האם למחוק את הריסוס?')) {
        try {
            await db.collection('sprays').doc(sprayId).delete();
            await loadAndRender();
        } catch (error) {
            console.error('Error deleting spray:', error);
        }
    }
}

// ===================
// UI Functions
// ===================

// עדכון תאריך
function updateDateTime() {
    const now = new Date();
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric'
    };
    document.getElementById('datetime').textContent = now.toLocaleDateString('he-IL', options);
}

// פורמט תאריך
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('he-IL', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
}

// בדיקה אם עדיין בתקופת המתנה
function isInWaitingPeriod(sprayDate, waitingDays) {
    if (!waitingDays) return false;
    const spray = new Date(sprayDate);
    const endDate = new Date(spray);
    endDate.setDate(spray.getDate() + parseInt(waitingDays));
    return new Date() < endDate;
}

// חישוב ימים עד סוף המתנה
function daysUntilClear(sprayDate, waitingDays) {
    if (!waitingDays) return 0;
    const spray = new Date(sprayDate);
    const endDate = new Date(spray);
    endDate.setDate(spray.getDate() + parseInt(waitingDays));
    const diff = Math.ceil((endDate - new Date()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
}

// יצירת HTML לריסוס
function createSprayElement(spray) {
    const inWaiting = isInWaitingPeriod(spray.date, spray.waiting);
    const daysLeft = daysUntilClear(spray.date, spray.waiting);
    
    const sprayCard = document.createElement('div');
    sprayCard.className = 'spray-card';
    sprayCard.dataset.branch = spray.branch;
    
    sprayCard.innerHTML = `
        <div class="spray-header">
            <span class="spray-product">${spray.product}</span>
            <span class="spray-date">📅 ${formatDate(spray.date)}</span>
        </div>
        <div class="spray-details">
            <div class="spray-detail">
                <span class="spray-detail-label">ענף:</span>
                <span class="spray-detail-value">${branchNames[spray.branch] || spray.branch}</span>
            </div>
            ${spray.target ? `
            <div class="spray-detail">
                <span class="spray-detail-label">מטרה:</span>
                <span class="spray-detail-value">${spray.target}</span>
            </div>` : ''}
            ${spray.concentration ? `
            <div class="spray-detail">
                <span class="spray-detail-label">ריכוז:</span>
                <span class="spray-detail-value">${spray.concentration}</span>
            </div>` : ''}
            ${spray.area ? `
            <div class="spray-detail">
                <span class="spray-detail-label">שטח:</span>
                <span class="spray-detail-value">${spray.area} דונם</span>
            </div>` : ''}
            ${spray.waiting ? `
            <div class="spray-detail">
                <span class="spray-detail-label">המתנה:</span>
                <span class="waiting-badge ${inWaiting ? 'active' : 'clear'}">
                    ${inWaiting ? `⏳ ${daysLeft} ימים` : '✅ מותר'}
                </span>
            </div>` : ''}
        </div>
        ${spray.notes ? `<div class="spray-notes">📝 ${spray.notes}</div>` : ''}
        <div class="spray-actions">
            <button class="btn-edit" onclick="openEditModal('${spray.id}')" title="ערוך">✏️</button>
            <button class="btn-delete" onclick="deleteSpray('${spray.id}')" title="מחק">🗑️</button>
        </div>
    `;
    
    return sprayCard;
}

// רינדור ריסוסים
function renderSprays() {
    spraysList.innerHTML = '';
    
    let filteredSprays = spraysCache;
    if (currentFilter !== 'all') {
        filteredSprays = spraysCache.filter(s => s.branch === currentFilter);
    }
    
    if (filteredSprays.length === 0) {
        emptyState.classList.remove('hidden');
        spraysList.classList.add('hidden');
    } else {
        emptyState.classList.add('hidden');
        spraysList.classList.remove('hidden');
        
        filteredSprays.forEach(spray => {
            spraysList.appendChild(createSprayElement(spray));
        });
    }
}

// עדכון סטטיסטיקות
function updateStats() {
    totalSpraysEl.textContent = spraysCache.length;
    
    // ריסוסים החודש
    const now = new Date();
    const thisMonth = spraysCache.filter(s => {
        const sprayDate = new Date(s.date);
        return sprayDate.getMonth() === now.getMonth() && 
               sprayDate.getFullYear() === now.getFullYear();
    }).length;
    thisMonthEl.textContent = thisMonth;
    
    // ריסוס אחרון
    if (spraysCache.length > 0) {
        const lastSpray = spraysCache[0];
        lastSprayEl.textContent = formatDate(lastSpray.date);
    } else {
        lastSprayEl.textContent = '-';
    }
}

// טעינה ורינדור
async function loadAndRender() {
    await loadSprays();
    renderSprays();
    updateStats();
}

// ===================
// Event Listeners
// ===================

// טופס הוספת ריסוס
sprayForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const sprayData = {
        date: document.getElementById('spray-date').value,
        branch: document.getElementById('spray-branch').value,
        plot: document.getElementById('spray-plot').value.trim(),
        product: document.getElementById('spray-product').value.trim(),
        concentration: document.getElementById('spray-concentration').value.trim(),
        target: document.getElementById('spray-target').value.trim(),
        area: document.getElementById('spray-area').value,
        notes: document.getElementById('spray-notes').value.trim()
    };
    
    if (sprayData.date && sprayData.branch && sprayData.product) {
        await addSpray(sprayData);
        sprayForm.reset();
        document.getElementById('spray-date').value = new Date().toISOString().split('T')[0];
    }
});

// כפתורי טאבים
tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.tab;
        renderSprays();
    });
});

// עדכון חלקות לפי ענף
document.getElementById('spray-branch').addEventListener('change', function() {
    const branch = this.value;
    const plotSelect = document.getElementById('spray-plot');
    const plots = plotsByBranch[branch] || [];
    
    plotSelect.innerHTML = '<option value="">בחר חלקה</option>';
    
    if (plots.length > 0) {
        plots.forEach(plot => {
            plotSelect.innerHTML += `<option value="${plot}">${plot}</option>`;
        });
    } else {
        plotSelect.innerHTML = '<option value="">אין חלקות מוגדרות</option>';
    }
});

// ייצוא לאקסל (CSV)
exportBtn.addEventListener('click', () => {
    if (spraysCache.length === 0) {
        alert('אין ריסוסים לייצוא');
        return;
    }
    
    // כותרות
    let csv = '\ufeff'; // BOM for Hebrew
    csv += 'תאריך,ענף,תכשיר,ריכוז,מטרה,שטח (דונם),המתנה (ימים),הערות\n';
    
    // נתונים
    spraysCache.forEach(spray => {
        csv += `${spray.date},`;
        csv += `${branchNames[spray.branch] || spray.branch},`;
        csv += `"${spray.product}",`;
        csv += `"${spray.concentration || ''}",`;
        csv += `"${spray.target || ''}",`;
        csv += `${spray.area || ''},`;
        csv += `${spray.waiting || ''},`;
        csv += `"${spray.notes || ''}"\n`;
    });
    
    // הורדה
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `יומן_ריסוסים_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
});

// ===================
// אתחול
// ===================
document.addEventListener('DOMContentLoaded', () => {
    updateDateTime();
    setInterval(updateDateTime, 1000);
    document.getElementById('spray-date').value = new Date().toISOString().split('T')[0];
    loadAndRender();
});

// האזנה לשינויים בזמן אמת
db.collection('sprays').onSnapshot(() => {
    loadAndRender();
});

// ===================
// עריכת ריסוס
// ===================

// פתיחת modal לעריכה
function openEditModal(sprayId) {
    const spray = spraysCache.find(s => s.id === sprayId);
    if (!spray) return;
    
    document.getElementById('edit-spray-id').value = sprayId;
    document.getElementById('edit-date').value = spray.date;
    document.getElementById('edit-branch').value = spray.branch;
    document.getElementById('edit-plot').value = spray.plot || '';
    document.getElementById('edit-product').value = spray.product;
    document.getElementById('edit-concentration').value = spray.concentration || '';
    document.getElementById('edit-target').value = spray.target || '';
    document.getElementById('edit-area').value = spray.area || '';
    document.getElementById('edit-notes').value = spray.notes || '';
    
    document.getElementById('edit-modal').classList.remove('hidden');
}

// סגירת modal
function closeEditModal() {
    document.getElementById('edit-modal').classList.add('hidden');
}

// שמירת עריכה
document.getElementById('edit-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const sprayId = document.getElementById('edit-spray-id').value;
    const updates = {
        date: document.getElementById('edit-date').value,
        branch: document.getElementById('edit-branch').value,
        plot: document.getElementById('edit-plot').value,
        product: document.getElementById('edit-product').value,
        concentration: document.getElementById('edit-concentration').value,
        target: document.getElementById('edit-target').value,
        area: document.getElementById('edit-area').value,
        notes: document.getElementById('edit-notes').value
    };
    
    try {
        await db.collection('sprays').doc(sprayId).update(updates);
        closeEditModal();
        await loadAndRender();
    } catch (error) {
        console.error('Error updating spray:', error);
        alert('שגיאה בעדכון ריסוס');
    }
});

// סגירה בלחיצה מחוץ ל-modal
document.getElementById('edit-modal').addEventListener('click', (e) => {
    if (e.target.id === 'edit-modal') {
        closeEditModal();
    }
});
