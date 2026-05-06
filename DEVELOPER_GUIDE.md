# 👨‍💻 Руководство разработчика

## 🏗️ Архитектура

### Трехслойная архитектура

```
┌─────────────────────────────────────┐
│         Presentation Layer          │
│  (HTML, CSS, JavaScript в браузере) │
└────────────────┬────────────────────┘
                 │ HTTP/WebSocket
┌─────────────────┴────────────────────┐
│         Application Layer            │
│  (Express.js API endpoints)          │
└────────────────┬────────────────────┘
                 │
┌─────────────────┴────────────────────┐
│           Data Layer                 │
│  (In-memory Maps, в будущем БД)      │
└─────────────────────────────────────┘
```

## 🔧 Стек технологий

**Frontend:**
- Vanilla JavaScript (без фреймворков)
- HTML5 + CSS3
- Leaflet.js для карт
- Socket.io для WebSockets

**Backend:**
- Node.js + Express.js
- Socket.io
- CORS для безопасности

## 📁 Файловая структура по функциям

### Backend (server.js)

```javascript
// 1. Инициализация
const express = require('express');
const app = express();

// 2. Middleware
app.use(cors());
app.use(express.json());

// 3. Хранилище
const groups = new Map();
const users = new Map();

// 4. API endpoints
app.post('/api/register', ...);
app.post('/api/login', ...);
// ... остальные endpoints

// 5. Socket.io
io.on('connection', ...);

// 6. Запуск
server.listen(PORT);
```

### Frontend (app.js)

```javascript
// 1. Глобальные переменные
let currentUser = null;
let socket = null;

// 2. Инициализация
document.addEventListener('DOMContentLoaded', ...);

// 3. Авторизация
function setupAuthListeners() { ... }
function switchAuthTab(tabName) { ... }

// 4. Группы
function setupGroupsListeners() { ... }
function loadUserGroups() { ... }

// 5. Карта
function initializeMap() { ... }
function startLocationTracking() { ... }

// 6. Чат
function sendMessage() { ... }
function displayMessage(message) { ... }

// 7. Утилиты
function switchScreen(screenName) { ... }
function showNotification(message) { ... }
```

## 🔐 Безопасность

### Текущее состояние (ДЕМО)
⚠️ Приложение использует базовую безопасность для демонстрации!

### Что нужно добавить для продакшена

1. **Хеширование паролей**
```javascript
const bcrypt = require('bcrypt');

const hashedPassword = await bcrypt.hash(password, 10);
const isValid = await bcrypt.compare(password, hashedPassword);
```

2. **JWT Токены**
```javascript
const jwt = require('jsonwebtoken');

const token = jwt.sign({ userId }, SECRET, { expiresIn: '7d' });
const decoded = jwt.verify(token, SECRET);
```

3. **Валидация данных**
```javascript
const { body, validationResult } = require('express-validator');

app.post('/api/register',
  body('email').isEmail(),
  body('password').isLength({ min: 8 }),
  (req, res) => { ... }
);
```

4. **HTTPS/SSL**
```javascript
const https = require('https');
const fs = require('fs');

const options = {
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem')
};

https.createServer(options, app).listen(443);
```

## 📊 Примеры запросов API

### Регистрация

**Request:**
```bash
POST http://localhost:5000/api/register
Content-Type: application/json

{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "userId": "1234567890",
  "message": "Успешная регистрация"
}
```

### Создание группы

**Request:**
```bash
POST http://localhost:5000/api/groups
Content-Type: application/json

{
  "userId": "1234567890",
  "name": "Пикник",
  "description": "В парке"
}
```

**Response:**
```json
{
  "success": true,
  "groupId": "9876543210",
  "message": "Группа создана"
}
```

## 🔌 Socket.io события

### Подключение к группе

**Client:**
```javascript
socket.emit('join-group', {
  userId: currentUser.id,
  groupId: currentGroup.id
});
```

**Server обрабатывает и отправляет:**
```javascript
io.to(`group-${groupId}`).emit('user-joined', {
  userId,
  message: 'Пользователь присоединился'
});
```

### Отправка сообщения

**Client:**
```javascript
socket.emit('send-message', {
  groupId: currentGroup.id,
  userId: currentUser.id,
  username: currentUser.username,
  message: 'Hello!'
});
```

**Server трансляция:**
```javascript
io.to(`group-${groupId}`).emit('message-received', {
  id: Date.now(),
  userId, username, message,
  timestamp: new Date()
});
```

## 🧪 Отладка

### В браузере (DevTools)

```javascript
// Проверить текущего пользователя
console.log(currentUser);

// Проверить подключение Socket
console.log(socket.connected);

// Отправить тестовое сообщение
socket.emit('send-message', {
  groupId: currentGroup.id,
  userId: currentUser.id,
  username: 'Test',
  message: 'Test message'
});

// Проверить сохраненные группы
localStorage.getItem('user');
```

### На сервере

```bash
# Смотреть логи в реальном времени
npm run dev

# Полная информация о подключении
console.log(socket.id);
console.log(io.engine.clientsCount);
```

## 🚀 Расширение функциональности

### Добавление нового API endpoint

1. **В server.js:**
```javascript
app.post('/api/new-endpoint', (req, res) => {
  const { data } = req.body;
  
  // Логика обработки
  const result = processData(data);
  
  res.json({ success: true, result });
});
```

2. **В app.js:**
```javascript
async function callNewEndpoint(data) {
  const response = await fetch(`${API_BASE}/new-endpoint`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data })
  });
  
  const result = await response.json();
  if (result.success) {
    // Обработка результата
  }
}
```

### Добавление Socket.io события

1. **На сервере:**
```javascript
socket.on('custom-event', (data) => {
  console.log('Получено:', data);
  
  // Отправить ответ всем в группе
  io.to(`group-${data.groupId}`).emit('response-event', {
    success: true,
    message: 'Обработано'
  });
});
```

2. **На клиенте:**
```javascript
// Получение события
socket.on('response-event', (data) => {
  console.log('Ответ:', data);
});

// Отправка события
socket.emit('custom-event', {
  groupId: currentGroup.id,
  customData: 'value'
});
```

## 📈 Оптимизация

### Производительность карты

```javascript
// Использовать Leaflet plugins
L.markerClusterGroup() // Группировка маркеров

// Ограничить количество маркеров
if (markers.length > 100) {
  markers = markers.slice(0, 100);
}
```

### Кеширование данных

```javascript
const cache = new Map();

function getOrFetchGroups(userId) {
  if (cache.has(userId)) {
    return cache.get(userId);
  }
  
  const groups = fetchGroupsFromAPI(userId);
  cache.set(userId, groups);
  return groups;
}
```

### Ограничение частоты обновлений

```javascript
let lastUpdate = 0;
const UPDATE_INTERVAL = 5000; // 5 секунд

function updateLocation(lat, lng) {
  const now = Date.now();
  if (now - lastUpdate > UPDATE_INTERVAL) {
    socket.emit('update-location', { lat, lng });
    lastUpdate = now;
  }
}
```

## 🔍 Тестирование

### Ручное тестирование

```bash
# 1. Запустить сервер
npm start

# 2. Открыть в браузере
http://localhost:5000

# 3. Откать DevTools (F12)
# 4. Протестировать функции
```

### Автоматизированное тестирование

```javascript
// Пример теста с Jest
describe('GroupMap API', () => {
  test('регистрация пользователя', async () => {
    const response = await fetch('/api/register', {
      method: 'POST',
      body: JSON.stringify({
        username: 'test',
        email: 'test@test.com',
        password: 'password123'
      })
    });
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
  });
});
```

## 📝 Кодовые соглашения

### Комментирование

```javascript
// ==================== РАЗДЕЛ ====================

// Подраздел
function myFunction() {
  // Коментарий к коду
  const result = calculation();
  return result;
}
```

### Именование переменных

```javascript
// ✅ Хорошо
const currentUser = null;
const groupList = [];
function loadUserGroups() { }

// ❌ Плохо
const cu = null;
const gl = [];
function loadGr() { }
```

---

**Версия:** 1.0.0  
**Последнее обновление:** май 2024
