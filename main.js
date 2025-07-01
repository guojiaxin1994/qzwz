import { fetchData } from './api_handler.js';

const DATA_KEY_PREFIX = 'fitnessPlanCompletion_2025_';
let planData = null;
let completionData = {};
let progressChartInstance = null;
let currentUser = null;

function getTodayISO() {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function loadCompletionData() {
    if (!currentUser) return;
    const userKey = DATA_KEY_PREFIX + currentUser;
    try {
        const storedData = localStorage.getItem(userKey);
        completionData = storedData ? JSON.parse(storedData) : {};
    } catch (error) {
        console.error(`Error loading completion data for ${currentUser}:`, error);
        completionData = {};
    }
}

function saveCompletionData() {
    if (!currentUser) return;
    const userKey = DATA_KEY_PREFIX + currentUser;
    try {
        localStorage.setItem(userKey, JSON.stringify(completionData));
    } catch (error) {
        console.error(`Error saving completion data for ${currentUser}:`, error);
    }
}

function applyTheme(color) {
    if (!color) return;
    const style = document.documentElement.style;
    style.setProperty('--theme-color', color);
    localStorage.setItem('themeColor', color);
}

function applyLayoutOrder() {
    const order = planData.layout_order;
    const container = document.getElementById('right-column-container');
    
    if (!order || !Array.isArray(order) || !container) {
        return;
    }
    
    const fragment = document.createDocumentFragment();
    const sectionMap = new Map();

    for(const child of container.children){
        if(child.id){
            sectionMap.set(child.id, child);
        }
    }
    
    order.forEach(moduleId => {
        if (sectionMap.has(moduleId)) {
            fragment.appendChild(sectionMap.get(moduleId));
            sectionMap.delete(moduleId);
        }
    });

    sectionMap.forEach(section => fragment.appendChild(section));

    container.appendChild(fragment);
}


function renderHeader(info) {
    document.getElementById('main-title').textContent = info.title;
    document.getElementById('main-description').textContent = info.description;
}

function renderAnnouncement() {
    const announcement = planData.announcement;
    const banner = document.getElementById('announcement-banner');
    const content = document.getElementById('announcement-content');

    if (banner && content && announcement && announcement.trim() !== '') {
        content.textContent = announcement;
        banner.classList.remove('hidden');
        lucide.createIcons();
    } else if (banner) {
        banner.classList.add('hidden');
    }
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
        <div class="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
            <h3 class="text-3xl font-bold text-theme">${todayPlan.training_type}</h3>
            <p class="text-gray-500 text-lg">${todayPlan.day}</p>
        </div>
        <div class="space-y-6">`;

    todayPlan.exercises.forEach(catName => {
        const category = planData.exercise_categories[catName];
        if (!category) return;

        contentHtml += `<div class="border-l-4 border-theme-light pl-4 py-2">\\n            <h4 class="text-xl font-semibold flex items-center"><i data-lucide="zap" class="w-5 h-5 mr-2 text-theme"></i>${catName}</h4>\\n            <p class="text-gray-600 mt-1 mb-3">${category.description}</p>`;
        
        if (category.exercises && category.exercises.length > 0) {
            contentHtml += `<ul class="space-y-4 list-inside text-gray-700">`;
            category.exercises.forEach(ex => {
                let mediaContent = '';
                if (ex.imageUrl && ex.imageUrl.trim() !== '') {
                    mediaContent += `<img src="${ex.imageUrl}" alt="${ex.name} 示范" class="mt-3 rounded-lg shadow-sm w-full object-cover max-h-80">`;
                }
                if (ex.videoUrl && ex.videoUrl.trim() !== '') {
                    mediaContent += `<video controls src="${ex.videoUrl}" class="mt-3 rounded-lg shadow-sm w-full"></video>`;
                }

                contentHtml += `
                    <li class="p-4 bg-gray-50 rounded-lg border border-gray-200/80">
                        <strong class="font-semibold text-lg">${ex.name}</strong>
                        <p class="text-gray-800 mt-1">${ex.method}</p>
                        <div class="text-sm text-gray-500 mt-2 border-t border-gray-200 pt-2">
                            <span><strong>要求:</strong> ${ex.requirement}</span>
                            ${ex.notes ? `<span class="ml-2 pl-2 border-l border-gray-300"><strong>备注:</strong> ${ex.notes}</span>` : ''}
                        </div>
                        ${mediaContent ? `<div class="mt-3">${mediaContent}</div>` : ''}
                    </li>
                `;
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
            actionButtonHTML = `<button disabled class="flex-shrink-0 flex items-center gap-2 text-sm font-semibold text-white bg-green-500 px-3 py-1.5 rounded-full cursor-not-allowed">
                <i data-lucide="check-circle-2" class="w-4 h-4"></i>
                <span>已完成</span>
            </button>`;
        } else if (isToday && dayPlan && dayPlan.training_type !== '完全休息') {
            actionButtonHTML = `<button onclick="window.markDayAsComplete('${dayISO}')" class="flex-shrink-0 flex items-center gap-2 text-sm font-semibold text-white bg-theme hover:opacity-90 transition px-3 py-1.5 rounded-full">
                <i data-lucide="calendar-check" class="w-4 h-4"></i>
                <span>打卡</span>
            </button>`;
        } else if (isPast && dayPlan && dayPlan.training_type !== '完全休息') {
             actionButtonHTML = `<button disabled class="flex-shrink-0 flex items-center gap-2 text-sm font-semibold text-white bg-red-400 px-3 py-1.5 rounded-full cursor-not-allowed opacity-70">
                <i data-lucide="x-circle" class="w-4 h-4"></i>
                <span>未完成</span>
            </button>`;
        } else {
             const isRestDay = !dayPlan || dayPlan.training_type === '完全休息';
             actionButtonHTML = `<button disabled class="flex-shrink-0 flex items-center gap-2 text-sm font-semibold text-gray-500 bg-gray-200 px-3 py-1.5 rounded-full cursor-not-allowed">
                <i data-lucide="${isRestDay ? 'moon' : 'clock'}" class="w-4 h-4"></i>
                <span>${isRestDay ? '休息' : '待办'}</span>
            </button>`;
        }
        
        card.innerHTML = `
            <div class="flex-grow min-w-0">
                <p class="font-bold text-gray-900">${dayPlan ? dayPlan.day : ''} <span class="text-xs text-gray-500 font-normal">${dayISO.substring(5)}</span></p>
                <p class="text-sm text-gray-600 truncate">${dayPlan ? dayPlan.training_type : '休息日'}</p>
            </div>
            ${actionButtonHTML}
        `;
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
                    '#e5e7eb'
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

function renderLeaderboard() {
    const container = document.getElementById('leaderboard-container');
    if (!container) return;

    const leaderboardData = [];
    
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith(DATA_KEY_PREFIX)) {
            try {
                const username = key.substring(DATA_KEY_PREFIX.length);
                if (!username) continue;

                const userData = JSON.parse(localStorage.getItem(key));
                const completedDays = Object.values(userData).filter(status => status === true).length;
                
                if (completedDays > 0) {
                    leaderboardData.push({ username, completedDays });
                }
            } catch (e) {
                console.error(`Could not parse leaderboard data for key: ${key}`, e);
            }
        }
    }

    leaderboardData.sort((a, b) => b.completedDays - a.completedDays);

    const top20 = leaderboardData.slice(0, 20);

    if (top20.length === 0) {
        container.innerHTML = `<p class="text-center text-gray-500 py-8">暂无打卡记录，快来成为第一个上榜的人吧！</p>`;
        return;
    }

    let html = '<ul class="space-y-3">';
    top20.forEach((user, index) => {
        const rank = index + 1;
        let rankIcon = `<span class="font-bold text-lg w-8 text-center text-gray-500">${rank}</span>`;
        if (rank === 1) {
            rankIcon = `<i data-lucide="trophy" class="w-6 h-6 text-yellow-400"></i>`;
        } else if (rank === 2) {
            rankIcon = `<i data-lucide="medal" class="w-6 h-6 text-gray-400"></i>`;
        } else if (rank === 3) {
            rankIcon = `<i data-lucide="award" class="w-6 h-6 text-orange-400"></i>`;
        }
        
        const isCurrentUser = user.username === currentUser;
        const bgClass = isCurrentUser ? 'bg-theme-light' : 'bg-gray-50';

        html += `
            <li class="flex items-center justify-between p-3 rounded-lg ${bgClass} transition-all hover:shadow-md hover:scale-[1.02]">
                <div class="flex items-center gap-3 min-w-0">
                    ${rankIcon}
                    <span class="font-semibold text-gray-800 truncate">${user.username}</span>
                </div>
                <span class="font-bold text-theme flex-shrink-0">${user.completedDays} 天</span>
            </li>
        `;
    });
    html += '</ul>';

    container.innerHTML = html;
    lucide.createIcons();
}

function renderAll() {
    if (!planData) return;
    renderAnnouncement();
    renderHeader(planData.plan_info);
    renderTodayPlan();
    renderWeeklyOverview();
    renderProgressOverview();
    renderLeaderboard();
}

async function init() {
    let username = localStorage.getItem('fitnessUsername');
    if (!username) {
        username = prompt("请输入您的用户名来进行打卡和排行:", "奋斗的你");
        if (username) {
            localStorage.setItem('fitnessUsername', username);
        }
    }
    
    if (!username) {
        document.body.innerHTML = '<div class="text-center p-8 text-red-500">需要用户名才能继续。请刷新页面并输入用户名。</div>';
        return;
    }
    currentUser = username;

    const adminLink = document.querySelector('a[href="admin.html"]');
    if (adminLink) {
        adminLink.addEventListener('click', (e) => {
            e.preventDefault();
            const password = prompt('请输入管理员密码:');
            if (password === null) {
                return;
            }
            const storedPassword = localStorage.getItem('adminPassword') || '120317';
            if (password === storedPassword) {
                window.location.href = adminLink.href;
            } else {
                alert('密码错误！');
            }
        });
    }
    
    if (!localStorage.getItem('leaderboard_demo_data_seeded')) {
        localStorage.setItem('fitnessPlanCompletion_2025_卷王', JSON.stringify({'2025-07-14': true, '2025-07-15': true, '2025-07-16': true, '2025-07-17': true, '2025-07-18': true, '2025-07-19': true, '2025-07-21':true, '2025-07-22':true, '2025-07-23':true}));
        localStorage.setItem('fitnessPlanCompletion_2025_坚持哥', JSON.stringify({'2025-07-14': true, '2025-07-15': true, '2025-07-16': true, '2025-07-18': true, '2025-07-19': true}));
        localStorage.setItem('fitnessPlanCompletion_2025_小明', JSON.stringify({'2025-07-14': true, '2025-07-15': true}));
        localStorage.setItem('fitnessPlanCompletion_2025_躺平怪', JSON.stringify({'2025-07-14': true}));
        localStorage.setItem('leaderboard_demo_data_seeded', 'true');
    }

    const storedTheme = localStorage.getItem('themeColor');
    
    loadCompletionData();
    
    try {
        planData = await fetchData();
        applyTheme(storedTheme || planData.theme.color);
        applyLayoutOrder();
        renderAll();
    } catch (error) {
        console.error('Initialization failed:', error);
        document.body.innerHTML = '<div class="text-center p-8 text-red-500">无法加载锻炼计划数据，请检查 plan_data.json 文件是否存在或格式是否正确。</div>';
    }
}

document.addEventListener('DOMContentLoaded', init);
