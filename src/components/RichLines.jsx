import { Fragment } from 'react';
const entities = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", nbsp: ' ' };
export default function RichLines({ text = '' }) {
  return <span className="rich-lines">{String(text).split(/<br\s*\/?\s*>|\n/gi).map((line, index) => <Fragment key={index}>{index > 0 && <br />}{line.replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (_, entity) => entities[entity])}</Fragment>)}</span>;
}
