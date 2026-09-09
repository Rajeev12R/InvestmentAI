import React from 'react';

export default function ConversationHistory({
  conversations = [],
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation
}) {
  return (
    <div className="w-64 border-r border-slate-800 bg-slate-950 p-3 flex flex-col h-full">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Conversations</span>
        <button
          onClick={onNewConversation}
          className="p-1 rounded bg-emerald-950 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 text-xs font-medium flex items-center transition-colors cursor-pointer"
          title="New Conversation"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-1">
        {conversations.length === 0 ? (
          <div className="text-xs text-slate-500 text-center py-4">No active conversations</div>
        ) : (
          conversations.map((conv) => (
            <div
              key={conv.conversationId}
              onClick={() => onSelectConversation(conv.conversationId)}
              className={`group flex items-center justify-between p-2 rounded text-xs cursor-pointer transition-colors ${
                conv.conversationId === activeConversationId
                  ? 'bg-slate-800/90 text-slate-100 border border-slate-700'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
              }`}
            >
              <div className="truncate flex-1 pr-2">
                <span className="block font-medium truncate">{conv.title || 'Conversation'}</span>
                <span className="text-[10px] text-slate-500 block">{new Date(conv.createdAt || Date.now()).toLocaleDateString()}</span>
              </div>
              {onDeleteConversation && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteConversation(conv.conversationId);
                  }}
                  className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 p-1"
                  title="Delete"
                >
                  ✕
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
