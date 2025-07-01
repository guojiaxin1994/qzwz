import { fetchData } from './api_handler.js';

const COMPLETION_DATA_KEY = 'fitnessPlanCompletion_2025';

let planData = null;
let completionData = {};
let progressChartInstance = null;

function getTodayISO() {
    const now = new Date();


    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function loadCompletionData() {
    try {
        const storedData = localStorage.getItem(COMPLETION_DATA_KEY);
        completionData = storedData ? JSON.parse(storedData) : {};
    } catch (error) {
        console.error('Error loading completion data:', error);
        completionData = {};
    }
}

function saveCompletionData() {
    try {
        localStorage.setItem(COMPLETION_DATA_KEY, JSON.stringify(completionData));
    } catch (error) {
        console.error('Error saving completion data:', error);
    }
}

function applyTheme(color) {
    if(!color) return;
    const style = document.documentElement.style;
    style.setProperty('--theme-color', color);
    localStorage.setItem('themeColor', color);
}

function renderHeader(info) {
    document.getElementById('main-title').textContent = info.title;
    document.getElementById('main-description').textContent = info.description;
}

function renderTodayPlan() {
    const todayISO = getTodayISO();
    const todayPlan = planData.daily_schedule.find(day => day.date === todayISO);
    const container = document.getElementById('today-plan-container');

    document.getElementById('today-date').textContent = `${todayISO}`;

    if (!todayPlan) {
        container.innerHTML = `<div class="text-center py-16"><p class="text-xl font-medium">今天没有安排训练计划。</p><p class="text-gray-500 mt-2">可能是计划开始前或结束后，好好休息吧！</p></div>`;
        return;
    }

    let contentHtml = `
        <div class="flex flex-col md:flex-row md:items-center md:justify-between mb-4">\n            <h3 class="text-3xl font-bold text-theme">${todayPlan.training_type}</h3>\n            <p class="text-gray-500 text-lg">${todayPlan.day}</p>\n        </div>\n        <div class="space-y-6">`;

    todayPlan.exercises.forEach(catName => {
        const category = planData.exercise_categories[catName];
        if (!category) return;

        contentHtml += `<div class="border-l-4 border-theme-light pl-4 py-2">\n            <h4 class="text-xl font-semibold flex items-center"><i data-lucide="zap" class="w-5 h-5 mr-2 text-theme"></i>${catName}</h4>\n            <p class="text-gray-600 mt-1 mb-3">${category.description}</p>`;
        
        if (category.exercises && category.exercises.length > 0) {
            contentHtml += `<ul class="space-y-3 list-inside text-gray-700">`;
            category.exercises.forEach(ex => {
                contentHtml += `\n                    <li class="p-3 bg-gray-50 rounded-lg">\n                        <strong class="font-semibold">${ex.name}</strong> - ${ex.method}\n                        <div class="text-sm text-gray-500 mt-1">\n                            <span><strong>要求:</strong> ${ex.requirement}</span> | \n                            <span><strong>备注:</strong> ${ex.notes}</span>\n                        </div>\n                    </li>\n                `;
            });
            contentHtml += `</ul>`;
        }
        contentHtml += `</div>`;
    });

    contentHtml += '</div>';
    container.innerHTML = contentHtml;
    lucide.createIcons();
}

function renderWeeklyOverview() {
    const today = new Date(getTodayISO());
    today.setHours(0, 0, 0, 0);

    const dayOfWeek = today.getDay();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

    const container = document.getElementById('weekly-overview-container');
    container.innerHTML = '';
    
    const todayISO = getTodayISO();

    for (let i = 0; i < 7; i++) {
        const currentDay = new Date(startOfWeek);
        currentDay.setDate(startOfWeek.getDate() + i);
        const dayISO = currentDay.toISOString().split('T')[0];
        const dayPlan = planData.daily_schedule.find(d => d.date === dayISO);

        const isToday = (dayISO === todayISO);
        const isPast = dayISO < todayISO;
        const isCompleted = completionData[dayISO] === true;

        let cardClass = 'bg-white border-gray-200';
        if (isToday) cardClass = 'bg-theme-light border-theme shadow-md';
        
        const card = document.createElement('div');
        card.className = `p-4 rounded-xl shadow-sm border transition-all duration-300 ${cardClass} flex items-center justify-between gap-4`;
        
        let actionButtonHTML = '';
        if (isCompleted) {
            actionButtonHTML = `<button disabled class="flex-shrink-0 flex items-center gap-2 text-sm font-semibold text-white bg-green-500 px-3 py-1.5 rounded-full cursor-not-allowed">\n                <i data-lucide="check-circle-2" class="w-4 h-4"></i>\n                <span>已完成</span>\n            </button>`;
        } else if (isToday && dayPlan && dayPlan.training_type !== '完全休息') {
            actionButtonHTML = `<button onclick="window.markDayAsComplete('${dayISO}')" class="flex-shrink-0 flex items-center gap-2 text-sm font-semibold text-white bg-theme hover:opacity-90 transition px-3 py-1.5 rounded-full">\n                <i data-lucide="calendar-check" class="w-4 h-4"></i>\n                <span>打卡</span>\n            </button>`;
        } else if (isPast && dayPlan && dayPlan.training_type !== '完全休息') {
             actionButtonHTML = `<button disabled class="flex-shrink-0 flex items-center gap-2 text-sm font-semibold text-white bg-red-400 px-3 py-1.5 rounded-full cursor-not-allowed opacity-70">\n                <i data-lucide="x-circle" class="w-4 h-4"></i>\n                <span>未完成</span>\n            </button>`;
        } else {
             const isRestDay = !dayPlan || dayPlan.training_type === '完全休息';
             actionButtonHTML = `<button disabled class="flex-shrink-0 flex items-center gap-2 text-sm font-semibold text-gray-500 bg-gray-200 px-3 py-1.5 rounded-full cursor-not-allowed">\n                <i data-lucide="${isRestDay ? 'moon' : 'clock'}" class="w-4 h-4"></i>\n                <span>${isRestDay ? '休息' : '待办'}</span>\n            </button>`;
        }
        
        card.innerHTML = `
            <div class="flex-grow min-w-0">\n                <p class="font-bold text-gray-900">${dayPlan ? dayPlan.day : ''} <span class="text-xs text-gray-500 font-normal">${dayISO.substring(5)}</span></p>\n                <p class="text-sm text-gray-600 truncate">${dayPlan ? dayPlan.training_type : '休息日'}</p>\n            </div>\n            ${actionButtonHTML}\n        `;
        container.appendChild(card);
    }
    
    window.markDayAsComplete = (dateISO) => {
        completionData[dateISO] = true;
        saveCompletionData();
        renderAll();
    };

    lucide.createIcons();
}

function renderProgressChart(completed, total) {
    const ctx = document.getElementById('progress-chart');
    if (!ctx) return;
    const themeColor = getComputedStyle(document.documentElement).getPropertyValue('--theme-color').trim();
    const remaining = total - completed;

    if (progressChartInstance) {
        progressChartInstance.destroy();
    }

    progressChartInstance = new Chart(ctx.getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: ['已完成', '未完成'],
            datasets: [{
                data: [completed, remaining > 0 ? remaining : 0],
                backgroundColor: [
                    themeColor,
                    '#e5e7eb' // gray-200
                ],
                borderColor: '#f8fafc',
                borderWidth: 4,
                hoverBorderWidth: 4,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '80%',
            plugins: {
                legend: { display: false },
                tooltip: { enabled: true },
            },
            animation: {
                animateScale: true,
                animateRotate: true
            }
        }
    });
}

function renderProgressOverview() {
    const totalDays = planData.daily_schedule.filter(day => day.training_type !== '完全休息').length;
    const completedCount = Object.values(completionData).filter(status => status === true).length;
    const percentage = totalDays > 0 ? Math.round((completedCount / totalDays) * 100) : 0;

    document.getElementById('total-days').textContent = totalDays;
    document.getElementById('completed-days').textContent = completedCount;
    document.getElementById('progress-percentage').textContent = `${percentage}%`;
    document.getElementById('progress-percentage-chart').textContent = `${percentage}%`;
    
    const progressBar = document.getElementById('progress-bar');
    progressBar.style.width = `${percentage}%`;

    renderProgressChart(completedCount, totalDays);
}

function renderAll() {
    if (!planData) return;
    renderHeader(planData.plan_info);
    renderTodayPlan();
    renderWeeklyOverview();
    renderProgressOverview();
}

async function init() {
    const storedTheme = localStorage.getItem('themeColor');
    
    loadCompletionData();
    
    try {
        planData = await fetchData();
        applyTheme(storedTheme || planData.theme.color);
        renderAll();
    } catch (error) {
        console.error('Initialization failed:', error);
        document.body.innerHTML = '<div class="text-center p-8 text-red-500">无法加载锻炼计划数据，请检查 plan_data.json 文件是否存在或格式是否正确。</div>';
    }
}

document.addEventListener('DOMContentLoaded', init);
