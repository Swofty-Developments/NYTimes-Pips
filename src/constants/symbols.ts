import { ConstraintSymbol } from '@/types';

/**
 * SVG markup for each constraint symbol.
 * These are rendered inside the diamond label, white on the region fill color.
 * To add a new symbol, add an entry here and update the ConstraintSymbol type.
 */
export const SYMBOL_SVGS: Record<ConstraintSymbol, string> = {
  equal: `<svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M25.9364 8.02663V13.2746H4.07788V8.02663H25.9364ZM25.9364 18.0893V23.3372H4.07788V18.0893H25.9364Z" fill="white"/>
</svg>`,

  notEqual: `<svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
<path fill-rule="evenodd" clip-rule="evenodd" d="M15.2527 23.3373H25.9293V18.0893H17.7733L15.2527 23.3373ZM20.0857 13.2746H25.9293V8.02667H22.6063L20.0857 13.2746ZM13.7314 8.02667L11.2109 13.2746H4.07074V8.02667H13.7314ZM8.8984 18.0893L6.37783 23.3373H4.07074V18.0893H8.8984Z" fill="white"/>
<path d="M21.4135 1.27118L8.22578 28.7288" stroke="white" stroke-width="3.5"/>
</svg>`,
};

/** Encode a symbol SVG for use as a CSS background-image */
export function symbolToBackground(symbol: ConstraintSymbol): string {
  return `url("data:image/svg+xml,${encodeURIComponent(SYMBOL_SVGS[symbol])}")`;
}
