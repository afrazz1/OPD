const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
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

// ==================== ФУНКЦИИ РАБОТЫ С БД ====================

const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// Создать папку data если её нет
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Загрузить пользователей из файла
function loadUsersData() {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const data = fs.readFileSync(USERS_FILE, 'utf8');
      const usersArray = JSON.parse(data);
      usersArray.forEach(([id, user]) => {
        users.set(id, user);
      });
      console.log(`✓ Загружено ${users.size} пользователей из базы данных`);
    } else {
      console.log('📝 Файл users.json не найден. Создана новая база данных.');
    }
  } catch (error) {
    console.error('❌ Ошибка загрузки пользователей:', error);
  }
}

// Сохранить пользователей в файл
function saveUsersData() {
  try {
    const usersArray = Array.from(users.entries());
    fs.writeFileSync(USERS_FILE, JSON.stringify(usersArray, null, 2), 'utf8');
  } catch (error) {
    console.error('❌ Ошибка сохранения пользователей:', error);
  }
}

// Загрузить пользователей при запуске
loadUsersData();
const places = [
    {
        id: 1,
        name: 'Кинотеатр "Синема Парк"',
        type: 'cinema',
        rating: 4.5,
        lat: 55.7558,
        lng: 37.6173,
        address: 'ул. Тверская, 12',
        description: 'Современный кинотеатр с 8 залами'
    },
    {
        id: 2,
        name: 'Кафе "Уютное место"',
        type: 'cafe',
        rating: 4.8,
        lat: 55.7489,
        lng: 37.6240,
        address: 'ул. Арбат, 5',
        description: 'Кофе, десерты и уютная атмосфера'
    },
    {
        id: 3,
        name: 'Парк развлечений "Веселье"',
        type: 'park',
        rating: 4.3,
        lat: 55.7614,
        lng: 37.6204,
        address: 'ул. Ленинградская, 25',
        description: 'Аттракционы и развлечения для всей семьи'
    },
    {
        id: 4,
        name: 'Боулинг "Strike"',
        type: 'bowling',
        rating: 4.6,
        lat: 55.7421,
        lng: 37.6156,
        address: 'пр. Мира, 45',
        description: 'Профессиональный боулинг с 12 дорожками'
    },
    {
        id: 5,
        name: 'Театр "Современник"',
        type: 'theater',
        rating: 4.7,
        lat: 55.7598,
        lng: 37.6189,
        address: 'ул. Чехова, 8',
        description: 'Классический театр с современными постановками'
    },
    {
        id: 6,
        name: 'Квест-комната "Загадки"',
        type: 'quest',
        rating: 4.4,
        lat: 55.7512,
        lng: 37.6098,
        address: 'ул. Никольская, 15',
        description: 'Интерактивные квесты для компании'
    },
    {
        id: 7,
        name: 'Картинг "Скорость"',
        type: 'karting',
        rating: 4.5,
        lat: 55.7456,
        lng: 37.6289,
        address: 'ул. Волгоградская, 30',
        description: 'Профессиональный картинг на открытом воздухе'
    },
    {
        id: 8,
        name: 'Бар "Вечерний"',
        type: 'bar',
        rating: 4.2,
        lat: 55.7634,
        lng: 37.6123,
        address: 'ул. Петровка, 20',
        description: 'Коктейли и живая музыка'
    }
];

// ==================== API ENDPOINTS ====================

// Регистрация
app.post('/api/register', (req, res) => {
  const { username, email, password } = req.body;

  // Проверить, что все поля заполнены
  if (!username || !email || !password) {
    return res.status(400).json({ 
      success: false, 
      message: 'Пожалуйста, заполните все поля' 
    });
  }

  // Проверить, что email еще не зарегистрирован
  let emailExists = false;
  users.forEach(u => {
    if (u.email === email) {
      emailExists = true;
    }
  });

  if (emailExists) {
    return res.status(400).json({ 
      success: false, 
      message: 'Этот email уже зарегистрирован' 
    });
  }

  const userId = Date.now().toString();
  
  users.set(userId, {
    id: userId,
    username,
    email,
    password: password, // В реальном приложении хешировать!
    createdAt: new Date().toISOString()
  });

  // Сохранить пользователей в файл
  saveUsersData();

  res.json({ 
    success: true, 
    userId, 
    username,
    message: 'Успешная регистрация' 
  });
});

// Авторизация
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ 
      success: false, 
      message: 'Пожалуйста, заполните все поля' 
    });
  }
  
  let user = null;
  users.forEach(u => {
    if (u.email.toLowerCase() === email.toLowerCase() && u.password === password) {
      user = u;
    }
  });

  if (user) {
    res.json({ 
      success: true, 
      userId: user.id, 
      username: user.username,
      message: 'Успешный вход' 
    });
  } else {
    res.status(401).json({ 
      success: false, 
      message: 'Неверные учетные данные' 
    });
  }
});

// Получить информацию о пользователе
app.get('/api/users/:userId', (req, res) => {
  const user = users.get(req.params.userId);
  
  if (!user) {
    return res.status(404).json({ 
      success: false, 
      message: 'Пользователь не найден' 
    });
  }

  // Не отправляем пароль в ответе
  const { password, ...userWithoutPassword } = user;
  
  res.json({ 
    success: true, 
    user: userWithoutPassword 
  });
});

// Получить всех пользователей (для статистики)
app.get('/api/users', (req, res) => {
  const allUsers = Array.from(users.values()).map(u => {
    const { password, ...userWithoutPassword } = u;
    return userWithoutPassword;
  });
  
  res.json({ 
    success: true, 
    count: allUsers.length,
    users: allUsers 
  });
});

// Изменить пароль
app.put('/api/users/:userId/password', (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const user = users.get(req.params.userId);

  if (!user) {
    return res.status(404).json({ 
      success: false, 
      message: 'Пользователь не найден' 
    });
  }

  if (user.password !== oldPassword) {
    return res.status(401).json({ 
      success: false, 
      message: 'Текущий пароль неверный' 
    });
  }

  user.password = newPassword;
  users.set(req.params.userId, user);
  saveUsersData();

  res.json({ 
    success: true, 
    message: 'Пароль успешно изменен' 
  });
});

// Удалить учетную запись
app.delete('/api/users/:userId', (req, res) => {
  const { password } = req.body;
  const user = users.get(req.params.userId);

  if (!user) {
    return res.status(404).json({ 
      success: false, 
      message: 'Пользователь не найден' 
    });
  }

  if (user.password !== password) {
    return res.status(401).json({ 
      success: false, 
      message: 'Пароль неверный' 
    });
  }

  users.delete(req.params.userId);
  saveUsersData();

  res.json({ 
    success: true, 
    message: 'Учетная запись удалена' 
  });
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

// Приглашение пользователя по email
app.post('/api/groups/:groupId/invite', (req, res) => {
  const { email } = req.body;
  const group = groups.get(req.params.groupId);

  if (!group) {
    return res.status(404).json({ success: false, message: 'Группа не найдена' });
  }

  if (!email) {
    return res.status(400).json({ success: false, message: 'Укажите email пользователя' });
  }

  const user = Array.from(users.values()).find(u => u.email.toLowerCase() === email.toLowerCase());

  if (!user) {
    return res.status(404).json({ success: false, message: 'Пользователь с таким email не найден' });
  }

  if (group.members.includes(user.id)) {
    return res.status(409).json({ success: false, message: 'Пользователь уже находится в группе' });
  }

  group.members.push(user.id);
  res.json({ success: true, userId: user.id, username: user.username, message: 'Пользователь приглашён в группу' });
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

// Получение мест развлечений
app.get('/api/places', (req, res) => {
  res.json({ success: true, places });
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
