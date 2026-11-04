import { evaluate, FAN } from '../js/scoring.js';

// notation: "123m456p789s1234567z" ; z: 1-4 = ESWN, 5 中 6 發 7 白
function parse(s) {
  const out = [];
  let buf = [];
  for (const ch of s.replace(/\s/g, '')) {
    if (/\d/.test(ch)) buf.push(+ch);
    else {
      const base = { m: 0, p: 9, s: 18, z: 27 }[ch];
      buf.forEach(d => out.push(base + d - 1));
      buf = [];
    }
  }
  return out;
}
const M = (kind, s) => ({ kind, t: parse(s)[0] });

let fails = 0;
function check(name, inp, expectKeys, expectTotal) {
  const r = evaluate({ seatWind: 0, roundWind: 0, selfDraw: false, ...inp });
  const keys = r ? r.fans.map(f => f.k) : [];
  const desc = r ? r.fans.map(f => `${FAN[f.k].zh}${f.n > 1 ? 'x' + f.n : ''}(${f.p * f.n})`).join(' ') + ` = ${r.total}` : 'NOT WIN';
  let ok = !!r && expectKeys.every(k => keys.includes(k));
  if (expectTotal !== undefined) ok = ok && r.total === expectTotal;
  if (expectKeys === null) ok = r === null;
  if (!ok) fails++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}: ${desc}`);
}

check('13 orphans', { concealed: parse('19m19p19s12345677z'), winTile: parse('7z')[0] }, ['ssy'], 88);
check('Big three dragons', { concealed: parse('555666777z123m99m'), winTile: parse('9m')[0] }, ['dsy']);
check('Chicken hand', {
  concealed: parse('567p345s888s22z'), melds: [M('chi', '2m')], winTile: parse('5p')[0],
}, ['wfh'], 8);
check('Pure straight self-draw', {
  concealed: parse('123456789m123p55s'), winTile: parse('5s')[0], selfDraw: true,
}, ['ql', 'bqr']);
check('Lesser knitted', { concealed: parse('147m258p369s12345z'), winTile: parse('5z')[0] }, ['qbk', 'zhl'], 24);
check('Greater knitted', { concealed: parse('147m258p3s1234567z'), winTile: parse('3s')[0] }, ['qxbk']);
check('Nine gates', { concealed: parse('11123455678999m'), winTile: parse('5m')[0] }, ['jlbd']);
check('Pure terminal chows', { concealed: parse('12312378978955m'), winTile: parse('5m')[0] }, ['ysslh']);
check('Seven pairs half flush', { concealed: parse('1133557799m1122z'), winTile: parse('2z')[0] }, ['qd', 'hys']);
check('Seven shifted pairs', { concealed: parse('22334455667788p'), winTile: parse('8p')[0] }, ['lqd']);
check('All pungs + dragons', {
  concealed: parse('555z666z222m33p'), melds: [M('pon', '9s')], winTile: parse('3p')[0],
}, ['pph', 'sjk']);
check('Not a win', { concealed: parse('123m456p789s1235z'), winTile: parse('5z')[0] }, null);
check('Melded hand', {
  concealed: parse('11z'), melds: [M('chi', '2m'), M('pon', '5p'), M('chi', '6s'), M('pon', '7z')], winTile: parse('1z')[0],
}, ['qqr']);
check('Mixed triple chow + all chows', {
  concealed: parse('234m234p234s567s88p'), winTile: parse('7s')[0],
}, ['s3ts', 'ph']);
check('Knitted straight + set', { concealed: parse('147m258s369p123s99m'), winTile: parse('9m')[0] }, ['zhl']);
check('Big four winds', { concealed: parse('111222333444z55m'), winTile: parse('5m')[0] }, ['dsx']);
check('Edge wait', {
  concealed: parse('12m3m456p789s567m99p'.replace('12m3m', '123m')), winTile: parse('3m')[0],
}, ['bz']);
check('Robbing kong', { concealed: parse('234m456p678s345s99m'), winTile: parse('3s')[0], robKong: true }, ['qgh']);

console.log(fails ? `\n${fails} FAILED` : '\nAll scoring tests passed');
process.exit(fails ? 1 : 0);
