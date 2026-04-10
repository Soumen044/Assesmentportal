'use client';

import katex from 'katex';

function renderFormula(expression, displayMode) {
  try {
    return katex.renderToString(expression, {
      throwOnError: false,
      displayMode
    });
  } catch (error) {
    return expression;
  }
}

function tokenizeMath(text) {
  return String(text || '').split(/(\$\$[\s\S]+?\$\$|\$[^$]+\$)/g).filter(Boolean);
}

export default function MathText({ text, className = '' }) {
  const tokens = tokenizeMath(text);

  if (!tokens.length) {
    return <span className={className}>{text}</span>;
  }

  return (
    <span className={className}>
      {tokens.map((token, index) => {
        if (token.startsWith('$$') && token.endsWith('$$')) {
          const expression = token.slice(2, -2);
          return (
            <span
              key={`${token}-${index}`}
              className="my-2 block overflow-x-auto rounded-2xl bg-slate-50 px-3 py-2"
              dangerouslySetInnerHTML={{ __html: renderFormula(expression, true) }}
            />
          );
        }

        if (token.startsWith('$') && token.endsWith('$')) {
          const expression = token.slice(1, -1);
          return (
            <span
              key={`${token}-${index}`}
              className="inline-block align-middle"
              dangerouslySetInnerHTML={{ __html: renderFormula(expression, false) }}
            />
          );
        }

        return <span key={`${token}-${index}`}>{token}</span>;
      })}
    </span>
  );
}
