/** Periodic rail contacts, indexed by section without allocating the full route. */
export class CompactContacts {
  constructor(data) {
    if (!data.id || !data.sections?.length) throw new Error('Invalid compact route');
    this.id = data.id;
    let end = 0;
    this.count = 0;
    this.sections = data.sections.map((section, i) => {
      if (section.position !== end || !Number.isFinite(section.length) || section.length <= 0 ||
          !['jointed', 'welded'].includes(section.construction))
        throw new Error('Invalid compact sections');
      const pattern = section.railPattern ?? [25, 25, 25, 25, 25, 25, 25, 12.5];
      if (section.construction === 'jointed' &&
          (!Array.isArray(pattern) || !pattern.length || pattern.some(size => ![12.5, 25].includes(size))))
        throw new Error('Invalid rail pattern');
      end += section.length;
      const patternOffsets = [0];
      if (section.construction === 'jointed')
        for (const size of pattern) patternOffsets.push(patternOffsets.at(-1) + size);
      const item = { ...section, end, patternOffsets };
      item.count = this.upperBound(item, section.length - 1e-8);
      item.boundaryType = section.construction === 'jointed' ||
        data.sections[i - 1]?.construction === 'jointed' ? 'joint' : 'weld';
      this.count += 2 * (item.count + (i > 0 ? 1 : 0));
      return item;
    });
    if (end !== data.length) throw new Error('Incomplete compact route');
  }
  offset(section, n) {
    return section.construction === 'jointed'
      ? Math.floor(n / (section.patternOffsets.length - 1)) * section.patternOffsets.at(-1) +
        section.patternOffsets[n % (section.patternOffsets.length - 1)]
      : n * 25;
  }
  upperBound(section, offset) {
    let lo = 0, hi = Math.max(0, Math.ceil(section.length / 12.5));
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      if (this.offset(section, mid) <= offset) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  }
  between(start, end) {
    if (end <= start) return [];
    const result = [];
    const append = (position, type) => {
      for (const side of ['left', 'right'])
        result.push({ id: `${this.id}/contact/${position}/${side}`, position, side, type });
    };
    // Locate the first overlapping section; distant station jumps cost no prefix scan.
    let lo = 0, hi = this.sections.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (this.sections[mid].end <= start + 1e-8) lo = mid + 1;
      else hi = mid;
    }
    for (let i = lo; i < this.sections.length; i++) {
      const section = this.sections[i];
      if (section.position > end + 1e-8) break;
      if (i > 0 && section.position > start + 1e-8)
        append(section.position, section.boundaryType);
      const first = this.upperBound(section, start + 1e-8 - section.position) + 1;
      for (let n = first; n <= section.count; n++) {
        const position = section.position + this.offset(section, n);
        if (position > end + 1e-8) break;
        append(position, section.construction === 'jointed' ? 'joint' : 'weld');
      }
    }
    return result;
  }
}
