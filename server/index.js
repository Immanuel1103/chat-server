const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const mongoose = require('mongoose');
const cors = require('cors');           // [추가] 보안 정책 허용
const bcrypt = require('bcrypt');       // [추가] 비밀번호 암호화
const { v4: uuidv4 } = require('uuid'); // [추가] 고유 ID 생성

const app = express();
const server = http.createServer(app);

// CORS 설정 (프론트엔드 3000, 5500 등 모든 곳에서 접속 허용)
app.use(cors());
app.use(express.json());

const io = new Server(server, { cors: { origin: "*" } });

// ======================================================
// ★ [중요] 아까 사용했던 MongoDB 주소를 여기에 넣으세요!
// <db_password> 부분 수정하는 것 잊지 마세요.
const MONGO_URL = "여기에_몽고DB_주소를_넣어주세요"; 
// ======================================================

// 1. 데이터베이스 연결
mongoose.connect(MONGO_URL)
  .then(() => console.log('✅ MongoDB 연결 성공! (회원가입/채팅 준비 완료)'))
  .catch((err) => console.log('🔥 DB 연결 실패:', err));

// -------------------------------------------------------
// [스키마 1] 회원정보 설계도 (User) - 오늘 추가한 내용
// -------------------------------------------------------
const userSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true }, // UUID
    loginId: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: String,
    nickname: String,
    createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', userSchema);

// -------------------------------------------------------
// [스키마 2] 채팅 메시지 설계도 (Message) - 기존 내용
// -------------------------------------------------------
const chatSchema = new mongoose.Schema({
  user: String,
  text: String,
  time: String,
  room: String,
  isAdmin: Boolean,
  createdAt: { type: Date, default: Date.now }
});
const Message = mongoose.model('Message', chatSchema);


// =======================================================
// 🚀 기능 1: 회원가입 API (POST /signup)
// =======================================================
app.post('/signup', async (req, res) => {
    try {
        const { loginId, password, name, nickname } = req.body;

        // 1. 유효성 검사
        if (!loginId || !password || !name || !nickname) {
            return res.status(400).json({ message: "모든 정보를 입력해주세요." });
        }
        
        // 아이디: 영문소문자+숫자 4~12자
        const idPattern = /^[a-z0-9]{4,12}$/;
        if (!idPattern.test(loginId)) {
            return res.status(400).json({ message: "아이디는 영문 소문자와 숫자로 4~12자여야 합니다." });
        }

        // 비밀번호: 4자 이상
        if (password.length < 4) {
            return res.status(400).json({ message: "비밀번호는 최소 4자 이상이어야 합니다." });
        }

        // 2. 중복 아이디 확인 (DB 조회)
        const existingUser = await User.findOne({ loginId: loginId });
        if (existingUser) {
            return res.status(409).json({ message: "이미 사용 중인 아이디입니다." });
        }

        // 3. 비밀번호 암호화 및 저장
        const hashedPassword = await bcrypt.hash(password, 10);
        const uniqueId = uuidv4();

        const newUser = new User({
            userId: uniqueId,
            loginId,
            password: hashedPassword,
            name,
            nickname
        });

        await newUser.save(); // DB에 영구 저장

        console.log(`[회원가입 성공] ${nickname} (${loginId})`);
        res.status(201).json({ message: "회원가입이 완료되었습니다!", userId: uniqueId });

    } catch (error) {
        console.error("회원가입 에러:", error);
        res.status(500).json({ message: "서버 오류 발생" });
    }
});

// =======================================================
// 🚀 기능 2: 로그인 API (POST /login) - ★ 여기부터 추가하세요
// =======================================================
app.post('/login', async (req, res) => {
    try {
        const { loginId, password } = req.body;

        // 1. 아이디가 존재하는지 확인
        const user = await User.findOne({ loginId: loginId });
        if (!user) {
            return res.status(400).json({ message: "아이디 또는 비밀번호가 틀렸습니다." });
        }

        // 2. 비밀번호가 일치하는지 확인 (bcrypt가 해싱된 비번과 비교해줌)
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "아이디 또는 비밀번호가 틀렸습니다." });
        }

        // 3. 로그인 성공! (유저 정보를 돌려줌)
        res.status(200).json({
            message: "로그인 성공!",
            userId: user.userId,
            nickname: user.nickname,
            name: user.name
        });

    } catch (error) {
        console.error("로그인 에러:", error);
        res.status(500).json({ message: "서버 오류 발생" });
    }
});

// ... 이 아래는 socket.io 채팅 코드 ...

// =======================================================
// 🚀 기능 2: 실시간 채팅 (Socket.io)
// =======================================================
io.on('connection', async (socket) => {
  console.log('유저 접속:', socket.id);

  // 접속 시 과거 대화 불러오기
  try {
    const oldMessages = await Message.find().sort({ createdAt: 1 }).limit(50);
    oldMessages.forEach((msg) => {
      socket.emit('chat message', {
        user: msg.user,
        text: msg.text,
        time: msg.time
      });
    });
  } catch (e) {
    console.log('과거 대화 로드 실패', e);
  }

  // 메시지 전송 및 저장
  socket.on('chat message', async (data) => {
    const now = new Date();
    const timeString = now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

    const newMessage = new Message({
      user: data.user,
      text: data.text,
      time: timeString,
      room: 'lobby',
      isAdmin: false,
    });

    await newMessage.save();

    io.emit('chat message', {
      user: data.user,
      text: data.text,
      time: timeString
    });
  });

  socket.on('disconnect', () => console.log('유저 나감'));
});

// 서버 시작
server.listen(3000, () => {
  console.log('✅ 서버가 3000번 포트에서 실행 중입니다.');
});