import ReactMarkdown from 'react-markdown';

type Props = {
  content: string;
};

export const MarkdownRenderer = ({ content }: Props) => {
  return (
    <div className="text-text-primary leading-7">
      <ReactMarkdown
        components={{
          h1: ({ children }) => (
            <h1 className="mb-4 text-3xl font-bold leading-tight">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="mb-3 mt-8 text-2xl font-semibold leading-tight">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="mb-3 mt-6 text-xl font-semibold leading-tight">{children}</h3>
          ),
          h4: ({ children }) => (
            <h4 className="mb-2 mt-5 text-lg font-semibold leading-tight">{children}</h4>
          ),
          p: ({ children }) => (
            <p className="mb-4 text-base leading-7 text-text-primary">{children}</p>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-text-primary">{children}</strong>
          ),
          em: ({ children }) => <em className="italic text-text-primary">{children}</em>,
          ul: ({ children }) => <ul className="mb-4 list-disc pl-6 space-y-2">{children}</ul>,
          ol: ({ children }) => <ol className="mb-4 list-decimal pl-6 space-y-2">{children}</ol>,
          li: ({ children }) => <li>{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="mb-4 border-l-4 border-primary pl-4 italic text-text-secondary">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-6 border-border" />,
          a: ({ href, children }) => (
            <a
              href={href}
              className="text-accent underline underline-offset-2"
              target="_blank"
              rel="noreferrer"
            >
              {children}
            </a>
          ),
          code: ({ children }) => (
            <code className="rounded bg-surface px-1.5 py-0.5 text-sm">{children}</code>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
