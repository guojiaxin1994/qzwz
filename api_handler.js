const PLAN_DATA_URL = 'plan_data.json';
const ANNOUNCEMENTS_URL = 'announcements.json';
const LEADERBOARD_URL = 'leaderboard.json';

const ALL_USERS_KEY = 'allUsersData';
const CURRENT_USER_KEY = 'currentUser';
const USER_ACTIVITY_KEY = 'user_activity_data';

function getCurrentUser() {
    return localStorage.getItem(CURRENT_USER_KEY);
}

function _saveData(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

export async function getPlanData() {
    try {
        const response = await fetch(PLAN_DATA_URL, { cache: "no-store" });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Could not fetch plan data:", error);
        throw error;
    }
}

export async function getAnnouncements() {
    try {
        const response = await fetch(ANNOUNCEMENTS_URL, { cache: "no-store" });
        if (!response.ok) return [];
        return await response.json();
    } catch (error) {
        console.error("Could not fetch announcements:", error);
        return [];
    }
}

export async function getLeaderboard() {
    try {
        const response = await fetch(LEADERBOARD_URL, { cache: "no-store" });
        if (!response.ok) return [];
        return await response.json();
    } catch (error) {
        console.error("Could not fetch leaderboard:", error);
        return [];
    }
}

export async function getCheckinData() {
    const currentUser = getCurrentUser();
    if (!currentUser) return { completed_dates: [] };
    
    const allUsers = JSON.parse(localStorage.getItem(ALL_USERS_KEY)) || {};
    return allUsers[currentUser] || { checkin_dates: [] };
}

export async function saveCheckinData(dateStr) {
    const currentUser = getCurrentUser();
    if (!currentUser) throw new Error("User not logged in");
    
    let allUsers = JSON.parse(localStorage.getItem(ALL_USERS_KEY)) || {};
    if (!allUsers[currentUser]) {
        allUsers[currentUser] = { checkin_dates: [] };
    }
    if (!allUsers[currentUser].checkin_dates.includes(dateStr)) {
        allUsers[currentUser].checkin_dates.push(dateStr);
    }
    _saveData(ALL_USERS_KEY, allUsers);
}

function getActivityData() {
    try {
        const data = localStorage.getItem(USER_ACTIVITY_KEY);
        return data ? JSON.parse(data) : {};
    } catch (e) {
        console.error('Error parsing activity data from localStorage', e);
        return {};
    }
}

export function getAllActivityData() {
    return getActivityData();
}

function saveActivityData(data) {
    _saveData(USER_ACTIVITY_KEY, data);
}

export function recordVideoWatch(username, videoUrl, durationInSeconds) {
    if (!username || !videoUrl || durationInSeconds <= 0) return;

    const activities = getActivityData();
    if (!activities[username]) {
        activities[username] = { logins: [], video_watches: [] };
    }
     if (!activities[username].video_watches) {
        activities[username].video_watches = [];
    }

    let videoLog = activities[username].video_watches.find(v => v.url === videoUrl);

    if (videoLog) {
        videoLog.total_watch_time_seconds = (videoLog.total_watch_time_seconds || 0) + durationInSeconds;
        videoLog.watch_sessions.push({
            timestamp: new Date().toISOString(),
            duration: durationInSeconds
        });
    } else {
        activities[username].video_watches.push({
            url: videoUrl,
            total_watch_time_seconds: durationInSeconds,
            watch_sessions: [{
                timestamp: new Date().toISOString(),
                duration: durationInSeconds
            }]
        });
    }
    
    saveActivityData(activities);
}
