const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const mongoose = require('mongoose');

// ★ 여기에 아까 그 MongoDB 주소를 다시 정확히 넣어주세요!
// (비밀번호에 특수문자가 있다면 뺀 걸로 넣으셔야 합니다)
const MONGO_URL = "mongodb+srv://admin:admin3257@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// [안전장치 1] DB 연결 시도 (실패해도 서버는 안 죽게 설정)
mongoose.connect(MONGO_URL)
  .then(() => console.log('✅ MongoDB 연결 성공!'))
  .catch((err) => {
    console.log('⚠️ MongoDB 연결 실패 (채팅은 계속 됩니다):');
    console.log(err.message); // 에러 이유를 보여줌
  });

// 데이터 모델 (Schema)
const chatSchema = new mongoose.Schema({
  user: String,
  text: String,
  time: String,
  createdAt: { type: Date, default: Date.now }
});
const Message = mongoose.model('Message', chatSchema);

io.on('connection', async (socket) => {
  console.log('유저 접속:', socket.id);

  // [안전장치 2] 과거 대화 불러오기 (DB 에러나면 무시하고 진행)
  try {
    // DB가 연결된 상태인지 확인 (1 = 연결됨)
    if (mongoose.connection.readyState === 1) {
      const oldMessages = await Message.find().sort({ createdAt: 1 }).limit(50);
      oldMessages.forEach((msg) => {
        socket.emit('chat message', { user: msg.user, text: msg.text, time: msg.time });
      });
    }
  } catch (e) {
    console.log('과거 대화 불러오기 실패 (무시함)');
  }

  socket.on('chat message', async (data) => {
    // 1. 시간 계산
    const now = new Date();
    const timeString = now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

    // 2. 일단 채팅방에 먼저 뿌리기 (DB 저장 기다리지 않음 -> 속도 빠름)
    io.emit('chat message', {
      user: data.user,
      text: data.text,
      time: timeString
    });

    // 3. 그 다음 DB에 저장 시도 (실패해도 유저는 모르게 함)
    try {
      if (mongoose.connection.readyState === 1) {
        const newMessage = new Message({
          user: data.user,
          text: data.text,
          time: timeString,
        });
        await newMessage.save();
      } else {
        console.log('DB 미연결로 인해 메시지 저장 안 됨');
      }
    } catch (e) {
      console.log('메시지 저장 실패:', e.message);
    }
  });

  socket.on('disconnect', () => {
    console.log('유저 나감');
  });
});

server.listen(3000, () => {
  console.log('🚀 채팅 서버가 가동되었습니다 (3000번 포트)');
});