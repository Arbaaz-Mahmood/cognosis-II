import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import './App.css';
import ReactMarkdown from 'react-markdown';
import MicRecorder from 'mic-recorder-to-mp3';
import FingerprintJS from '@fingerprintjs/fingerprintjs';
import botAvatar from './bot-avatar.png';
import AvatarSelector from './components/AvatarSelector';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMicrophone, faMicrophoneSlash, faVolumeUp, faVolumeMute } from '@fortawesome/free-solid-svg-icons';
import SendIcon from './components/SendIcon';
import PreferencesPopup from './components/PreferencesPopup';
import ChatWindow from './components/ChatWindow';
import './App.css';

const App: React.FC = () => {
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [selectedAvatar, setSelectedAvatar] = useState<string>('Apex');
  const [messages, setMessages] = useState<Array<{ type: string; text: string }>>([]);
  const [sessionId, setSessionId] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [sessions, setSessions] = useState<string[]>([]);
  const messageEndRef = useRef<null | HTMLDivElement>(null);
  const inputRef = useRef<null | HTMLInputElement>(null);
  const [userFingerprint, setUserFingerprint] = useState<string>('');
  const [isPreferencesPopupOpen, setIsPreferencesPopupOpen] = useState(false);

  const handlePreferencesPopupClose = (selectedOrientation: string, selectedGender: string) => {
    setIsPreferencesPopupOpen(false);
    // Send the selected orientation and gender to the API in index.ts along with the avatar information on the first message
    // You can access the selected orientation and gender here and include them in your API request
  };

  const toggleAudio = () => {
    setIsAudioEnabled((prevState) => {
      const newState = !prevState;
      if (newState && currentAudio) {
        currentAudio.play().catch((error) => {
          console.error('Error playing audio:', error);
          // Display a message to the user indicating they need to manually start the audio
          alert('To enable sound on iOS, please tap the audio button.');
        });
      }
      return newState;
    });
  };

  useEffect(() => {
    // Check if the user is on iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

    // Set the initial audio state based on the device
    setIsAudioEnabled(!isIOS);

    const storedSessionId = null; // localStorage.getItem('sessionId');
    const storedSessions = JSON.parse(localStorage.getItem('sessions') || '[]');
    const storedPreferences = JSON.parse(localStorage.getItem('userPreferences') || 'null');

    FingerprintJS.load().then((fp) => {
      fp.get().then((result) => {
        const fingerprint = result.visitorId;
        setUserFingerprint(fingerprint);
      });
    });
    setSessions(storedSessions);

    const urlParams = new URLSearchParams(window.location.search);
    const urlSessionId = urlParams.get('sessionId');
    if (urlSessionId && !storedSessionId) {
      setSessionId(urlSessionId);
      fetchChatHistory(urlSessionId, selectedAvatar);
    } else if (!storedSessionId) {
      const newSessionId = uuidv4();
      localStorage.setItem('sessionId', newSessionId);
      setSessionId(newSessionId);
      updateSessions(newSessionId);
    } else {
      setSessionId(storedSessionId);
      fetchChatHistory(storedSessionId, selectedAvatar);
    }

    if (!storedPreferences) {
      setIsPreferencesPopupOpen(true);
    }
    inputRef.current?.focus();
  }, [selectedAvatar]);

  const [isRecording, setIsRecording] = useState(false);
  const recorderRef = useRef<MicRecorder | null>(null);

  useEffect(() => {
    recorderRef.current = new MicRecorder({
      bitRate: 128,
      encoder: 'mp3',
      mimeType: 'audio/mp3',
    });
  }, []);

  const startRecording = () => {
    if (recorderRef.current) {
      recorderRef.current
        .start()
        .then(() => {
          setIsRecording(true);
        })
        .catch((error) => {
          console.error('Failed to start recording:', error);
          // Check if the error is due to permission denial
          if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
            // Permission was denied, so silently handle the error
            // You can optionally log the error for debugging purposes
            console.warn('Microphone permission denied. Recording will not be available.');
          } else {
            // Handle other types of errors if needed
            console.error('Error starting recording:', error);
          }
        });
    }
  };

  const stopRecording = async () => {
    if (recorderRef.current) {
      recorderRef.current.stop();
      setIsRecording(false);
  
      try {
        const [, blob] = await recorderRef.current.getMp3();
  
        const formData = new FormData();
        formData.append('audio', blob, 'recording.mp3');
  
        const response = await axios.post(`/api/audio?sessionId=${sessionId}`, formData);
        const transcription = response.data.transcription;
        sendMessage(transcription);
      } catch (err) {
        console.error('Failed to send audio', err);
      }
    }
  };

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchChatHistory = async (sessionId: string, avatar: string) => {
    try {
      const response = await axios.get(`/api/messages?sessionId=${sessionId}&avatar=${avatar}`);
      const formattedMessages = response.data.map((msg: any) => ({
        type: msg.role === 'assistant' ? 'ai' : 'user',
        text: msg.content,
      }));
      setMessages(formattedMessages);
    } catch (error) {
      console.error('Error retrieving chat history:', error);
    }
  };

  const updateSessions = (newSessionId: string) => {
    const updatedSessions = [...sessions, newSessionId].slice(-5);
    setSessions(updatedSessions);
    localStorage.setItem('sessions', JSON.stringify(updatedSessions));
  };

  const sendMessage = (fmessage?: string) => {
    console.log(`fmessage: ${fmessage}`)
    const xmessage = fmessage || message.trim();
    setMessages((prev) => [...prev, { type: 'user', text: xmessage }]);
    const storedPreferences = JSON.parse(localStorage.getItem('userPreferences') || 'null');
    const sex_orientation = storedPreferences?.orientation || '';
    const gender = storedPreferences?.gender || '';

    const newSessionId = uuidv4();
    if (!sessionId) {
      setSessionId(newSessionId);
      window.history.pushState({}, '', `?sessionId=${newSessionId}`);
      updateSessions(`${newSessionId}_${selectedAvatar}`);
    }

    console.log( 
      `/api/chat-stream?sessionId=${sessionId}_${selectedAvatar}&message=${encodeURIComponent(
        xmessage
      )}&fingerprint=${encodeURIComponent(userFingerprint)}&avatar=${encodeURIComponent(
        selectedAvatar
      )}&sex_orientation`
    )  
    const eventSource = new EventSource(
      `/api/chat-stream?sessionId=${sessionId}_${selectedAvatar}&message=${encodeURIComponent(
        xmessage
      )}&fingerprint=${encodeURIComponent(userFingerprint)}&avatar=${encodeURIComponent(
        selectedAvatar
      )}&sex_orientation=${encodeURIComponent(sex_orientation)}&gender=${encodeURIComponent(gender)}`
    );
    let currentMessage = '';
    const userMessageIndex = messages.length;

    eventSource.onmessage = function (event) {
      const data = JSON.parse(event.data);
      console.log('Received data:', data);
      console.log('Data type:', typeof data);
      console.log('Data properties:', Object.keys(data));
      if (data.type && data.type === 'audio') {
        console.log('Received audio data');
        console.log('Audio data type:', typeof data.data);
        try {
          // Is audio enabled?
          if (isAudioEnabled) {
            const audioData = atob(data.data);
            const blob = new Blob([new Uint8Array(audioData.split('').map((char) => char.charCodeAt(0)))], {
              type: 'audio/mpeg',
            });
            const audioUrl = URL.createObjectURL(blob);
            const audio = new Audio(audioUrl);
            audio.play().catch((error) => {
              console.error('Error playing audio:', error);
              // Display an error message or update the UI to indicate the issue
            });
            setCurrentAudio(audio); // Set the current audio element
          }
        } catch (error) {
          console.error('Error processing audio data:', error);
        }
      } else {
        currentMessage += data.content;
        setMessages((prev) => {
          const newMessages = [...prev];
          if (newMessages[userMessageIndex + 1]) {
            newMessages[userMessageIndex + 1].text = currentMessage;
          } else {
            newMessages.push({ type: 'ai', text: currentMessage });
          }
          return newMessages;
        });
      }
    };

    eventSource.onerror = function (event) {
      console.error('EventSource failed:', event);
      eventSource.close();
    };

    setMessage('');
  };

  return (
    <div className="app">
      <div className="chat-container">
        <div className="bigcontainer">
          <PreferencesPopup open={isPreferencesPopupOpen} onClose={handlePreferencesPopupClose} />
          <AvatarSelector selectedAvatar={selectedAvatar} onSelectAvatar={setSelectedAvatar} />
          <ChatWindow messages={messages} selectedAvatar={selectedAvatar} />
        </div>
        <div className="input-container">
          <Button
            className="record-button"
            variant="contained"
            color={isRecording ? 'secondary' : 'primary'}
            onClick={isRecording ? stopRecording : startRecording}
          >
            {isRecording ? (
              <FontAwesomeIcon icon={faMicrophoneSlash} size="xs" />
            ) : (
              <FontAwesomeIcon icon={faMicrophone} size="xs" />
            )}
          </Button>
          <Button
            className="audio-button"
            variant="contained"
            color={isAudioEnabled ? 'primary' : 'secondary'}
            onClick={toggleAudio}
          >
            {isAudioEnabled ? (
              <FontAwesomeIcon icon={faVolumeUp} size="xs" />
            ) : (
              <FontAwesomeIcon icon={faVolumeMute} size="xs" />
            )}
          </Button>
          <TextField
            className="input-box"
            variant="outlined"
            placeholder="Type your message here..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                if (message.trim() !== '') {
                  sendMessage();
                  if (currentAudio) {
                    currentAudio.pause();
                  }
                  setCurrentAudio(new Audio('send.mp3'));
                  currentAudio?.play();
                }
                e.preventDefault(); // Prevent the default behavior of the Enter key
              }
            }}
            fullWidth
            inputRef={inputRef}
            multiline
            rows={4}
            InputProps={{
              style: {
                color: 'white',
              },
            }}
          />
          <Button
            className="send-button"
            variant="contained"
            color="primary"
            onClick={() => message.trim() && sendMessage()}
          >
            <SendIcon />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default App;