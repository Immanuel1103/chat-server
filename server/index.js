// 필요한 도구들을 가져옵니다
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");

const app = express();
// express(웹 서버)를 기반으로 http 서버를 만듭니다
const server = http.createServer(app);

// socket.io(채팅 서버)를 http 서버 위에 얹습니다
// cors: { origin: "*" }는 누구나 접속해도 된다는 허락입니다 (테스트용)
const io = new Server(server, {
  cors: {
    origin: "*", 
  }
});

// [이벤트 처리] 누군가 서버에 연결되면 실행되는 부분
io.on('connection', (socket) => {
  console.log('새로운 유저가 접속했습니다! (ID:', socket.id, ')');

  // 1. 'chat message'라는 이름으로 메시지가 오면?
  socket.on('chat message', (msg) => {
    console.log('받은 메시지: ' + msg);
    
    // 2. 나를 포함한 모든 사람(io)에게 그 메시지를 다시 뿌립니다(emit)
    io.emit('chat message', msg);
  });

  // 유저가 연결을 끊으면 실행
  socket.on('disconnect', () => {
    console.log('유저가 나갔습니다.');
  });
});

// 서버를 3000번 포트에서 켜놓고 대기합니다
server.listen(3000, () => {
  console.log('📢 채팅 서버가 3000번 포트에서 대기 중입니다...');
});