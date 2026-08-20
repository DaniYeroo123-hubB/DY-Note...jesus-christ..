import React from 'react';

/**
 * Utility to strip HTML tags and zero-width spaces from string for length checks & search
 */
export function stripHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim();
}

/**
 * Safe HTML renderer for rich formatted note preview cards and lines
 */
export function RichTextRenderer({ 
  html, 
  className = '', 
  defaultColor = '#0f172a',
  style = {} 
}: { 
  html: string; 
  className?: string; 
  defaultColor?: string;
  style?: React.CSSProperties;
}) {
  if (!html) return null;

  // Check if string contains HTML tags
  const hasHtml = /<[a-z][\s\S]*>/i.test(html);

  if (!hasHtml) {
    return (
      <span className={className} style={{ color: defaultColor, ...style }}>
        {html}
      </span>
    );
  }

  // Render HTML directly preserving individual nested spans and word colors
  return (
    <span 
      className={`rich-rendered-content ${className}`}
      style={{ color: defaultColor, ...style }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
