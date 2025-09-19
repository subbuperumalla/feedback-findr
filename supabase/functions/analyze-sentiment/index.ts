import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { feedback_text } = await req.json()

    if (!feedback_text) {
      return new Response(
        JSON.stringify({ error: 'Feedback text is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Check if credits are available
    const { data: creditsData, error: creditsError } = await supabaseClient
      .from('credits')
      .select('*')
      .single()

    if (creditsError || !creditsData) {
      return new Response(
        JSON.stringify({ error: 'Unable to check credits' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (creditsData.credits_used >= creditsData.max_credits) {
      return new Response(
        JSON.stringify({ error: 'Credit limit reached. You have used all 5 credits.' }),
        { 
          status: 429, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Simple sentiment analysis using keyword matching
    // In a real app, you'd use an AI service like OpenAI or Hugging Face
    const analyzeSentiment = (text: string) => {
      const lowerText = text.toLowerCase()
      
      const positiveWords = ['good', 'great', 'excellent', 'amazing', 'love', 'awesome', 'fantastic', 'wonderful', 'perfect', 'best', 'happy', 'satisfied', 'pleased']
      const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'worst', 'horrible', 'disappointing', 'poor', 'angry', 'frustrated', 'upset']
      
      let positiveScore = 0
      let negativeScore = 0
      
      positiveWords.forEach(word => {
        if (lowerText.includes(word)) positiveScore++
      })
      
      negativeWords.forEach(word => {
        if (lowerText.includes(word)) negativeScore++
      })
      
      if (positiveScore > negativeScore) {
        return { 
          sentiment: 'positive' as const, 
          confidence: Math.min(0.95, 0.6 + (positiveScore * 0.1)) 
        }
      } else if (negativeScore > positiveScore) {
        return { 
          sentiment: 'negative' as const, 
          confidence: Math.min(0.95, 0.6 + (negativeScore * 0.1)) 
        }
      } else {
        return { 
          sentiment: 'neutral' as const, 
          confidence: 0.7 
        }
      }
    }

    const analysis = analyzeSentiment(feedback_text)

    // Store the feedback in the database
    const { data: feedbackData, error: feedbackError } = await supabaseClient
      .from('feedback')
      .insert({
        feedback_text,
        sentiment: analysis.sentiment,
        confidence_score: analysis.confidence
      })
      .select()
      .single()

    if (feedbackError) {
      return new Response(
        JSON.stringify({ error: 'Failed to store feedback' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Update credits
    const { error: updateCreditsError } = await supabaseClient
      .from('credits')
      .update({ 
        credits_used: creditsData.credits_used + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', creditsData.id)

    if (updateCreditsError) {
      console.error('Failed to update credits:', updateCreditsError)
    }

    return new Response(
      JSON.stringify({
        id: feedbackData.id,
        sentiment: analysis.sentiment,
        confidence: analysis.confidence,
        credits_remaining: creditsData.max_credits - (creditsData.credits_used + 1)
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})