import {useMemo} from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface MathFormulaProps {
    math: string;
    /** Render as a centered display equation instead of inline with the text. */
    block?: boolean;
}

/**
 * Renders a LaTeX expression with KaTeX. Invalid expressions are shown in red instead of throwing.
 */
export const MathFormula = ({math, block = false}: MathFormulaProps) => {
    const html = useMemo(() => katex.renderToString(math, {displayMode: block, throwOnError: false}), [math, block]);

    return block ? <div dangerouslySetInnerHTML={{__html: html}} /> : <span dangerouslySetInnerHTML={{__html: html}} />;
};
