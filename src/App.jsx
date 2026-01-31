import { useEffect, useState, useRef } from 'react'
import { supabase } from './superbase'

export default function App() {
  const [user, setUser] = useState(null)
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const scrollRef = useRef(null)

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => authListener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!user?.id) return
    const loadMessages = async () => {
      const { data, error } = await supabase.from('messages1').select('*').order('created_at', { ascending: true })
      if (!error) setMessages(data)
    }
    loadMessages()

    const channel = supabase.channel('messages-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages1' }, 
      payload => setMessages(prev => [...prev, payload.new]))
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [user?.id])

  const sendMessage = async (e) => {
    e.preventDefault()
    if (!text.trim()) return
    await supabase.from('messages1').insert({ text, user_id: user.id })
    setText('')
  }

  if (!user) return <Auth />

  return (
    <div className="flex flex-col h-screen bg-gray-100 max-w-2xl mx-auto border-x shadow-xl">
      {/* Header */}
      <header className="p-4 bg-white border-b flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-800">Chat Room</h2>
        <button onClick={() => supabase.auth.signOut()} className="text-sm text-red-500 hover:underline">Logout</button>
      </header>

      {/* Messages Area - The Scrollable Part */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
      >
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.user_id === user.id ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[70%] rounded-2xl px-4 py-2 shadow-sm ${
              msg.user_id === user.id 
                ? 'bg-blue-600 text-white rounded-br-none' 
                : 'bg-white text-gray-800 border rounded-bl-none'
            }`}>
              <p className="text-xs opacity-50 mb-1 font-mono">{msg.user_id.slice(0, 6)}</p>
              <p className="text-sm leading-relaxed">{msg.text}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Input Area */}
      <form onSubmit={sendMessage} className="p-4 bg-white border-t flex gap-2">
        <input
          className="flex-1 bg-gray-100 border-none focus:ring-2 focus:ring-blue-500 rounded-full px-4 py-2 outline-none"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Type a message..."
        />
        <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full font-medium transition">
          Send
        </button>
      </form>
    </div>
  )
}

function Auth() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md border">
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Welcome Back</h2>
        <div className="space-y-4">
          <input
            className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Email"
            onChange={e => setEmail(e.target.value)}
          />
          <input
            className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500"
            type="password"
            placeholder="Password"
            onChange={e => setPassword(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-4 pt-2">
            <button
              className="bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
              onClick={() => supabase.auth.signInWithPassword({ email, password })}
            >
              Sign In
            </button>
            <button
              className="border border-gray-300 py-3 rounded-lg font-semibold hover:bg-gray-50 transition"
              onClick={() => supabase.auth.signUp({ email, password })}
            >
              Sign Up
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
