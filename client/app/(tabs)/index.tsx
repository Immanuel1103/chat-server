import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, Text, TextInput, View, Button, FlatList, Alert, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import io from 'socket.io-client';

// ★ 서버 주소 (자동 적용)
const SOCKET_URL = 'https://my-chat-server-078k.onrender.com'; 

type MessageData = {
  user: string;
  text: string;
  time?: string;
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

  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));
    
    // 메시지 받기
    socket.on('chat message', (data: MessageData) => {
      const now = new Date();
      const timeString = now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
      const newData = { ...data, time: data.time || timeString };
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
    // 1. 화면의 메시지를 먼저 싹 비웁니다.
    setMessages([]); 
    
    // 2. 입장 상태로 변경
    setIsJoined(true);

    // 3. [핵심] 서버에게 "옛날 대화 주세요!"라고 요청(신호)을 보냅니다.
    socket.emit('request history');
  };

  // ★ [추가된 기능] 채팅방 나가기 (로그아웃)
  const leaveChat = () => {
    setIsJoined(false); // 로그인 화면으로 돌아감
    setNickname('');    // 닉네임 비우기
    setMessages([]);    // 메시지 목록 비우기 (중요: 그래야 다시 들어올 때 DB에서 불러온 건지 확인 가능)
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
    !isJoined ? (
      // 1️⃣ 로그인 화면
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
      // 2️⃣ 채팅 화면
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* 헤더 부분 수정됨 */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{nickname}님</Text>
          {/* 나가기 버튼 추가 */}
          <TouchableOpacity onPress={leaveChat} style={styles.leaveButton}>
            <Text style={styles.leaveButtonText}>나가기 🚪</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item, index) => index.toString()}
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
                  <View style={[
                    styles.messageBubble, 
                    isMyMessage ? styles.myBubble : styles.otherBubble
                  ]}>
                    <Text style={isMyMessage ? styles.myText : styles.otherText}>
                      {item.text}
                    </Text>
                  </View>
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
  
  // 헤더 스타일 수정
  header: { 
    paddingTop: 50, 
    paddingBottom: 15, 
    paddingHorizontal: 20,
    backgroundColor: 'white', 
    flexDirection: 'row',     // 가로 배치
    justifyContent: 'space-between', // 양쪽 끝으로 벌리기
    alignItems: 'center', 
    borderBottomWidth: 1, 
    borderBottomColor: '#ddd' 
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  leaveButton: { backgroundColor: '#ff6b6b', paddingVertical: 5, paddingHorizontal: 12, borderRadius: 5 },
  leaveButtonText: { color: 'white', fontWeight: 'bold', fontSize: 14 },

  list: { flex: 1, paddingHorizontal: 10 },
  messageRow: { marginVertical: 5 },
  myMessageRow: { alignItems: 'flex-end' },
  otherMessageRow: { alignItems: 'flex-start' },
  messageBubble: { padding: 10, borderRadius: 10, maxWidth: '70%' },
  myBubble: { backgroundColor: '#ffe812' },
  otherBubble: { backgroundColor: 'white' },
  userText: { fontSize: 12, color: '#666', marginBottom: 2, marginLeft: 5 },
  timeText: { fontSize: 10, color: '#888', marginHorizontal: 5, marginBottom: 2 },
  myText: { color: 'black' },
  otherText: { color: 'black' },
  inputContainer: { flexDirection: 'row', padding: 10, backgroundColor: 'white' },
  input: { flex: 1, backgroundColor: '#f0f0f0', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 10, marginRight: 10 },
});