from fastapi import APIRouter, HTTPException, Query
from google.cloud import storage
import pandas as pd
import numpy as np
import io
from scipy import stats
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
import json
from typing import Dict, List, Any, Optional

eda_router = APIRouter()

# Initialize Google Cloud Storage client
client = storage.Client()

def convert_numpy_types(obj):
    """Convert numpy types to Python native types for JSON serialization"""
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, np.bool_):
        return bool(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, dict):
        return {key: convert_numpy_types(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [convert_numpy_types(item) for item in obj]
    else:
        return obj

def detect_outliers_iqr(data: pd.Series) -> Dict[str, Any]:
    """Detect outliers using IQR method"""
    Q1 = data.quantile(0.25)
    Q3 = data.quantile(0.75)
    IQR = Q3 - Q1
    lower_bound = Q1 - 1.5 * IQR
    upper_bound = Q3 + 1.5 * IQR
    
    outliers = data[(data < lower_bound) | (data > upper_bound)]
    
    return {
        "count": int(len(outliers)),
        "percentage": float((len(outliers) / len(data)) * 100),
        "lower_bound": float(lower_bound),
        "upper_bound": float(upper_bound),
        "outlier_values": [float(x) for x in outliers.tolist()[:10]]  # First 10 outliers
    }

def analyze_correlation(df: pd.DataFrame) -> Dict[str, Any]:
    """Analyze correlations between numeric columns"""
    numeric_cols = df.select_dtypes(include=[np.number]).columns
    if len(numeric_cols) < 2:
        return {
            "message": "Need at least 2 numeric columns for correlation analysis",
            "high_correlations": [],
            "numeric_columns": []
        }
    
    corr_matrix = df[numeric_cols].corr()
    
    # Find high correlations (> 0.8 or < -0.8)
    high_corr_pairs = []
    for i in range(len(corr_matrix.columns)):
        for j in range(i+1, len(corr_matrix.columns)):
            corr_val = corr_matrix.iloc[i, j]
            if not pd.isna(corr_val) and abs(corr_val) > 0.8:
                high_corr_pairs.append({
                    "var1": str(corr_matrix.columns[i]),
                    "var2": str(corr_matrix.columns[j]),
                    "correlation": float(corr_val)
                })
    
    # Convert correlation matrix to pure Python types
    matrix_dict = {}
    for col in corr_matrix.columns:
        matrix_dict[str(col)] = {}
        for row in corr_matrix.index:
            val = corr_matrix.loc[row, col]
            matrix_dict[str(col)][str(row)] = float(val) if not pd.isna(val) else None
    
    return {
        "matrix": matrix_dict,
        "high_correlations": high_corr_pairs,
        "numeric_columns": [str(col) for col in numeric_cols.tolist()]
    }

def perform_clustering(df: pd.DataFrame) -> Dict[str, Any]:
    """Perform automatic clustering analysis"""
    numeric_df = df.select_dtypes(include=[np.number]).dropna()
    
    if len(numeric_df.columns) < 2 or len(numeric_df) < 3:
        return {"message": "Insufficient numeric data for clustering"}
    
    try:
        # Standardize the data
        scaler = StandardScaler()
        scaled_data = scaler.fit_transform(numeric_df)
        
        # Find optimal clusters using elbow method
        inertias = []
        k_range = range(2, min(8, len(numeric_df)))
        
        for k in k_range:
            kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
            kmeans.fit(scaled_data)
            inertias.append(float(kmeans.inertia_))
        
        # Simple elbow detection
        optimal_k = 3  # Default
        if len(inertias) > 1:
            differences = [inertias[i] - inertias[i+1] for i in range(len(inertias)-1)]
            optimal_k = differences.index(max(differences)) + 2
        
        # Perform clustering with optimal k
        kmeans = KMeans(n_clusters=optimal_k, random_state=42, n_init=10)
        clusters = kmeans.fit_predict(scaled_data)
        
        return {
            "optimal_clusters": int(optimal_k),
            "cluster_counts": {f"Cluster {i}": int(np.sum(clusters == i)) for i in range(optimal_k)},
            "inertias": [float(x) for x in inertias],
            "k_range": [int(x) for x in k_range]
        }
    except Exception as e:
        return {"message": f"Clustering analysis failed: {str(e)}"}

def generate_insights(df: pd.DataFrame, analysis_results: Dict) -> List[Dict[str, Any]]:
    """Generate automated insights and recommendations"""
    insights = []
    
    try:
        # Data Quality Insights
        missing_percentage = (df.isnull().sum().sum() / (len(df) * len(df.columns))) * 100
        if missing_percentage > 10:
            insights.append({
                "type": "data_quality",
                "priority": "high",
                "title": "High Missing Data",
                "description": f"{missing_percentage:.1f}% of data is missing. Consider data imputation strategies.",
                "recommendation": "Review missing data patterns and apply appropriate imputation methods."
            })
        
        # Correlation Insights
        if "correlation" in analysis_results and "high_correlations" in analysis_results["correlation"]:
            high_corr = analysis_results["correlation"]["high_correlations"]
            if len(high_corr) > 0:
                insights.append({
                    "type": "correlation",
                    "priority": "medium",
                    "title": "High Correlations Detected",
                    "description": f"Found {len(high_corr)} pairs of highly correlated variables.",
                    "recommendation": "Consider feature selection to avoid multicollinearity in modeling."
                })
        
        # Outlier Insights
        outlier_columns = []
        if "outliers" in analysis_results:
            for col, outlier_info in analysis_results["outliers"].items():
                if outlier_info["percentage"] > 5:
                    outlier_columns.append(col)
            
            if outlier_columns:
                insights.append({
                    "type": "outliers",
                    "priority": "medium",
                    "title": "Significant Outliers Found",
                    "description": f"Columns {', '.join(outlier_columns)} have >5% outliers.",
                    "recommendation": "Investigate outliers - they may be data errors or important anomalies."
                })
        
        # Data Type Insights
        numeric_ratio = len(df.select_dtypes(include=[np.number]).columns) / len(df.columns)
        if numeric_ratio < 0.3:
            insights.append({
                "type": "data_types",
                "priority": "low",
                "title": "Mostly Categorical Data",
                "description": f"Only {numeric_ratio*100:.1f}% of columns are numeric.",
                "recommendation": "Consider encoding categorical variables for ML applications."
            })
    except Exception as e:
        insights.append({
            "type": "error",
            "priority": "high",
            "title": "Insight Generation Error",
            "description": f"Error generating insights: {str(e)}",
            "recommendation": "Check data format and try again."
        })
    
    return insights

@eda_router.get("/analyze-file/")
async def analyze_file(
    bucket_name: str = Query(description="GCS bucket name"),
    file_path: str = Query(description="Full path to the file in GCS")
):
    """
    Perform comprehensive EDA on a file from Google Cloud Storage
    """
    try:
        # Download file from GCS
        bucket = client.get_bucket(bucket_name)
        blob = bucket.blob(file_path)
        
        if not blob.exists():
            raise HTTPException(status_code=404, detail="File not found")
        
        # Read file content
        file_content = blob.download_as_bytes()
        
        # Determine file type and read accordingly
        if file_path.lower().endswith('.csv'):
            df = pd.read_csv(io.BytesIO(file_content))
        elif file_path.lower().endswith(('.xlsx', '.xls')):
            df = pd.read_excel(io.BytesIO(file_content))
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format. Use CSV or Excel files.")
        
        # Basic dataset info
        dataset_info = {
            "shape": [int(df.shape[0]), int(df.shape[1])],
            "columns": [str(col) for col in df.columns.tolist()],
            "dtypes": {str(col): str(dtype) for col, dtype in df.dtypes.items()},
            "memory_usage": float(df.memory_usage(deep=True).sum() / 1024 / 1024)  # MB
        }
        
        # Data Quality Analysis
        missing_values = {}
        for col in df.columns:
            missing_count = int(df[col].isnull().sum())
            missing_values[str(col)] = {
                "count": missing_count,
                "percentage": float((missing_count / len(df)) * 100)
            }
        
        # Statistical Summaries
        numeric_columns = df.select_dtypes(include=[np.number]).columns
        statistical_summary = {}
        
        for col in numeric_columns:
            series = df[col].dropna()
            if len(series) > 0:
                try:
                    statistical_summary[str(col)] = {
                        "count": int(len(series)),
                        "mean": float(series.mean()),
                        "std": float(series.std()),
                        "min": float(series.min()),
                        "max": float(series.max()),
                        "median": float(series.median()),
                        "q25": float(series.quantile(0.25)),
                        "q75": float(series.quantile(0.75)),
                        "skewness": float(stats.skew(series)),
                        "kurtosis": float(stats.kurtosis(series))
                    }
                except Exception as e:
                    print(f"Error processing column {col}: {str(e)}")
        
        # Outlier Detection
        outlier_analysis = {}
        for col in numeric_columns:
            if not df[col].isnull().all():
                try:
                    outlier_analysis[str(col)] = detect_outliers_iqr(df[col].dropna())
                except Exception as e:
                    print(f"Error in outlier detection for {col}: {str(e)}")
        
        # Correlation Analysis
        correlation_analysis = analyze_correlation(df)
        
        # Distribution Analysis
        distribution_analysis = {}
        for col in numeric_columns:
            series = df[col].dropna()
            if len(series) > 0:
                try:
                    _, shapiro_p = stats.shapiro(series.sample(min(5000, len(series))))
                    distribution_analysis[str(col)] = {
                        "is_normal": bool(shapiro_p > 0.05),
                        "shapiro_p_value": float(shapiro_p),
                        "unique_values": int(series.nunique()),
                        "unique_ratio": float(series.nunique() / len(series))
                    }
                except Exception as e:
                    distribution_analysis[str(col)] = {
                        "is_normal": False,
                        "shapiro_p_value": 0.0,
                        "unique_values": int(series.nunique()),
                        "unique_ratio": float(series.nunique() / len(series))
                    }
        
        # Clustering Analysis
        clustering_analysis = perform_clustering(df)
        
        # Compile all results
        analysis_results = {
            "dataset_info": dataset_info,
            "data_quality": {
                "missing_values": missing_values,
                "completeness": float(((df.size - df.isnull().sum().sum()) / df.size) * 100)
            },
            "statistical_summary": statistical_summary,
            "correlation": correlation_analysis,
            "outliers": outlier_analysis,
            "distributions": distribution_analysis,
            "clustering": clustering_analysis
        }
        
        # Generate insights
        insights = generate_insights(df, analysis_results)
        analysis_results["insights"] = insights
        
        # Convert all numpy types to Python types before returning
        analysis_results = convert_numpy_types(analysis_results)
        
        return analysis_results
        
    except pd.errors.EmptyDataError:
        raise HTTPException(status_code=400, detail="File is empty or invalid")
    except pd.errors.ParserError:
        raise HTTPException(status_code=400, detail="Unable to parse file. Check file format.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")