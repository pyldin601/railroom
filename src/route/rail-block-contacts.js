/** Index physical rail boundaries once; materialize only contacts in the queried window. */
export class RailBlockContacts {
  constructor(data) {
    if (!data.id || !data.sections?.length) throw new Error('Invalid rail-block route');
    this.id = data.id;
    const boundaries = [], welded = [];
    let position = 0;
    for (const section of data.sections) {
      if (section.position !== position || !Number.isFinite(section.length) || section.length <= 0 ||
          !Array.isArray(section.railLengths) || !section.railLengths.length)
        throw new Error('Invalid rail-block section');
      const end = position + section.length;
      const indices = section.weldedJoins ?? [];
      if (!Array.isArray(indices) || new Set(indices).size !== indices.length || indices.some(i =>
        !Number.isInteger(i) || i <= 0 || i >= section.railLengths.length ||
        section.railLengths[i-1] < 800 || section.railLengths[i] < 800))
        throw new Error('Invalid welded long-string join');
      const joins = new Set(indices);
      for (const [i, length] of section.railLengths.entries()) {
        if (!Number.isFinite(length) || length <= 0 || position + length > end)
          throw new Error('Invalid rail length');
        if (position > 0) { boundaries.push(position); welded.push(joins.has(i) ? 1 : 0); }
        position += length;
      }
      if (position !== end) throw new Error('Incomplete rail-block section');
    }
    if (position !== data.length) throw new Error('Incomplete rail-block route');
    this.boundaries = Float64Array.from(boundaries);
    this.welded = Uint8Array.from(welded);
    this.count = boundaries.length * 2;
  }
  upperBound(position) {
    let lo = 0, hi = this.boundaries.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (this.boundaries[mid] <= position) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }
  between(start, end) {
    const contacts = [];
    for (let i = this.upperBound(start + 1e-8);
      i < this.boundaries.length && this.boundaries[i] <= end + 1e-8; i++) {
      const position = this.boundaries[i];
      for (const side of ['left', 'right'])
        contacts.push({ id: `${this.id}/contact/${position}/${side}`, position, side, type: this.welded[i] ? 'welded_joint' : 'joint' });
    }
    return contacts;
  }
}
