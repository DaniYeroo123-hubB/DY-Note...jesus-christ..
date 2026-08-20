import { Note } from './types';

export const INITIAL_NOTES: Note[] = [
  {
    id: 'note-sample-1',
    title: 'Welcome to DY Note',
    content: 'Capture your thoughts, ideas, and important moments in one simple and organized place.',
    isPinned: true,
    color: '#000000',
    updatedAt: Date.now() - 3600000,
  },
  {
    id: 'note-sample-2',
    title: 'Never Lose an Idea',
    content: 'Capture your thoughts, save your best ideas, and keep everything important organized and ready whenever you need it.',
    isPinned: false,
    color: '#000000',
    updatedAt: Date.now() - 7200000,
  },
];
