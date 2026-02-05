const express = require('express');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const mongoose = require('mongoose'); // ★ DB 도구 추가

const app = express();

app.use(cors());
app.use(express.json());

// ======================================================
// ★ [중요] 여기에 아까 그 MongoDB 주소를 넣으세요!
// <db_password> 부분 비밀번호로 바꾸는 것 잊지 말고요!
const MONGO_URL = "mongodb+srv://admin:admin3257@cluster0.jr6vxpa.mongodb.net/?appName=Cluster0";
// ======================================================

// 1. 데이터베이스 연결 (이게 성공해야 서버가 켜짐)
mongoose.connect(MONGO_URL)
    .then(() => console.log('✅ MongoDB(진짜 저장소) 연결 성공!'))
    .catch(err => console.error('🔥 DB 연결 실패:', err));

// 2. 유저 스키마(설계도) 만들기
// 아까는 chatSchema였지만, 이번엔 'User' 정보를 담을 그릇이야.
const userSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true }, // UUID
    loginId: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: String,
    nickname: String,
    createdAt: { type: Date, default: Date.now }
});

// 'User'라는 이름의 장부 생성
const User = mongoose.model('User', userSchema);


// --- 회원가입 API (DB 버전) ---
app.post('/signup', async (req, res) => {
    try {
        const { loginId, password, name, nickname } = req.body;

        // 유효성 검사 (아까랑 같음)
        if (!loginId || !password || !name || !nickname) return res.status(400).json({ message: "정보 부족" });
        const idPattern = /^[a-z0-9]{4,12}$/;
        if (!idPattern.test(loginId)) return res.status(400).json({ message: "아이디 형식 오류" });
        if (password.length < 4) return res.status(400).json({ message: "비밀번호 너무 짧음" });

        // ★ [변경점] DB에서 중복 아이디 찾기
        // (기존 users.some(...) 대신 DB 명령어를 씀)
        const existingUser = await User.findOne({ loginId: loginId });
        if (existingUser) {
            return res.status(409).json({ message: "이미 사용 중인 아이디입니다." });
        }

        // 비밀번호 암호화 & UUID 생성
        const hashedPassword = await bcrypt.hash(password, 10);
        const uniqueId = uuidv4();

        // ★ [변경점] DB에 저장할 데이터 만들기
        const newUser = new User({
            userId: uniqueId,
            loginId: loginId,
            password: hashedPassword,
            name: name,
            nickname: nickname
        });

        // ★ [변경점] 진짜 저장! (하드디스크에 저장됨)
        await newUser.save();
        console.log("--- DB에 회원 저장 완료 ---", newUser);

        res.status(201).json({ 
            message: "회원가입 완료! (DB저장됨)",
            userId: uniqueId 
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "서버 오류 발생" });
    }
});

app.listen(3000, () => {
    console.log('서버가 3000번 포트에서 실행 중입니다.');
});