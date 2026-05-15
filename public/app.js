// ==================== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ====================

let currentUser = null;
let currentGroup = null;
let socket = null;
let map = null;
let userMarkers = new Map();
let placeMarkers = new Map();

const API_BASE = 'http://localhost:5000/api';

// ==================== ИНИЦИАЛИЗАЦИЯ ====================

document.addEventListener('DOMContentLoaded', () => {
    initializeSocketIO();
    setupAuthListeners();
    setupGroupsListeners();
    setupMapListeners();
    loadGroupsIfLoggedIn();
});

// ==================== SOCKET.IO ====================

function initializeSocketIO() {
    socket = io('http://localhost:5000', {
        reconnectionDelay: 1000,
        reconnection: true,
        reconnectionAttempts: 10,
        transports: ['websocket']
    });

    socket.on('connect', () => {
        console.log('✓ Подключение установлено');
    });

    socket.on('location-updated', (data) => {
        updateUserOnMap(data);
    });

    socket.on('message-received', (message) => {
        displayMessage(message);
    });

    socket.on('user-joined', (data) => {
        showNotification(`${data.message}`);
    });

    socket.on('disconnect', () => {
        console.log('✗ Соединение разорвано');
    });
}

// ==================== АВТОРИЗАЦИЯ ====================

function setupAuthListeners() {
    // Вкладки авторизации
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (e.target.closest('#authScreen')) {
                const tabName = btn.dataset.tab;
                switchAuthTab(tabName);
            }
        });
    });

    // Форма входа
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = e.target.querySelector('input[type="email"]').value;
        const password = e.target.querySelector('input[type="password"]').value;

        try {
            const response = await fetch(`${API_BASE}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();
            if (data.success) {
                currentUser = { id: data.userId, username: data.username };
                localStorage.setItem('user', JSON.stringify(currentUser));
                switchScreen('groupsScreen');
                loadUserGroups();
                showNotification(`Добро пожаловать, ${data.username}!`);
            } else {
                showNotification('Ошибка входа', 'error');
            }
        } catch (error) {
            console.error('Ошибка входа:', error);
            showNotification('Ошибка подключения', 'error');
        }
    });

    // Форма регистрации
    document.getElementById('registerForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = e.target.querySelector('input[type="text"]').value;
        const email = e.target.querySelector('input[type="email"]').value;
        const password = e.target.querySelector('input[type="password"]').value;

        try {
            const response = await fetch(`${API_BASE}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password })
            });

            const data = await response.json();
            if (data.success) {
                currentUser = { id: data.userId, username };
                localStorage.setItem('user', JSON.stringify(currentUser));
                switchScreen('groupsScreen');
                loadUserGroups();
                showNotification(`Добро пожаловать, ${username}!`);
            }
        } catch (error) {
            console.error('Ошибка регистрации:', error);
            showNotification('Ошибка регистрации', 'error');
        }
    });

    // Кнопка выхода
    document.getElementById('logoutBtn').addEventListener('click', () => {
        currentUser = null;
        localStorage.removeItem('user');
        switchScreen('authScreen');
        showNotification('Вы вышли из аккаунта');
    });
}

function switchAuthTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));

    document.getElementById(`${tabName}Tab`).classList.add('active');
    event.target.classList.add('active');
}

// ==================== ГРУППЫ ====================

function setupGroupsListeners() {
    // Создание группы
    document.getElementById('createGroupBtn').addEventListener('click', () => {
        document.getElementById('createGroupModal').classList.add('active');
    });

    document.querySelector('.close-btn').addEventListener('click', () => {
        document.getElementById('createGroupModal').classList.remove('active');
    });

    document.getElementById('createGroupForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = e.target.querySelector('input').value;
        const description = e.target.querySelector('textarea').value;

        try {
            const response = await fetch(`${API_BASE}/groups`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: currentUser.id,
                    name,
                    description
                })
            });

            const data = await response.json();
            if (data.success) {
                document.getElementById('createGroupModal').classList.remove('active');
                e.target.reset();
                loadUserGroups();
                showNotification('Группа создана!');
            }
        } catch (error) {
            console.error('Ошибка создания группы:', error);
        }
    });
}

async function loadUserGroups() {
    if (!currentUser) return;

    try {
        const response = await fetch(`${API_BASE}/groups/${currentUser.id}`);
        const data = await response.json();

        if (data.success) {
            displayGroups(data.groups);
        }
    } catch (error) {
        console.error('Ошибка загрузки групп:', error);
    }
}

function displayGroups(groups) {
    const groupsList = document.getElementById('groupsList');
    document.getElementById('currentUser').textContent = currentUser.username;

    if (groups.length === 0) {
        groupsList.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary);">У вас еще нет групп. Создайте первую!</p>';
        return;
    }

    groupsList.innerHTML = groups.map(group => `
        <div class="group-card" onclick="openGroup('${group.id}', '${group.name}')">
            <div class="group-card-header">
                <div class="group-card-icon">
                    <i class="fas fa-users"></i>
                </div>
                <div>
                    <h3>${group.name}</h3>
                </div>
            </div>
            <p>${group.description || 'Нет описания'}</p>
            <div class="group-card-footer">
                <span><i class="fas fa-user-friends"></i> ${group.members.length} участник(ов)</span>
                <span>${new Date(group.createdAt).toLocaleDateString('ru-RU')}</span>
            </div>
        </div>
    `).join('');
}

function openGroup(groupId, groupName) {
    currentGroup = { id: groupId, name: groupName };
    document.getElementById('groupTitle').textContent = groupName;
    switchScreen('groupMapScreen');
    initializeMap();
    loadGroupChat();
    loadGroupMembers();
    startLocationTracking();
    joinGroupSocket();
}

// ==================== КАРТА ====================

function setupMapListeners() {
    document.getElementById('backBtn').addEventListener('click', () => {
        currentGroup = null;
        stopLocationTracking();
        switchScreen('groupsScreen');
    });

    document.querySelectorAll('.sidebar-tabs .tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const view = btn.dataset.view;
            switchView(view);
        });
    });

    document.getElementById('getRecommendationsBtn').addEventListener('click', getAIRecommendations);
    document.getElementById('sendMessageBtn').addEventListener('click', sendMessage);
    document.getElementById('inviteUserBtn').addEventListener('click', inviteUserToGroup);
    document.getElementById('inviteEmailInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') inviteUserToGroup();
    });

    document.getElementById('chatInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });
}

function initializeMap() {
    ymaps.ready(function() {
        if (map) {
            map.destroy();
        }

        map = new ymaps.Map('map', {
            center: [55.7558, 37.6173],
            zoom: 13,
            controls: ['zoomControl', 'fullscreenControl']
        });

        loadGroupMembers();
    });
}

function updateUserOnMap(data) {
    const { userId, lat, lng } = data;

    if (userMarkers.has(userId)) {
        const marker = userMarkers.get(userId);
        marker.geometry.setCoordinates([lat, lng]);
    } else {
        const placemark = new ymaps.Placemark([lat, lng], {
            balloonContent: '<div class="map-popup"><div class="map-popup-user">Друг</div><div class="map-popup-status"><i class="fas fa-check-circle" style="color: #48bb78;"></i> Online</div></div>'
        }, {
            preset: 'islands#blueIcon'
        });
        map.geoObjects.add(placemark);
        userMarkers.set(userId, placemark);
    }

    map.setCenter([lat, lng], map.getZoom());
}

function startLocationTracking() {
    if (navigator.geolocation) {
        navigator.geolocation.watchPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                
                if (socket && currentGroup) {
                    socket.emit('update-location', {
                        userId: currentUser.id,
                        groupId: currentGroup.id,
                        lat: latitude,
                        lng: longitude
                    });
                }

                // Обновление позиции пользователя на карте
                if (map) {
                    if (userMarkers.has(currentUser.id)) {
                        const marker = userMarkers.get(currentUser.id);
                        marker.geometry.setCoordinates([latitude, longitude]);
                    } else {
                        const placemark = new ymaps.Placemark([latitude, longitude], {
                            balloonContent: '<div class="map-popup"><div class="map-popup-user">Вы</div><div class="map-popup-status"><i class="fas fa-check-circle" style="color: #48bb78;"></i> Online</div></div>'
                        }, {
                            preset: 'islands#blueIcon'
                        });
                        map.geoObjects.add(placemark);
                        userMarkers.set(currentUser.id, placemark);
                    }
                    map.setCenter([latitude, longitude], map.getZoom());
                }
            },
            (error) => console.error('Ошибка геолокации:', error),
            { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
        );
    } else {
        showNotification('Геолокация не поддерживается браузером', 'error');
    }
}

function stopLocationTracking() {
    // Остановка отслеживания при необходимости
}

async function getAIRecommendations() {
    try {
        const response = await fetch(`${API_BASE}/ai/recommend`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: currentUser.id,
                groupId: currentGroup.id,
                preferences: 'entertainment'
            })
        });

        const data = await response.json();
        if (data.success) {
            displayRecommendations(data.recommendations);
            displayPlacesOnMap(data.recommendations);
        }
    } catch (error) {
        console.error('Ошибка получения рекомендаций:', error);
    }
}

function displayRecommendations(recommendations) {
    const list = document.getElementById('recommendationsList');
    list.innerHTML = recommendations.map(rec => `
        <div class="recommendation-item" onclick="centerMapOnPlace(${rec.lat}, ${rec.lng})">
            <div class="recommendation-name">${rec.name}</div>
            <span class="recommendation-type">${translateType(rec.type)}</span>
            <div class="recommendation-stats">
                <span><i class="fas fa-star" style="color: #f6ad55;"></i> ${rec.rating}</span>
                <span><i class="fas fa-map-marker-alt"></i> ${rec.distance}</span>
            </div>
        </div>
    `).join('');
}

function displayPlacesOnMap(places) {
    // Удаление старых маркеров мест
    placeMarkers.forEach(marker => map.geoObjects.remove(marker));
    placeMarkers.clear();

    places.forEach(place => {
        const placemark = new ymaps.Placemark([place.lat, place.lng], {
            balloonContent: `<div class="map-popup"><strong>${place.name}</strong><br/>⭐ ${place.rating}</div>`
        }, {
            preset: 'islands#redIcon'
        });
        map.geoObjects.add(placemark);
        placeMarkers.set(place.id, placemark);
    });
}

function centerMapOnPlace(lat, lng) {
    if (map) {
        map.setCenter([lat, lng], 15);
    }
}

function translateType(type) {
    const types = {
        cinema: '🎬 Кино',
        cafe: '☕ Кафе',
        park: '🌳 Парк',
        bowling: '🎳 Боулинг',
        theater: '🎭 Театр',
        quest: '🧩 Квест',
        karting: '🏎️ Картинг',
        bar: '🍺 Бар'
    };
    return types[type] || type;
}

async function loadPlaces() {
    try {
        const response = await fetch(`${API_BASE}/places`);
        const data = await response.json();
        if (data.success) {
            displayPlaces(data.places);
            displayPlacesOnMap(data.places);
        }
    } catch (error) {
        console.error('Ошибка загрузки мест:', error);
    }
}

function displayPlaces(places) {
    const list = document.getElementById('placesList');
    list.innerHTML = places.map(place => `
        <div class="place-item" onclick="centerMapOnPlace(${place.lat}, ${place.lng})">
            <div class="place-header">
                <div class="place-name">${place.name}</div>
                <span class="place-type">${translateType(place.type)}</span>
            </div>
            <div class="place-address">${place.address}</div>
            <div class="place-description">${place.description}</div>
            <div class="place-rating">
                <i class="fas fa-star" style="color: #f6ad55;"></i> ${place.rating}
            </div>
        </div>
    `).join('');
}

// ==================== ЧАТ ====================

function joinGroupSocket() {
    if (socket && currentGroup) {
        socket.emit('join-group', {
            userId: currentUser.id,
            groupId: currentGroup.id
        });
    }
}

async function loadGroupChat() {
    try {
        const response = await fetch(`${API_BASE}/groups/${currentGroup.id}/messages`);
        const data = await response.json();

        if (data.success) {
            const chatMessages = document.getElementById('chatMessages');
            chatMessages.innerHTML = '';
            data.messages.forEach(msg => displayMessage(msg));
        }
    } catch (error) {
        console.error('Ошибка загрузки чата:', error);
    }
}

function sendMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();

    if (!message) return;

    socket.emit('send-message', {
        groupId: currentGroup.id,
        userId: currentUser.id,
        username: currentUser.username,
        message
    });

    input.value = '';
}

function displayMessage(message) {
    const chatMessages = document.getElementById('chatMessages');
    const isOwnMessage = message.userId === currentUser.id;

    const messageEl = document.createElement('div');
    messageEl.className = `message ${isOwnMessage ? 'own' : 'other'}`;
    messageEl.innerHTML = `
        <div class="message-author">${message.username}</div>
        <div class="message-text">${escapeHtml(message.message)}</div>
        <div class="message-time">${new Date(message.timestamp).toLocaleTimeString('ru-RU')}</div>
    `;

    chatMessages.appendChild(messageEl);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function loadGroupMembers() {
    try {
        const response = await fetch(`${API_BASE}/groups/${currentGroup.id}/info`);
        const data = await response.json();

        if (data.success) {
            displayGroupMembers(data.group.members);
        }
    } catch (error) {
        console.error('Ошибка загрузки участников:', error);
    }
}

async function displayGroupMembers(memberIds) {
    const membersList = document.getElementById('membersList');

    if (memberIds.length === 0) {
        membersList.innerHTML = '<p class="empty-members">В этой группе пока нет участников.</p>';
        return;
    }

    const membersData = await Promise.all(memberIds.map(async (memberId) => {
        try {
            const response = await fetch(`${API_BASE}/users/${memberId}`);
            const data = await response.json();
            return data.success ? data.user : { id: memberId, username: `Пользователь ${memberId}` };
        } catch (error) {
            return { id: memberId, username: `Пользователь ${memberId}` };
        }
    }));

    membersList.innerHTML = membersData.map((member, index) => `
        <div class="member-item">
            <div class="member-avatar">${String.fromCharCode(65 + index)}</div>
            <span>${member.username}</span>
            <div class="member-status online"></div>
        </div>
    `).join('');
}

async function inviteUserToGroup() {
    const emailInput = document.getElementById('inviteEmailInput');
    const status = document.getElementById('inviteStatus');
    const email = emailInput.value.trim();

    if (!email) {
        status.textContent = 'Введите email пользователя для приглашения.';
        status.className = 'invite-status error';
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/groups/${currentGroup.id}/invite`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        const data = await response.json();

        if (data.success) {
            status.textContent = `Пользователь ${data.username} приглашён.`;
            status.className = 'invite-status success';
            emailInput.value = '';
            loadGroupMembers();
        } else {
            status.textContent = data.message || 'Ошибка приглашения.';
            status.className = 'invite-status error';
        }
    } catch (error) {
        console.error('Ошибка приглашения пользователя:', error);
        status.textContent = 'Ошибка сервера. Попробуйте позже.';
        status.className = 'invite-status error';
    }
}

// ==================== ВКЛАДКИ ====================

function switchView(viewName) {
    document.querySelectorAll('.view-content').forEach(view => view.classList.remove('active'));
    document.querySelectorAll('.sidebar-tabs .tab-btn').forEach(btn => btn.classList.remove('active'));

    document.getElementById(`${viewName}View`).classList.add('active');
    event.target.classList.add('active');

    // Загрузка данных для вкладки
    if (viewName === 'places') {
        loadPlaces();
    }
}

// ==================== УТИЛИТЫ ====================

function switchScreen(screenName) {
    document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
    document.getElementById(screenName).classList.add('active');
}

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${type === 'error' ? '#f56565' : '#48bb78'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        animation: slideIn 0.3s ease;
        z-index: 1000;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function loadGroupsIfLoggedIn() {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        switchScreen('groupsScreen');
        loadUserGroups();
        document.getElementById('currentUser').textContent = currentUser.username;
    }
}
