import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Platform,
  ViewStyle,
  TextStyle,
  DeviceEventEmitter,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import {
  fula,
  blockchain,
  chainApi,
  fxblox,
  fxAi,
} from '@functionland/react-native-fula';

interface Message {
  role: string;
  content: string;
}

interface Chunk {
  status: boolean;
  msg: string;
}

const TypingIndicator = () => {
  const [dots] = useState([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]);

  useEffect(() => {
    const animations = dots.map((dot, index) =>
      Animated.sequence([
        Animated.delay(index * 200),
        Animated.loop(
          Animated.sequence([
            Animated.timing(dot, {
              toValue: 1,
              duration: 400,
              easing: Easing.ease,
              useNativeDriver: true,
            }),
            Animated.timing(dot, {
              toValue: 0,
              duration: 400,
              easing: Easing.ease,
              useNativeDriver: true,
            }),
          ])
        ),
      ])
    );

    Animated.parallel(animations).start();

    return () => {
      animations.forEach(anim => anim.stop());
    };
  }, []);

  return (
    <View style={[styles.messageContainer, styles.assistantMessage, styles.typingContainer]}>
      <View style={styles.typingDotsContainer}>
        {dots.map((dot, index) => (
          <Animated.View
            key={index}
            style={[
              styles.typingDot,
              {
                transform: [
                  {
                    translateY: dot.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -6],
                    }),
                  },
                ],
                opacity: dot.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.3, 1],
                }),
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
};

const ChatScreen = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const cleanupTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (Platform.OS === 'ios') {
      // Add system message for iOS users
      setMessages([
        {
          role: 'system',
          content: 'iOS is not currently supported. Please use Android or web version.'
        }
      ]);
      return; // Early return for iOS
    }
  }, []);

  const handleSendMessage = async (input: string) => {
    if (!input.trim()) return;
    
    if (Platform.OS === 'ios') {
      return; // Prevent sending messages on iOS
    }

    // Add user message
    const userMessage: Message = { role: 'user', content: input };
    setMessages(prevMessages => [...prevMessages, userMessage]);
    setInput('');

    try {
      // Start AI response
      const streamID = await chatWithAI(input);
      console.log('ChatWithAI started, Stream ID:', streamID);
      setIsLoading(false);
      setIsThinking(true);

      // Add initial AI message
      const aiMessage: Message = { role: 'assistant', content: '' };
      setMessages(prevMessages => [...prevMessages, aiMessage]);

      // Set up streaming with callbacks
      let fullResponse = '';
      const cleanup = fxAi.streamChunks(streamID, {
        onChunk: (chunkStr: string) => {
          try{
            const chunk = JSON.parse(chunkStr);
            fullResponse += chunk.msg;
            
            // Update UI with accumulated response
            setMessages(prevMessages => {
              const lastIndex = prevMessages.length - 1;
              const updatedMessages = [...prevMessages];
              if (lastIndex >= 0 && updatedMessages[lastIndex].role === 'assistant') {
                updatedMessages[lastIndex] = {
                  role: 'assistant',
                  content: fullResponse
                };
              }
              return updatedMessages;
            });
          } catch (error) {
            console.error('Error parsing chunk:', error);
          }
        },
        onComplete: () => {
          setIsThinking(false);
          // Clear the safety timeout since stream completed normally
          if (cleanupTimeoutRef.current) {
            clearTimeout(cleanupTimeoutRef.current);
          }
          cleanup(); // Clean up listeners on successful completion
        },
        onError: (error) => {
          console.error('Stream error:', error);
          setIsThinking(false);
          // Clear the safety timeout on error
          if (cleanupTimeoutRef.current) {
            clearTimeout(cleanupTimeoutRef.current);
          }
          cleanup(); // Clean up listeners on error
          setMessages(prevMessages => [
            ...prevMessages,
            { 
              role: 'system', 
              content: 'Sorry, there was an error processing your request.' 
            }
          ]);
        },
      });

      // Clear any existing timeout
      if (cleanupTimeoutRef.current) {
        clearTimeout(cleanupTimeoutRef.current);
      }
      
      // Set new safety cleanup timeout
      cleanupTimeoutRef.current = setTimeout(() => {
        cleanup();
        console.log('Safety cleanup of stream listeners after timeout');
      }, 5 * 60 * 1000);

    } catch (error) {
      console.error('Error in handleSendMessage:', error);
      setIsThinking(false);
      setMessages(prevMessages => [
        ...prevMessages,
        { 
          role: 'system', 
          content: 'Sorry, there was an error processing your request.' 
        }
      ]);
    }
  };

  const renderMessageContent = (content: string) => {
    const parts = [];
    const splitContent = content.split(/```/g);
  
    for (let i = 0; i < splitContent.length; i++) {
      if (i % 2 === 0) {
        // Regular text - split by newlines and create separate text parts
        const textLines = splitContent[i].split('\n');
        textLines.forEach((line, index) => {
          if (line.trim()) {
            parts.push({ type: 'text', content: line.trim() });
          }
        });
      } else {
        const codeContent = splitContent[i];
        let language = '';
        if (codeContent.includes('\n')) {
          const firstLine = codeContent.split('\n')[0].trim();
          language = firstLine;
          const code = codeContent.substring(firstLine.length).trim();
          parts.push({ type: 'code', language: language, content: code });
        } else {
          parts.push({ type: 'code', language: '', content: codeContent.trim() });
        }
      }
    }

    return (
      <View>
        {parts.map((part, index) => {
          if (part.type === 'text') {
            return (
              <Text key={index} style={styles.messageText}>
                {part.content}
              </Text>
            );
          } else {
            return (
              <View key={index} style={styles.codeBlock}>
                {part.language && (
                  <Text style={styles.codeLanguage}>{part.language}</Text>
                )}
                <Text style={styles.codeText}>{part.content}</Text>
              </View>
            );
          }
        })}
      </View>
    );
  };

  const renderMessage = (message: Message, index: number) => {
    const isUser = message.role === 'user';
    
    return (
      <View
        key={index}
        style={[
          styles.messageContainer,
          isUser ? styles.userMessage : message.role === 'assistant' ? styles.assistantMessage : styles.systemMessage
        ]}
      >
        {renderMessageContent(message.content)}
      </View>
    );
  };

  const chatWithAI = async (prompt: string) => {
    try {
      // Check connection to Blox
      const isConnected = await fula.checkConnection();
      if (!isConnected) {
        throw new Error('Not connected to Blox. Please check your connection.');
      }

      // Start Chat with AI using deepseek-chat model
      const streamID = await fxAi.chatWithAI('deepseek-chat', prompt);
      console.log('ChatWithAI started, Stream ID:', streamID);
      return streamID;
    } catch (error) {
      console.error('Error in chatWithAI:', error);
      throw error;
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.messagesContainer}
        contentContainerStyle={{ padding: 10 }}
      >
        {messages.map((message, index) => renderMessage(message, index))}
        {(isLoading || isThinking) && <TypingIndicator />}
      </ScrollView>
      
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type your message..."
          placeholderTextColor="#999"
          value={input}
          onChangeText={setInput}
          editable={!isLoading && !isThinking}
        />
        <Button
          title="Send"
          onPress={() => handleSendMessage(input)}
          color="#007AFF"
          disabled={isLoading || isThinking}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  messagesContainer: {
    flex: 1,
    padding: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#ccc',
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    marginRight: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 20,
    backgroundColor: '#fff',
    color: '#000', // Add text color
  },
  messageContainer: {
    marginVertical: 5,
    maxWidth: '80%',
    padding: 10,
    borderRadius: 20,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#007AFF',
  },
  assistantMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#E5E5EA',
  },
  systemMessage: {
    alignSelf: 'center',
    backgroundColor: '#ccc',
    borderRadius: 10,
    padding: 8,
    margin: 8,
  },
  messageText: {
    fontSize: 16,
    color: '#000',
    marginVertical: 2,
  },
  codeBlock: {
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 5,
    marginVertical: 5,
  },
  codeLanguage: {
    color: '#666',
    fontSize: 12,
    marginBottom: 5,
  },
  codeText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 14,
    color: '#333',
  },
  thinkingContainer: {
    alignSelf: 'center',
    padding: 8,
    backgroundColor: '#E5E5EA',
    borderRadius: 10,
    marginVertical: 5,
  },
  thinkingText: {
    color: '#666',
    fontSize: 14,
  },
  typingContainer: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    width: 70,
  },
  typingDotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 20,
  },
  typingDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#8E8E93',
    marginHorizontal: 3,
  },
});

export default ChatScreen;