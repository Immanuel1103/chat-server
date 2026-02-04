import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View, Button, FlatList } from 'react-native';
import io from 'socket.io-client';

// ★ 여기에 본인 컴퓨터 IP를 넣으세요 (예: 192.168.0.10)
// 윈도우 cmd창에서 'ipconfig'를 치면 IPv4 주소라고 나옵니다.
const YOUR_IP_ADDRESS = '192.168.0.xxx'; 

// 서버에 전화(연결)를 겁니다
const socket = io(`https://my-chat-server-078k.onrender.com`);

export default function App() {
  const [message, setMessage] = useState(''); // 내가 지금 치고 있는 글자
  const [messages, setMessages] = useState([]); // 화면에 보여줄 전체 채팅 목록

  useEffect(() => {
    // [듣기] 서버가 'chat message'를 보내면 목록에 추가합니다
    socket.on('chat message', (msg) => {
      setMessages((prevMessages) => [...prevMessages, msg]);
    });
  }, []);

  const sendMessage = () => {
    if (message) {
      // [말하기] 서버로 메시지를 보냅니다
      socket.emit('chat message', message);
      setMessage(''); // 입력창 비우기
    }
  };

  return (
    <View style={styles.container}>
      {/* 채팅 목록 보여주는 곳 */}
      <FlatList
        data={messages}
        renderItem={({ item }) => <Text style={styles.messageText}>{item}</Text>}
        keyExtractor={(item, index) => index.toString()}
      />
      
      {/* 입력창과 전송 버튼 */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={message}
          onChangeText={setMessage}
          placeholder="내용 입력..."
        />
        <Button title="전송" onPress={sendMessage} />
      </View>
    </View>
  );
}

// 스타일(디자인) 정의
const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 50, padding: 20, backgroundColor: '#fff' },
  messageText: { fontSize: 16, padding: 10, backgroundColor: '#eee', marginBottom: 5, borderRadius: 8 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  input: { flex: 1, borderWidth: 1, borderColor: '#ddd', padding: 10, marginRight: 10, borderRadius: 5 },
});