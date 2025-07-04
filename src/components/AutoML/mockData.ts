// mockData.ts - Sample data for development and testing

export interface CloudFile {
  name: string;
  path: string;
  type: 'file' | 'folder';
  size: number;
  modified: string;
  contentType: string;
  metadata?: {
    rows?: number;
    columns?: number;
    records?: number;
    sheets?: number;
    headers?: string[];
    sampleData?: string[][];
  };
}

export interface CloudBucket {
  name: string;
  region: string;
  storageClass: string;
  created: string;
  size: number;
}

export const mockBuckets: CloudBucket[] = [
  { 
    name: 'autoeda-datasets', 
    region: 'us-central1', 
    storageClass: 'STANDARD', 
    created: '2024-01-15', 
    size: 2500000000 
  },
  { 
    name: 'client-data-archive', 
    region: 'us-east1', 
    storageClass: 'COLDLINE', 
    created: '2024-02-01', 
    size: 850000000 
  },
  { 
    name: 'ml-training-data', 
    region: 'europe-west1', 
    storageClass: 'NEARLINE', 
    created: '2024-01-20', 
    size: 1200000000 
  },
];

export const mockFiles: CloudFile[] = [
  {
    name: 'customer_analytics.csv',
    path: 'datasets/customer_analytics.csv',
    type: 'file',
    size: 2540000,
    modified: '2024-07-03T10:30:00Z',
    contentType: 'text/csv',
    metadata: {
      rows: 15420,
      columns: 12,
      headers: [
        'customer_id', 
        'age', 
        'income', 
        'region', 
        'product_category', 
        'purchase_amount', 
        'churn_risk', 
        'satisfaction_score', 
        'tenure_months', 
        'support_tickets', 
        'last_purchase_date', 
        'status'
      ],
      sampleData: [
        ['1', '34', '75000', 'North', 'Electronics', '1250.50', '0.23', '8.5', '18', '2', '2024-06-15', 'active'],
        ['2', '28', '62000', 'South', 'Clothing', '890.25', '0.45', '7.2', '12', '5', '2024-06-20', 'active'],
        ['3', '42', '95000', 'West', 'Electronics', '2150.75', '0.12', '9.1', '24', '1', '2024-06-25', 'active'],
        ['4', '29', '58000', 'East', 'Home & Garden', '675.00', '0.67', '6.8', '8', '3', '2024-06-10', 'churned'],
        ['5', '55', '120000', 'North', 'Electronics', '3200.25', '0.05', '9.5', '36', '0', '2024-06-28', 'active']
      ]
    }
  },
  {
    name: 'sales_performance.xlsx',
    path: 'reports/sales_performance.xlsx',
    type: 'file',
    size: 890000,
    modified: '2024-07-01T09:15:00Z',
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    metadata: {
      sheets: 3,
      rows: 8950,
      columns: 15,
      headers: [
        'date', 
        'sales_rep', 
        'region', 
        'product', 
        'quantity', 
        'revenue', 
        'margin', 
        'customer_segment', 
        'deal_size', 
        'win_rate', 
        'pipeline_value', 
        'forecast_accuracy', 
        'quota_attainment', 
        'commission', 
        'territory'
      ],
      sampleData: [
        ['2024-06-01', 'John Smith', 'West', 'Software License', '5', '25000', '18000', 'Enterprise', 'Large', '0.75', '150000', '0.92', '1.15', '3750', 'CA-North'],
        ['2024-06-02', 'Sarah Johnson', 'East', 'Consulting', '1', '15000', '12000', 'Mid-Market', 'Medium', '0.68', '95000', '0.88', '0.95', '2250', 'NY-Metro'],
        ['2024-06-03', 'Mike Chen', 'North', 'Hardware', '10', '8500', '3400', 'SMB', 'Small', '0.82', '45000', '0.95', '1.05', '1275', 'WA-Seattle']
      ]
    }
  },
  {
    name: 'user_behavior.json',
    path: 'analytics/user_behavior.json',
    type: 'file',
    size: 1230000,
    modified: '2024-06-30T14:22:00Z',
    contentType: 'application/json',
    metadata: {
      records: 25600,
      headers: [
        'user_id', 
        'session_duration', 
        'page_views', 
        'conversion_rate', 
        'bounce_rate', 
        'device_type', 
        'traffic_source', 
        'geography', 
        'timestamp'
      ],
      sampleData: [
        ['user_12345', '285', '12', '0.08', '0.45', 'desktop', 'organic', 'US-CA', '2024-06-30T14:22:15Z'],
        ['user_67890', '142', '6', '0.12', '0.38', 'mobile', 'paid', 'US-NY', '2024-06-30T14:25:33Z'],
        ['user_11111', '456', '18', '0.15', '0.22', 'tablet', 'social', 'UK-London', '2024-06-30T14:28:45Z']
      ]
    }
  },
  {
    name: 'financial_data.csv',
    path: 'finance/financial_data.csv',
    type: 'file',
    size: 1890000,
    modified: '2024-06-28T16:45:00Z',
    contentType: 'text/csv',
    metadata: {
      rows: 32150,
      columns: 18,
      headers: [
        'transaction_id', 
        'account_id', 
        'transaction_type', 
        'amount', 
        'currency', 
        'merchant_category', 
        'risk_score', 
        'fraud_flag', 
        'approval_status', 
        'processing_time', 
        'fees', 
        'exchange_rate', 
        'country_code', 
        'timestamp', 
        'user_age', 
        'account_balance', 
        'credit_limit', 
        'payment_method'
      ],
      sampleData: [
        ['txn_001', 'acc_12345', 'purchase', '156.78', 'USD', 'grocery', '0.12', 'false', 'approved', '2.3', '0.00', '1.0', 'US', '2024-06-28T09:15:22Z', '34', '2500.45', '5000', 'credit_card'],
        ['txn_002', 'acc_67890', 'transfer', '1200.00', 'USD', 'p2p', '0.25', 'false', 'approved', '1.8', '2.50', '1.0', 'US', '2024-06-28T09:18:45Z', '29', '8750.22', '10000', 'bank_transfer']
      ]
    }
  },
  {
    name: 'processed_data/',
    path: 'processed_data/',
    type: 'folder',
    size: 0,
    modified: '2024-06-28T11:00:00Z',
    contentType: '',
    metadata: { records: 45 }
  },
  {
    name: 'models/',
    path: 'models/',
    type: 'folder',
    size: 0,
    modified: '2024-06-25T15:30:00Z',
    contentType: '',
    metadata: { records: 12 }
  }
];

// Sample analysis results for different file types
export const mockAnalysisResults = {
  'customer_analytics.csv': {
    suggestedTargets: ['churn_risk', 'status', 'satisfaction_score'],
    dataQuality: {
      completeness: 94.5,
      nullPercentage: 5.5,
      duplicates: 12
    },
    columnTypes: {
      'customer_id': 'text' as const,
      'age': 'numeric' as const,
      'income': 'numeric' as const,
      'region': 'categorical' as const,
      'product_category': 'categorical' as const,
      'purchase_amount': 'numeric' as const,
      'churn_risk': 'numeric' as const,
      'satisfaction_score': 'numeric' as const,
      'tenure_months': 'numeric' as const,
      'support_tickets': 'numeric' as const,
      'last_purchase_date': 'datetime' as const,
      'status': 'categorical' as const
    },
    insights: [
      'Dataset contains 15,420 rows and 12 columns',
      '3 potential target variables identified',
      '7 numeric columns available for ML analysis',
      'High data quality detected - suitable for AutoML training',
      'No significant data drift detected across time periods'
    ]
  },
  'sales_performance.xlsx': {
    suggestedTargets: ['win_rate', 'quota_attainment', 'forecast_accuracy'],
    dataQuality: {
      completeness: 97.2,
      nullPercentage: 2.8,
      duplicates: 5
    },
    columnTypes: {
      'date': 'datetime' as const,
      'sales_rep': 'categorical' as const,
      'region': 'categorical' as const,
      'product': 'categorical' as const,
      'quantity': 'numeric' as const,
      'revenue': 'numeric' as const,
      'margin': 'numeric' as const,
      'customer_segment': 'categorical' as const,
      'deal_size': 'categorical' as const,
      'win_rate': 'numeric' as const,
      'pipeline_value': 'numeric' as const,
      'forecast_accuracy': 'numeric' as const,
      'quota_attainment': 'numeric' as const,
      'commission': 'numeric' as const,
      'territory': 'categorical' as const
    },
    insights: [
      'Multi-sheet Excel file with 8,950 total rows',
      'Excellent data quality with 97.2% completeness',
      'Time series data ideal for forecasting models',
      'Strong predictive signals for sales performance'
    ]
  },
  'financial_data.csv': {
    suggestedTargets: ['fraud_flag', 'approval_status', 'risk_score'],
    dataQuality: {
      completeness: 99.1,
      nullPercentage: 0.9,
      duplicates: 3
    },
    columnTypes: {
      'transaction_id': 'text' as const,
      'account_id': 'text' as const,
      'transaction_type': 'categorical' as const,
      'amount': 'numeric' as const,
      'currency': 'categorical' as const,
      'merchant_category': 'categorical' as const,
      'risk_score': 'numeric' as const,
      'fraud_flag': 'categorical' as const,
      'approval_status': 'categorical' as const,
      'processing_time': 'numeric' as const,
      'fees': 'numeric' as const,
      'exchange_rate': 'numeric' as const,
      'country_code': 'categorical' as const,
      'timestamp': 'datetime' as const,
      'user_age': 'numeric' as const,
      'account_balance': 'numeric' as const,
      'credit_limit': 'numeric' as const,
      'payment_method': 'categorical' as const
    },
    insights: [
      'Large financial dataset with 32,150 transactions',
      'Excellent data quality suitable for fraud detection',
      'Balanced mix of categorical and numeric features',
      'Real-time transaction data with timestamp precision'
    ]
  }
};