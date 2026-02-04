const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const mongoose = require('mongoose');

// ★ 여기에 아까 그 MongoDB 주소를 다시 정확히 넣어주세요!
// (비밀번호에 특수문자가 있다면 뺀 걸로 넣으셔야 합니다)
const MONGO_URL = "mongodb+srv://admin:admin3257@cluster0.jr6vxpa.mongodb.net/?appName=Cluster0";

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

  // [수정됨] 접속하자마자 주지 않고, "달라고 할 때" 줍니다.
  socket.on('request history', async () => {
    try {
      if (mongoose.connection.readyState === 1) {
        // DB에서 최근 50개 가져오기
        const oldMessages = await Message.find().sort({ createdAt: 1 }).limit(50);
        
        // 요청한 사람(socket)에게만 보내주기
        // 중요: forEach 대신 한 번에 배열로 보내는 게 더 깔끔하지만, 
        // 기존 클라이언트 코드 유지를 위해 하나씩 보냅니다.
        oldMessages.forEach((msg) => {
          socket.emit('chat message', { 
            user: msg.user, 
            text: msg.text, 
            time: msg.time 
          });
        });
        console.log('📜 과거 대화 전송 완료');
      }
    } catch (e) {
      console.log('과거 대화 불러오기 실패', e);
    }
  });

  socket.on('chat message', async (data) => {
    // ... (여기는 기존과 똑같습니다) ...
    const now = new Date();
    const timeString = now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

    io.emit('chat message', {
      user: data.user,
      text: data.text,
      time: timeString
    });

    try {
      if (mongoose.connection.readyState === 1) {
        const newMessage = new Message({
          user: data.user,
          text: data.text,
          time: timeString,
        });
        await newMessage.save();
      }
    } catch (e) {
      console.log('저장 실패', e);
    }
  });

  socket.on('disconnect', () => {
    console.log('유저 나감');
  });
});

server.listen(3000, () => {
  console.log('🚀 채팅 서버가 가동되었습니다 (3000번 포트)');
});