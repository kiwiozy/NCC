import os
from openai import OpenAI


class OpenAIService:
    """Service for interacting with OpenAI API"""
    
    def __init__(self):
        self.api_key = os.getenv('OPENAI_API_KEY')
        if not self.api_key or self.api_key == 'your-openai-api-key-here':
            raise ValueError("OPENAI_API_KEY must be set in environment variables")
        
        self.client = OpenAI(api_key=self.api_key)
        self.model = "gpt-4o-mini"  # Using the latest, most cost-effective model
    
    def rewrite_clinical_notes(self, content: str, custom_prompt: str = None) -> str:
        """
        Rewrite text as professional clinical notes
        
        Args:
            content: The original note content
            custom_prompt: Optional custom instructions for refinement
            
        Returns:
            Rewritten clinical notes
        """
        system_message = """You are a professional medical scribe specializing in podiatry and orthotic clinical notes.
Your task is to rewrite patient notes into clear, professional clinical documentation following these guidelines:

1. Use proper medical terminology
2. Organize into clear sections (Subjective, Objective, Assessment, Plan if appropriate)
3. Be concise but comprehensive
4. Maintain clinical accuracy
5. Use professional tone
6. Follow standard clinical documentation practices

Do not add information that wasn't in the original notes. Only restructure and professionalize the existing content."""

        if custom_prompt:
            user_message = f"""Original notes:
{content}

Additional instructions: {custom_prompt}

Please rewrite these notes as professional clinical documentation."""
        else:
            user_message = f"""Original notes:
{content}

Please rewrite these notes as professional clinical documentation."""

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_message},
                    {"role": "user", "content": user_message}
                ],
                temperature=0.7,
                max_tokens=1000
            )
            
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            raise Exception(f"OpenAI API error: {str(e)}")

