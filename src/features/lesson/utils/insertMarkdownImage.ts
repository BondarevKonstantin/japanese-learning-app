type InsertMarkdownImageParams = {
  currentValue: string;
  imageUrl: string;
  alt?: string;
};

export const insertMarkdownImage = ({
  currentValue,
  imageUrl,
  alt = 'image',
}: InsertMarkdownImageParams) => {
  const imageMarkdown = `\n![${alt}](${imageUrl})\n`;

  if (!currentValue.trim()) {
    return imageMarkdown.trim();
  }

  return `${currentValue}${imageMarkdown}`;
};
