const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const mongoose = require('mongoose');

// ★ MongoDB 주소 (기존 주소 그대로 유지)
const MONGO_URL = "mongodb+srv://admin:admin3257@cluster0.jr6vxpa.mongodb.net/?appName=Cluster0";

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// DB 연결
mongoose.connect(MONGO_URL)
  .then(() => console.log('✅ MongoDB 연결 성공!'))
  .catch((err) => console.log('⚠️ DB 연결 에러:', err));

// 1. 유저 장부 (회원정보)
const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true }, // 아이디 (중복불가)
  password: { type: String, required: true },               // 비밀번호
  isAdmin: { type: Boolean, default: false },               // 관리자 여부 (나중을 위해!)
  createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', userSchema);

// 2. 메시지 장부
const chatSchema = new mongoose.Schema({
  user: String,
  text: String,
  time: String,
  createdAt: { type: Date, default: Date.now }
});
const Message = mongoose.model('Message', chatSchema);

io.on('connection', (socket) => {
  console.log('유저 접속:', socket.id);

  // [기능 1] 회원가입
  socket.on('register', async ({ username, password }) => {
    try {
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        socket.emit('auth_error', '이미 존재하는 아이디입니다.');
      } else {
        // 새 유저 저장 (첫 번째 가입자는 자동으로 관리자로 만들어줄까요? 일단은 모두 일반유저)
        const newUser = new User({ username, password, isAdmin: false });
        await newUser.save();
        socket.emit('register_success', '회원가입 성공! 로그인해주세요.');
      }
    } catch (e) {
      socket.emit('auth_error', '회원가입 중 오류 발생');
    }
  });

  // [기능 2] 로그인
  socket.on('login', async ({ username, password }) => {
    try {
      const user = await User.findOne({ username, password });
      if (user) {
        socket.emit('login_success', { 
          username: user.username, 
          isAdmin: user.isAdmin 
        });
      } else {
        socket.emit('auth_error', '아이디 또는 비밀번호가 틀렸습니다.');
      }
    } catch (e) {
      socket.emit('auth_error', '로그인 중 오류 발생');
    }
  });

  // [기능 3] 대화 불러오기 (로그인 성공한 사람만 요청하겠죠?)
  socket.on('request history', async () => {
    try {
      const oldMessages = await Message.find().sort({ createdAt: 1 }).limit(50);
      oldMessages.forEach((msg) => {
        socket.emit('chat message', { 
          user: msg.user, 
          text: msg.text, 
          time: msg.time 
        });
      });
    } catch (e) {}
  });

  // [기능 4] 메시지 전송
  socket.on('chat message', async (data) => {
    const now = new Date();
    const timeString = now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

    // 나중에 관리자인지 확인해서 표시할 수도 있음
    io.emit('chat message', {
      user: data.user,
      text: data.text,
      time: timeString
    });

    try {
      const newMessage = new Message({
        user: data.user,
        text: data.text,
        time: timeString,
      });
      await newMessage.save();
    } catch (e) {}
  });
});

server.listen(3000, () => {
  console.log('🚀 서버 가동 중');
});