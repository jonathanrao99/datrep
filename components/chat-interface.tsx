'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LoadingSpinner } from '@/components/loading-spinner'
import { 
  Send, 
  Bot, 
  User, 
  Sparkles,
  Lightbulb,
  TrendingUp,
  Copy,
  Check
} from 'lucide-react'

interface FormattedMessageProps {
  content: string
  isUser?: boolean
}

function FormattedMessage({ content, isUser }: FormattedMessageProps) {
  if (!content) return null
  if (isUser) return <span className="text-sm leading-relaxed whitespace-pre-wrap">{content}</span>

  const lines = content.split('\n')
  const elements: React.ReactNode[] = []
  let listItems: string[] = []
  let key = 0

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={key++} className="space-y-2 my-3 pl-4 border-l-2 border-blue-200">
          {listItems.map((item, i) => (
            <li key={i} className="text-slate-700 leading-relaxed flex items-start gap-2">
              <span className="text-blue-500 mt-1 font-bold">•</span>
              <span className="flex-1">{processInlineFormatting(item.replace(/^[-*•]\s*/, ''))}</span>
            </li>
          ))}
        </ul>
      )
      listItems = []
    }
  }

  const highlightNumbers = (text: string) => {
    const parts = text.split(/(\d+[,.]?\d*)/g)
    return parts.map((part, i) =>
      /^\d+[,.]?\d*$/.test(part) ? (
        <span key={i} className="font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
          {part}
        </span>
      ) : (
        <span key={i}>{part}</span>
      )
    )
  }

  const processInlineFormatting = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g)
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-semibold text-slate-800">{part.slice(2, -2)}</strong>
      }
      return <span key={i}>{highlightNumbers(part)}</span>
    })
  }

  for (const line of lines) {
    const trimmed = line.trim()
    if (/^[-*]\s/.test(trimmed) || (trimmed.startsWith('•') && trimmed.length > 1)) {
      listItems.push(trimmed)
    } else {
      flushList()
      if (trimmed) {
        elements.push(
          <p key={key++} className="text-slate-700 leading-relaxed my-2">
            {processInlineFormatting(trimmed)}
          </p>
        )
      }
    }
  }
  flushList()

  return <div className="space-y-1">{elements}</div>
}

interface Message {
  id: string
  type: 'user' | 'assistant'
  content: string
  timestamp: Date
  metadata?: {
    confidence?: string
    sources?: string[]
    suggestedQuestions?: string[]
  }
}

interface ChatInterfaceProps {
  fileId: string
  onClose?: () => void
}

export function ChatInterface({ fileId, onClose }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'assistant',
      content: "Hello! I'm your AI data analyst. I've analyzed your dataset and I'm ready to answer any questions you have. What would you like to know?",
      timestamp: new Date(),
      metadata: {
        suggestedQuestions: [
          "What are the main trends in this data?",
          "Which variables have the strongest correlation?",
          "Are there any outliers or anomalies?",
          "What insights can help improve business outcomes?"
        ]
      }
    }
  ])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    try {
      // Call the real chat API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: inputValue,
          file_id: fileId
        }),
      })

      if (!response.ok) {
        throw new Error('Chat API request failed')
      }

      const data = await response.json()
      const answer = data.answer ?? data.response ?? 'I could not generate a response. Please try again.'

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: answer,
        timestamp: new Date(),
        metadata: {
          confidence: data.confidence || 'high',
          sources: data.sources || ['Dataset analysis'],
          suggestedQuestions: data.suggested_questions ?? generateFollowUpQuestions(inputValue)
        }
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Error sending message:', error)
      const errorDetail = error instanceof Error ? error.message : 'Unknown error'
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: `I'm sorry, I encountered an error while processing your question: ${errorDetail}. Please try again or rephrase your question.`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const generateFollowUpQuestions = (question: string): string[] => {
    const lowerQuestion = question.toLowerCase()
    
    if (lowerQuestion.includes('trend') || lowerQuestion.includes('pattern')) {
      return [
        "What factors are driving these trends?",
        "How do these trends compare to national averages?",
        "Are there seasonal or temporal patterns?"
      ]
    }
    
    if (lowerQuestion.includes('correlation') || lowerQuestion.includes('relationship')) {
      return [
        "Which correlations are most actionable?",
        "Are there any surprising negative correlations?",
        "How do these correlations vary by region?"
      ]
    }
    
    if (lowerQuestion.includes('funding') || lowerQuestion.includes('money')) {
      return [
        "How does funding vary by region?",
        "What's the optimal funding threshold?",
        "Which schools are most efficient with funding?"
      ]
    }
    
    if (lowerQuestion.includes('test') || lowerQuestion.includes('score') || lowerQuestion.includes('performance')) {
      return [
        "Which schools are performing best?",
        "What factors predict high performance?",
        "How can we improve underperforming schools?"
      ]
    }
    
    if (lowerQuestion.includes('class') || lowerQuestion.includes('teacher') || lowerQuestion.includes('ratio')) {
      return [
        "What's the optimal class size?",
        "How do ratios vary by school type?",
        "Which schools have the best ratios?"
      ]
    }
    
    if (lowerQuestion.includes('internet') || lowerQuestion.includes('technology') || lowerQuestion.includes('digital')) {
      return [
        "How does technology access vary by region?",
        "What's the impact of digital infrastructure?",
        "Which schools need technology upgrades?"
      ]
    }
    
    if (lowerQuestion.includes('outlier') || lowerQuestion.includes('anomaly') || lowerQuestion.includes('unusual')) {
      return [
        "What causes these outliers?",
        "Are there patterns in the anomalies?",
        "How can we learn from these exceptions?"
      ]
    }
    
    return [
      "What are the main trends in this data?",
      "Which variables have the strongest correlation?",
      "What insights can help improve business outcomes?",
      "Are there any outliers or anomalies?"
    ]
  }

  const handleCopyMessage = async (content: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(messageId)
      setTimeout(() => setCopied(null), 2000)
    } catch (error) {
      console.error('Failed to copy message:', error)
    }
  }

  const handleSuggestedQuestion = (question: string) => {
    setInputValue(question)
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  return (
    <Card className="border-0 shadow-xl h-[85vh] max-h-[900px] flex flex-col bg-white">
      <CardHeader className="pb-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-xl shadow-sm">
              <Bot className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold text-slate-900">Chat with Your Data</CardTitle>
              <p className="text-sm text-slate-600 font-medium">Ask questions about your dataset</p>
            </div>
          </div>
          {onClose && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClose}
              className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600"
            >
              ×
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 min-h-0">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 chat-scrollbar">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${
                message.type === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {message.type === 'assistant' && (
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Bot className="h-5 w-5 text-blue-600" />
                </div>
              )}
              
              <div className={`max-w-[80%] space-y-2 ${
                message.type === 'user' ? 'order-first' : ''
              }`}>
                <div className={`p-4 rounded-xl shadow-sm ${
                  message.type === 'user' 
                    ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white' 
                    : 'bg-white border border-slate-200 text-slate-900'
                }`}>
                  <FormattedMessage content={message.content} isUser={message.type === 'user'} />
                </div>
                
                {/* Message Metadata */}
                <div className="flex items-center justify-between text-xs text-slate-500 mt-1">
                  <span className="font-medium">{formatTime(message.timestamp)}</span>
                  <div className="flex items-center gap-2">
                    {message.metadata?.confidence && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-200">
                        {message.metadata.confidence} confidence
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopyMessage(message.content, message.id)}
                      className="h-6 w-6 p-0"
                    >
                      {copied === message.id ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Suggested Questions */}
                {message.metadata?.suggestedQuestions && (
                  <div className="space-y-2 mt-3">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Suggested follow-up questions</p>
                    <div className="flex flex-wrap gap-2">
                      {message.metadata.suggestedQuestions.map((question, index) => (
                        <button
                          key={index}
                          onClick={() => handleSuggestedQuestion(question)}
                          className="text-xs px-3 py-2 rounded-lg bg-slate-100 hover:bg-blue-50 hover:border-blue-200 border border-transparent text-slate-700 hover:text-blue-800 transition-colors"
                        >
                          {question}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {message.type === 'user' && (
                <div className="p-2 bg-slate-100 rounded-lg">
                  <User className="h-5 w-5 text-slate-600" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Bot className="h-5 w-5 text-blue-600" />
              </div>
              <div className="p-4 bg-slate-100 rounded-lg">
                <LoadingSpinner size="sm" text="Analyzing your question..." />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-slate-200 p-4 bg-gradient-to-b from-slate-50 to-white flex-shrink-0">
          <div className="flex gap-3">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Ask a question about your data..."
              className="flex-1 bg-white border-slate-200 rounded-xl shadow-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              disabled={isLoading}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading}
              size="sm"
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 rounded-xl shadow-md"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => handleSuggestedQuestion("What are the main trends in this data?")}
              className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-white border border-slate-200 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 text-slate-600 transition-all shadow-sm"
            >
              <TrendingUp className="h-3.5 w-3.5" />
              Trends
            </button>
            <button
              onClick={() => handleSuggestedQuestion("Which variables have the strongest correlation?")}
              className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-white border border-slate-200 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 text-slate-600 transition-all shadow-sm"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Correlations
            </button>
            <button
              onClick={() => handleSuggestedQuestion("What insights can help improve business outcomes?")}
              className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-white border border-slate-200 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 text-slate-600 transition-all shadow-sm"
            >
              <Lightbulb className="h-3.5 w-3.5" />
              Insights
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 
