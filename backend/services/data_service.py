import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Tuple
from pathlib import Path
import json
from datetime import datetime

class DataService:
    """Service for data processing and analysis"""
    
    def __init__(self):
        self.supported_formats = {'.csv', '.xlsx', '.xls'}
    
    async def parse_file(self, file_path: str) -> Dict:
        """
        Parse uploaded file and return data summary
        
        Args:
            file_path: Path to the uploaded file
            
        Returns:
            Dict: Data summary including statistics and sample
        """
        try:
            # Determine file type and parse accordingly
            file_extension = Path(file_path).suffix.lower()
            
            if file_extension == '.csv':
                df = pd.read_csv(file_path)
            elif file_extension in {'.xlsx', '.xls'}:
                df = pd.read_excel(file_path)
            else:
                raise ValueError(f"Unsupported file format: {file_extension}")
            
            # Generate data summary
            summary = self._generate_data_summary(df)
            
            # Get sample data
            sample_data = self._get_sample_data(df)
            
            return {
                "success": True,
                "data_summary": summary,
                "sample_data": sample_data,
                "parsed_at": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "parsed_at": datetime.utcnow().isoformat()
            }
    
    def _generate_data_summary(self, df: pd.DataFrame) -> Dict:
        """Generate comprehensive data summary"""
        summary = {
            "rows": len(df),
            "columns": len(df.columns),
            "column_names": df.columns.tolist(),
            "data_types": df.dtypes.astype(str).to_dict(),
            "missing_values": df.isnull().sum().to_dict(),
            "memory_usage": df.memory_usage(deep=True).sum(),
            "statistics": {}
        }
        
        # Generate statistics for numeric columns
        numeric_columns = df.select_dtypes(include=[np.number]).columns
        if len(numeric_columns) > 0:
            summary["statistics"]["numeric"] = {}
            for col in numeric_columns:
                summary["statistics"]["numeric"][col] = {
                    "mean": float(df[col].mean()) if not df[col].isna().all() else None,
                    "median": float(df[col].median()) if not df[col].isna().all() else None,
                    "std": float(df[col].std()) if not df[col].isna().all() else None,
                    "min": float(df[col].min()) if not df[col].isna().all() else None,
                    "max": float(df[col].max()) if not df[col].isna().all() else None,
                    "missing_count": int(df[col].isna().sum())
                }
        
        # Generate statistics for categorical columns
        categorical_columns = df.select_dtypes(include=['object', 'category']).columns
        if len(categorical_columns) > 0:
            summary["statistics"]["categorical"] = {}
            for col in categorical_columns:
                value_counts = df[col].value_counts()
                summary["statistics"]["categorical"][col] = {
                    "unique_values": int(df[col].nunique()),
                    "most_common": value_counts.index[0] if len(value_counts) > 0 else None,
                    "most_common_count": int(value_counts.iloc[0]) if len(value_counts) > 0 else None,
                    "missing_count": int(df[col].isna().sum())
                }
        
        # Detect potential trends in time series data
        summary["trends"] = self._detect_trends(df)
        
        # Detect anomalies
        summary["anomalies"] = self._detect_anomalies(df)
        
        return summary
    
    def _get_sample_data(self, df: pd.DataFrame, rows: int = 5) -> str:
        """Get sample data as formatted string"""
        sample_df = df.head(rows)
        return sample_df.to_string(index=False)
    
    def _detect_trends(self, df: pd.DataFrame) -> Dict:
        """Detect trends in time series data"""
        trends = {}
        
        # Look for date/time columns
        date_columns = []
        for col in df.columns:
            if df[col].dtype == 'object':
                try:
                    pd.to_datetime(df[col])
                    date_columns.append(col)
                except:
                    continue
        
        if date_columns:
            trends["time_series_columns"] = date_columns
            
            # Analyze trends for numeric columns over time
            numeric_columns = df.select_dtypes(include=[np.number]).columns
            for date_col in date_columns[:1]:  # Use first date column
                try:
                    df_temp = df.copy()
                    df_temp[date_col] = pd.to_datetime(df_temp[date_col])
                    df_temp = df_temp.sort_values(date_col)
                    
                    for num_col in numeric_columns[:3]:  # Analyze first 3 numeric columns
                        if not df_temp[num_col].isna().all():
                            # Calculate trend (positive/negative)
                            x = np.arange(len(df_temp))
                            y = df_temp[num_col].fillna(method='ffill')
                            if len(y) > 1:
                                slope = np.polyfit(x, y, 1)[0]
                                trends[f"{num_col}_trend"] = "increasing" if slope > 0 else "decreasing"
                except:
                    continue
        
        return trends
    
    def _detect_anomalies(self, df: pd.DataFrame) -> Dict:
        """Detect anomalies in numeric data"""
        anomalies = {}
        
        numeric_columns = df.select_dtypes(include=[np.number]).columns
        
        for col in numeric_columns:
            try:
                # Remove NaN values for analysis
                clean_data = df[col].dropna()
                if len(clean_data) < 3:
                    continue
                
                # Calculate z-scores
                z_scores = np.abs((clean_data - clean_data.mean()) / clean_data.std())
                anomaly_indices = z_scores > 2  # Z-score > 2 considered anomaly
                
                if anomaly_indices.sum() > 0:
                    anomalies[col] = {
                        "anomaly_count": int(anomaly_indices.sum()),
                        "anomaly_percentage": float(anomaly_indices.sum() / len(clean_data) * 100),
                        "anomaly_values": clean_data[anomaly_indices].tolist()[:5]  # First 5 anomalies
                    }
            except:
                continue
        
        return anomalies
    
    def get_chart_data(self, df: pd.DataFrame, chart_type: str, column: str) -> Dict:
        """
        Prepare data for chart generation
        
        Args:
            df: Pandas DataFrame
            chart_type: Type of chart (bar, line, pie, scatter)
            column: Column to visualize
            
        Returns:
            Dict: Chart configuration data
        """
        try:
            if chart_type == "bar":
                if df[column].dtype in ['object', 'category']:
                    data = df[column].value_counts().head(10).to_dict()
                else:
                    # Create bins for numeric data
                    data = df[column].value_counts(bins=10).to_dict()
                
                return {
                    "type": "bar",
                    "data": {
                        "labels": list(data.keys()),
                        "values": list(data.values())
                    }
                }
            
            elif chart_type == "line":
                if len(df) > 100:
                    # Sample data for line charts
                    df_sample = df.sample(n=100).sort_index()
                else:
                    df_sample = df
                
                return {
                    "type": "line",
                    "data": {
                        "x": df_sample.index.tolist(),
                        "y": df_sample[column].tolist()
                    }
                }
            
            elif chart_type == "pie":
                data = df[column].value_counts().head(8).to_dict()
                return {
                    "type": "pie",
                    "data": {
                        "labels": list(data.keys()),
                        "values": list(data.values())
                    }
                }
            
            elif chart_type == "scatter":
                # For scatter, we need two numeric columns
                numeric_cols = df.select_dtypes(include=[np.number]).columns
                if len(numeric_cols) >= 2:
                    x_col = numeric_cols[0]
                    y_col = numeric_cols[1] if numeric_cols[1] != x_col else numeric_cols[2] if len(numeric_cols) > 2 else x_col
                    
                    return {
                        "type": "scatter",
                        "data": {
                            "x": df[x_col].tolist(),
                            "y": df[y_col].tolist()
                        }
                    }
            
            return {"error": f"Unsupported chart type: {chart_type}"}
            
        except Exception as e:
            return {"error": f"Failed to generate chart data: {str(e)}"}

# Global data service instance
data_service = DataService() 