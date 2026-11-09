// Satu konfigurasi server, dua CP: 5 divisi dan 6 divisi. Tidak ada fallback kontak.
const normalizeDivision = (value) => typeof value === 'string'
  ? value.trim().replace(/\s+/g, ' ').toUpperCase()
  : '';

function readGroup(divisions, whatsapp, expectedCount) {
  const names = typeof divisions === 'string'
    ? divisions.split(',').map(normalizeDivision)
    : [];
  const phone = typeof whatsapp === 'string' ? whatsapp.trim() : '';
  if (names.length !== expectedCount || names.some((name) => !name)
      || new Set(names).size !== expectedCount || !/^\+?[1-9]\d{7,14}$/.test(phone)) return null;
  return { divisions: names, whatsapp: phone.replace(/^\+/, '') };
}

export function resolveContactPerson(division, env = process.env) {
  const first = readGroup(env.CP_1_DIVISIONS, env.CP_1_WHATSAPP, 5);
  const second = readGroup(env.CP_2_DIVISIONS, env.CP_2_WHATSAPP, 6);
  if (!first || !second || first.whatsapp === second.whatsapp) return null;
  const allDivisions = [...first.divisions, ...second.divisions];
  if (new Set(allDivisions).size !== 11) return null;
  const target = normalizeDivision(division);
  const group = [first, second].find((item) => item.divisions.includes(target));
  return group ? { name: 'Contact Person', whatsapp: group.whatsapp } : null;
}
