export interface Bucket {
    name: string;
    region: string;
  }
  
  export interface File {
    name: string;
    path: string;  // Add this line
    type: 'file' | 'folder';
    size: number;
    modified: string;
    contentType: string;
    metadata?: {
      rows?: number;
      columns?: number;
      records?: number;
    };
  }
  
  export interface FileBrowserProps {
    buckets: Bucket[];
    files: File[];
    currentBucket: Bucket | null;
    selectedFile: File | null;
    searchTerm: string;
    loading: boolean;
    onBucketChange: (bucket: Bucket) => void;
    onFileSelect: (file: File) => void;
    onSearchChange: (searchTerm: string) => void;
    onRefresh: () => void;
  }
