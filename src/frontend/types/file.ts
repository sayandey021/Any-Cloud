export interface CloudFile {
  id: string;
  account_id: string;
  remote_path: string;
  parent_path: string;
  name: string;
  is_dir: boolean;
  size: number;
  mime_type: string | null;
  mod_time: string | null;
  hash: string | null;
  is_favorite: boolean;
  is_trash: boolean;
  last_accessed_at: string | null;
  cached_at: string;
}

export type ViewMode = 'grid' | 'list';

export type SortField = 'name' | 'size' | 'mod_time' | 'type';
export type SortDirection = 'asc' | 'desc';

export type FileTypeFilter = 'all' | 'documents' | 'images' | 'media' | 'archives' | 'folders';

export interface FileFilter {
  type: FileTypeFilter;
  searchQuery: string;
}
