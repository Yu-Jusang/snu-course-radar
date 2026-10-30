export const remaining = c => c.capacity == null || c.enrolled == null ? null : c.capacity - c.enrolled;
export const basketFree = c => c.capacity == null || c.basket == null ? null : c.capacity - c.basket;
export const ratio = c => c.capacity > 0 && c.basket != null ? c.basket / c.capacity : null;
export function selectCourses(courses, options, stars = new Set()) {
  const q = (options.query || '').trim().toLocaleLowerCase();
  const result = courses.filter(c => (!q || [c.id,c.name,c.instructor,c.department].join(' ').toLocaleLowerCase().includes(q)) &&
    (!options.category || c.category === options.category) && (!options.department || c.department === options.department) &&
    (!options.onlySafe || (c.capacity > 0 && basketFree(c) !== null && basketFree(c) >= 0)) &&
    (!options.onlySeats || remaining(c) > 0) && (!options.onlyStars || stars.has(c.id)));
  const modes = {basketFree:[basketFree,-1],basketLow:[ratio,1],basketHigh:[ratio,-1],basketOver:[c=>basketFree(c)===null?null:-basketFree(c),-1],remaining:[remaining,-1],capacity:[c=>c.capacity,-1]};
  const mode = modes[options.sort];
  return result.sort((a,b) => {
    if (mode) {const x=mode[0](a),y=mode[0](b); if(x===null&&y!==null)return 1;if(y===null&&x!==null)return -1;if(x!==null&&y!==null&&x!==y)return (x-y)*mode[1];}
    return a.name.localeCompare(b.name,'ko') || a.id.localeCompare(b.id);
  });
}
export function csvCell(value) {
  let s = String(value ?? '');
  if (/^[=+@\-\t\r]/.test(s)) s = "'" + s;
  return '"' + s.replaceAll('"','""') + '"';
}
