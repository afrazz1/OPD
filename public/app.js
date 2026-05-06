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

    document.getElementById('chatInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });
}

function initializeMap() {
    if (map) map.remove();

    map = L.map('map').setView([55.7558, 37.6173], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(map);

    loadGroupMembers();
}

function updateUserOnMap(data) {
    const { userId, lat, lng } = data;

    if (userMarkers.has(userId)) {
        userMarkers.get(userId).setLatLng([lat, lng]);
    } else {
        const marker = L.marker([lat, lng]).addTo(map)
            .bindPopup(`<div class="map-popup"><div class="map-popup-user">Друг</div><div class="map-popup-status"><i class="fas fa-check-circle" style="color: #48bb78;"></i> Online</div></div>`);
        userMarkers.set(userId, marker);
    }

    map.setView([lat, lng], map.getZoom());
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
                        userMarkers.get(currentUser.id).setLatLng([latitude, longitude]);
                    } else {
                        const marker = L.marker([latitude, longitude], {
                            icon: L.icon({
                                iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
                                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                                iconSize: [25, 41],
                                iconAnchor: [12, 41],
                                popupAnchor: [1, -34],
                                shadowSize: [41, 41]
                            })
                        }).addTo(map)
                            .bindPopup(`<div class="map-popup"><div class="map-popup-user">Вы</div><div class="map-popup-status"><i class="fas fa-check-circle" style="color: #48bb78;"></i> Online</div></div>`);
                        userMarkers.set(currentUser.id, marker);
                    }
                    map.setView([latitude, longitude], map.getZoom());
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
    placeMarkers.forEach(marker => map.removeLayer(marker));
    placeMarkers.clear();

    places.forEach(place => {
        const marker = L.marker([place.lat, place.lng], {
            icon: L.icon({
                iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowSize: [41, 41]
            })
        }).addTo(map)
            .bindPopup(`<div class="map-popup"><strong>${place.name}</strong><br/>⭐ ${place.rating}</div>`);
        
        placeMarkers.set(place.id, marker);
    });
}

function centerMapOnPlace(lat, lng) {
    if (map) {
        map.flyTo([lat, lng], 15);
    }
}

function translateType(type) {
    const types = {
        cinema: '🎬 Кино',
        cafe: '☕ Кафе',
        park: '🌳 Парк',
        restaurant: '🍽️ Ресторан',
        bar: '🍺 Бар',
        museum: '🏛️ Музей'
    };
    return types[type] || type;
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

function displayGroupMembers(memberIds) {
    const membersList = document.getElementById('membersList');
    membersList.innerHTML = memberIds.map((memberId, index) => `
        <div class="member-item">
            <div class="member-avatar">${String.fromCharCode(65 + index)}</div>
            <span>Участник #${index + 1}</span>
            <div class="member-status online"></div>
        </div>
    `).join('');
}

// ==================== ВКЛАДКИ ====================

function switchView(viewName) {
    document.querySelectorAll('.view-content').forEach(view => view.classList.remove('active'));
    document.querySelectorAll('.sidebar-tabs .tab-btn').forEach(btn => btn.classList.remove('active'));

    document.getElementById(`${viewName}View`).classList.add('active');
    event.target.classList.add('active');
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
