from fastapi import APIRouter, HTTPException, Query
from google.cloud import storage
import pandas as pd
import numpy as np
import io
from scipy import stats
from scipy.stats import chi2_contingency, normaltest, jarque_bera, anderson
from sklearn.cluster import KMeans, DBSCAN, AgglomerativeClustering
from sklearn.decomposition import PCA, FactorAnalysis
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.feature_selection import mutual_info_classif, mutual_info_regression, f_classif, f_regression
from sklearn.ensemble import IsolationForest
from sklearn.metrics import silhouette_score, calinski_harabasz_score
from sklearn.model_selection import cross_val_score
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
from sklearn.linear_model import LinearRegression, LogisticRegression
import warnings
from typing import Dict, List, Any, Optional, Tuple
import json
from datetime import datetime, timedelta
import seaborn as sns

warnings.filterwarnings('ignore')

advanced_eda_router = APIRouter()

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
    elif pd.isna(obj):
        return None
    else:
        return obj

def advanced_statistical_tests(df: pd.DataFrame) -> Dict[str, Any]:
    """Perform comprehensive statistical testing"""
    results = {
        "normality_tests": {},
        "independence_tests": {},
        "homogeneity_tests": {},
        "stationarity_tests": {}
    }
    
    numeric_cols = df.select_dtypes(include=[np.number]).columns
    categorical_cols = df.select_dtypes(include=['object', 'category']).columns
    
    # Normality Tests
    for col in numeric_cols:
        series = df[col].dropna()
        if len(series) > 8:  # Minimum sample size for tests
            try:
                # Multiple normality tests
                shapiro_stat, shapiro_p = stats.shapiro(series.sample(min(5000, len(series))))
                jarque_stat, jarque_p = jarque_bera(series)
                anderson_stat = anderson(series, dist='norm')
                
                results["normality_tests"][str(col)] = {
                    "shapiro_wilk": {"statistic": float(shapiro_stat), "p_value": float(shapiro_p)},
                    "jarque_bera": {"statistic": float(jarque_stat), "p_value": float(jarque_p)},
                    "anderson_darling": {
                        "statistic": float(anderson_stat.statistic),
                        "critical_values": [float(x) for x in anderson_stat.critical_values],
                        "significance_levels": [float(x) for x in anderson_stat.significance_level]
                    },
                    "is_normal_consensus": bool(shapiro_p > 0.05 and jarque_p > 0.05)
                }
            except Exception as e:
                results["normality_tests"][str(col)] = {"error": str(e)}
    
    # Independence Tests (Chi-square for categorical variables)
    categorical_pairs = [(cat1, cat2) for i, cat1 in enumerate(categorical_cols) 
                        for cat2 in categorical_cols[i+1:]]
    
    for cat1, cat2 in categorical_pairs[:10]:  # Limit to first 10 pairs
        try:
            contingency_table = pd.crosstab(df[cat1], df[cat2])
            if contingency_table.size > 1:
                chi2_stat, chi2_p, dof, expected = chi2_contingency(contingency_table)
                cramers_v = np.sqrt(chi2_stat / (contingency_table.sum().sum() * 
                                               (min(contingency_table.shape) - 1)))
                
                results["independence_tests"][f"{cat1}_vs_{cat2}"] = {
                    "chi_square": {"statistic": float(chi2_stat), "p_value": float(chi2_p)},
                    "degrees_of_freedom": int(dof),
                    "cramers_v": float(cramers_v),
                    "is_independent": bool(chi2_p > 0.05)
                }
        except Exception as e:
            results["independence_tests"][f"{cat1}_vs_{cat2}"] = {"error": str(e)}
    
    return results

def advanced_clustering_analysis(df: pd.DataFrame) -> Dict[str, Any]:
    """Perform multiple clustering algorithms with evaluation metrics"""
    numeric_df = df.select_dtypes(include=[np.number]).dropna()
    
    if len(numeric_df.columns) < 2 or len(numeric_df) < 10:
        return {"message": "Insufficient data for advanced clustering"}
    
    try:
        # Standardize data
        scaler = StandardScaler()
        scaled_data = scaler.fit_transform(numeric_df)
        
        results = {
            "algorithms": {},
            "optimal_clusters": {},
            "cluster_quality_metrics": {}
        }
        
        # K-Means with multiple evaluation metrics
        silhouette_scores = []
        calinski_scores = []
        k_range = range(2, min(8, len(numeric_df)//2))
        
        for k in k_range:
            kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
            cluster_labels = kmeans.fit_predict(scaled_data)
            
            sil_score = silhouette_score(scaled_data, cluster_labels)
            cal_score = calinski_harabasz_score(scaled_data, cluster_labels)
            
            silhouette_scores.append(float(sil_score))
            calinski_scores.append(float(cal_score))
        
        optimal_k_silhouette = k_range[np.argmax(silhouette_scores)]
        optimal_k_calinski = k_range[np.argmax(calinski_scores)]
        
        results["algorithms"]["kmeans"] = {
            "silhouette_scores": silhouette_scores,
            "calinski_scores": calinski_scores,
            "k_range": list(k_range),
            "optimal_k_silhouette": int(optimal_k_silhouette),
            "optimal_k_calinski": int(optimal_k_calinski)
        }
        
        # DBSCAN
        try:
            dbscan = DBSCAN(eps=0.5, min_samples=5)
            dbscan_labels = dbscan.fit_predict(scaled_data)
            n_clusters_dbscan = len(set(dbscan_labels)) - (1 if -1 in dbscan_labels else 0)
            n_noise = list(dbscan_labels).count(-1)
            
            if n_clusters_dbscan > 1:
                dbscan_silhouette = silhouette_score(scaled_data, dbscan_labels)
            else:
                dbscan_silhouette = -1
            
            results["algorithms"]["dbscan"] = {
                "n_clusters": int(n_clusters_dbscan),
                "n_noise_points": int(n_noise),
                "silhouette_score": float(dbscan_silhouette),
                "noise_ratio": float(n_noise / len(scaled_data))
            }
        except Exception as e:
            results["algorithms"]["dbscan"] = {"error": str(e)}
        
        # Hierarchical Clustering
        try:
            hierarchical = AgglomerativeClustering(n_clusters=optimal_k_silhouette)
            hier_labels = hierarchical.fit_predict(scaled_data)
            hier_silhouette = silhouette_score(scaled_data, hier_labels)
            
            results["algorithms"]["hierarchical"] = {
                "n_clusters": int(optimal_k_silhouette),
                "silhouette_score": float(hier_silhouette)
            }
        except Exception as e:
            results["algorithms"]["hierarchical"] = {"error": str(e)}
        
        return results
    
    except Exception as e:
        return {"message": f"Advanced clustering failed: {str(e)}"}

def dimensionality_analysis(df: pd.DataFrame) -> Dict[str, Any]:
    """Perform PCA and Factor Analysis"""
    numeric_df = df.select_dtypes(include=[np.number]).dropna()
    
    if len(numeric_df.columns) < 3:
        return {"message": "Need at least 3 numeric variables for dimensionality analysis"}
    
    try:
        scaler = StandardScaler()
        scaled_data = scaler.fit_transform(numeric_df)
        
        results = {}
        
        # PCA Analysis
        pca = PCA()
        pca_transformed = pca.fit_transform(scaled_data)
        
        # Calculate cumulative explained variance
        cumulative_variance = np.cumsum(pca.explained_variance_ratio_)
        n_components_80 = np.argmax(cumulative_variance >= 0.8) + 1
        n_components_95 = np.argmax(cumulative_variance >= 0.95) + 1
        
        results["pca"] = {
            "explained_variance_ratio": [float(x) for x in pca.explained_variance_ratio_],
            "cumulative_variance": [float(x) for x in cumulative_variance],
            "n_components_80_variance": int(n_components_80),
            "n_components_95_variance": int(n_components_95),
            "total_components": int(len(pca.explained_variance_ratio_)),
            "kaiser_criterion": int(np.sum(pca.explained_variance_ > 1))  # Eigenvalues > 1
        }
        
        # Factor Analysis
        try:
            fa = FactorAnalysis(n_components=min(n_components_80, len(numeric_df.columns)//2))
            fa.fit(scaled_data)
            
            results["factor_analysis"] = {
                "n_factors": int(fa.n_components),
                "log_likelihood": float(fa.loglike_[-1]) if hasattr(fa, 'loglike_') else None,
                "noise_variance": [float(x) for x in fa.noise_variance_]
            }
        except Exception as e:
            results["factor_analysis"] = {"error": str(e)}
        
        return results
    
    except Exception as e:
        return {"message": f"Dimensionality analysis failed: {str(e)}"}

def feature_importance_analysis(df: pd.DataFrame, target_col: str = None) -> Dict[str, Any]:
    """Analyze feature importance using multiple methods"""
    if target_col and target_col not in df.columns:
        return {"message": f"Target column '{target_col}' not found"}
    
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    categorical_cols = df.select_dtypes(include=['object', 'category']).columns.tolist()
    
    if target_col:
        if target_col in numeric_cols:
            numeric_cols.remove(target_col)
        if target_col in categorical_cols:
            categorical_cols.remove(target_col)
    
    if len(numeric_cols) == 0:
        return {"message": "No numeric features available for analysis"}
    
    results = {
        "univariate_analysis": {},
        "mutual_information": {},
        "model_based_importance": {}
    }
    
    try:
        # Prepare feature matrix
        feature_df = df[numeric_cols].copy()
        
        # Handle missing values
        feature_df = feature_df.fillna(feature_df.median())
        
        if target_col:
            target_series = df[target_col].dropna()
            feature_df = feature_df.loc[target_series.index]
            
            # Determine if target is continuous or categorical
            is_classification = (df[target_col].dtype == 'object' or 
                               df[target_col].nunique() < 10)
            
            if is_classification:
                # Encode target if categorical
                le = LabelEncoder()
                target_encoded = le.fit_transform(target_series.astype(str))
                
                # F-test for classification
                f_scores, f_pvalues = f_classif(feature_df, target_encoded)
                
                # Mutual information for classification
                mi_scores = mutual_info_classif(feature_df, target_encoded, random_state=42)
                
                # Random Forest feature importance
                rf = RandomForestClassifier(n_estimators=100, random_state=42)
                rf.fit(feature_df, target_encoded)
                rf_importance = rf.feature_importances_
                
            else:
                # F-test for regression
                f_scores, f_pvalues = f_regression(feature_df, target_series)
                
                # Mutual information for regression
                mi_scores = mutual_info_regression(feature_df, target_series, random_state=42)
                
                # Random Forest feature importance
                rf = RandomForestRegressor(n_estimators=100, random_state=42)
                rf.fit(feature_df, target_series)
                rf_importance = rf.feature_importances_
            
            # Compile results
            for i, col in enumerate(numeric_cols):
                results["univariate_analysis"][col] = {
                    "f_score": float(f_scores[i]),
                    "f_pvalue": float(f_pvalues[i]),
                    "is_significant": bool(f_pvalues[i] < 0.05)
                }
                
                results["mutual_information"][col] = float(mi_scores[i])
                results["model_based_importance"][col] = float(rf_importance[i])
        
        else:
            # Without target, analyze feature variance and correlation
            results["variance_analysis"] = {}
            for col in numeric_cols:
                series = feature_df[col]
                results["variance_analysis"][col] = {
                    "variance": float(series.var()),
                    "coefficient_of_variation": float(series.std() / series.mean()) if series.mean() != 0 else None,
                    "unique_ratio": float(series.nunique() / len(series))
                }
        
        return results
    
    except Exception as e:
        return {"message": f"Feature importance analysis failed: {str(e)}"}

def anomaly_detection(df: pd.DataFrame) -> Dict[str, Any]:
    """Advanced anomaly detection using multiple methods"""
    numeric_df = df.select_dtypes(include=[np.number]).dropna()
    
    if len(numeric_df.columns) < 2:
        return {"message": "Need at least 2 numeric columns for anomaly detection"}
    
    try:
        scaler = StandardScaler()
        scaled_data = scaler.fit_transform(numeric_df)
        
        results = {}
        
        # Isolation Forest
        iso_forest = IsolationForest(contamination=0.1, random_state=42)
        iso_anomalies = iso_forest.fit_predict(scaled_data)
        iso_scores = iso_forest.decision_function(scaled_data)
        
        results["isolation_forest"] = {
            "n_anomalies": int(np.sum(iso_anomalies == -1)),
            "anomaly_percentage": float((np.sum(iso_anomalies == -1) / len(iso_anomalies)) * 100),
            "anomaly_scores": [float(x) for x in iso_scores[:100]]  # First 100 scores
        }
        
        # Statistical outliers (multivariate)
        try:
            # Mahalanobis distance
            cov_matrix = np.cov(scaled_data.T)
            inv_cov = np.linalg.pinv(cov_matrix)
            mean_vector = np.mean(scaled_data, axis=0)
            
            mahal_distances = []
            for i in range(len(scaled_data)):
                diff = scaled_data[i] - mean_vector
                mahal_dist = np.sqrt(diff.T @ inv_cov @ diff)
                mahal_distances.append(float(mahal_dist))
            
            # Chi-square threshold for outliers
            threshold = stats.chi2.ppf(0.95, df=scaled_data.shape[1])
            statistical_outliers = [d > threshold for d in mahal_distances]
            
            results["statistical_outliers"] = {
                "mahalanobis_distances": mahal_distances[:100],  # First 100
                "n_outliers": int(sum(statistical_outliers)),
                "outlier_percentage": float((sum(statistical_outliers) / len(statistical_outliers)) * 100),
                "threshold": float(threshold)
            }
        except Exception as e:
            results["statistical_outliers"] = {"error": str(e)}
        
        return results
    
    except Exception as e:
        return {"message": f"Anomaly detection failed: {str(e)}"}

def time_series_analysis(df: pd.DataFrame, date_col: str = None) -> Dict[str, Any]:
    """Basic time series analysis if date column is present"""
    if date_col and date_col not in df.columns:
        return {"message": f"Date column '{date_col}' not found"}
    
    # Auto-detect date columns if not specified
    if not date_col:
        date_cols = []
        for col in df.columns:
            if df[col].dtype == 'datetime64[ns]' or 'date' in col.lower() or 'time' in col.lower():
                try:
                    pd.to_datetime(df[col].dropna().iloc[:100])
                    date_cols.append(col)
                except:
                    pass
        
        if not date_cols:
            return {"message": "No date columns detected"}
        
        date_col = date_cols[0]
    
    try:
        # Convert to datetime
        df_ts = df.copy()
        df_ts[date_col] = pd.to_datetime(df_ts[date_col])
        df_ts = df_ts.dropna(subset=[date_col]).sort_values(date_col)
        
        numeric_cols = df_ts.select_dtypes(include=[np.number]).columns
        
        results = {
            "date_column": date_col,
            "date_range": {
                "start": str(df_ts[date_col].min()),
                "end": str(df_ts[date_col].max()),
                "total_days": int((df_ts[date_col].max() - df_ts[date_col].min()).days)
            },
            "frequency_analysis": {},
            "trend_analysis": {}
        }
        
        # Frequency analysis
        df_ts['date_only'] = df_ts[date_col].dt.date
        daily_counts = df_ts['date_only'].value_counts()
        
        results["frequency_analysis"] = {
            "total_records": int(len(df_ts)),
            "unique_dates": int(daily_counts.nunique()),
            "avg_records_per_day": float(daily_counts.mean()),
            "date_gaps": int(daily_counts[daily_counts == 0].count()) if 0 in daily_counts.values else 0
        }
        
        # Simple trend analysis for numeric columns
        for col in numeric_cols[:5]:  # Limit to first 5 numeric columns
            if len(df_ts[col].dropna()) > 10:
                # Group by date and calculate mean
                daily_values = df_ts.groupby('date_only')[col].mean()
                
                # Linear trend
                x = np.arange(len(daily_values))
                y = daily_values.values
                slope, intercept, r_value, p_value, std_err = stats.linregress(x, y)
                
                results["trend_analysis"][col] = {
                    "linear_trend_slope": float(slope),
                    "r_squared": float(r_value**2),
                    "trend_p_value": float(p_value),
                    "is_trending": bool(p_value < 0.05),
                    "trend_direction": "increasing" if slope > 0 else "decreasing" if slope < 0 else "flat"
                }
        
        return results
    
    except Exception as e:
        return {"message": f"Time series analysis failed: {str(e)}"}

def business_insights_generator(df: pd.DataFrame, analysis_results: Dict) -> List[Dict[str, Any]]:
    """Generate business-focused insights and recommendations"""
    insights = []
    
    try:
        # Data Quality Assessment
        total_missing = sum([info["count"] for info in analysis_results.get("data_quality", {}).get("missing_values", {}).values()])
        total_cells = df.shape[0] * df.shape[1]
        missing_percentage = (total_missing / total_cells) * 100
        
        if missing_percentage > 15:
            insights.append({
                "category": "Data Quality",
                "priority": "Critical",
                "finding": f"High Data Incompleteness ({missing_percentage:.1f}%)",
                "business_impact": "Poor data quality can lead to unreliable analysis and incorrect business decisions",
                "recommendation": "Implement data quality monitoring and establish data collection protocols",
                "action_items": [
                    "Audit data collection processes",
                    "Implement real-time data validation",
                    "Create data quality dashboards"
                ]
            })
        
        # Feature Richness Assessment
        numeric_ratio = len(df.select_dtypes(include=[np.number]).columns) / len(df.columns)
        if numeric_ratio > 0.7:
            insights.append({
                "category": "Data Characteristics",
                "priority": "Opportunity",
                "finding": f"High Numeric Feature Density ({numeric_ratio*100:.1f}%)",
                "business_impact": "Rich quantitative data enables advanced analytics and predictive modeling",
                "recommendation": "Leverage quantitative strength for predictive analytics and machine learning",
                "action_items": [
                    "Develop predictive models",
                    "Implement automated anomaly detection",
                    "Create dynamic forecasting capabilities"
                ]
            })
        
        # Correlation Insights
        correlation_data = analysis_results.get("correlation", {})
        high_correlations = correlation_data.get("high_correlations", [])
        
        if len(high_correlations) > 3:
            insights.append({
                "category": "Feature Relationships",
                "priority": "Medium",
                "finding": f"Multiple High Correlations Detected ({len(high_correlations)} pairs)",
                "business_impact": "Redundant features may indicate inefficient data collection or multicollinearity issues",
                "recommendation": "Optimize feature set and consider dimensionality reduction",
                "action_items": [
                    "Perform feature selection analysis",
                    "Consider principal component analysis",
                    "Review data collection efficiency"
                ]
            })
        
        # Clustering Insights
        clustering_data = analysis_results.get("clustering", {})
        if "optimal_clusters" in clustering_data:
            n_clusters = clustering_data["optimal_clusters"]
            insights.append({
                "category": "Market Segmentation",
                "priority": "Opportunity",
                "finding": f"Natural Customer/Data Segments Identified ({n_clusters} clusters)",
                "business_impact": "Clear segmentation enables targeted strategies and personalized approaches",
                "recommendation": "Develop segment-specific strategies and tailored offerings",
                "action_items": [
                    "Profile each segment characteristics",
                    "Design targeted marketing campaigns",
                    "Customize product/service offerings"
                ]
            })
        
        # Advanced Analytics Readiness
        advanced_data = analysis_results.get("advanced_analytics", {})
        if advanced_data:
            feature_importance = advanced_data.get("feature_importance", {})
            if feature_importance and "model_based_importance" in feature_importance:
                insights.append({
                    "category": "Analytics Readiness",
                    "priority": "Strategic",
                    "finding": "Data is Suitable for Advanced Predictive Modeling",
                    "business_impact": "Strong predictive capabilities can drive proactive decision-making",
                    "recommendation": "Invest in predictive analytics infrastructure and capabilities",
                    "action_items": [
                        "Build predictive model pipeline",
                        "Train team on model interpretation",
                        "Integrate predictions into business processes"
                    ]
                })
        
        # Anomaly Detection Insights
        anomaly_data = analysis_results.get("anomalies", {})
        if anomaly_data and "isolation_forest" in anomaly_data:
            anomaly_percentage = anomaly_data["isolation_forest"].get("anomaly_percentage", 0)
            if anomaly_percentage > 5:
                insights.append({
                    "category": "Risk Management",
                    "priority": "High",
                    "finding": f"Significant Anomalies Detected ({anomaly_percentage:.1f}%)",
                    "business_impact": "Anomalies may indicate fraud, errors, or exceptional cases requiring attention",
                    "recommendation": "Implement automated anomaly monitoring and investigation protocols",
                    "action_items": [
                        "Set up real-time anomaly alerts",
                        "Create investigation workflows",
                        "Establish escalation procedures"
                    ]
                })
        
        # Time Series Insights
        if "time_series" in analysis_results:
            ts_data = analysis_results["time_series"]
            trend_analysis = ts_data.get("trend_analysis", {})
            significant_trends = [col for col, data in trend_analysis.items() 
                                if data.get("is_trending", False)]
            
            if significant_trends:
                insights.append({
                    "category": "Temporal Patterns",
                    "priority": "Strategic",
                    "finding": f"Significant Trends Identified in {len(significant_trends)} Key Metrics",
                    "business_impact": "Clear trends enable forecasting and strategic planning",
                    "recommendation": "Develop trend-based forecasting and strategic planning capabilities",
                    "action_items": [
                        "Create automated trend monitoring",
                        "Build forecasting models",
                        "Integrate trends into strategic planning"
                    ]
                })
    
    except Exception as e:
        insights.append({
            "category": "Analysis Error",
            "priority": "Technical",
            "finding": f"Error in business insights generation: {str(e)}",
            "business_impact": "Unable to generate complete business insights",
            "recommendation": "Review data format and analysis parameters",
            "action_items": ["Check data quality", "Verify analysis configuration"]
        })
    
    return insights

@advanced_eda_router.get("/advanced-analyze/")
async def advanced_analyze_file(
    bucket_name: str = Query(description="GCS bucket name"),
    file_path: str = Query(description="Full path to the file in GCS"),
    target_column: Optional[str] = Query(None, description="Target column for supervised analysis"),
    date_column: Optional[str] = Query(None, description="Date column for time series analysis"),
    business_context: Optional[str] = Query(None, description="Business context for tailored insights")
):
    """
    Perform comprehensive advanced EDA suitable for consulting engagements
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
        
        # Basic dataset profiling
        dataset_profile = {
            "shape": [int(df.shape[0]), int(df.shape[1])],
            "columns": [str(col) for col in df.columns.tolist()],
            "dtypes": {str(col): str(dtype) for col, dtype in df.dtypes.items()},
            "memory_usage_mb": float(df.memory_usage(deep=True).sum() / 1024 / 1024),
            "business_context": business_context
        }
        
        # Data Quality Assessment
        missing_analysis = {}
        for col in df.columns:
            missing_count = int(df[col].isnull().sum())
            missing_analysis[str(col)] = {
                "count": missing_count,
                "percentage": float((missing_count / len(df)) * 100),
                "data_type": str(df[col].dtype)
            }
        
        data_quality = {
            "missing_values": missing_analysis,
            "completeness_score": float(((df.size - df.isnull().sum().sum()) / df.size) * 100),
            "duplicate_rows": int(df.duplicated().sum()),
            "duplicate_percentage": float((df.duplicated().sum() / len(df)) * 100)
        }
        
        # Advanced Statistical Analysis
        statistical_tests = advanced_statistical_tests(df)
        
        # Advanced Clustering
        clustering_analysis = advanced_clustering_analysis(df)
        
        # Dimensionality Analysis
        dimension_analysis = dimensionality_analysis(df)
        
        # Feature Importance Analysis
        feature_analysis = feature_importance_analysis(df, target_column)
        
        # Anomaly Detection
        anomaly_analysis = anomaly_detection(df)
        
        # Time Series Analysis
        time_series_results = time_series_analysis(df, date_column)
        
        # Compile comprehensive results
        comprehensive_results = {
            "dataset_profile": dataset_profile,
            "data_quality": data_quality,
            "statistical_tests": statistical_tests,
            "advanced_clustering": clustering_analysis,
            "dimensionality_analysis": dimension_analysis,
            "advanced_analytics": {
                "feature_importance": feature_analysis
            },
            "anomalies": anomaly_analysis,
            "time_series": time_series_results if "message" not in time_series_results else None
        }
        
        # Generate Business Insights
        business_insights = business_insights_generator(df, comprehensive_results)
        comprehensive_results["business_insights"] = business_insights
        
        # Model Readiness Assessment
        model_readiness = assess_model_readiness(df, target_column)
        comprehensive_results["model_readiness"] = model_readiness
        
        # Executive Summary
        executive_summary = generate_executive_summary(df, comprehensive_results, business_context)
        comprehensive_results["executive_summary"] = executive_summary
        
        # Convert all numpy types to Python types before returning
        comprehensive_results = convert_numpy_types(comprehensive_results)
        
        return comprehensive_results
        
    except pd.errors.EmptyDataError:
        raise HTTPException(status_code=400, detail="File is empty or invalid")
    except pd.errors.ParserError:
        raise HTTPException(status_code=400, detail="Unable to parse file. Check file format.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Advanced analysis failed: {str(e)}")

def assess_model_readiness(df: pd.DataFrame, target_col: str = None) -> Dict[str, Any]:
    """Assess data readiness for machine learning modeling"""
    
    readiness_score = 0
    max_score = 10
    assessment_details = {}
    recommendations = []
    
    try:
        # Data Volume Assessment (2 points)
        if len(df) >= 1000:
            readiness_score += 2
            assessment_details["data_volume"] = {"score": 2, "status": "Excellent", "records": len(df)}
        elif len(df) >= 100:
            readiness_score += 1
            assessment_details["data_volume"] = {"score": 1, "status": "Adequate", "records": len(df)}
            recommendations.append("Consider collecting more data for improved model performance")
        else:
            assessment_details["data_volume"] = {"score": 0, "status": "Insufficient", "records": len(df)}
            recommendations.append("Critical: Insufficient data volume for reliable modeling")
        
        # Feature Quality Assessment (2 points)
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        categorical_cols = df.select_dtypes(include=['object', 'category']).columns
        
        feature_quality_score = 0
        if len(numeric_cols) >= 3:
            feature_quality_score += 1
        if len(categorical_cols) >= 1:
            feature_quality_score += 0.5
        if len(df.columns) >= 5:
            feature_quality_score += 0.5
        
        readiness_score += min(2, feature_quality_score)
        assessment_details["feature_quality"] = {
            "score": min(2, feature_quality_score),
            "numeric_features": len(numeric_cols),
            "categorical_features": len(categorical_cols),
            "total_features": len(df.columns)
        }
        
        # Data Completeness Assessment (2 points)
        completeness = ((df.size - df.isnull().sum().sum()) / df.size) * 100
        if completeness >= 95:
            readiness_score += 2
            assessment_details["completeness"] = {"score": 2, "percentage": completeness, "status": "Excellent"}
        elif completeness >= 85:
            readiness_score += 1
            assessment_details["completeness"] = {"score": 1, "percentage": completeness, "status": "Good"}
            recommendations.append("Consider imputation strategies for missing data")
        else:
            assessment_details["completeness"] = {"score": 0, "percentage": completeness, "status": "Poor"}
            recommendations.append("Critical: Address high missing data rates before modeling")
        
        # Target Variable Assessment (2 points)
        if target_col and target_col in df.columns:
            target_series = df[target_col].dropna()
            target_score = 0
            
            # Check target completeness
            target_completeness = (len(target_series) / len(df)) * 100
            if target_completeness >= 95:
                target_score += 1
            elif target_completeness >= 80:
                target_score += 0.5
            
            # Check target distribution
            if df[target_col].dtype in ['object', 'category']:
                # Classification target
                value_counts = target_series.value_counts()
                min_class_ratio = value_counts.min() / value_counts.sum()
                if min_class_ratio >= 0.1:  # No class has less than 10%
                    target_score += 1
                elif min_class_ratio >= 0.05:
                    target_score += 0.5
                    recommendations.append("Consider addressing class imbalance")
                else:
                    recommendations.append("Critical: Severe class imbalance detected")
            else:
                # Regression target
                if target_series.nunique() / len(target_series) > 0.05:  # Good variability
                    target_score += 1
                else:
                    recommendations.append("Low target variable variability detected")
            
            readiness_score += target_score
            assessment_details["target_variable"] = {
                "score": target_score,
                "completeness": target_completeness,
                "unique_values": target_series.nunique(),
                "is_classification": df[target_col].dtype in ['object', 'category']
            }
        else:
            assessment_details["target_variable"] = {
                "score": 0,
                "message": "No target variable specified or found"
            }
            recommendations.append("Specify target variable for supervised learning assessment")
        
        # Feature Relationships Assessment (2 points)
        relationship_score = 0
        if len(numeric_cols) >= 2:
            # Check for some correlation but not too much
            corr_matrix = df[numeric_cols].corr()
            high_corr_count = 0
            moderate_corr_count = 0
            
            for i in range(len(corr_matrix.columns)):
                for j in range(i+1, len(corr_matrix.columns)):
                    corr_val = abs(corr_matrix.iloc[i, j])
                    if not pd.isna(corr_val):
                        if corr_val > 0.9:
                            high_corr_count += 1
                        elif corr_val > 0.3:
                            moderate_corr_count += 1
            
            if high_corr_count == 0 and moderate_corr_count > 0:
                relationship_score = 2  # Good relationships, no multicollinearity
            elif high_corr_count <= 2:
                relationship_score = 1  # Some multicollinearity
                recommendations.append("Consider feature selection due to high correlations")
            else:
                relationship_score = 0
                recommendations.append("Critical: High multicollinearity detected")
        
        readiness_score += relationship_score
        assessment_details["feature_relationships"] = {
            "score": relationship_score,
            "high_correlations": high_corr_count if 'high_corr_count' in locals() else 0,
            "moderate_correlations": moderate_corr_count if 'moderate_corr_count' in locals() else 0
        }
        
        # Overall Assessment
        readiness_percentage = (readiness_score / max_score) * 100
        
        if readiness_percentage >= 80:
            overall_status = "Ready for Advanced Modeling"
        elif readiness_percentage >= 60:
            overall_status = "Ready with Minor Improvements"
        elif readiness_percentage >= 40:
            overall_status = "Needs Significant Preparation"
        else:
            overall_status = "Not Ready for Modeling"
        
        return {
            "overall_score": float(readiness_score),
            "max_score": int(max_score),
            "readiness_percentage": float(readiness_percentage),
            "status": overall_status,
            "assessment_details": assessment_details,
            "recommendations": recommendations,
            "suggested_next_steps": generate_modeling_next_steps(readiness_percentage, recommendations)
        }
    
    except Exception as e:
        return {"error": f"Model readiness assessment failed: {str(e)}"}

def generate_modeling_next_steps(readiness_percentage: float, recommendations: List[str]) -> List[str]:
    """Generate specific next steps based on readiness assessment"""
    
    next_steps = []
    
    if readiness_percentage >= 80:
        next_steps.extend([
            "Proceed with baseline model development",
            "Implement cross-validation strategy",
            "Set up model performance monitoring",
            "Plan A/B testing for model deployment"
        ])
    elif readiness_percentage >= 60:
        next_steps.extend([
            "Address identified data quality issues",
            "Implement feature engineering pipeline",
            "Develop baseline models with current data",
            "Plan iterative data improvement"
        ])
    elif readiness_percentage >= 40:
        next_steps.extend([
            "Focus on data collection and quality improvement",
            "Implement comprehensive data cleaning pipeline",
            "Consider external data sources",
            "Develop data quality monitoring"
        ])
    else:
        next_steps.extend([
            "Prioritize data collection strategy",
            "Establish data governance framework",
            "Implement basic data quality controls",
            "Consider starting with descriptive analytics"
        ])
    
    return next_steps

def generate_executive_summary(df: pd.DataFrame, analysis_results: Dict, business_context: str = None) -> Dict[str, Any]:
    """Generate executive summary for business stakeholders"""
    
    try:
        # Key Statistics
        key_stats = {
            "total_records": int(len(df)),
            "total_features": int(len(df.columns)),
            "data_completeness": float(analysis_results["data_quality"]["completeness_score"]),
            "analysis_timestamp": datetime.now().isoformat()
        }
        
        # Critical Findings
        critical_findings = []
        
        # Data Quality Findings
        if key_stats["data_completeness"] < 85:
            critical_findings.append({
                "area": "Data Quality",
                "finding": f"Data completeness at {key_stats['data_completeness']:.1f}% requires attention",
                "impact": "High"
            })
        
        # Business Insights Summary
        business_insights = analysis_results.get("business_insights", [])
        critical_insights = [insight for insight in business_insights 
                           if insight.get("priority") in ["Critical", "Strategic"]]
        
        for insight in critical_insights[:3]:  # Top 3 critical insights
            critical_findings.append({
                "area": insight.get("category", "Unknown"),
                "finding": insight.get("finding", ""),
                "impact": insight.get("priority", "Medium")
            })
        
        # Opportunities
        opportunities = []
        
        # Model Readiness Opportunity
        model_readiness = analysis_results.get("model_readiness", {})
        readiness_percentage = model_readiness.get("readiness_percentage", 0)
        
        if readiness_percentage >= 70:
            opportunities.append({
                "area": "Predictive Analytics",
                "description": f"Data is {readiness_percentage:.0f}% ready for advanced modeling",
                "potential_value": "High - Enable predictive decision making"
            })
        
        # Clustering Opportunity
        clustering_results = analysis_results.get("advanced_clustering", {})
        if "algorithms" in clustering_results and "kmeans" in clustering_results["algorithms"]:
            opportunities.append({
                "area": "Market Segmentation",
                "description": "Natural data clusters identified for segmentation strategies",
                "potential_value": "Medium - Targeted marketing and personalization"
            })
        
        # Anomaly Detection Opportunity
        anomaly_results = analysis_results.get("anomalies", {})
        if "isolation_forest" in anomaly_results:
            anomaly_percentage = anomaly_results["isolation_forest"].get("anomaly_percentage", 0)
            if anomaly_percentage > 1:
                opportunities.append({
                    "area": "Risk Management",
                    "description": f"{anomaly_percentage:.1f}% anomalies detected - fraud/error detection opportunity",
                    "potential_value": "High - Risk mitigation and quality control"
                })
        
        # Strategic Recommendations
        strategic_recommendations = []
        
        if readiness_percentage >= 70:
            strategic_recommendations.append({
                "priority": "High",
                "recommendation": "Invest in predictive analytics capabilities",
                "rationale": "Data quality and structure support advanced modeling",
                "timeline": "3-6 months"
            })
        
        if len(opportunities) >= 2:
            strategic_recommendations.append({
                "priority": "Medium",
                "recommendation": "Develop integrated analytics platform",
                "rationale": "Multiple analytics opportunities identified",
                "timeline": "6-12 months"
            })
        
        # Add data quality recommendation if needed
        if key_stats["data_completeness"] < 90:
            strategic_recommendations.append({
                "priority": "High",
                "recommendation": "Implement data quality improvement program",
                "rationale": "Data quality issues limit analytical potential",
                "timeline": "1-3 months"
            })
        
        return {
            "key_statistics": key_stats,
            "critical_findings": critical_findings,
            "opportunities": opportunities,
            "strategic_recommendations": strategic_recommendations,
            "business_context": business_context,
            "overall_assessment": {
                "data_maturity": "Advanced" if readiness_percentage >= 80 else "Developing" if readiness_percentage >= 60 else "Basic",
                "analytics_readiness": model_readiness.get("status", "Unknown"),
                "recommended_next_phase": "Advanced Analytics" if readiness_percentage >= 70 else "Data Enhancement"
            }
        }
    
    except Exception as e:
        return {"error": f"Executive summary generation failed: {str(e)}"}

@advanced_eda_router.get("/model-readiness/")
async def assess_modeling_readiness(
    bucket_name: str = Query(description="GCS bucket name"),
    file_path: str = Query(description="Full path to the file in GCS"),
    target_column: str = Query(description="Target column for modeling assessment")
):
    """
    Dedicated endpoint for model readiness assessment
    """
    try:
        # Download and read file
        bucket = client.get_bucket(bucket_name)
        blob = bucket.blob(file_path)
        
        if not blob.exists():
            raise HTTPException(status_code=404, detail="File not found")
        
        file_content = blob.download_as_bytes()
        
        if file_path.lower().endswith('.csv'):
            df = pd.read_csv(io.BytesIO(file_content))
        elif file_path.lower().endswith(('.xlsx', '.xls')):
            df = pd.read_excel(io.BytesIO(file_content))
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format")
        
        # Perform model readiness assessment
        readiness_assessment = assess_model_readiness(df, target_column)
        
        # Add feature analysis specific to target
        feature_analysis = feature_importance_analysis(df, target_column)
        readiness_assessment["feature_analysis"] = feature_analysis
        
        return convert_numpy_types(readiness_assessment)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Model readiness assessment failed: {str(e)}")

@advanced_eda_router.get("/business-summary/")
async def generate_business_summary(
    bucket_name: str = Query(description="GCS bucket name"),
    file_path: str = Query(description="Full path to the file in GCS"),
    business_context: Optional[str] = Query(None, description="Business context for tailored summary")
):
    """
    Generate executive-level business summary
    """
    try:
        # Download and read file
        bucket = client.get_bucket(bucket_name)
        blob = bucket.blob(file_path)
        
        if not blob.exists():
            raise HTTPException(status_code=404, detail="File not found")
        
        file_content = blob.download_as_bytes()
        
        if file_path.lower().endswith('.csv'):
            df = pd.read_csv(io.BytesIO(file_content))
        elif file_path.lower().endswith(('.xlsx', '.xls')):
            df = pd.read_excel(io.BytesIO(file_content))
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format")
        
        # Quick analysis for summary
        basic_stats = {
            "shape": [int(df.shape[0]), int(df.shape[1])],
            "completeness": float(((df.size - df.isnull().sum().sum()) / df.size) * 100)
        }
        
        # Generate comprehensive summary
        summary = generate_executive_summary(df, {"data_quality": {"completeness_score": basic_stats["completeness"]}}, business_context)
        summary["dataset_overview"] = basic_stats
        
        return convert_numpy_types(summary)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Business summary generation failed: {str(e)}")