import os
import json
from datetime import datetime
from typing import Dict, List, Optional
from openai import OpenAI
from fastapi import HTTPException
import pandas as pd

class OpenAIMCP:
    """Model Context Protocol for OpenAI/OpenRouter GPT integration"""
    
    def __init__(self):
        openrouter_key = os.getenv("OPENROUTER_API_KEY")
        openai_key = os.getenv("OPENAI_API_KEY")
        
        if openrouter_key:
            self.client = OpenAI(
                api_key=openrouter_key,
                base_url="https://openrouter.ai/api/v1"
            )
            self.model = os.getenv("OPENROUTER_MODEL", "arcee-ai/trinity-large-preview:free")
        elif openai_key:
            self.client = OpenAI(api_key=openai_key)
            self.model = "gpt-5-nano"
        else:
            raise ValueError("OPENROUTER_API_KEY or OPENAI_API_KEY environment variable is required")
    
    async def generate_insights(self, data_summary: Dict, sample_data: str, file_path: str = None) -> Dict:
        """
        Generate insights from dataset using GPT
        
        Args:
            data_summary: Dictionary containing dataset statistics
            sample_data: Sample of the actual data
            file_path: Path to the actual data file for detailed analysis
            
        Returns:
            Dict: Generated insights and analysis
        """
        try:
            # Load actual data for detailed analysis
            actual_data_context = ""
            if file_path:
                try:
                    df = pd.read_csv(file_path) if file_path.endswith('.csv') else pd.read_excel(file_path)
                    actual_data_context = self._create_detailed_data_context(df, data_summary)
                except Exception as e:
                    print(f"Warning: Could not load actual data: {e}")
            
            # Create prompt for insight generation
            prompt = self._create_insights_prompt(data_summary, sample_data, actual_data_context)
            
            response = await self._call_gpt(prompt)
            
            # Parse and structure the response
            insights = self._parse_insights_response(response)
            
            return {
                "insights": insights,
                "summary": data_summary,
                "generated_at": datetime.utcnow().isoformat() + "Z"
            }
            
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to generate insights: {str(e)}"
            )
    
    async def chat_with_data(self, question: str, data_context: str, file_path: str = None) -> Dict:
        """
        Chat with data using GPT with dataset-specific answers
        
        Args:
            question: User's question about the data
            data_context: Context about the dataset
            file_path: Path to the actual data file
            
        Returns:
            Dict: GPT's response to the question
        """
        try:
            # Load actual data for specific analysis
            detailed_context = data_context
            if file_path:
                try:
                    df = pd.read_csv(file_path) if file_path.endswith('.csv') else pd.read_excel(file_path)
                    detailed_context = self._create_chat_data_context(df, question)
                except Exception as e:
                    print(f"Warning: Could not load actual data for chat: {e}")
            
            prompt = self._create_chat_prompt(question, detailed_context)
            response = await self._call_gpt(prompt)
            
            return {
                "question": question,
                "answer": response,
                "timestamp": datetime.utcnow().isoformat() + "Z"
            }
            
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to process chat question: {str(e)}"
            )
    
    def _create_detailed_data_context(self, df: pd.DataFrame, data_summary: Dict) -> str:
        """Create detailed context from actual data"""
        context_parts = []
        
        # Add key statistics with specific examples
        numeric_cols = df.select_dtypes(include=['number']).columns
        categorical_cols = df.select_dtypes(include=['object', 'category']).columns
        
        if len(numeric_cols) > 0:
            context_parts.append("📊 Numeric Columns Analysis (use these EXACT numbers in insights):")
            grand_total = df[numeric_cols].sum().sum()
            for col in numeric_cols[:10]:  # Include more columns for revenue-type data
                stats = df[col].describe()
                col_sum = df[col].sum()
                pct = (col_sum / grand_total * 100) if grand_total > 0 else 0
                max_val = df[col].max()
                min_val = df[col].min()
                context_parts.append(f"- {col}: sum={col_sum:,.2f} ({pct:.1f}% of total), mean={stats['mean']:.2f}, min={min_val:.2f}, max={max_val:.2f}")
        
        if len(categorical_cols) > 0:
            context_parts.append("🏷️ Categorical Columns Analysis:")
            for col in categorical_cols[:5]:  # Limit to first 5 columns
                value_counts = df[col].value_counts()
                top_values = value_counts.head(3)
                context_parts.append(f"- {col}: top values = {dict(top_values)}")
                
                # Find most common and least common
                most_common = value_counts.index[0] if len(value_counts) > 0 else None
                least_common = value_counts.index[-1] if len(value_counts) > 0 else None
                context_parts.append(f"  Most common: {most_common} ({value_counts.iloc[0]} times)")
                context_parts.append(f"  Least common: {least_common} ({value_counts.iloc[-1]} times)")
        
        # Add correlation analysis for numeric columns with specific examples
        if len(numeric_cols) >= 2:
            corr_matrix = df[numeric_cols].corr()
            high_corr = []
            for i in range(len(corr_matrix.columns)):
                for j in range(i+1, len(corr_matrix.columns)):
                    corr_val = corr_matrix.iloc[i, j]
                    if abs(corr_val) > 0.3:  # Lower threshold to catch more correlations
                        high_corr.append(f"{corr_matrix.columns[i]} & {corr_matrix.columns[j]}: {corr_val:.3f}")
            
            if high_corr:
                context_parts.append("🔗 Strong Correlations:")
                context_parts.extend(high_corr[:5])  # Limit to top 5 correlations
        
        # Add outlier analysis
        if len(numeric_cols) > 0:
            context_parts.append("🎯 Outlier Analysis:")
            for col in numeric_cols[:3]:
                Q1 = df[col].quantile(0.25)
                Q3 = df[col].quantile(0.75)
                IQR = Q3 - Q1
                outliers = df[(df[col] < Q1 - 1.5*IQR) | (df[col] > Q3 + 1.5*IQR)]
                if len(outliers) > 0:
                    context_parts.append(f"- {col}: {len(outliers)} outliers found")
                    # Show specific outlier values
                    outlier_values = outliers[col].head(3).tolist()
                    context_parts.append(f"  Outlier values: {outlier_values}")
        
        # Add sample data with more context
        context_parts.append("📋 Sample Data (first 5 rows with all columns):")
        context_parts.append(df.head(5).to_string())
        
        return "\n".join(context_parts)
    
    def _create_chat_data_context(self, df: pd.DataFrame, question: str) -> str:
        """Create context specific to the user's question"""
        question_lower = question.lower()
        context_parts = []

        # ALWAYS add pre-computed column sums first - critical for "total X" questions
        numeric_cols = df.select_dtypes(include=['number']).columns
        if len(numeric_cols) > 0:
            context_parts.append("PRE-COMPUTED COLUMN TOTALS (use these for 'total', 'sum', 'how much' - e.g. 'total sales' = Gross Sales or Net Sales sum):")
            grand_total = df[numeric_cols].sum().sum()
            for col in numeric_cols:
                col_sum = df[col].sum()
                pct = (col_sum / grand_total * 100) if grand_total > 0 else 0
                context_parts.append(f'- "{col}": sum={col_sum:,.2f} ({pct:.1f}% of total)')
            context_parts.append("")
        
        # Add relevant data based on question type
        if any(word in question_lower for word in ['trend', 'pattern', 'correlation']):
            numeric_cols = df.select_dtypes(include=['number']).columns
            if len(numeric_cols) >= 2:
                corr_matrix = df[numeric_cols].corr()
                context_parts.append("🔗 Correlation Analysis:")
                for i in range(len(corr_matrix.columns)):
                    for j in range(i+1, len(corr_matrix.columns)):
                        corr_val = corr_matrix.iloc[i, j]
                        context_parts.append(f"- {corr_matrix.columns[i]} vs {corr_matrix.columns[j]}: {corr_val:.3f}")
        
        if any(word in question_lower for word in ['outlier', 'anomaly', 'extreme']):
            numeric_cols = df.select_dtypes(include=['number']).columns
            context_parts.append("🎯 Outlier Analysis:")
            for col in numeric_cols[:3]:
                Q1 = df[col].quantile(0.25)
                Q3 = df[col].quantile(0.75)
                IQR = Q3 - Q1
                outliers = df[(df[col] < Q1 - 1.5*IQR) | (df[col] > Q3 + 1.5*IQR)]
                if len(outliers) > 0:
                    context_parts.append(f"- {col}: {len(outliers)} outliers found")
                    # Show specific outlier values and their context
                    outlier_values = outliers[col].head(3).tolist()
                    context_parts.append(f"  Outlier values: {outlier_values}")
        
        if any(word in question_lower for word in ['distribution', 'spread', 'range']):
            numeric_cols = df.select_dtypes(include=['number']).columns
            context_parts.append("📊 Distribution Analysis:")
            for col in numeric_cols[:3]:
                stats = df[col].describe()
                context_parts.append(f"- {col}: mean={stats['mean']:.2f}, std={stats['std']:.2f}, range={stats['max']-stats['min']:.2f}")
        
        if any(word in question_lower for word in ['highest', 'maximum', 'top', 'best']):
            numeric_cols = df.select_dtypes(include=['number']).columns
            context_parts.append("🏆 Highest Values:")
            for col in numeric_cols[:3]:
                max_val = df[col].max()
                max_idx = df[col].idxmax()
                context_parts.append(f"- {col}: {max_val:.2f} (row {max_idx})")
        
        if any(word in question_lower for word in ['lowest', 'minimum', 'bottom', 'worst']):
            numeric_cols = df.select_dtypes(include=['number']).columns
            context_parts.append("📉 Lowest Values:")
            for col in numeric_cols[:3]:
                min_val = df[col].min()
                min_idx = df[col].idxmin()
                context_parts.append(f"- {col}: {min_val:.2f} (row {min_idx})")
        
        if any(word in question_lower for word in ['average', 'mean', 'median']):
            numeric_cols = df.select_dtypes(include=['number']).columns
            context_parts.append("📈 Average Values:")
            for col in numeric_cols[:3]:
                mean_val = df[col].mean()
                median_val = df[col].median()
                context_parts.append(f"- {col}: mean={mean_val:.2f}, median={median_val:.2f}")
        
        # Add full dataset (or up to 2000 rows for context limits)
        max_rows = 2000
        df_to_include = df if len(df) <= max_rows else df.head(max_rows)
        context_parts.append(f"📋 Full Dataset ({len(df_to_include)} rows, total dataset has {len(df)} rows):")
        context_parts.append(df_to_include.to_string())
        
        return "\n".join(context_parts)
    
    def _create_insights_prompt(self, data_summary: Dict, sample_data: str, actual_data_context: str = "") -> str:
        """Create prompt for insight generation with actual data context"""
        prompt = f"""
You are a brilliant and enthusiastic data analyst who loves discovering hidden patterns in data! 🎯

CRITICAL: You MUST use ONLY the actual numbers from the Detailed Analysis and Sample Data below. NEVER use placeholders like $X, XX, Y%, $A, $B, XXXX. Every number in your insights MUST be real data.

Your mission: Analyze this dataset and provide EXCITING, SPECIFIC insights that will blow the user's mind!

Dataset Summary:
- Rows: {data_summary.get('rows', 'N/A')}
- Columns: {data_summary.get('columns', 'N/A')}
- Column names: {data_summary.get('column_names', [])}
- Data types: {data_summary.get('data_types', {})}

Sample Data:
{sample_data}

{f"🎯 Detailed Analysis:\n{actual_data_context}" if actual_data_context else ""}

Now, let's dive deep! Provide 6-8 AMAZING insights about THIS specific dataset. Be:
✨ SPECIFIC - Use actual numbers, names, and exact values from the data
🎉 EXCITING - Make it fun and engaging with emojis and personality
💡 DETAILED - Show the exact patterns you found
🔍 ANALYTICAL - Explain what the numbers mean

Format each insight like this example:
"🎵 Highest Like-to-View Ratio: 'Intro' by j-hope has the strongest YouTube engagement with a like-to-view ratio of 0.25."

Focus on:
- Highest/lowest values in each column
- Strongest correlations between variables
- Most interesting patterns and outliers
- Business implications of the findings
- Fun facts and surprising discoveries

Format as JSON:
{{
    "insights": [
        {{
            "title": "🎯 Specific insight with emoji",
            "description": "Detailed description with EXACT numbers and specific data points from the dataset",
            "business_impact": "What this means for business decisions",
            "confidence": "high/medium/low",
            "fun_fact": "One surprising or interesting detail with specific numbers"
        }}
    ],
    "key_findings": ["Finding 1 with specific numbers", "Finding 2 with specific numbers"],
    "recommendations": ["Actionable recommendation 1", "Actionable recommendation 2"],
    "data_story": "A brief, engaging story about what this data tells us with specific examples"
}}

Make it specific to THIS dataset - use actual column names, real numbers, and exact values you find in the data!
"""
        return prompt
    
    def _create_chat_prompt(self, question: str, data_context: str) -> str:
        """Create prompt for chat with data"""
        return f"""
You are a brilliant, enthusiastic data analyst who loves helping people understand their data! 🚀

Your superpower: Making complex data insights fun and easy to understand!

Dataset Context (from the user's UPLOADED FILE - use ONLY these numbers):
{data_context}

User Question: {question}

CRITICAL: For "total X", "sum of X", "how much" - use the PRE-COMPUTED COLUMN TOTALS above. Match the user's term to the closest column (e.g. "sales" → Gross Sales, Net Sales, Total Collected). Never say the data doesn't contain values if the column exists with a sum.

Your mission: Provide a detailed, fun, and professional answer that:
🎯 Directly addresses their question with SPECIFIC data insights
📊 Uses ACTUAL numbers and patterns from their dataset
💡 Provides actionable insights and recommendations
🎉 Makes it engaging and exciting to read with emojis
🔍 Shows your analytical expertise with specific examples

Be specific to their actual data - mention real correlations, patterns, and insights you find. 
Use exact numbers, column names, and specific data points from their dataset.

Make it conversational but professional, detailed but not overwhelming.
Include specific examples like: "The correlation between age and salary is 0.85, meaning older employees earn significantly more."

Keep it under 400 words unless they specifically ask for more detail.
"""
    
    async def _call_gpt(self, prompt: str) -> str:
        """Make API call to OpenAI GPT with optimized token usage"""
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a brilliant, enthusiastic data analyst who loves discovering hidden patterns in data! You make complex insights fun and easy to understand while maintaining professional expertise. Use emojis sparingly but effectively to make responses engaging."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=1000,  # Reduced from 2000 for efficiency
                temperature=0.2,   # Reduced for more consistent, factual responses
                top_p=0.9
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            # Fallback to GPT-3.5-turbo if GPT-4o-mini fails
            try:
                response = self.client.chat.completions.create(
                    model="gpt-3.5-turbo",
                    messages=[
                        {"role": "system", "content": "You are a brilliant, enthusiastic data analyst who loves discovering hidden patterns in data! You make complex insights fun and easy to understand while maintaining professional expertise. Use emojis sparingly but effectively to make responses engaging."},
                        {"role": "user", "content": prompt}
                    ],
                    max_tokens=1000,
                    temperature=0.2,
                    top_p=0.9
                )
                
                return response.choices[0].message.content
                
            except Exception as fallback_error:
                raise Exception(f"Both GPT-4o-mini and GPT-3.5-turbo failed: {str(e)}, {str(fallback_error)}")
    
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
                "key_findings": [],
                "recommendations": []
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
                "key_findings": [],
                "recommendations": []
            }

# Global OpenAI instance
openai_mcp = OpenAIMCP() 