export interface Note {
  id: string;
  title: string;
  content: string;
  updatedAt: number;
  category?: string;
  isPinned?: boolean;
  color?: string;
  accentColor?: string;
}

export type Category = 'All' | 'Personal' | 'Work' | 'Ideas' | 'Tasks';
