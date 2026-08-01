const COMMAND_IDS = ['whoami', 'impact', 'projects', 'systems', 'philosophy', 'journey', 'contact'];
const COMMAND_IDS_SET = new Set(COMMAND_IDS);

const ITERATIONS = 10000000;

console.time('Array.includes (Hit)');
for (let i = 0; i < ITERATIONS; i++) {
  COMMAND_IDS.includes('contact');
}
console.timeEnd('Array.includes (Hit)');

console.time('Set.has (Hit)');
for (let i = 0; i < ITERATIONS; i++) {
  COMMAND_IDS_SET.has('contact');
}
console.timeEnd('Set.has (Hit)');

console.time('Array.includes (Miss)');
for (let i = 0; i < ITERATIONS; i++) {
  COMMAND_IDS.includes('invalid');
}
console.timeEnd('Array.includes (Miss)');

console.time('Set.has (Miss)');
for (let i = 0; i < ITERATIONS; i++) {
  COMMAND_IDS_SET.has('invalid');
}
console.timeEnd('Set.has (Miss)');
