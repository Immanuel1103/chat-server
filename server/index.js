const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const mongoose = require('mongoose');

// ★ [중요] 아까 복사한 MongoDB 주소를 여기에 넣으세요!
// <db_password> 부분은 진짜 비밀번호로 바꿔야 합니다. <> 괄호도 지우세요.
const MONGO_URL = "mongodb+srv://admin:<admin3257>@cluster0.jr6vxpa.mongodb.net/?appName=Cluster0";

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// 1. 데이터베이스 연결
mongoose.connect(MONGO_URL)
  .then(() => console.log('✅ MongoDB에 연결되었습니다!'))
  .catch((err) => console.log('🔥 DB 연결 실패:', err));

// 2. 대화 내용 저장할 형식(Schema) 만들기
// (나중에 관리자 기능 등을 위해 room, role 등을 미리 생각해서 구조를 잡습니다)
const chatSchema = new mongoose.Schema({
  user: String,       // 닉네임
  text: String,       // 내용
  time: String,       // 시간
  room: String,       // 방 이름 (나중을 위해 추가)
  isAdmin: Boolean,   // 관리자/호스트 여부 (나중을 위해 추가)
  createdAt: { type: Date, default: Date.now } // 진짜 저장 시간
});

// "Message"라는 이름의 장부(Model)를 만듭니다
const Message = mongoose.model('Message', chatSchema);

io.on('connection', async (socket) => {
  console.log('유저 접속:', socket.id);

  // 3. [핵심] 유저가 들어오면, 저장된 과거 대화를 DB에서 가져와서 보내줍니다.
  try {
    // 최근 50개만 가져오기 (오래된 순서대로 정렬)
    const oldMessages = await Message.find().sort({ createdAt: 1 }).limit(50);
    
    // 가져온 데이터를 이 유저에게만 쏩니다.
    // 클라이언트가 이해할 수 있는 모양으로 바꿔서 보냅니다.
    oldMessages.forEach((msg) => {
      socket.emit('chat message', {
        user: msg.user,
        text: msg.text,
        time: msg.time
      });
    });
  } catch (e) {
    console.log('과거 대화 불러오기 실패', e);
  }

  // 4. 메시지를 받으면 DB에 저장하고 뿌리기
  socket.on('chat message', async (data) => {
    // data = { user: '홍길동', text: '안녕' }
    
    // 시간 계산
    const now = new Date();
    const timeString = now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

    // DB에 저장할 데이터 만들기
    const newMessage = new Message({
      user: data.user,
      text: data.text,
      time: timeString,
      room: 'lobby',   // 일단은 모두 '로비'에 있다고 가정
      isAdmin: false,  // 나중에 로그인 기능 생기면 true/false 판단
    });

    // DB에 저장!
    await newMessage.save();

    // 사람들에게 전송 (시간까지 포함해서)
    io.emit('chat message', {
      user: data.user,
      text: data.text,
      time: timeString
    });
  });

  socket.on('disconnect', () => {
    console.log('유저 나감');
  });
});

server.listen(3000, () => {
  console.log('서버 가동 중...');
});