const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Временное хранилище данных (в реальном приложении использовать БД)
const groups = new Map();
const users = new Map();
const messages = new Map();
const userLocations = new Map();

// ==================== API ENDPOINTS ====================

// Регистрация
app.post('/api/register', (req, res) => {
  const { username, email, password } = req.body;
  const userId = Date.now().toString();
  
  users.set(userId, {
    id: userId,
    username,
    email,
    password: password, // В реальном приложении хешировать!
    createdAt: new Date()
  });

  res.json({ success: true, userId, message: 'Успешная регистрация' });
});

// Авторизация
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  
  let user = null;
  users.forEach(u => {
    if (u.email === email && u.password === password) {
      user = u;
    }
  });

  if (user) {
    res.json({ success: true, userId: user.id, username: user.username });
  } else {
    res.status(401).json({ success: false, message: 'Неверные учетные данные' });
  }
});

// Создание группы
app.post('/api/groups', (req, res) => {
  const { userId, name, description } = req.body;
  const groupId = Date.now().toString();

  groups.set(groupId, {
    id: groupId,
    name,
    description,
    creator: userId,
    members: [userId],
    createdAt: new Date()
  });

  res.json({ success: true, groupId, message: 'Группа создана' });
});

// Получение групп пользователя
app.get('/api/groups/:userId', (req, res) => {
  const { userId } = req.params;
  const userGroups = [];

  groups.forEach(group => {
    if (group.members.includes(userId)) {
      userGroups.push(group);
    }
  });

  res.json({ success: true, groups: userGroups });
});

// Получение информации о группе
app.get('/api/groups/:groupId/info', (req, res) => {
  const group = groups.get(req.params.groupId);
  if (group) {
    res.json({ success: true, group });
  } else {
    res.status(404).json({ success: false, message: 'Группа не найдена' });
  }
});

// Добавление пользователя в группу
app.post('/api/groups/:groupId/add-member', (req, res) => {
  const { userId } = req.body;
  const group = groups.get(req.params.groupId);

  if (group && !group.members.includes(userId)) {
    group.members.push(userId);
    res.json({ success: true, message: 'Пользователь добавлен в группу' });
  } else {
    res.status(404).json({ success: false, message: 'Ошибка' });
  }
});

// Получение сообщений чата
app.get('/api/groups/:groupId/messages', (req, res) => {
  const groupMessages = messages.get(req.params.groupId) || [];
  res.json({ success: true, messages: groupMessages });
});

// AI рекомендация мест развлечения
app.post('/api/ai/recommend', (req, res) => {
  const { userId, groupId, preferences } = req.body;
  
  // Симуляция AI рекомендаций
  const recommendations = [
    {
      id: 1,
      name: 'Кинотеатр "Синема"',
      type: 'cinema',
      rating: 4.5,
      lat: 55.7558,
      lng: 37.6173,
      distance: '2.5 км'
    },
    {
      id: 2,
      name: 'Кафе "Уютное место"',
      type: 'cafe',
      rating: 4.8,
      lat: 55.7489,
      lng: 37.6240,
      distance: '1.2 км'
    },
    {
      id: 3,
      name: 'Парк развлечений "Веселье"',
      type: 'park',
      rating: 4.3,
      lat: 55.7614,
      lng: 37.6204,
      distance: '3.1 км'
    }
  ];

  res.json({ success: true, recommendations });
});

// ==================== SOCKET.IO ====================

io.on('connection', (socket) => {
  console.log(`Пользователь подключился: ${socket.id}`);

  // Присоединение к группе
  socket.on('join-group', (data) => {
    const { groupId, userId } = data;
    socket.join(`group-${groupId}`);
    console.log(`Пользователь ${userId} присоединился к группе ${groupId}`);
    
    io.to(`group-${groupId}`).emit('user-joined', {
      userId,
      message: `Пользователь присоединился к группе`
    });
  });

  // Обновление местоположения
  socket.on('update-location', (data) => {
    const { userId, groupId, lat, lng } = data;
    userLocations.set(userId, { lat, lng, groupId });
    
    io.to(`group-${groupId}`).emit('location-updated', {
      userId,
      lat,
      lng,
      timestamp: new Date()
    });
  });

  // Отправка сообщения в чат
  socket.on('send-message', (data) => {
    const { groupId, userId, username, message } = data;
    const msg = {
      id: Date.now(),
      userId,
      username,
      message,
      timestamp: new Date()
    };

    if (!messages.has(groupId)) {
      messages.set(groupId, []);
    }
    messages.get(groupId).push(msg);

    io.to(`group-${groupId}`).emit('message-received', msg);
  });

  // Отключение
  socket.on('disconnect', () => {
    console.log(`Пользователь отключился: ${socket.id}`);
  });
});

// ==================== ЗАПУСК СЕРВЕРА ====================

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
});
