const test = require('node:test'),
  assert = require('node:assert/strict'),
  vm = require('node:vm'),
  fs = require('node:fs');
test('Банк викторины, варианты и числовые ключи', () => {
  const {
    quiz,
    categories,
    facts
  } = vm.runInNewContext(fs.readFileSync('core/bank.js', 'utf8') + 'BANK');
  assert.equal(quiz.length, 334);
  assert.equal(categories.length, quiz.length);
  assert.equal(new Set(quiz.map(row => row[0])).size, quiz.length);
  quiz.forEach(([question, key, ...other], i) => {
    assert.equal(new Set([key, ...other]).size, 4);
    if (i >= 300) return;
    const ns = question.match(/\d+/g).map(Number);
    const [a, b] = ns;
    const expected = [a * b, 2 * (a + b), 60 * a + b, a * b, a - b][i % 5];
    assert.equal(Number(key), expected);
  });
  assert.ok(facts.every(x => ['Правда', 'Ложь'].includes(x[1]) && x[2].length));
});
