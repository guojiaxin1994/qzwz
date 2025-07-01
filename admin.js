import { getPlanData, getAllActivityData } from './api_handler.js';

let planData = null;
const THEME_COLORS = ['#EA580C', '#0EA5E9', '#10B981', '#8B5CF6', '#D946EF', '#EC4899'];
const MODULE_NAMES = {
    'weekly-overview-section': '本周打卡',
    'progress-overview-section': '计划进度',
    'leaderboard-section': '锻炼排行榜'
};

function handleFileUpload(file, callback) {
    if (!file || !file.type.startsWith('image/')) {
        alert('请选择一个图片文件。');
        return;
    }
    const reader = new FileReader();
    reader.onload = () => {
        callback(reader.result);
    };
    reader.onerror = () => {
        alert('读取文件失败。');
    };
    reader.readAsDataURL(file);
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        planData = await getPlanData();
        initComponents();
    } catch (error) {
        console.error('Failed to initialize admin panel:', error);
        document.getElementById('root').innerHTML = '<div class=\"text-center p-8 text-red-500\">无法加载管理后台数据。</div>';
    }
});

function initComponents() {
    if (!planData.announcement_image) {
        planData.announcement_image = '';
    }
    renderThemeSettings();
    renderGeneralInfo();
    renderLayoutManager();
    renderAnnouncementEditor();
    renderDailyPlanList();
    renderExerciseLib();
    setupEventListeners();
    renderUserAnalysisDashboard();
    lucide.createIcons();
}

function renderThemeSettings() {
    const palette = document.getElementById('color-palette');
    palette.innerHTML = '';
    THEME_COLORS.forEach(color => {
        const isActive = color.toLowerCase() === planData.theme.color.toLowerCase();
        const colorOption = document.createElement('div');
        colorOption.className = `w-10 h-10 rounded-full cursor-pointer border-4 ${isActive ? 'border-blue-500' : 'border-transparent'} transition-all`;
        colorOption.style.backgroundColor = color;
        colorOption.dataset.color = color;
        colorOption.onclick = () => {
            planData.theme.color = color;
            renderThemeSettings();
        };
        palette.appendChild(colorOption);
    });
}

function renderLayoutManager() {
    const container = document.getElementById('layout-sortable-list');
    if (!container) return;
    container.innerHTML = '';
    
    if (!planData.layout_order || !Array.isArray(planData.layout_order) || planData.layout_order.length === 0) {
        planData.layout_order = Object.keys(MODULE_NAMES);
    }

    planData.layout_order.forEach(moduleId => {
        if (MODULE_NAMES[moduleId]) {
            const item = document.createElement('div');
            item.className = 'sortable-item bg-gray-100 p-3 rounded-lg flex items-center justify-between shadow-sm';
            item.draggable = true;
            item.dataset.moduleId = moduleId;
            
            item.innerHTML = `
                <div class="flex items-center">
                    <i data-lucide="grip-vertical" class="w-5 h-5 mr-3 text-gray-400"></i>
                    <span class="font-medium">${MODULE_NAMES[moduleId]}</span>
                </div>
                <i data-lucide="layout" class="w-5 h-5 text-gray-500"></i>
            `;
            container.appendChild(item);
        }
    });
    
    addDragAndDropListeners(container);
    lucide.createIcons();
}

function addDragAndDropListeners(container) {
    let draggedItem = null;

    container.addEventListener('dragstart', e => {
        const target = e.target.closest('.sortable-item');
        if (target) {
            draggedItem = target;
            setTimeout(() => {
                target.classList.add('dragging');
            }, 0);
        }
    });

    container.addEventListener('dragend', () => {
        if (draggedItem) {
            draggedItem.classList.remove('dragging');
            draggedItem = null;
        }
    });

    container.addEventListener('dragover', e => {
        e.preventDefault();
        const afterElement = getDragAfterElement(container, e.clientY);
        const currentlyDragged = document.querySelector('.dragging');
        if (!currentlyDragged) return;

        if (afterElement == null) {
            container.appendChild(currentlyDragged);
        } else {
            container.insertBefore(currentlyDragged, afterElement);
        }
    });
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.sortable-item:not(.dragging)')];

    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function renderGeneralInfo() {
    const form = document.getElementById('general-info-form');
    form.innerHTML = `
        <div>
            <label for="site-title" class="block text-sm font-medium text-gray-700">网站标题</label>
            <input type="text" id="site-title" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" value="${planData.plan_info.title}">
        </div>
        <div>
            <label for="site-description" class="block text-sm font-medium text-gray-700">网站描述</label>
            <textarea id="site-description" rows="4" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">${planData.plan_info.description}</textarea>
        </div>
    `;
}

function renderAnnouncementEditor() {
    const textarea = document.getElementById('announcement-text');
    if (textarea) {
        textarea.value = planData.announcement || '';
    }

    const imageUrlInput = document.getElementById('announcement-image-url');
    const imagePreview = document.getElementById('announcement-image-preview');
    if (imageUrlInput && imagePreview) {
        const imageUrl = planData.announcement_image || '';
        imageUrlInput.value = imageUrl;
        if (imageUrl) {
            imagePreview.src = imageUrl;
            imagePreview.style.display = 'block';
        } else {
            imagePreview.style.display = 'none';
        }
    }
}

function renderDailyPlanList() {
    const container = document.getElementById('daily-plan-list');
    container.innerHTML = '';
    planData.daily_schedule.forEach((day, index) => {
        const item = createDailyPlanItem(day, index);
        container.appendChild(item);
    });
    lucide.createIcons();
}

function createDailyPlanItem(day, index) {
    const item = document.createElement('div');
    item.className = 'p-3 bg-gray-50 rounded-lg border border-gray-200';
    item.dataset.index = index;

    const allCategories = Object.keys(planData.exercise_categories);
    const exerciseOptions = allCategories.map(cat => `<option value=\"${cat}\" ${day.exercises.includes(cat) ? 'selected' : ''}>${cat}</option>`).join('');

    item.innerHTML = `
        <div class="flex items-center justify-between">
            <input type="date" class="form-input rounded-md text-sm p-1" value="${day.date}">
            <input type="text" class="form-input rounded-md text-sm p-1 mx-2" placeholder="星期" value="${day.day}">
            <input type="text" class="form-input rounded-md text-sm p-1 flex-grow" placeholder="训练类型" value="${day.training_type}">
            <button class="remove-day-btn text-red-500 hover:text-red-700 p-1 ml-2"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
        </div>
        <div class="mt-2">
            <select multiple class="form-multiselect block w-full mt-1 text-sm rounded-md">
                ${exerciseOptions}
            </select>
        </div>
    `;

    item.querySelector('.remove-day-btn').onclick = () => {
        planData.daily_schedule.splice(index, 1);
        renderDailyPlanList();
    };

    return item;
}

function renderExerciseLib() {
    const container = document.getElementById('exercise-lib-list');
    container.innerHTML = '';
    Object.keys(planData.exercise_categories).forEach(catName => {
        const category = planData.exercise_categories[catName];
        const item = document.createElement('div');
        item.className = 'p-4 bg-gray-50 rounded-lg border border-gray-200';
        item.dataset.category = catName;

        let exercisesHtml = category.exercises.map((ex, exIndex) => `
            <div class="exercise-item mt-2 p-2 bg-white rounded border space-y-2" data-ex-index="${exIndex}">
                <input type="text" class="form-input w-full text-sm" placeholder="动作名称" value="${ex.name || ''}">
                <textarea class="form-textarea w-full text-sm" rows="2" placeholder="方法">${ex.method || ''}</textarea>
                <input type="text" class="form-input w-full text-sm" placeholder="要求" value="${ex.requirement || ''}">
                <input type="text" class="form-input w-full text-sm" placeholder="时长 (如: 30秒)" value="${ex.duration || ''}">
                <input type="text" class="form-input w-full text-sm" placeholder="备注" value="${ex.notes || ''}">
                <div>
                    <label class="text-xs font-medium text-gray-600">动作图片</label>
                    <div class="flex items-center space-x-2">
                        <input type="url" class="image-url-input form-input w-full text-sm" placeholder="图片URL或上传" value="${ex.imageUrl || ''}">
                        <button type="button" class="upload-exercise-image-btn flex-shrink-0 text-xs bg-gray-200 text-gray-700 py-1 px-2 rounded hover:bg-gray-300">上传</button>
                    </div>
                    <img src="${ex.imageUrl || ''}" class="exercise-image-preview mt-2 rounded-md max-h-32" style="${ex.imageUrl ? '' : 'display: none;'}">
                </div>
                <div>
                    <label class="text-xs font-medium text-gray-600">动作视频 URL</label>
                    <input type="url" class="form-input w-full text-sm" placeholder="动作视频URL" value="${ex.videoUrl || ''}">
                </div>
                <button class="remove-exercise-btn text-xs text-red-500 hover:text-red-700 mt-1">删除动作</button>
            </div>
        `).join('');

        item.innerHTML = `
            <div class="flex items-center justify-between">
                <input type="text" class="form-input font-bold text-lg p-1" value="${catName}">
                <div>
                     <button class="add-exercise-btn text-xs bg-blue-500 text-white py-1 px-2 rounded hover:bg-blue-600">添加动作</button>
                     <button class="remove-category-btn text-red-500 hover:text-red-700 p-1 ml-2"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                </div>
            </div>
            <textarea class="form-textarea w-full text-sm mt-2" placeholder="分类描述">${category.description}</textarea>
            <div class="exercises-container mt-2">${exercisesHtml}</div>
        `;
        container.appendChild(item);
    });

    lucide.createIcons();
    addExerciseLibEventListeners();
}

function addExerciseLibEventListeners() {
    document.querySelectorAll('.remove-category-btn').forEach(btn => {
        btn.onclick = (e) => {
            const catName = e.currentTarget.closest('[data-category]').dataset.category;
            delete planData.exercise_categories[catName];
            renderExerciseLib();
            renderDailyPlanList();
        };
    });

    document.querySelectorAll('.add-exercise-btn').forEach(btn => {
        btn.onclick = (e) => {
            const catName = e.currentTarget.closest('[data-category]').dataset.category;
            planData.exercise_categories[catName].exercises.push({name: "", method: "", requirement: "", duration: "", notes: "", imageUrl: "", videoUrl: ""});
            renderExerciseLib();
        };
    });
    
     document.querySelectorAll('.remove-exercise-btn').forEach(btn => {
        btn.onclick = (e) => {
            const catName = e.currentTarget.closest('[data-category]').dataset.category;
            const exIndex = e.currentTarget.closest('.exercise-item').dataset.exIndex;
            planData.exercise_categories[catName].exercises.splice(exIndex, 1);
            renderExerciseLib();
        };
    });
}

function handleChangePassword(event) {
    event.preventDefault();
    const oldPasswordInput = document.getElementById('old-password');
    const newPasswordInput = document.getElementById('new-password');
    const confirmNewPasswordInput = document.getElementById('confirm-new-password');

    const oldPassword = oldPasswordInput.value;
    const newPassword = newPasswordInput.value;
    const confirmNewPassword = confirmNewPasswordInput.value;

    if (!oldPassword || !newPassword || !confirmNewPassword) {
        alert('所有字段均为必填项。');
        return;
    }

    const currentPassword = localStorage.getItem('adminPassword') || '120317';

    if (oldPassword !== currentPassword) {
        alert('旧密码不正确。');
        return;
    }

    if (newPassword.length < 6) {
        alert('新密码长度不能少于6位。');
        return;
    }

    if (newPassword !== confirmNewPassword) {
        alert('两次输入的新密码不一致。');
        return;
    }

    localStorage.setItem('adminPassword', newPassword);
    alert('密码修改成功！');
    document.getElementById('change-password-form').reset();
}

function setupEventListeners() {
    document.getElementById('save-changes-btn').addEventListener('click', saveChanges);
    
    document.getElementById('add-day-btn').addEventListener('click', () => {
        const today = new Date().toISOString().split('T')[0];
        planData.daily_schedule.push({ date: today, day: '新', training_type: '新训练', exercises: [] });
        renderDailyPlanList();
    });

    document.getElementById('add-category-btn').addEventListener('click', () => {
        const newCatName = `新分类 ${Object.keys(planData.exercise_categories).length + 1}`;
        planData.exercise_categories[newCatName] = { description: "", exercises: [] };
        renderExerciseLib();
        renderDailyPlanList();
    });

    const changePasswordForm = document.getElementById('change-password-form');
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', handleChangePassword);
    }
    
    document.getElementById('upload-announcement-image-btn').addEventListener('click', () => {
        document.getElementById('announcement-image-upload').click();
    });

    document.getElementById('announcement-image-upload').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            handleFileUpload(file, (base64) => {
                document.getElementById('announcement-image-url').value = base64;
                const preview = document.getElementById('announcement-image-preview');
                preview.src = base64;
                preview.style.display = 'block';
            });
        }
        e.target.value = '';
    });

    let targetImageInput = null;
    const imageUploader = document.getElementById('image-uploader');
    document.getElementById('exercise-lib-list').addEventListener('click', e => {
        if (e.target.classList.contains('upload-exercise-image-btn')) {
            targetImageInput = e.target.previousElementSibling;
            imageUploader.click();
        }
    });

    imageUploader.addEventListener('change', e => {
        const file = e.target.files[0];
        if (file && targetImageInput) {
            handleFileUpload(file, base64 => {
                targetImageInput.value = base64;
                const preview = targetImageInput.parentElement.nextElementSibling;
                if (preview && preview.tagName === 'IMG') {
                    preview.src = base64;
                    preview.style.display = 'block';
                }
                targetImageInput = null;
            });
        }
        e.target.value = '';
    });
}


function collectDataFromDOM() {
    const newPlanData = {
        plan_info: {
            title: document.getElementById('site-title').value,
            description: document.getElementById('site-description').value,
        },
        theme: {
            color: planData.theme.color
        },
        announcement: document.getElementById('announcement-text').value,
        announcement_image: document.getElementById('announcement-image-url').value,
        layout_order: [],
        exercise_categories: {},
        daily_schedule: []
    };

    const layoutOrder = [];
    document.querySelectorAll('#layout-sortable-list .sortable-item').forEach(item => {
        layoutOrder.push(item.dataset.moduleId);
    });
    newPlanData.layout_order = layoutOrder;

    document.querySelectorAll('#daily-plan-list > div').forEach(item => {
        const inputs = item.querySelectorAll('input');
        const select = item.querySelector('select');
        const selectedOptions = Array.from(select.selectedOptions).map(opt => opt.value);
        newPlanData.daily_schedule.push({
            date: inputs[0].value,
            day: inputs[1].value,
            training_type: inputs[2].value,
            exercises: selectedOptions,
        });
    });


    document.querySelectorAll('#exercise-lib-list > div').forEach(item => {
        const catNameInput = item.querySelector('input[type=\"text\"]');
        const oldCatName = item.dataset.category;
        const newCatName = catNameInput.value;
        const description = item.querySelector('textarea').value;
        const exercises = [];

        item.querySelectorAll('.exercise-item').forEach(exItem => {
            const inputs = exItem.querySelectorAll('input, textarea');
            exercises.push({
                name: inputs[0].value,
                method: inputs[1].value,
                requirement: inputs[2].value,
                duration: inputs[3].value,
                notes: inputs[4].value,
                imageUrl: inputs[5].value,
                videoUrl: inputs[6].value
            });
        });

        newPlanData.exercise_categories[newCatName] = { description, exercises };
        

        if(oldCatName !== newCatName) {
            newPlanData.daily_schedule.forEach(day => {
                day.exercises = day.exercises.map(ex => ex === oldCatName ? newCatName : ex);
            });
        }
    });
    
    return newPlanData;
}


function saveChanges() {
    const updatedData = collectDataFromDOM();
    const jsonString = JSON.stringify(updatedData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'plan_data.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    const instructions = document.getElementById('save-instructions');
    instructions.classList.remove('hidden');
    setTimeout(() => instructions.classList.add('hidden'), 5000);
}

function renderUserAnalysisDashboard() {
    const activityData = getAllActivityData();
    if (Object.keys(activityData).length === 0) {
        return;
    }

    const loginsByDate = {};
    const videoWatchStats = {};
    const userEngagement = [];
    const videoNameMapping = {};

    Object.values(planData.exercise_categories).forEach(cat => {
        cat.exercises.forEach(ex => {
            if (ex.videoUrl) {
                videoNameMapping[ex.videoUrl] = ex.name;
            }
        });
    });

    for (const username in activityData) {
        const userData = activityData[username];
        let totalUserWatchTime = 0;

        if (userData.logins && Array.isArray(userData.logins)) {
            userData.logins.forEach(login => {
                const date = new Date(login.timestamp).toISOString().split('T')[0];
                loginsByDate[date] = (loginsByDate[date] || 0) + 1;
            });
        }
        
        if (userData.video_watches && Array.isArray(userData.video_watches)) {
            userData.video_watches.forEach(video => {
                const url = video.url;
                const time = video.total_watch_time_seconds || 0;
                const sessions = video.watch_sessions || [];
                
                totalUserWatchTime += time;

                if (!videoWatchStats[url]) {
                    videoWatchStats[url] = { totalTime: 0, watchCount: 0 };
                }
                videoWatchStats[url].totalTime += time;
                videoWatchStats[url].watchCount += sessions.length;
            });
        }
        
        userEngagement.push({ username, totalWatchTime: totalUserWatchTime });
    }

    renderLoginChart(loginsByDate);
    renderVideoHeatmap(videoWatchStats, videoNameMapping);
    renderUserEngagementTable(userEngagement);
}

function renderLoginChart(loginsByDate) {
    const ctx = document.getElementById('user-activity-chart');
    if (!ctx) return;
    
    const sortedDates = Object.keys(loginsByDate).sort();
    
    if (sortedDates.length === 0) {
        ctx.parentElement.innerHTML = '<p class=\"text-center text-gray-500 py-8\">暂无登录数据</p>';
        return;
    }

    const labels = sortedDates;
    const data = sortedDates.map(date => loginsByDate[date]);

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: '每日登录次数',
                data: data,
                fill: true,
                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                borderColor: 'rgba(59, 130, 246, 1)',
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, ticks: { stepSize: 1 } }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}

function renderVideoHeatmap(videoWatchStats, videoNameMapping) {
    const container = document.getElementById('video-heatmap-container');
    if (!container) return;

    const statsArray = Object.entries(videoWatchStats).map(([url, stats]) => ({
        url,
        name: videoNameMapping[url] || '未知视频',
        ...stats
    }));
    
    if (statsArray.length === 0) {
        container.innerHTML = '<p class=\"text-center text-gray-500 py-8\">暂无视频观看数据</p>';
        return;
    }

    statsArray.sort((a, b) => b.totalTime - a.totalTime);
    const top10 = statsArray.slice(0, 10);
    const maxTime = top10[0]?.totalTime || 1;

    container.innerHTML = top10.map(video => `
        <div class="text-sm">
            <div class="flex justify-between items-center mb-1">
                <span class="font-medium text-gray-700 truncate" title="${video.url}">${video.name}</span>
                <span class="text-gray-500 flex-shrink-0 ml-2">${Math.round(video.totalTime / 60)} 分钟</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2">
                <div class="bg-blue-500 h-2 rounded-full transition-all" style="width: ${ (video.totalTime / maxTime) * 100}%\"></div>
            </div>
        </div>
    `).join('');
}

function renderUserEngagementTable(userEngagement) {
    const container = document.getElementById('user-engagement-table-container');
    if (!container) return;
    
    if (userEngagement.length === 0) {
        container.innerHTML = '<p class=\"text-center text-gray-500 py-8\">暂无用户参与数据</p>';
        return;
    }

    let currentSort = { key: 'totalWatchTime', order: 'desc' };

    const sortData = (data, key, order) => {
        return [...data].sort((a, b) => {
            const valA = a[key];
            const valB = b[key];
            let comparison = 0;
            if (valA > valB) {
                comparison = 1;
            } else if (valA < valB) {
                comparison = -1;
            }
            return order === 'desc' ? comparison * -1 : comparison;
        });
    };

    const renderTable = (data) => {
        const tableHtml = `
            <table class="w-full text-sm text-left text-gray-500">
                <thead class="text-xs text-gray-700 uppercase bg-gray-100">
                    <tr>
                        <th scope="col" class="px-6 py-3 cursor-pointer hover:bg-gray-200 transition-colors" data-sort="username">
                            用户 ${currentSort.key === 'username' ? (currentSort.order === 'asc' ? '▲' : '▼') : ''}
                        </th>
                        <th scope="col" class="px-6 py-3 cursor-pointer hover:bg-gray-200 transition-colors" data-sort="totalWatchTime">
                            总观看时长 (分钟) ${currentSort.key === 'totalWatchTime' ? (currentSort.order === 'asc' ? '▲' : '▼') : ''}
                        </th>
                    </tr>
                </thead>
                <tbody>
                    ${data.map(user => `
                        <tr class="bg-white border-b hover:bg-gray-50">
                            <th scope="row" class="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                                ${user.username}
                            </th>
                            <td class="px-6 py-4">
                                ${Math.round(user.totalWatchTime / 60)}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        container.innerHTML = tableHtml;
        
        container.querySelectorAll('th[data-sort]').forEach(th => {
            th.addEventListener('click', () => {
                const sortKey = th.dataset.sort;
                let newOrder = 'desc';
                if (currentSort.key === sortKey && currentSort.order === 'desc') {
                    newOrder = 'asc';
                }
                currentSort = { key: sortKey, order: newOrder };
                const sortedData = sortData(userEngagement, currentSort.key, currentSort.order);
                renderTable(sortedData);
            });
        });
    };

    const initialSortedData = sortData(userEngagement, currentSort.key, currentSort.order);
    renderTable(initialSortedData);
}
