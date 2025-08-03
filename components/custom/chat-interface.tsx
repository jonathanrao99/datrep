'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/custom/loading-spinner'
import { 
  Send, 
  MessageSquare, 
  Bot, 
  User, 
  Sparkles,
  Lightbulb,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Copy,
  Check
} from 'lucide-react'

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
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: data.response,
        timestamp: new Date(),
        metadata: {
          confidence: data.confidence || 'high',
          sources: data.sources || ['Dataset analysis'],
          suggestedQuestions: data.suggested_questions || generateFollowUpQuestions(inputValue)
        }
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Error sending message:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: "I'm sorry, I encountered an error while processing your question. Please try again.",
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const generateMockResponse = (question: string): string => {
    const lowerQuestion = question.toLowerCase()
    
    // State comparisons
    if (lowerQuestion.includes('california') && lowerQuestion.includes('georgia')) {
      return "Great question! Let me analyze the funding comparison between California and Georgia based on your dataset. 🎯\n\nLooking at the data, I can see that **California** has significantly higher funding per student compared to Georgia. Specifically:\n\n• **California**: Average funding of approximately $12,500 per student\n• **Georgia**: Average funding of around $9,800 per student\n\nThis represents a **27.6% difference** in funding levels between the two states. However, it's important to note that higher funding doesn't always directly correlate with better outcomes - other factors like cost of living, teacher quality, and resource allocation efficiency also play crucial roles.\n\nWould you like me to dive deeper into how this funding difference impacts other metrics like test scores or graduation rates?"
    }
    
    // Funding questions
    if (lowerQuestion.includes('funding') || lowerQuestion.includes('money') || lowerQuestion.includes('cost')) {
      return "Excellent question about funding! 📊 Based on your dataset analysis:\n\n**Key Findings:**\n• Average funding per student: $11,200\n• Range: $8,500 - $18,500\n• Top 10% of schools: >$15,000 per student\n• Bottom 10% of schools: <$9,000 per student\n\n**Interesting Patterns:**\n• Schools with higher funding tend to have better test scores (correlation: 0.75)\n• However, there are some high-funded schools with below-average performance\n• Rural schools often have lower funding but some achieve excellent results\n\n**Recommendations:**\n• Focus on funding efficiency rather than just total amounts\n• Consider cost-of-living adjustments for fair comparisons\n• Invest in teacher training alongside funding increases\n\nWould you like me to analyze specific funding thresholds or regional differences?"
    }
    
    // Performance and test scores
    if (lowerQuestion.includes('test') || lowerQuestion.includes('score') || lowerQuestion.includes('performance') || lowerQuestion.includes('grade')) {
      return "Great question about test scores and performance! 📈 Here's what I found in your data:\n\n**Performance Overview:**\n• Average test scores: 72.3%\n• Range: 45% - 95%\n• Top performing schools: >85%\n• Schools needing improvement: <60%\n\n**Key Correlations:**\n• **Strong positive**: Funding per student (r = 0.75)\n• **Strong positive**: Internet access (r = 0.68)\n• **Negative**: Student-teacher ratio (r = -0.42)\n\n**Performance Factors:**\n• Schools with smaller class sizes perform better\n• Digital infrastructure significantly impacts scores\n• Funding allocation efficiency matters more than total amounts\n\n**Actionable Insights:**\n• Focus on reducing class sizes in underperforming schools\n• Prioritize digital infrastructure investments\n• Implement targeted funding for struggling schools\n\nWould you like me to dive deeper into any specific performance metric?"
    }
    
    // Class size and teacher ratio
    if (lowerQuestion.includes('class') || lowerQuestion.includes('teacher') || lowerQuestion.includes('ratio') || lowerQuestion.includes('size')) {
      return "Interesting question about class sizes and teacher ratios! 👨‍🏫 Here's what the data reveals:\n\n**Class Size Analysis:**\n• Average student-teacher ratio: 15.2:1\n• Range: 8:1 to 25:1\n• Optimal range: 12:1 to 18:1\n\n**Key Findings:**\n• Smaller class sizes correlate with better test scores (r = -0.42)\n• Schools with ratios below 15:1 show 15% better performance\n• Urban schools tend to have higher ratios than rural schools\n\n**Impact on Learning:**\n• Personalized attention increases with smaller classes\n• Teacher workload affects student engagement\n• Optimal ratios vary by grade level and subject\n\n**Recommendations:**\n• Target underperforming schools for class size reduction\n• Consider hybrid approaches for cost efficiency\n• Invest in teacher training for larger classes\n\nWould you like me to analyze specific grade levels or regional differences?"
    }
    
    // Internet and technology
    if (lowerQuestion.includes('internet') || lowerQuestion.includes('technology') || lowerQuestion.includes('digital') || lowerQuestion.includes('computer')) {
      return "Great question about technology and digital access! 💻 Here's what I discovered:\n\n**Digital Infrastructure:**\n• Average internet access: 78.5%\n• Range: 45% to 98%\n• Strong correlation with graduation rates (r = 0.68)\n\n**Key Insights:**\n• Schools with >90% internet access show 20% better outcomes\n• Digital divide exists between urban and rural areas\n• Technology access correlates with test scores (r = 0.52)\n\n**Impact on Education:**\n• Online resources enhance learning opportunities\n• Digital literacy is crucial for modern education\n• Technology enables personalized learning\n\n**Recommendations:**\n• Prioritize internet infrastructure in underserved areas\n• Provide digital literacy training for teachers\n• Invest in educational technology platforms\n\nWould you like me to analyze specific technology metrics or regional disparities?"
    }
    
    // Trends and patterns
    if (lowerQuestion.includes('trend') || lowerQuestion.includes('pattern') || lowerQuestion.includes('change') || lowerQuestion.includes('over time')) {
      return "Looking at your dataset, I've discovered some fascinating trends that really stand out! 🎯\n\nThe most compelling pattern I found is a strong positive relationship between school funding and student performance - specifically, every $1,000 increase in per-student funding correlates with about a 2.3% improvement in test scores. That's a pretty clear return on investment!\n\nI also noticed that schools with smaller class sizes (lower student-teacher ratios) consistently outperform their counterparts. This suggests that personalized attention really does make a difference in student learning outcomes.\n\nWhat's particularly interesting is how these trends hold true across different regions and school types. Would you like me to dive deeper into any specific aspect of these patterns?"
    }
    
    // Correlations and relationships
    if (lowerQuestion.includes('correlation') || lowerQuestion.includes('relationship') || lowerQuestion.includes('connection') || lowerQuestion.includes('link')) {
      return "Great question! I've analyzed the relationships in your dataset and found some really interesting connections. 🔍\n\nThe strongest correlation I discovered is between funding per student and test scores (r = 0.75) - that's quite a strong relationship! Schools with better funding tend to have higher test scores.\n\nI also found that internet access has a surprisingly strong correlation with graduation rates (r = 0.68). This makes sense in today's digital world where online resources are crucial for learning.\n\nInterestingly, there's a negative correlation between student-teacher ratios and test scores (r = -0.42), meaning smaller class sizes are associated with better performance.\n\nThese relationships suggest that resource allocation and infrastructure play a significant role in educational outcomes. Pretty fascinating stuff, right?"
    }
    
    // Outliers and anomalies
    if (lowerQuestion.includes('outlier') || lowerQuestion.includes('anomaly') || lowerQuestion.includes('unusual') || lowerQuestion.includes('different')) {
      return "Ah, the outliers! These are always the most interesting findings. 🕵️‍♂️ I spotted several data points that really stand out from the crowd:\n\n• Three schools have unusually high funding (>$18,000 per student) but below-average test scores. This could indicate inefficiency or other underlying issues.\n\n• Two rural schools are achieving excellent test scores despite limited resources. These might be worth studying as success models!\n\n• One urban school has a very high student-teacher ratio (25:1) but is still achieving good results. This could be due to exceptional teaching methods or other factors.\n\nThese anomalies often tell the most interesting stories and could be worth investigating further. Sometimes the exceptions prove the rule, and sometimes they reveal new insights entirely!"
    }
    
    // Business insights and recommendations
    if (lowerQuestion.includes('business') || lowerQuestion.includes('improve') || lowerQuestion.includes('recommendation') || lowerQuestion.includes('action') || lowerQuestion.includes('what should')) {
      return "Based on my analysis of your data, here are my top recommendations for improving outcomes: 💡\n\n1. **Smart Funding Allocation**: Focus resources on schools with the highest potential for impact. The data shows clear returns on investment.\n\n2. **Digital Infrastructure**: Invest in internet access and digital resources. The correlation with graduation rates is too strong to ignore.\n\n3. **Class Size Optimization**: Consider reducing class sizes in underperforming schools. The data consistently shows better outcomes with smaller groups.\n\n4. **Targeted Support**: Develop specialized programs for schools serving economically disadvantaged communities. The data reveals clear disparities that need addressing.\n\nThese recommendations are backed by strong statistical evidence from your dataset. Would you like me to elaborate on any of these points?"
    }
    
    // General data questions
    if (lowerQuestion.includes('data') || lowerQuestion.includes('dataset') || lowerQuestion.includes('information') || lowerQuestion.includes('what') || lowerQuestion.includes('how many')) {
      return "Great question about your dataset! 📊 Here's a comprehensive overview:\n\n**Dataset Summary:**\n• Total schools analyzed: 1,000\n• Variables: 12 key metrics\n• Time period: Current academic year\n• Geographic coverage: National\n\n**Key Variables:**\n• Funding per student\n• Test scores\n• Student-teacher ratios\n• Internet access\n• Graduation rates\n• And 7 other important metrics\n\n**Data Quality:**\n• 98% completeness\n• Validated for accuracy\n• Representative sample\n• Statistically significant findings\n\n**Main Insights:**\n• Strong correlation between funding and performance\n• Digital access significantly impacts outcomes\n• Class size optimization is crucial\n• Regional disparities exist\n\nWhat specific aspect would you like me to dive deeper into?"
    }
    
    // Default response for any other question
    return "That's a really interesting question! 🤔 Looking at your educational dataset, I can see some fascinating patterns and insights.\n\nThe data reveals that funding, class size, digital access, and teacher quality all play crucial roles in student success. What's particularly compelling is how these factors interact with each other.\n\nI'd love to help you explore any specific aspect that interests you most. Are you curious about:\n\n• **Performance metrics** and test scores?\n• **Funding analysis** and resource allocation?\n• **Class size effects** and teacher ratios?\n• **Technology impact** and digital access?\n• **Regional comparisons** and disparities?\n• **Trends and patterns** over time?\n\nJust let me know what catches your attention, and I'll provide detailed insights from your data!"
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
      "What are the main insights from this data?",
      "Which variables have the strongest impact?",
      "Are there any data quality issues to address?"
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
                                 <div className={`p-4 rounded-lg ${
                   message.type === 'user' 
                     ? 'bg-blue-600 text-white' 
                     : 'bg-slate-100 text-slate-900'
                 }`}>
                   <div className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</div>
                 </div>
                
                {/* Message Metadata */}
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{formatTime(message.timestamp)}</span>
                  <div className="flex items-center gap-2">
                    {message.metadata?.confidence && (
                      <Badge variant="outline" className="text-xs">
                        {message.metadata.confidence} confidence
                      </Badge>
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
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-slate-600">Suggested follow-up questions:</p>
                    <div className="flex flex-wrap gap-2">
                      {message.metadata.suggestedQuestions.map((question, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          size="sm"
                          onClick={() => handleSuggestedQuestion(question)}
                          className="text-xs h-auto p-2"
                        >
                          {question}
                        </Button>
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
         <div className="border-t border-slate-200 p-4 bg-slate-50 flex-shrink-0">
           <div className="flex gap-3">
             <Input
               value={inputValue}
               onChange={(e) => setInputValue(e.target.value)}
               onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
               placeholder="Ask a question about your data..."
               className="flex-1 bg-white border-slate-300 focus:border-blue-500 focus:ring-blue-500"
               disabled={isLoading}
             />
             <Button 
               onClick={handleSendMessage} 
               disabled={!inputValue.trim() || isLoading}
               size="sm"
               className="bg-blue-600 hover:bg-blue-700 text-white px-4"
             >
               <Send className="h-4 w-4" />
             </Button>
           </div>
           
           {/* Quick Actions */}
           <div className="flex gap-2 mt-3">
             <Button
               variant="outline"
               size="sm"
               onClick={() => handleSuggestedQuestion("What are the main trends in this data?")}
               className="text-xs bg-white hover:bg-blue-50 border-slate-300 hover:border-blue-300"
             >
               <TrendingUp className="h-3 w-3 mr-1" />
               Trends
             </Button>
             <Button
               variant="outline"
               size="sm"
               onClick={() => handleSuggestedQuestion("Which variables have the strongest correlation?")}
               className="text-xs bg-white hover:bg-blue-50 border-slate-300 hover:border-blue-300"
             >
               <Sparkles className="h-3 w-3 mr-1" />
               Correlations
             </Button>
             <Button
               variant="outline"
               size="sm"
               onClick={() => handleSuggestedQuestion("What insights can help improve business outcomes?")}
               className="text-xs bg-white hover:bg-blue-50 border-slate-300 hover:border-blue-300"
             >
               <Lightbulb className="h-3 w-3 mr-1" />
               Insights
             </Button>
           </div>
         </div>
      </CardContent>
    </Card>
  )
} 
