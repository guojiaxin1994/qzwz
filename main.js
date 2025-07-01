import { getPlanData, getCheckinData, saveCheckinData, getLeaderboard, recordVideoWatch } from './api_handler.js';

let todayExercises = [];
let currentExerciseIndex = 0;
let todayPlanDateStr = '';
let planData = null;
let checkinData = null;

let videoStartTime = null;
let currentVideoURL = null;
let currentUser = null;

function stopAndRecordWatchTime() {
    if (videoStartTime && currentUser && currentVideoURL) {
        const durationInSeconds = (Date.now() - videoStartTime) / 1000;
        if (durationInSeconds > 1) { 
            recordVideoWatch(currentUser, currentVideoURL, durationInSeconds);
        }
        videoStartTime = null; 
    }
}

function getTodayDateStr(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function displayTodayPlan() {
    const daySchedule = planData.daily_schedule.find(d => d.date === todayPlanDateStr);
    const container = document.getElementById('today-plan-container');
    const isCompleted = checkinData && checkinData.checkin_dates && checkinData.checkin_dates.includes(todayPlanDateStr);

    if (isCompleted) {
        container.innerHTML = `<div class="text-center py-16"><p class="text-2xl font-bold text-green-600">🎉 今日已打卡！</p><p class="text-gray-500 mt-2">坚持得很棒，明天继续！</p></div>`;
        return;
    }

    if (!daySchedule || !daySchedule.exercises || daySchedule.exercises.length === 0) {
        container.innerHTML = `<div class="text-center py-16"><p class="text-xl font-medium">今天是休息日！</p><p class="text-gray-500 mt-2">好好放松，为下一次训练储备能量。</p></div>`;
        return;
    }
    
    todayExercises = daySchedule.exercises.flatMap(categoryName => {
        const category = planData.exercise_categories[categoryName];
        if (!category || !category.exercises) return [];
        return category.exercises.map(ex => ({ ...ex, module: categoryName }));
    });
    
    todayExercises.forEach(ex => {
        if (ex.requirement && !ex.duration) {
             ex.duration = ex.requirement;
        }
    });

    container.innerHTML = `
        <div id="plan-header" class="mb-4">
             <h3 class="text-xl font-bold text-gray-800">${daySchedule.training_type}</h3>
        </div>
        <div id="exercise-area"></div>
        <div id="sequencer-controls" class="mt-6 flex justify-end items-center min-h-[40px]"></div>
        <div class="mt-6">
            <button id="complete-day-btn" class="w-full bg-theme text-white font-bold py-3 rounded-lg shadow-lg hover:bg-opacity-90 transition-all duration-300 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:shadow-none" disabled>
                <i data-lucide="check-circle" class="inline-block w-5 h-5 mr-2"></i>
                完成今日打卡
            </button>
        </div>
    `;
    lucide.createIcons();

    if (todayExercises.length > 0) {
        currentExerciseIndex = 0;
        renderCurrentExercise();
    } else {
        document.getElementById('complete-day-btn').disabled = false;
    }

    document.getElementById('complete-day-btn').addEventListener('click', handleCompleteCheckin);
}


function renderCurrentExercise() {
    stopAndRecordWatchTime(); 
    if (currentExerciseIndex >= todayExercises.length) return;

    const exercise = todayExercises[currentExerciseIndex];
    const area = document.getElementById('exercise-area');
    
    area.innerHTML = `
        <div class="exercise-item p-4 border rounded-lg bg-gray-50 shadow-inner">
            <h4 class="text-lg font-semibold text-theme">${exercise.module}</h4>
            <h5 class="text-2xl font-bold text-gray-900 my-2">${exercise.name}</h5>
            <p class="text-gray-600 mb-1 text-sm"><strong>要求:</strong> ${exercise.requirement}</p>
            <p class="text-gray-600 mb-4 text-sm"><strong>时长:</strong> ${exercise.duration}</p>
            <div class="aspect-w-16 aspect-h-9 rounded-lg overflow-hidden bg-black mt-4">
                <video id="exercise-video" src="${exercise.videoUrl}" controls autoplay muted playsinline class="w-full h-full object-contain"></video>
            </div>
             ${exercise.notes ? `<p class="mt-4 text-sm text-gray-500 bg-gray-100 p-2 rounded"><strong>备注:</strong> ${exercise.notes}</p>` : ''}
        </div>
    `;

    const progressIndicator = document.createElement('div');
    progressIndicator.className = 'text-center text-sm text-gray-500 mt-4';
    progressIndicator.textContent = `项目 ${currentExerciseIndex + 1} / ${todayExercises.length}`;
    area.appendChild(progressIndicator);
    
    document.getElementById('sequencer-controls').innerHTML = '';
    const video = document.getElementById('exercise-video');

    if (!exercise.videoUrl) {
         area.querySelector('.aspect-w-16').innerHTML = `<div class="w-full h-full flex items-center justify-center bg-gray-200 text-gray-500 rounded-lg">无视频</div>`;
         handleVideoEnd();
         return;
    }

    video.addEventListener('play', () => {
        videoStartTime = Date.now();
        currentVideoURL = exercise.videoUrl;
    });

    video.addEventListener('pause', stopAndRecordWatchTime);
    video.addEventListener('ended', handleVideoEnd);
    video.addEventListener('error', () => {
        console.error("视频加载失败:", exercise.videoUrl);
        area.querySelector('.aspect-w-16').innerHTML = `<div class="w-full h-full flex items-center justify-center bg-red-100 text-red-500 rounded-lg">视频加载失败</div>`;
        stopAndRecordWatchTime();
        handleVideoEnd();
    });
}

function handleVideoEnd() {
    stopAndRecordWatchTime();

    if (currentExerciseIndex < todayExercises.length - 1) {
        const controls = document.getElementById('sequencer-controls');
        controls.innerHTML = `
            <button id="next-exercise-btn" class="px-6 py-2 bg-theme text-white font-semibold rounded-lg shadow-md hover:bg-opacity-90 transition-opacity flex items-center gap-2">
                进行下一练习 <i data-lucide="arrow-right" class="w-4 h-4"></i>
            </button>
        `;
        lucide.createIcons();
        document.getElementById('next-exercise-btn').addEventListener('click', () => {
            currentExerciseIndex++;
            renderCurrentExercise();
        });
    } else {
        const controls = document.getElementById('sequencer-controls');
        controls.innerHTML = `<p class="text-green-600 font-semibold text-lg">🎉 太棒了！已完成今天所有训练！</p>`;
        document.getElementById('complete-day-btn').disabled = false;
    }
}

async function handleCompleteCheckin() {
    this.disabled = true;
    this.innerHTML = `<i data-lucide="loader-2" class="animate-spin inline-block w-5 h-5 mr-2"></i> 正在提交...`;
    lucide.createIcons();
    try {
        await saveCheckinData(todayPlanDateStr);
        const container = document.getElementById('today-plan-container');
        container.innerHTML = `<div class="text-center py-16"><p class="text-2xl font-bold text-green-600">✅ 打卡成功！</p><p class="text-gray-500 mt-2">你真棒！明天也要坚持哦！</p></div>`;
        checkinData = await getCheckinData();
        displayWeeklyOverview();
        displayProgress();
        displayLeaderboard();
    } catch (error) {
        console.error("Check-in failed:", error);
        alert('打卡失败，请刷新页面后重试。');
        this.disabled = false;
        this.innerHTML = `<i data-lucide="check-circle" class="inline-block w-5 h-5 mr-2"></i> 完成今日打卡`;
        lucide.createIcons();
    }
}

function displayWeeklyOverview() {
    const container = document.getElementById('weekly-overview-container');
    if (!planData || !checkinData) {
        container.innerHTML = `<div class="bg-white p-4 rounded-lg text-center text-gray-500">无法加载打卡记录。</div>`;
        return;
    }

    const today = new Date(todayPlanDateStr + "T00:00:00");
    const dayOfWeek = today.getDay();
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diff));

    let weeklyHtml = '';
    const weekdays = ['一', '二', '三', '四', '五', '六', '日'];
    const todayDateOnly = new Date();
    todayDateOnly.setHours(0, 0, 0, 0);

    for (let i = 0; i < 7; i++) {
        const currentDay = new Date(monday);
        currentDay.setDate(monday.getDate() + i);
        const dateStr = getTodayDateStr(currentDay);
        const daySchedule = planData.daily_schedule.find(d => d.date === dateStr);
        const isCompleted = checkinData.checkin_dates && checkinData.checkin_dates.includes(dateStr);
        const isToday = (dateStr === todayPlanDateStr);
        
        let statusClass = 'bg-gray-100 text-gray-400';
        let statusIcon = 'circle';
        let statusText = '待完成';
        let isFuture = currentDay > todayDateOnly;

        if (isCompleted) {
            statusClass = 'bg-green-100 text-green-700';
            statusIcon = 'check-circle-2';
            statusText = '已打卡';
        } else if (!daySchedule || !daySchedule.exercises || daySchedule.exercises.length === 0) {
            statusClass = 'bg-blue-100 text-blue-700';
            statusIcon = 'bed-double';
            statusText = '休息日';
        } else if (isFuture) {
             statusClass = 'bg-gray-100 text-gray-400';
             statusIcon = 'circle';
             statusText = '待完成';
        } else if (!isCompleted && !isFuture && !isToday) {
            statusClass = 'bg-red-100 text-red-700';
            statusIcon = 'x-circle';
            statusText = '未打卡';
        }
        
        let todayHighlightClass = isToday ? 'ring-2 ring-offset-2 ring-theme' : 'ring-1 ring-gray-200';

        weeklyHtml += `
            <div class="flex items-center justify-between p-3 rounded-lg ${statusClass} ${todayHighlightClass} transition-all">
                <div class="flex items-center">
                    <i data-lucide="${statusIcon}" class="w-5 h-5 mr-3 flex-shrink-0"></i>
                    <div>
                        <p class="font-semibold">星期${weekdays[i]}</p>
                        <p class="text-xs">${dateStr.substring(5)}</p>
                    </div>
                </div>
                <span class="text-sm font-medium">${statusText}</span>
            </div>
        `;
    }
    container.innerHTML = `<div class="bg-white p-4 rounded-xl shadow-sm space-y-2">${weeklyHtml}</div>`;
    lucide.createIcons();
}

function displayProgress() {
    if (!planData || !checkinData) return;

    const totalDays = planData.daily_schedule.filter(d => d.exercises && d.exercises.length > 0).length;
    const completedDays = checkinData.checkin_dates ? checkinData.checkin_dates.length : 0;
    const progress = totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0;

    document.getElementById('total-days').textContent = totalDays;
    document.getElementById('completed-days').textContent = completedDays;
    document.getElementById('progress-percentage').textContent = `${progress}%`;
    document.getElementById('progress-percentage-chart').textContent = `${progress}%`;
    
    const progressBar = document.getElementById('progress-bar');
    if (progressBar) progressBar.style.width = `${progress}%`;

    const ctx = document.getElementById('progress-chart');
    if (!ctx) return;
    if (window.progressChart instanceof Chart) {
        window.progressChart.destroy();
    }
    window.progressChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            datasets: [{
                data: [completedDays, Math.max(0, totalDays - completedDays)],
                backgroundColor: ['var(--theme-color)', '#e5e7eb'],
                borderWidth: 0,
                hoverBackgroundColor: ['var(--theme-color)', '#e5e7eb']
            }]
        },
        options: {
            responsive: true,
            cutout: '80%',
            plugins: { tooltip: { enabled: false }, legend: { display: false } }
        }
    });
}

async function displayLeaderboard() {
    const container = document.getElementById('leaderboard-container');
    try {
        const leaderboardData = await getLeaderboard();
        if (!leaderboardData || leaderboardData.length === 0) {
            container.innerHTML = `<p class="text-center text-gray-500 py-8">排行榜暂无数据。</p>`;
            return;
        }

        const leaderboardHtml = leaderboardData
            .sort((a, b) => b.check_ins - a.check_ins)
            .slice(0, 10)
            .map((user, index) => {
                let medalIcon = '';
                if (index === 0) medalIcon = `<i data-lucide="medal" class="w-5 h-5 text-yellow-400"></i>`;
                else if (index === 1) medalIcon = `<i data-lucide="medal" class="w-5 h-5 text-slate-400"></i>`;
                else if (index === 2) medalIcon = `<i data-lucide="medal" class="w-5 h-5 text-amber-600"></i>`;
                else medalIcon = `<span class="text-sm font-medium text-gray-500 w-5 text-center">${index + 1}</span>`;

                return `
                    <div class="flex items-center p-2 rounded-md hover:bg-gray-50 transition-colors">
                        <div class="w-8 flex-shrink-0 flex items-center justify-center">${medalIcon}</div>
                        <div class="flex-grow font-medium text-gray-800 truncate" title="${user.username}">${user.nickname || user.username}</div>
                        <div class="flex-shrink-0 text-sm font-bold text-theme">${user.check_ins} <span class="font-normal text-gray-500">次</span></div>
                    </div>
                `;
            }).join('');
        
        container.innerHTML = `<div class="space-y-1">${leaderboardHtml}</div>`;
        lucide.createIcons();

    } catch (error) {
        console.error('Failed to load leaderboard:', error);
        container.innerHTML = `<p class="text-center text-red-500 py-8">无法加载排行榜。</p>`;
    }
}

function displayAnnouncements() {
    const banner = document.getElementById('announcement-banner');
    const content = document.getElementById('announcement-content');
    const bannerImageContainer = document.createElement('div');
    bannerImageContainer.id = 'announcement-image-container';
    bannerImageContainer.className = 'mt-2';
    banner.querySelector('.flex > div:last-child').appendChild(bannerImageContainer);


    if (planData && planData.announcement) {
        content.textContent = planData.announcement;

        const imgContainer = document.getElementById('announcement-image-container');
        if (planData.announcement_image) {
            imgContainer.innerHTML = `<img src="${planData.announcement_image}" class="max-w-xs rounded-md mt-2 shadow-sm">`;
        } else {
             imgContainer.innerHTML = '';
        }
        banner.classList.remove('hidden');

    } else {
        banner.classList.add('hidden');
    }
}

async function init() {
    currentUser = localStorage.getItem('currentUser');
    window.addEventListener('beforeunload', stopAndRecordWatchTime);

    try {
        [planData, checkinData] = await Promise.all([getPlanData(), getCheckinData()]);
        const date = new Date();
        todayPlanDateStr = getTodayDateStr(date);
        
        if (planData && planData.theme && planData.theme.color) {
            document.documentElement.style.setProperty('--theme-color', planData.theme.color);
        }
        if(planData && planData.plan_info) {
             document.getElementById('main-title').textContent = planData.plan_info.title;
             document.getElementById('main-description').textContent = planData.plan_info.description;
        }

        if(planData && planData.layout_order) {
            const container = document.getElementById('right-column-container');
            planData.layout_order.forEach(id => {
                const section = document.getElementById(id);
                if (section) container.appendChild(section);
            });
            const footer = container.querySelector('footer');
            if(footer) container.appendChild(footer);
        }


        document.getElementById('today-date').textContent = todayPlanDateStr;
        
        displayAnnouncements();
        displayTodayPlan();
        displayWeeklyOverview();
        displayProgress();
        displayLeaderboard();

    } catch (error) {
        console.error("Initialization failed:", error);
        document.getElementById('today-plan-container').innerHTML = `<div class="text-center py-16"><p class="text-xl font-medium text-red-500">加载失败</p><p class="text-gray-500 mt-2">无法加载计划数据，请检查网络连接并刷新页面。</p></div>`;
    }
}

document.addEventListener('DOMContentLoaded', init);
