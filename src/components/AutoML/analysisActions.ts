// analysisActions.ts - Analysis capabilities definitions

import { 
    Eye, 
    BarChart3, 
    TrendingUp, 
    Target, 
    Brain, 
    Zap, 
    Users, 
    PieChart,
    Activity,
    GitBranch,
    Layers,
    Shuffle,
    TrendingDown,
    Calculator,
    Search,
    Filter,
    AlertTriangle,
    CheckCircle,
    Clock,
    Database,
    Settings,
    Cpu,
    Network,
    BarChart2,
    LineChart,
  } from 'lucide-react';
  
  export interface AnalysisAction {
    id: string;
    label: string;
    icon: any;
    description: string;
    requiresTarget: boolean;
    fileTypes: string[];
    category: 'eda' | 'ml' | 'advanced';
    estimatedTime?: string;
    computeIntensity: 'low' | 'medium' | 'high';
    outputs: string[];
    prerequisites?: string[];
  }
  
  // ==============================
  // EXPLORATORY DATA ANALYSIS (EDA)
  // ==============================
  
  export const edaActions: AnalysisAction[] = [
    {
      id: 'data_profiling',
      label: 'Data Profiling',
      icon: Eye,
      description: 'Comprehensive data quality and structure analysis with automated insights',
      requiresTarget: false,
      fileTypes: ['csv', 'xlsx', 'json'],
      category: 'eda',
      estimatedTime: '2-5 minutes',
      computeIntensity: 'medium',
      outputs: ['Data quality report', 'Column statistics', 'Missing value analysis', 'Data type recommendations'],
      prerequisites: []
    },
    {
      id: 'statistical_summary',
      label: 'Statistical Analysis',
      icon: BarChart3,
      description: 'Descriptive statistics, distributions, and summary metrics for all variables',
      requiresTarget: false,
      fileTypes: ['csv', 'xlsx'],
      category: 'eda',
      estimatedTime: '1-3 minutes',
      computeIntensity: 'low',
      outputs: ['Summary statistics', 'Distribution plots', 'Quartile analysis', 'Skewness & kurtosis'],
    },
    {
      id: 'correlation_analysis',
      label: 'Correlation Matrix',
      icon: TrendingUp,
      description: 'Feature correlations, multicollinearity detection, and relationship mapping',
      requiresTarget: false,
      fileTypes: ['csv', 'xlsx'],
      category: 'eda',
      estimatedTime: '2-4 minutes',
      computeIntensity: 'medium',
      outputs: ['Correlation heatmap', 'High correlation pairs', 'Multicollinearity warnings', 'Feature dependencies'],
    },
    {
      id: 'outlier_detection',
      label: 'Outlier Detection',
      icon: Target,
      description: 'Identify anomalies using statistical and ML-based methods',
      requiresTarget: false,
      fileTypes: ['csv', 'xlsx'],
      category: 'eda',
      estimatedTime: '3-6 minutes',
      computeIntensity: 'medium',
      outputs: ['Outlier identification', 'Anomaly scores', 'Visualization plots', 'Cleanup recommendations'],
    },
    {
      id: 'distribution_analysis',
      label: 'Distribution Analysis',
      icon: BarChart2,
      description: 'Analyze data distributions, normality tests, and transformation suggestions',
      requiresTarget: false,
      fileTypes: ['csv', 'xlsx'],
      category: 'eda',
      estimatedTime: '2-4 minutes',
      computeIntensity: 'medium',
      outputs: ['Distribution plots', 'Normality tests', 'Transformation suggestions', 'Skewness analysis'],
    },
    {
      id: 'temporal_analysis',
      label: 'Time Series Analysis',
      icon: Clock,
      description: 'Analyze temporal patterns, seasonality, and trends in time-based data',
      requiresTarget: false,
      fileTypes: ['csv', 'xlsx'],
      category: 'eda',
      estimatedTime: '4-8 minutes',
      computeIntensity: 'high',
      outputs: ['Trend analysis', 'Seasonality detection', 'Time series plots', 'Forecast readiness'],
      prerequisites: ['Datetime column required']
    }
  ];
  
  // ==============================
  // MACHINE LEARNING (ML)
  // ==============================
  
  export const mlActions: AnalysisAction[] = [
    {
      id: 'automl_classification',
      label: 'AutoML Classification',
      icon: Brain,
      description: 'Automated classification model training with feature engineering and hyperparameter tuning',
      requiresTarget: true,
      fileTypes: ['csv', 'xlsx'],
      category: 'ml',
      estimatedTime: '15-45 minutes',
      computeIntensity: 'high',
      outputs: ['Trained model', 'Accuracy metrics', 'Feature importance', 'Confusion matrix', 'Model explainability'],
    },
    {
      id: 'automl_regression',
      label: 'AutoML Regression',
      icon: TrendingUp,
      description: 'Automated regression model training for continuous target prediction',
      requiresTarget: true,
      fileTypes: ['csv', 'xlsx'],
      category: 'ml',
      estimatedTime: '15-45 minutes',
      computeIntensity: 'high',
      outputs: ['Trained model', 'RMSE/MAE metrics', 'Feature importance', 'Residual analysis', 'Prediction intervals'],
    },
    {
      id: 'automl_forecasting',
      label: 'Time Series Forecasting',
      icon: Activity,
      description: 'Automated time series forecasting with seasonal decomposition',
      requiresTarget: true,
      fileTypes: ['csv', 'xlsx'],
      category: 'ml',
      estimatedTime: '20-60 minutes',
      computeIntensity: 'high',
      outputs: ['Forecast model', 'Future predictions', 'Confidence intervals', 'Seasonal components'],
      prerequisites: ['Datetime column required', 'Sufficient historical data']
    },
    {
      id: 'quick_ml_experiment',
      label: 'Quick ML Experiment',
      icon: Zap,
      description: 'Fast model prototyping with 1-hour budget for rapid insights',
      requiresTarget: true,
      fileTypes: ['csv', 'xlsx'],
      category: 'ml',
      estimatedTime: '10-15 minutes',
      computeIntensity: 'medium',
      outputs: ['Model performance estimate', 'Feature importance preview', 'ML feasibility score'],
    },
    {
      id: 'model_comparison',
      label: 'Model Comparison',
      icon: GitBranch,
      description: 'Compare multiple ML algorithms and select the best performing model',
      requiresTarget: true,
      fileTypes: ['csv', 'xlsx'],
      category: 'ml',
      estimatedTime: '30-60 minutes',
      computeIntensity: 'high',
      outputs: ['Model comparison table', 'Performance metrics', 'Algorithm recommendations', 'Cross-validation results'],
    }
  ];
  
  // ==============================
  // ADVANCED ANALYTICS (AA)
  // ==============================
  
  export const advancedActions: AnalysisAction[] = [
    {
      id: 'feature_importance',
      label: 'Feature Importance',
      icon: Zap,
      description: 'ML-driven feature ranking using multiple importance calculation methods',
      requiresTarget: true,
      fileTypes: ['csv', 'xlsx'],
      category: 'advanced',
      estimatedTime: '8-15 minutes',
      computeIntensity: 'high',
      outputs: ['Feature ranking', 'Importance scores', 'SHAP values', 'Permutation importance'],
    },
    {
      id: 'clustering_analysis',
      label: 'Clustering Analysis',
      icon: Users,
      description: 'Discover natural data groupings using advanced clustering algorithms',
      requiresTarget: false,
      fileTypes: ['csv', 'xlsx'],
      category: 'advanced',
      estimatedTime: '10-20 minutes',
      computeIntensity: 'high',
      outputs: ['Cluster assignments', 'Cluster profiles', 'Optimal cluster count', 'Silhouette analysis'],
    },
    {
      id: 'dimensionality_reduction',
      label: 'Dimensionality Reduction',
      icon: Layers,
      description: 'Reduce feature space using PCA, t-SNE, and UMAP for visualization and analysis',
      requiresTarget: false,
      fileTypes: ['csv', 'xlsx'],
      category: 'advanced',
      estimatedTime: '5-12 minutes',
      computeIntensity: 'medium',
      outputs: ['Reduced dimensions', '2D/3D visualizations', 'Explained variance', 'Component analysis'],
    },
    {
      id: 'association_rules',
      label: 'Association Rules',
      icon: Network,
      description: 'Discover frequent patterns and associations in categorical data',
      requiresTarget: false,
      fileTypes: ['csv', 'xlsx'],
      category: 'advanced',
      estimatedTime: '5-10 minutes',
      computeIntensity: 'medium',
      outputs: ['Association rules', 'Support/confidence metrics', 'Pattern visualization', 'Market basket analysis'],
      prerequisites: ['Categorical data required']
    },
    {
      id: 'anomaly_detection',
      label: 'Advanced Anomaly Detection',
      icon: AlertTriangle,
      description: 'ML-based anomaly detection using isolation forest and autoencoders',
      requiresTarget: false,
      fileTypes: ['csv', 'xlsx'],
      category: 'advanced',
      estimatedTime: '8-15 minutes',
      computeIntensity: 'high',
      outputs: ['Anomaly scores', 'Outlier classification', 'Anomaly explanations', 'Threshold recommendations'],
    },
    {
      id: 'causal_inference',
      label: 'Causal Analysis',
      icon: GitBranch,
      description: 'Analyze causal relationships and estimate treatment effects',
      requiresTarget: true,
      fileTypes: ['csv', 'xlsx'],
      category: 'advanced',
      estimatedTime: '15-30 minutes',
      computeIntensity: 'high',
      outputs: ['Causal graph', 'Treatment effects', 'Confounding analysis', 'Causal recommendations'],
      prerequisites: ['Treatment/intervention variable required']
    },
    {
      id: 'feature_engineering',
      label: 'Automated Feature Engineering',
      icon: Settings,
      description: 'Generate new features using automated feature engineering techniques',
      requiresTarget: false,
      fileTypes: ['csv', 'xlsx'],
      category: 'advanced',
      estimatedTime: '10-25 minutes',
      computeIntensity: 'high',
      outputs: ['New features', 'Feature transformations', 'Interaction features', 'Polynomial features'],
    },
    {
      id: 'data_drift_analysis',
      label: 'Data Drift Analysis',
      icon: TrendingDown,
      description: 'Detect data distribution changes over time periods',
      requiresTarget: false,
      fileTypes: ['csv', 'xlsx'],
      category: 'advanced',
      estimatedTime: '6-12 minutes',
      computeIntensity: 'medium',
      outputs: ['Drift detection', 'Distribution changes', 'Stability metrics', 'Monitoring recommendations'],
      prerequisites: ['Temporal data required']
    },
    {
      id: 'survival_analysis',
      label: 'Survival Analysis',
      icon: Clock,
      description: 'Analyze time-to-event data and survival probabilities',
      requiresTarget: true,
      fileTypes: ['csv', 'xlsx'],
      category: 'advanced',
      estimatedTime: '12-20 minutes',
      computeIntensity: 'high',
      outputs: ['Survival curves', 'Hazard ratios', 'Risk scores', 'Time-to-event predictions'],
      prerequisites: ['Duration and event columns required']
    }
  ];
  
  // ==============================
  // COMBINED ACTIONS EXPORT
  // ==============================
  
  export const allAnalysisActions: AnalysisAction[] = [
    ...edaActions,
    ...mlActions,
    ...advancedActions
  ];
  
  // Helper functions for working with analysis actions
  export const getActionsByCategory = (category: 'eda' | 'ml' | 'advanced'): AnalysisAction[] => {
    return allAnalysisActions.filter(action => action.category === category);
  };
  
  export const getActionById = (id: string): AnalysisAction | undefined => {
    return allAnalysisActions.find(action => action.id === id);
  };
  
  export const getCompatibleActions = (fileType: string): AnalysisAction[] => {
    const extension = fileType.toLowerCase();
    return allAnalysisActions.filter(action => 
      action.fileTypes.includes(extension)
    );
  };
  
  export const getActionsByIntensity = (intensity: 'low' | 'medium' | 'high'): AnalysisAction[] => {
    return allAnalysisActions.filter(action => action.computeIntensity === intensity);
  };
  
  export const getQuickActions = (): AnalysisAction[] => {
    return allAnalysisActions.filter(action => 
      action.computeIntensity === 'low' || action.computeIntensity === 'medium'
    );
  };
  
  // Analysis action categories for UI grouping
  export const analysisCategories = {
    eda: {
      label: 'Exploratory Data Analysis',
      description: 'Understand your data structure, quality, and patterns',
      color: 'blue',
      actions: edaActions
    },
    ml: {
      label: 'Machine Learning',
      description: 'Automated model training and predictive analytics',
      color: 'green',
      actions: mlActions
    },
    advanced: {
      label: 'Advanced Analytics',
      description: 'Specialized analysis techniques and deep insights',
      color: 'purple',
      actions: advancedActions
    }
  } as const;