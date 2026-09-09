import React, { useState, useEffect, useRef } from 'react';
import ConversationHistory from './ConversationHistory';
import CopilotMessage from './CopilotMessage';
import CopilotInput from './CopilotInput';

export default function CopilotPanel({ workspaceId = 'DEFAULT_WORKSPACE', activeTicker = null }) {
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [depth, setDepth] = useState('STANDARD');
  const [showHistory, setShowHistory] = useState(false);
  const messagesEndRef = useRef(null);

  // Load conversations on mount
  useEffect(() => {
    fetchConversations();
  }, [workspaceId]);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchConversations = async () => {
    try {
      const res = await fetch(`http://localhost:3000/api/copilot/conversations?workspace=${workspaceId}`);
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
        if (data.conversations?.length > 0 && !activeConversationId) {
          selectConversation(data.conversations[0].conversationId);
        }
      }
    } catch (e) {
      console.error('Failed to fetch conversations:', e);
    }
  };

  const selectConversation = async (id) => {
    setActiveConversationId(id);
    try {
      const res = await fetch(`http://localhost:3000/api/copilot/conversations/${id}?workspace=${workspaceId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (e) {
      console.error('Failed to load conversation messages:', e);
    }
  };

  const handleNewConversation = () => {
    const newId = `CONV-${workspaceId}-${Date.now()}`;
    setActiveConversationId(newId);
    setMessages([]);
  };

  const handleDeleteConversation = async (id) => {
    try {
      await fetch(`http://localhost:3000/api/copilot/conversations/${id}?workspace=${workspaceId}`, { method: 'DELETE' });
      setConversations(conversations.filter(c => c.conversationId !== id));
      if (activeConversationId === id) {
        handleNewConversation();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendMessage = async (userText) => {
    setLoading(true);
    const tempUserMsg = { role: 'user', content: userText, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      const res = await fetch('http://localhost:3000/api/copilot/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-workspace-id': workspaceId
        },
        body: JSON.stringify({
          message: userText,
          conversationId: activeConversationId,
          ticker: activeTicker,
          depth
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.conversationId && data.conversationId !== activeConversationId) {
          setActiveConversationId(data.conversationId);
        }
        const assistantMsg = {
          role: 'assistant',
          content: data.answer,
          intent: data.intent,
          citations: data.citations,
          decision: data.decision,
          whyMatters: data.whyMatters,
          whatChanged: data.whatChanged,
          suggestedQuestions: data.suggestedQuestions,
          contextHash: data.contextHash,
          ticker: activeTicker,
          timestamp: data.generatedAt
        };
        setMessages(prev => [...prev, assistantMsg]);
        fetchConversations();
      } else {
        const errData = await res.json();
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `Error: ${errData.error || 'Failed to process copilot request'}`,
          timestamp: new Date().toISOString()
        }]);
      }
    } catch (e) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Error connecting to InvestmentAI Copilot: ${e.message}`,
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerReview = async ({ ticker, attentionId }) => {
    await fetch('http://localhost:3000/api/copilot/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-workspace-id': workspaceId },
      body: JSON.stringify({ ticker, attentionId, note: 'Initiated from Copilot chat' })
    });
  };

  return (
    <div className="flex h-[720px] bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
      {/* Sidebar for Conversation History */}
      {showHistory && (
        <ConversationHistory
          conversations={conversations}
          activeConversationId={activeConversationId}
          onSelectConversation={selectConversation}
          onNewConversation={handleNewConversation}
          onDeleteConversation={handleDeleteConversation}
        />
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full bg-slate-900/50">
        {/* Top App Bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
              title="Toggle History"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center">
                <span className="text-emerald-400 text-xs font-bold font-mono">AI</span>
              </div>
              <span className="font-bold text-sm text-slate-100">Investor Copilot</span>
              {activeTicker && (
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-sky-950 text-sky-300 border border-sky-600/40">
                  {activeTicker}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse"></span>
              Air-Gapped & Sealed
            </span>
          </div>
        </div>

        {/* Message Feed */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 text-slate-400 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-emerald-400">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-slate-200 text-base">How can I assist your investment research today?</h3>
                <p className="text-xs text-slate-500 max-w-md mt-1">
                  Ask questions regarding model valuations, decision shifts, risk signals, thesis breakers, or portfolio exposure.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 max-w-lg">
                {[
                  `Why did ${activeTicker || 'AAPL'} move to WATCH?`,
                  `What are the active thesis breakers for ${activeTicker || 'AAPL'}?`,
                  `What is my highest concentration risk across my portfolio?`,
                  `Explain the DCF fair value assumptions.`
                ].map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(q)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-300 transition-colors cursor-pointer"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <CopilotMessage
                key={idx}
                message={msg}
                onSelectQuestion={handleSendMessage}
                onTriggerReview={handleTriggerReview}
              />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <CopilotInput
          onSendMessage={handleSendMessage}
          disabled={loading}
          depth={depth}
          onDepthChange={setDepth}
        />
      </div>
    </div>
  );
}
