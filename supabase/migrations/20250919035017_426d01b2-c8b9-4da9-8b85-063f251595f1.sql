-- Create feedback table to store customer feedback and sentiment analysis
CREATE TABLE public.feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  feedback_text TEXT NOT NULL,
  sentiment VARCHAR(10) NOT NULL CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  confidence_score DECIMAL(3,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create credits table to track usage
CREATE TABLE public.credits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  credits_used INTEGER NOT NULL DEFAULT 0,
  max_credits INTEGER NOT NULL DEFAULT 5,
  last_reset TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credits ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (since this is a public feedback analyzer)
CREATE POLICY "Anyone can view feedback" 
ON public.feedback 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create feedback" 
ON public.feedback 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can view credits" 
ON public.credits 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can update credits" 
ON public.credits 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can create credits record" 
ON public.credits 
FOR INSERT 
WITH CHECK (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_feedback_updated_at
BEFORE UPDATE ON public.feedback
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_credits_updated_at
BEFORE UPDATE ON public.credits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial credits record
INSERT INTO public.credits (credits_used, max_credits) VALUES (0, 5);