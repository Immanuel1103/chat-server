import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, Text, TextInput, View, Button, FlatList, Alert, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import io from 'socket.io-client';

const SOCKET_URL = 'https://my-chat-server-078k.onrender.com'; 

type MessageData = { user: string; text: string; time?: string; };

const socket = io(SOCKET_URL, {
  transports: ['websocket'],
  reconnectionAttempts: 5,
  timeout: 10000,
});

export default function App() {
  // 로그인 관련 상태
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoginMode, setIsLoginMode] = useState(true); // true면 로그인화면, false면 회원가입화면
  
  // 앱 상태
  const [isJoined, setIsJoined] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false); // 내가 관리자인지?
  
  // 채팅 관련
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<MessageData[]>([]);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    // 1. 로그인 성공 신호 받기
    socket.on('login_success', (userData) => {
      Alert.alert('환영합니다', `${userData.username}님 접속 완료!`);
      setIsAdmin(userData.isAdmin); // 관리자 여부 저장
      setIsJoined(true);            // 채팅방 입장
      setMessages([]);              // 메시지 초기화
      socket.emit('request history'); // 대화 불러오기
    });

    // 2. 회원가입 성공 신호 받기
    socket.on('register_success', (msg) => {
      Alert.alert('성공', msg);
      setIsLoginMode(true); // 로그인 화면으로 전환
    });

    // 3. 에러 메시지 받기 (비번 틀림 등)
    socket.on('auth_error', (msg) => {
      Alert.alert('오류', msg);
    });

    // 4. 채팅 메시지 받기
    socket.on('chat message', (data: MessageData) => {
      const now = new Date();
      const timeString = now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
      setMessages((prev) => [...prev, { ...data, time: data.time || timeString }]);
    });

    return () => {
      socket.off('login_success');
      socket.off('register_success');
      socket.off('auth_error');
      socket.off('chat message');
    };
  }, []);

  // 버튼 클릭 시 실행
  const handleAuth = () => {
    if (username.length < 2 || password.length < 2) {
      Alert.alert('알림', '아이디와 비밀번호를 2자 이상 입력하세요.');
      return;
    }

    if (isLoginMode) {
      // 로그인 시도
      socket.emit('login', { username, password });
    } else {
      // 회원가입 시도
      socket.emit('register', { username, password });
    }
  };

  const sendMessage = () => {
    if (message.trim()) {
      socket.emit('chat message', { user: username, text: message });
      setMessage('');
    }
  };

  const leaveChat = () => {
    setIsJoined(false);
    setMessages([]);
    setUsername('');
    setPassword('');
  };

  return (
    !isJoined ? (
      // 1️⃣ 로그인 & 회원가입 화면
      <View style={styles.centerContainer}>
        <Text style={styles.title}>{isLoginMode ? '🔐 로그인' : '📝 회원가입'}</Text>
        
        <TextInput
          style={styles.inputField}
          placeholder="아이디"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />
        <TextInput
          style={styles.inputField}
          placeholder="비밀번호"
          value={password}
          onChangeText={setPassword}
          secureTextEntry // 비밀번호 가리기
        />
        
        <View style={{ marginVertical: 10, width: '100%' }}>
          <Button 
            title={isLoginMode ? "로그인하기" : "회원가입하기"} 
            onPress={handleAuth} 
          />
        </View>

        <TouchableOpacity onPress={() => setIsLoginMode(!isLoginMode)}>
          <Text style={styles.switchText}>
            {isLoginMode ? "계정이 없으신가요? 회원가입" : "이미 계정이 있나요? 로그인"}
          </Text>
        </TouchableOpacity>
      </View>
    ) : (
      // 2️⃣ 채팅 화면 (이전과 동일)
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            {username} {isAdmin ? '👑(방장)' : ''} 
          </Text>
          <TouchableOpacity onPress={leaveChat} style={styles.leaveButton}>
            <Text style={styles.leaveButtonText}>로그아웃</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item, index) => index.toString()}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          renderItem={({ item }) => {
            const isMyMessage = item.user === username;
            return (
              <View style={[styles.messageRow, isMyMessage ? styles.myMessageRow : styles.otherMessageRow]}>
                {!isMyMessage && <Text style={styles.userText}>{item.user}</Text>}
                <View style={{ flexDirection: isMyMessage ? 'row-reverse' : 'row', alignItems: 'flex-end' }}>
                  <View style={[styles.messageBubble, isMyMessage ? styles.myBubble : styles.otherBubble]}>
                    <Text style={isMyMessage ? styles.myText : styles.otherText}>{item.text}</Text>
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
  centerContainer: { flex: 1, justifyContent: 'center', padding: 30, backgroundColor: '#f5f5f5', alignItems: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 30 },
  inputField: { width: '100%', borderWidth: 1, borderColor: '#ddd', padding: 15, borderRadius: 10, marginBottom: 10, backgroundColor: 'white' },
  switchText: { marginTop: 20, color: '#007AFF', textDecorationLine: 'underline' },

  container: { flex: 1, backgroundColor: '#b2c7d9' },
  header: { paddingTop: 50, paddingBottom: 15, paddingHorizontal: 20, backgroundColor: 'white', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#ddd' },
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