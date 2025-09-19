import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Loader2, MessageSquare, TrendingUp, TrendingDown, Minus, BarChart3 } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"

interface SentimentResult {
  id: string
  sentiment: 'positive' | 'neutral' | 'negative'
  confidence: number
  credits_remaining: number
}

interface FeedbackItem {
  id: string
  feedback_text: string
  sentiment: 'positive' | 'neutral' | 'negative'
  confidence_score: number
  created_at: string
}

interface Credits {
  credits_used: number
  max_credits: number
}

export const FeedbackAnalyzer = () => {
  const [feedback, setFeedback] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [result, setResult] = useState<SentimentResult | null>(null)
  const [credits, setCredits] = useState<Credits>({ credits_used: 0, max_credits: 5 })
  const [recentFeedback, setRecentFeedback] = useState<FeedbackItem[]>([])
  const { toast } = useToast()

  useEffect(() => {
    fetchCredits()
    fetchRecentFeedback()
  }, [])

  const fetchCredits = async () => {
    const { data, error } = await supabase
      .from('credits')
      .select('*')
      .single()

    if (data) {
      setCredits(data)
    }
  }

  const fetchRecentFeedback = async () => {
    const { data, error } = await supabase
      .from('feedback')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)

    if (data) {
      setRecentFeedback(data as FeedbackItem[])
    }
  }

  const analyzeFeedback = async () => {
    if (!feedback.trim()) {
      toast({
        title: "Empty feedback",
        description: "Please enter some feedback to analyze.",
        variant: "destructive"
      })
      return
    }

    if (credits.credits_used >= credits.max_credits) {
      toast({
        title: "Credit limit reached",
        description: "You have used all 5 credits. Please try again later.",
        variant: "destructive"
      })
      return
    }

    setIsAnalyzing(true)
    setResult(null)

    try {
      const { data, error } = await supabase.functions.invoke('analyze-sentiment', {
        body: { feedback_text: feedback }
      })

      if (error) throw error

      setResult(data)
      setCredits(prev => ({ 
        ...prev, 
        credits_used: prev.credits_used + 1 
      }))
      
      toast({
        title: "Analysis complete!",
        description: `Sentiment: ${data.sentiment} (${Math.round(data.confidence * 100)}% confidence)`,
      })

      // Refresh recent feedback
      fetchRecentFeedback()
      
      // Clear the input
      setFeedback("")

    } catch (error: any) {
      toast({
        title: "Analysis failed",
        description: error.message || "Failed to analyze feedback. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return <TrendingUp className="h-4 w-4 text-positive" />
      case 'negative':
        return <TrendingDown className="h-4 w-4 text-negative" />
      default:
        return <Minus className="h-4 w-4 text-neutral" />
    }
  }

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return "bg-gradient-positive text-positive-foreground"
      case 'negative':
        return "bg-gradient-negative text-negative-foreground"
      default:
        return "bg-gradient-neutral text-neutral-foreground"
    }
  }

  const creditsRemaining = credits.max_credits - credits.credits_used

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted p-4">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-4 animate-fade-in">
          <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Feedback Sentiment Analyzer
          </h1>
          <p className="text-muted-foreground text-lg">
            Get instant AI-powered sentiment analysis of customer feedback
          </p>
        </div>

        {/* Credits Display */}
        <Card className="bg-gradient-card border-0 shadow-lg">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Usage Credits</CardTitle>
              </div>
              <Badge variant="outline" className="text-sm">
                {creditsRemaining} / {credits.max_credits} remaining
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Progress 
              value={(creditsRemaining / credits.max_credits) * 100} 
              className="h-3"
            />
            <p className="text-sm text-muted-foreground mt-2">
              {creditsRemaining === 0 
                ? "You've used all your credits. Please try again later." 
                : `You have ${creditsRemaining} credit${creditsRemaining !== 1 ? 's' : ''} remaining.`
              }
            </p>
          </CardContent>
        </Card>

        {/* Main Analysis Card */}
        <Card className="bg-gradient-card border-0 shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              <CardTitle>Analyze Customer Feedback</CardTitle>
            </div>
            <CardDescription>
              Enter customer feedback below to get instant sentiment analysis
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Enter customer feedback here... (e.g., 'The service was excellent and the staff was very helpful!')"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="min-h-32 resize-none border-2 focus:border-primary/50"
              disabled={isAnalyzing || creditsRemaining === 0}
            />
            
            <Button 
              onClick={analyzeFeedback}
              disabled={isAnalyzing || !feedback.trim() || creditsRemaining === 0}
              className="w-full bg-gradient-primary hover:opacity-90 transition-opacity"
              size="lg"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Analyze Sentiment
                </>
              )}
            </Button>

            {/* Result Display */}
            {result && (
              <div className="animate-fade-in">
                <Card className={`${getSentimentColor(result.sentiment)} border-0`}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getSentimentIcon(result.sentiment)}
                        <div>
                          <h3 className="font-semibold text-lg capitalize">
                            {result.sentiment} Sentiment
                          </h3>
                          <p className="opacity-90">
                            Confidence: {Math.round(result.confidence * 100)}%
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm opacity-90">Credits Remaining</p>
                        <p className="text-2xl font-bold">{result.credits_remaining}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Feedback */}
        {recentFeedback.length > 0 && (
          <Card className="bg-gradient-card border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Recent Feedback Analysis
              </CardTitle>
              <CardDescription>
                Latest {recentFeedback.length} feedback submissions and their sentiment scores
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentFeedback.map((item) => (
                  <div key={item.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    {getSentimentIcon(item.sentiment)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {item.feedback_text}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {item.sentiment}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {Math.round((item.confidence_score || 0) * 100)}% confidence
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}