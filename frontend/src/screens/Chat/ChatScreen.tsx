import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { 
    Send, 
    Paperclip, 
    ArrowLeft, 
    Search,
    User,
    MessageCircle,
    Check,
    CheckCheck,
    FileText,
    X,
    Loader2
} from 'lucide-react';

interface ChatUser {
    id: number;
    username: string;
    role: string;
    unread_count: number;
}

interface Message {
    message_id: number;
    sender_employee_id: number;
    message_type: 'text' | 'image' | 'pdf' | 'doc';
    message_text: string; // URL if file, text otherwise
    created_at: string;
    is_read: number;
    is_sender: boolean;
}

const API_BASE_URL = 'https://prospine.in/admin/mobile/api';
const FILE_BASE_URL = 'https://prospine.in/';

const ChatScreen: React.FC = () => {
    const { user } = useAuthStore();
    const [users, setUsers] = useState<ChatUser[]>([]);
    const [activeUser, setActiveUser] = useState<ChatUser | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');

    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const location = useLocation();
    const { id } = useParams();
    const navigate = useNavigate();

    // Initial load
    useEffect(() => {
        fetchUsers();
        // Poll users list for unread counts every 15s
        const interval = setInterval(fetchUsers, 15000);
        return () => clearInterval(interval);
    }, []);

    // Handle deep link from notification
    // Handle deep link (Notification or URL Param)
    useEffect(() => {
        // 1. From Notification State
        const state = location.state as { targetUserId?: number };
        if (state?.targetUserId) {
            navigate(`/chat/${state.targetUserId}`, { replace: true, state: {} });
            return;
        }

        // 2. From URL Param
        if (id) {
            const userId = parseInt(id);
            if (!isNaN(userId) && users.length > 0) {
                 const target = users.find(u => u.id === userId);
                 if (target) setActiveUser(target);
            }
        } else {
            setActiveUser(null);
        }
    }, [id, users, location.state, navigate]);

    // Poll messages when chat is active
    useEffect(() => {
        if (!activeUser) return;
        
        fetchMessages(activeUser.id);
        const interval = setInterval(() => {
            fetchMessages(activeUser.id, true); // true = silent (no loading spinner)
        }, 3000); // Poll every 3s

        return () => clearInterval(interval);
    }, [activeUser]);

    // Scroll to bottom on new messages
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const fetchUsers = async () => {
        try {
            // Pass user_id explicitly if needed, or rely on session + proxy
            const params = new URLSearchParams();
            const empId = user?.employee_id || (user as any)?.id;
            if (empId) params.append('employee_id', empId.toString());
            const branchId = user?.branch_id || 1;
            params.append('branch_id', branchId.toString());
            params.append('action', 'users');

            const res = await fetch(`${API_BASE_URL}/chat.php?${params.toString()}`);
            const data = await res.json();
            if (data.success && data.users) {
                setUsers(data.users);
            }
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    };

    const fetchMessages = async (partnerId: number, silent = false) => {
        if (!silent) setIsLoadingMessages(true);
        try {
            const params = new URLSearchParams();
            const empId = user?.employee_id || (user as any)?.id;
            if (empId) params.append('employee_id', empId.toString());
            const branchId = user?.branch_id || 1;
            params.append('branch_id', branchId.toString());
            params.append('action', 'fetch');
            params.append('partner_id', partnerId.toString());

            const res = await fetch(`${API_BASE_URL}/chat.php?${params.toString()}`);
            const data = await res.json();
            if (data.success && data.messages) {
                setMessages(data.messages);
            }
        } catch (error) {
            console.error('Error fetching messages:', error);
        } finally {
            if (!silent) setIsLoadingMessages(false);
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0] && activeUser) {
            const file = e.target.files[0];
            setIsUploading(true);
            const formData = new FormData();
            
            const empId = user?.employee_id || (user as any)?.id;
            if (empId) formData.append('employee_id', empId.toString());
            const branchId = user?.branch_id || 1;
            formData.append('branch_id', branchId.toString());
            
            formData.append('action', 'send');
            formData.append('receiver_id', activeUser.id.toString());
            formData.append('file', file);
            
            try {
                await fetch(`${API_BASE_URL}/chat.php`, {
                    method: 'POST',
                    body: formData,
                });
                fetchMessages(activeUser.id);
            } catch (error) {
                console.error('Error uploading file:', error);
                alert('Upload failed');
            } finally {
                setIsUploading(false);
            }
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleSendMessage = async () => {
        if ((!inputText.trim()) || !activeUser) return;

        const textToSend = inputText;
        setInputText(''); // Optimistic clear

        try {
            const formData = new FormData();
            const empId = user?.employee_id || (user as any)?.id;
            if (empId) formData.append('employee_id', empId.toString());
            const branchId = user?.branch_id || 1;
            formData.append('branch_id', branchId.toString());
            formData.append('action', 'send');
            formData.append('receiver_id', activeUser.id.toString());
            formData.append('message_text', textToSend);

            const res = await fetch(`${API_BASE_URL}/chat.php`, {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (data.success) {
                fetchMessages(activeUser.id, true);
            } else {
                alert('Failed to send: ' + data.message);
                setInputText(textToSend); // Restore text
            }
        } catch (error) {
            console.error('Error sending message:', error);
            setInputText(textToSend); // Restore text
        }
    };

    // Base path for navigation (Admin vs Reception)
    const basePath = location.pathname.startsWith('/admin') ? '/admin/chat' : '/chat';

    const handleBackToList = () => {
        navigate(basePath);
        setMessages([]);
        fetchUsers();
    };

    const filteredUsers = users.filter(u => 
        u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.role.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Render Message Bubble
    const renderMessage = (msg: Message) => {
        const isMe = msg.is_sender;
        
        // Format time
        const date = new Date(msg.created_at); // Already ISO from API
        const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        return (
            <div key={msg.message_id} className={`flex w-full mb-4 ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] rounded-2xl px-4 py-3 shadow-md relative group ${
                    isMe 
                    ? 'bg-gradient-to-br from-teal-500 to-teal-600 text-white rounded-br-none' 
                    : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-bl-none border border-gray-100 dark:border-gray-700'
                }`}>
                    {/* Content */}
                    {msg.message_type === 'text' && (
                        <p className="text-sm md:text-base leading-relaxed break-words">{msg.message_text}</p>
                    )}
                    {msg.message_type === 'image' && (
                        <div 
                            className="rounded-lg overflow-hidden mb-1 cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => setSelectedImage(`${FILE_BASE_URL}${msg.message_text}`)}
                        >
                             <img src={`${FILE_BASE_URL}${msg.message_text}`} alt="Shared" className="max-w-full h-auto object-cover" />
                        </div>
                    )}
                    {(msg.message_type === 'pdf' || msg.message_type === 'doc') && (
                        <a href={`${FILE_BASE_URL}${msg.message_text}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-white/10 p-2 rounded hover:bg-white/20 transition-colors">
                            <FileText size={20} />
                            <span className="text-sm underline truncate max-w-[150px]">Attachment</span>
                        </a>
                    )}

                    {/* Meta */}
                    <div className={`text-[10px] mt-1 flex items-center justify-end gap-1 ${isMe ? 'text-teal-100' : 'text-gray-400'}`}>
                        <span>{time}</span>
                        {isMe && (
                            msg.is_read ? <CheckCheck size={14} className="text-blue-200" /> : <Check size={14} />
                        )}
                    </div>
                </div>
            </div>
        );
    };

    // --- VIEW: User List ---
    if (!activeUser) {
        return (
            <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900 pb-[env(safe-area-inset-bottom)]">
                {/* Header */}
                <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md px-4 py-3 pt-[max(env(safe-area-inset-top),16px)] sticky top-0 z-30 border-b border-gray-100 dark:border-gray-700 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Chats</h1>
                        <div className="p-2 bg-teal-50 dark:bg-teal-900/20 rounded-full">
                            <MessageCircle size={20} className="text-teal-600 dark:text-teal-400" />
                        </div>
                    </div>
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input 
                            type="text" 
                            placeholder="Search colleagues..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-gray-100 dark:bg-gray-700/50 text-gray-900 dark:text-white pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all font-medium placeholder-gray-500"
                        />
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2 pb-24 custom-scrollbar">
                    {filteredUsers.length > 0 ? (
                        filteredUsers.map(u => (
                            <button
                                key={u.id}
                                onClick={() => navigate(`${basePath}/${u.id}`)}
                                className="w-full bg-white dark:bg-gray-800 p-3 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all active:scale-[0.98] group"
                            >
                                <div className="relative">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg shadow-lg group-hover:shadow-indigo-500/30 transition-shadow">
                                        {u.username.charAt(0).toUpperCase()}
                                    </div>
                                    {/* Online indicator (simulated for now) */}
                                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
                                </div>
                                <div className="flex-1 text-left overflow-hidden">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-bold text-gray-900 dark:text-white text-base truncate">{u.username}</h3>
                                        <span className="text-[10px] text-gray-400 font-medium bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded-md">{u.role}</span>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">Tap to chat with {u.username.split(' ')[0]}</p>
                                </div>
                                {u.unread_count > 0 && (
                                    <div className="w-6 h-6 rounded-full bg-teal-500 flex items-center justify-center text-white text-xs font-bold shadow-md shadow-teal-500/30 animate-pulse">
                                        {u.unread_count}
                                    </div>
                                )}
                            </button>
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                             <User size={48} className="mb-2 opacity-20" />
                             <p className="text-sm font-medium">No colleagues found</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // --- VIEW: Active Chat ---
    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
            {/* Chat Header */}
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md px-4 py-3 pt-[max(env(safe-area-inset-top),10px)] sticky top-0 z-30 border-b border-gray-100 dark:border-gray-700 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button onClick={handleBackToList} className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                        <ArrowLeft size={22} className="text-gray-700 dark:text-gray-200" />
                    </button>
                    <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm shadow-md">
                            {activeUser.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h2 className="font-bold text-gray-900 dark:text-white text-sm leading-tight">{activeUser.username}</h2>
                        </div>
                    </div>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-slate-50 dark:bg-slate-900/50" style={{ backgroundImage: 'radial-gradient(circle at center, #e2e8f0 1px, transparent 1px)', backgroundSize: '24px 24px', opacity: 0.9 }}>
                {isLoadingMessages && messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
                    </div>
                ) : (
                    messages.length > 0 ? (
                        messages.map(renderMessage)
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full opacity-40">
                            <MessageCircle size={64} className="text-gray-300 mb-4" />
                            <p className="text-gray-500 text-sm">Start a conversation with {activeUser.username}</p>
                        </div>
                    )
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 pb-[max(env(safe-area-inset-bottom),12px)]">
                <div className="flex items-end gap-2 max-w-4xl mx-auto">
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        onChange={handleFileSelect}
                        accept="image/*,.pdf,.doc,.docx"
                    />
                    <button 
                        onClick={() => !isUploading && fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="p-3 text-gray-400 hover:text-teal-600 bg-gray-50 dark:bg-gray-700/50 rounded-2xl hover:bg-teal-50 transition-all disabled:opacity-50"
                    >
                        {isUploading ? <Loader2 size={20} className="animate-spin text-teal-600" /> : <Paperclip size={20} />}
                    </button>
                    <div className="flex-1 bg-gray-100 dark:bg-gray-700/50 rounded-2xl flex items-center px-4 py-2 focus-within:ring-2 focus-within:ring-teal-500/30 transition-all">
                        <textarea 
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage();
                                }
                            }}
                            placeholder="Type a message..."
                            className="bg-transparent border-none focus:ring-0 w-full text-sm max-h-32 resize-none py-2 text-gray-900 dark:text-white placeholder-gray-500"
                            rows={1}
                            style={{ minHeight: '40px' }}
                        />
                    </div>
                    <button 
                        onClick={handleSendMessage} 
                        disabled={!inputText.trim()}
                        className="p-3 bg-teal-600 text-white rounded-2xl shadow-lg shadow-teal-600/30 hover:bg-teal-700 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:shadow-none disabled:hover:scale-100"
                    >
                        <Send size={20} />
                    </button>
                </div>
            </div>
            
            {/* Image Modal */}
            {selectedImage && (
                <div 
                    className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 animate-in fade-in duration-200"
                    onClick={() => setSelectedImage(null)}
                >
                    <button className="absolute top-4 right-4 p-2 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors">
                        <X size={24} />
                    </button>
                    <img 
                        src={selectedImage || ''} 
                        alt="Full size" 
                        className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
                    />
                </div>
            )}
        </div>
    );
};

export default ChatScreen;
