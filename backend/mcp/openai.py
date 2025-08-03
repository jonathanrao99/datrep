import os
import json
from typing import Dict, List, Optional
from openai import OpenAI
from fastapi import HTTPException

class OpenAIMCP:
    """Model Context Protocol for OpenAI GPT integration"""
    
    def __init__(self):
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY environment variable is required")
        
        self.client = OpenAI(api_key=api_key)
        self.model = "gpt-4o"  # Use GPT-4o for better insights
    
    async def generate_insights(self, data_summary: Dict, sample_data: str) -> Dict:
        """
        Generate insights from dataset using GPT
        
        Args:
            data_summary: Dictionary containing dataset statistics
            sample_data: Sample of the actual data
            
        Returns:
            Dict: Generated insights and analysis
        """
        try:
            # Create prompt for insight generation
            prompt = self._create_insights_prompt(data_summary, sample_data)
            
            response = await self._call_gpt(prompt)
            
            # Parse and structure the response
            insights = self._parse_insights_response(response)
            
            return {
                "insights": insights,
                "summary": data_summary,
                "generated_at": "2024-01-01T00:00:00Z"  # TODO: Use actual timestamp
            }
            
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to generate insights: {str(e)}"
            )
    
    async def chat_with_data(self, question: str, data_context: str) -> Dict:
        """
        Chat with data using GPT (Phase 2 feature)
        
        Args:
            question: User's question about the data
            data_context: Context about the dataset
            
        Returns:
            Dict: GPT's response to the question
        """
        try:
            prompt = self._create_chat_prompt(question, data_context)
            response = await self._call_gpt(prompt)
            
            return {
                "question": question,
                "answer": response,
                "timestamp": "2024-01-01T00:00:00Z"  # TODO: Use actual timestamp
            }
            
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to process chat question: {str(e)}"
            )
    
    def _create_insights_prompt(self, data_summary: Dict, sample_data: str) -> str:
        """Create prompt for insight generation"""
        return f"""
You are a professional data analyst. Analyze this dataset and provide 4-6 key business insights.

Dataset Summary:
- Rows: {data_summary.get('rows', 'N/A')}
- Columns: {data_summary.get('columns', 'N/A')}
- Column names: {data_summary.get('column_names', [])}
- Data types: {data_summary.get('data_types', {})}
- Missing values: {data_summary.get('missing_values', {})}

Sample Data (first 5 rows):
{sample_data}

Please provide:
1. 4-6 key insights about the data
2. Any notable patterns or trends
3. Potential business implications
4. Data quality observations

Format your response as a JSON object with this structure:
{{
    "insights": [
        {{
            "title": "Insight title",
            "description": "Detailed description",
            "business_impact": "What this means for business",
            "confidence": "high/medium/low"
        }}
    ],
    "patterns": [
        "Pattern 1 description",
        "Pattern 2 description"
    ],
    "data_quality": {{
        "issues": ["Issue 1", "Issue 2"],
        "recommendations": ["Recommendation 1", "Recommendation 2"]
    }}
}}

Be concise, professional, and focus on actionable business insights.
"""
    
    def _create_chat_prompt(self, question: str, data_context: str) -> str:
        """Create prompt for chat with data"""
        return f"""
You are a helpful data analyst assistant. Answer the user's question about their dataset.

Dataset Context:
{data_context}

User Question: {question}

Please provide a clear, helpful answer based on the dataset context. If you need more information to answer accurately, say so. Be conversational but professional.
"""
    
    async def _call_gpt(self, prompt: str) -> str:
        """Make API call to OpenAI GPT"""
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a professional data analyst."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=2000,
                temperature=0.3
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            # Fallback to GPT-3.5 if GPT-4o fails
            try:
                response = self.client.chat.completions.create(
                    model="gpt-3.5-turbo",
                    messages=[
                        {"role": "system", "content": "You are a professional data analyst."},
                        {"role": "user", "content": prompt}
                    ],
                    max_tokens=2000,
                    temperature=0.3
                )
                
                return response.choices[0].message.content
                
            except Exception as fallback_error:
                raise Exception(f"Both GPT-4o and GPT-3.5-turbo failed: {str(e)}, {str(fallback_error)}")
    
    def _parse_insights_response(self, response: str) -> Dict:
        """Parse GPT response into structured insights"""
        try:
            # Try to parse as JSON
            if response.strip().startswith('{'):
                return json.loads(response)
            
            # If not JSON, create a structured response
            return {
                "insights": [
                    {
                        "title": "Data Analysis Complete",
                        "description": response,
                        "business_impact": "Analysis completed successfully",
                        "confidence": "medium"
                    }
                ],
                "patterns": [],
                "data_quality": {
                    "issues": [],
                    "recommendations": []
                }
            }
            
        except json.JSONDecodeError:
            # Fallback if JSON parsing fails
            return {
                "insights": [
                    {
                        "title": "Analysis Results",
                        "description": response,
                        "business_impact": "Analysis completed",
                        "confidence": "medium"
                    }
                ],
                "patterns": [],
                "data_quality": {
                    "issues": [],
                    "recommendations": []
                }
            }

# Global OpenAI instance
openai_mcp = OpenAIMCP() 