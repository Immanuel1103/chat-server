import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, Text, TextInput, View, Button, FlatList, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import io from 'socket.io-client';

// ★ 요청하신 서버 주소 적용 완료
const SOCKET_URL = 'https://my-chat-server-078k.onrender.com'; 

// 데이터 모양 정의 (시간 time 추가)
type MessageData = {
  user: string;
  text: string;
  time?: string; // 시간은 있을 수도 있고 없을 수도 있음 (선택사항)
};

const socket = io(SOCKET_URL, {
  transports: ['websocket'],
  reconnectionAttempts: 5,
  timeout: 10000,
});

export default function App() {
  const [nickname, setNickname] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  // 스크롤을 조종하기 위한 리모컨(Ref) 생성
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));
    
    // 메시지 받기
    socket.on('chat message', (data: MessageData) => {
      // 메시지가 도착한 순간의 시간을 구합니다
      const now = new Date();
      const timeString = now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
      
      // 기존 데이터에 시간을 추가해서 저장
      const newData = { ...data, time: timeString };
      setMessages((prev) => [...prev, newData]);
    });

    return () => {
      socket.off('chat message');
    };
  }, []);

  const joinChat = () => {
    if (nickname.trim().length < 2) {
      Alert.alert('알림', '닉네임을 2글자 이상 입력해주세요.');
      return;
    }
    setIsJoined(true);
  };

  const sendMessage = () => {
    if (message.trim()) {
      const payload = {
        user: nickname,
        text: message
      };
      socket.emit('chat message', payload);
      setMessage('');
    }
  };

  return (
    // 1️⃣ 입장 전: 닉네임 입력 화면
    !isJoined ? (
      <View style={styles.centerContainer}>
        <Text style={styles.title}>💬 채팅방 입장</Text>
        <TextInput
          style={styles.nicknameInput}
          placeholder="닉네임을 입력하세요"
          value={nickname}
          onChangeText={setNickname}
        />
        <Button title="입장하기" onPress={joinChat} />
        <Text style={styles.statusText}>
          {isConnected ? '🟢 서버 연결됨' : '🔴 서버 연결 중...'}
        </Text>
      </View>
    ) : (
      // 2️⃣ 입장 후: 채팅 화면
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{nickname}님 환영합니다!</Text>
        </View>

        <FlatList
          ref={flatListRef} // 리모컨 연결
          data={messages}
          keyExtractor={(item, index) => index.toString()}
          // 새 메시지가 오면 자동으로 맨 아래로 스크롤
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          renderItem={({ item }) => {
            const isMyMessage = item.user === nickname;
            return (
              <View style={[
                styles.messageRow, 
                isMyMessage ? styles.myMessageRow : styles.otherMessageRow
              ]}>
                {!isMyMessage && <Text style={styles.userText}>{item.user}</Text>}
                
                <View style={{ flexDirection: isMyMessage ? 'row-reverse' : 'row', alignItems: 'flex-end' }}>
                  {/* 말풍선 */}
                  <View style={[
                    styles.messageBubble, 
                    isMyMessage ? styles.myBubble : styles.otherBubble
                  ]}>
                    <Text style={isMyMessage ? styles.myText : styles.otherText}>
                      {item.text}
                    </Text>
                  </View>
                  
                  {/* 시간 표시 (말풍선 옆에 작게) */}
                  <Text style={styles.timeText}>{item.time}</Text>
                </View>
              </View>
            );
          }}
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
      </KeyboardAvoidingView>
    )
  );
}

const styles = StyleSheet.create({
  centerContainer: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#f5f5f5' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  nicknameInput: { borderWidth: 1, borderColor: '#ddd', padding: 15, borderRadius: 10, marginBottom: 20, backgroundColor: 'white' },
  statusText: { textAlign: 'center', marginTop: 20, color: '#888' },

  container: { flex: 1, backgroundColor: '#b2c7d9' },
  header: { paddingTop: 50, paddingBottom: 15, backgroundColor: 'white', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#ddd' },
  headerTitle: { fontSize: 16, fontWeight: 'bold' },
  list: { flex: 1, paddingHorizontal: 10 },
  
  messageRow: { marginVertical: 5 },
  myMessageRow: { alignItems: 'flex-end' },
  otherMessageRow: { alignItems: 'flex-start' },
  
  messageBubble: { padding: 10, borderRadius: 10, maxWidth: '70%' },
  myBubble: { backgroundColor: '#ffe812' },
  otherBubble: { backgroundColor: 'white' },
  
  userText: { fontSize: 12, color: '#666', marginBottom: 2, marginLeft: 5 },
  timeText: { fontSize: 10, color: '#888', marginHorizontal: 5, marginBottom: 2 }, // 시간 스타일
  myText: { color: 'black' },
  otherText: { color: 'black' },

  inputContainer: { flexDirection: 'row', padding: 10, backgroundColor: 'white' },
  input: { flex: 1, backgroundColor: '#f0f0f0', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 10, marginRight: 10 },
});