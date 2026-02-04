import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View, Button, FlatList, Alert } from 'react-native';
import io from 'socket.io-client';

// ★ [점검 1] 주소가 정확한지 다시 확인하세요! (https:// 포함, 끝에 / 없음)
const SOCKET_URL = 'https://my-chat-server-078k.onrender.com'; 

// ★ 타임아웃 시간을 늘리고, 연결 방식을 자동으로 설정합니다.
const socket = io(SOCKET_URL, {
  transports: ['websocket'], // 웹소켓 강제 사용
  reconnectionAttempts: 5,   // 실패하면 5번 더 시도해라
  timeout: 10000,            // 10초 말고 20초 기다려라 (기본값보다 길게 잡는 것)
});

export default function App() {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<string[]>([]);
  // 연결 상태를 확인하는 변수
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // 1. 연결 성공했을 때
    socket.on('connect', () => {
      console.log('서버와 연결되었습니다!');
      setIsConnected(true);
    });

    // 2. 연결 끊겼을 때
    socket.on('disconnect', () => {
      console.log('서버와 연결이 끊어졌습니다.');
      setIsConnected(false);
    });
    
    // 3. 연결 에러가 날 때 (중요!)
    socket.on('connect_error', (error) => {
      console.log('연결 에러:', error);
      setIsConnected(false);
    });

    // 4. 메시지 받기
    socket.on('chat message', (msg: string) => {
      setMessages((prevMessages) => [...prevMessages, msg]);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('chat message');
    };
  }, []);

  const sendMessage = () => {
    if (message) {
      if (!isConnected) {
        Alert.alert("오류", "서버와 연결되어 있지 않습니다.");
        return;
      }
      socket.emit('chat message', message);
      setMessage('');
    }
  };

  return (
    <View style={styles.container}>
      {/* 상태 표시등 */}
      <View style={[styles.statusBox, { backgroundColor: isConnected ? '#4CAF50' : '#F44336' }]}>
        <Text style={styles.statusText}>
          {isConnected ? '🟢 서버와 연결됨' : '🔴 서버 연결 끊김 (주소 확인 필요)'}
        </Text>
      </View>

      <FlatList
        data={messages}
        renderItem={({ item }) => <Text style={styles.messageText}>{item}</Text>}
        keyExtractor={(item, index) => index.toString()}
        style={styles.list}
      />
      
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={message}
          onChangeText={setMessage}
          placeholder="메시지 입력..."
        />
        <Button title="전송" onPress={sendMessage} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 50, padding: 20, backgroundColor: '#fff' },
  statusBox: { padding: 10, borderRadius: 5, marginBottom: 10, alignItems: 'center' },
  statusText: { color: 'white', fontWeight: 'bold' },
  list: { flex: 1, marginBottom: 10 },
  messageText: { fontSize: 16, padding: 10, backgroundColor: '#eee', marginBottom: 5, borderRadius: 8 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  input: { flex: 1, borderWidth: 1, borderColor: '#ddd', padding: 10, marginRight: 10, borderRadius: 5 },
});