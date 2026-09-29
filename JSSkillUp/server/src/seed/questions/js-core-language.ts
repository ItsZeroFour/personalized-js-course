import type { SeedQuestion } from '../types.js';

/** Вопросы по устройству языка: типы, область видимости, замыкания, this, прототипы, классы. */
export const jsCoreLanguageQuestions: SeedQuestion[] = [
  // --- types-and-coercion ---------------------------------------------------
  {
    topic: 'types-and-coercion',
    kind: 'mc',
    difficulty: 'easy',
    promptMd: 'Сколько примитивных типов в JavaScript и какие из перечисленных к ним относятся?',
    options: [
      { id: 'a', text: '6: number, string, boolean, null, undefined, object' },
      { id: 'b', text: '7: number, string, boolean, null, undefined, symbol, bigint' },
      { id: 'c', text: '7: number, string, boolean, null, undefined, symbol, object' },
      { id: 'd', text: '8: все перечисленные плюс array и function' },
    ],
    correct: ['b'],
    explanationMd:
      'Примитивов семь: `number`, `string`, `boolean`, `null`, `undefined`, `symbol`, `bigint`. ' +
      'Восьмой тип — `object`, и к нему относятся массивы, функции, даты и всё остальное.',
    tags: ['типы'],
  },
  {
    topic: 'types-and-coercion',
    kind: 'output',
    difficulty: 'medium',
    promptMd: 'Что выведет этот код?',
    code: `console.log([] + []);
console.log([] + {});
console.log(1 + '2');
console.log('3' - 1);
console.log(null + 1);
console.log(undefined + 1);`,
    expectedOutput: ['', '[object Object]', '12', '2', '1', 'NaN'],
    options: [
      { id: 'a', text: "'', '[object Object]', '12', 2, 1, NaN" },
      { id: 'b', text: "[], {}, '12', 2, 1, 1" },
      { id: 'c', text: "'', '[object Object]', 3, 2, NaN, NaN" },
      { id: 'd', text: "0, '[object Object]', '12', '2', 1, NaN" },
    ],
    correct: ['a'],
    explanationMd:
      'Оба массива через ToPrimitive дают пустую строку, поэтому `[] + []` это `\'\'`. ' +
      '`{}` в позиции операнда даёт `\'[object Object]\'`. Плюс со строкой — конкатенация, ' +
      'минус всегда числовой. `Number(null) === 0`, а `Number(undefined) === NaN`.',
    tags: ['приведение типов', 'ToPrimitive'],
  },
  {
    topic: 'types-and-coercion',
    kind: 'mc',
    difficulty: 'medium',
    promptMd: 'Какие из выражений вернут `true`? (несколько вариантов)',
    options: [
      { id: 'a', text: 'null == undefined' },
      { id: 'b', text: 'null == 0' },
      { id: 'c', text: 'null >= 0' },
      { id: 'd', text: 'NaN === NaN' },
      { id: 'e', text: "'' == 0" },
    ],
    correct: ['a', 'c', 'e'],
    explanationMd:
      '`null == undefined` — единственная пара, где они равны. `null == 0` даёт `false`: ' +
      'алгоритм нестрогого равенства не приводит `null` к числу. А вот операторы сравнения ' +
      '(`>=`) используют другой алгоритм, где `null` превращается в `0`, поэтому `null >= 0` ' +
      'это `true` — классическая несогласованность языка. `NaN` не равен сам себе. ' +
      "`''` приводится к `0`.",
    tags: ['равенство', 'приведение типов'],
  },
  {
    topic: 'types-and-coercion',
    kind: 'open',
    difficulty: 'medium',
    promptMd:
      'Объясните разницу между `||` и `??`. Приведите пример, где замена одного на другой ' +
      'приводит к багу.',
    explanationMd:
      'Вопрос проверяет знание falsy-значений и понимание, что `??` появился именно ради ' +
      'валидных нулей и пустых строк.',
    referenceAnswerMd:
      '`||` возвращает правый операнд, если левый **falsy** — то есть `false`, `0`, `-0`, `0n`, ' +
      "`''`, `null`, `undefined`, `NaN`.\n\n" +
      '`??` (nullish coalescing) возвращает правый операнд только если левый `null` или ' +
      '`undefined`.\n\n' +
      '```js\n' +
      'function render({ count = 0, label = \'\' }) {\n' +
      '  const shown = count || 10;   // при count === 0 подставит 10 — баг\n' +
      '  const text  = count ?? 10;   // при count === 0 останется 0 — верно\n' +
      '}\n' +
      '```\n\n' +
      'Типичные места бага: числовые настройки (`timeout`, `page`), значения слайдеров, ' +
      'пустые строки в формах, булев флаг `false`.\n\n' +
      '`??` нельзя смешивать с `||` и `&&` без скобок — это синтаксическая ошибка, ' +
      'сделанная намеренно ради читаемости.',
    rubric: [
      'Назвать список falsy-значений или хотя бы 0 и пустую строку',
      '`??` реагирует только на null и undefined',
      'Привести конкретный пример бага с нулём или пустой строкой',
      'Бонус: запрет смешивания с || и && без скобок',
    ],
    tags: ['операторы', 'falsy'],
  },

  // --- scope-hoisting-tdz ---------------------------------------------------
  {
    topic: 'scope-hoisting-tdz',
    kind: 'output',
    difficulty: 'easy',
    promptMd: 'Что выведет этот код?',
    code: `console.log(a);
var a = 1;

try {
  console.log(b);
} catch (e) {
  console.log(e.constructor.name);
}
let b = 2;`,
    expectedOutput: ['undefined', 'ReferenceError'],
    options: [
      { id: 'a', text: 'undefined, ReferenceError' },
      { id: 'b', text: 'undefined, undefined' },
      { id: 'c', text: 'ReferenceError, ReferenceError' },
      { id: 'd', text: '1, 2' },
    ],
    correct: ['a'],
    explanationMd:
      '`var` регистрируется в фазе создания контекста и сразу инициализируется как `undefined`. ' +
      '`let` тоже регистрируется, но остаётся неинициализированной до строки объявления — ' +
      'это TDZ, и обращение к ней даёт `ReferenceError`.',
    tags: ['hoisting', 'TDZ'],
  },
  {
    topic: 'scope-hoisting-tdz',
    kind: 'output',
    difficulty: 'medium',
    promptMd: 'Что выведет этот код?',
    code: `for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log('var:', i), 0);
}
for (let j = 0; j < 3; j++) {
  setTimeout(() => console.log('let:', j), 0);
}`,
    expectedOutput: ['var: 3', 'var: 3', 'var: 3', 'let: 0', 'let: 1', 'let: 2'],
    explanationMd:
      '`var i` — одна переменная на всю функцию. К моменту срабатывания таймеров цикл ' +
      'закончился и `i === 3`, все три замыкания видят одну ячейку.\n\n' +
      '`let j` по спецификации получает **новое привязывание на каждой итерации**, ' +
      'значение копируется из предыдущей. Поэтому каждое замыкание держит свою копию.',
    tags: ['замыкания', 'цикл', 'var vs let'],
  },
  {
    topic: 'scope-hoisting-tdz',
    kind: 'mc',
    difficulty: 'medium',
    promptMd: 'Какую ошибку выбросит этот код?',
    code: `notHoisted();
var notHoisted = function () {};`,
    options: [
      { id: 'a', text: 'ReferenceError: notHoisted is not defined' },
      { id: 'b', text: 'TypeError: notHoisted is not a function' },
      { id: 'c', text: 'SyntaxError' },
      { id: 'd', text: 'Ошибки не будет' },
    ],
    correct: ['b'],
    explanationMd:
      'Имя `notHoisted` уже существует и равно `undefined` — поэтому не `ReferenceError`. ' +
      'Попытка вызвать `undefined` как функцию даёт `TypeError`. Если бы это было ' +
      '`function declaration`, код бы отработал: объявления функций поднимаются целиком.',
    tags: ['hoisting'],
  },
  {
    topic: 'scope-hoisting-tdz',
    kind: 'open',
    difficulty: 'hard',
    promptMd:
      'Почему `typeof x` бросает `ReferenceError` для переменной в TDZ, но возвращает ' +
      '`"undefined"` для вообще необъявленной переменной?',
    explanationMd:
      'Вопрос проверяет, понимает ли кандидат, что TDZ — это не «переменной нет», а ' +
      '«переменная есть, но помечена как неинициализированная».',
    referenceAnswerMd:
      '`typeof` исторически безопасен: для имени, которого нет ни в одной области видимости, ' +
      'он возвращает `"undefined"` вместо ошибки — так можно было проверять наличие глобальных ' +
      'переменных.\n\n' +
      'Переменная в TDZ — совсем другой случай. Она **уже зарегистрирована** в Environment ' +
      'Record текущего блока, но её внутренний слот помечен как uninitialized. Любое чтение ' +
      'такого биндинга, включая `typeof`, обязано по спецификации бросить `ReferenceError`.\n\n' +
      '```js\n' +
      'typeof neverDeclared; // "undefined"\n' +
      '{\n' +
      '  typeof x;           // ReferenceError\n' +
      '  let x = 1;\n' +
      '}\n' +
      '```\n\n' +
      'Это сделано намеренно: TDZ должна превращать обращение «до объявления» в громкую ' +
      'ошибку, а не в тихий `undefined`, как было с `var`.',
    rubric: [
      'Переменная в TDZ зарегистрирована, но не инициализирована',
      'Необъявленная переменная отсутствует в цепочке областей видимости',
      'typeof исторически не бросает ошибку только для второго случая',
      'Упомянуть, что это осознанное решение ради раннего обнаружения ошибок',
    ],
    tags: ['TDZ', 'typeof'],
  },

  // --- closures -------------------------------------------------------------
  {
    topic: 'closures',
    kind: 'open',
    difficulty: 'easy',
    promptMd: 'Что такое замыкание? Приведите практический пример из своего кода.',
    explanationMd:
      'Ответ «функция внутри функции» считается слабым. Ждут определение через лексическое ' +
      'окружение и понимание, что захватывается ссылка, а не значение.',
    referenceAnswerMd:
      'Замыкание — это функция вместе со ссылкой на лексическое окружение, в котором она была ' +
      'создана. Каждая функция в JS хранит внутренний слот `[[Environment]]`, указывающий на ' +
      'окружение места объявления, поэтому она видит внешние переменные даже после того, как ' +
      'внешняя функция завершилась.\n\n' +
      'Ключевая деталь: захватывается **переменная**, а не её значение — это ссылка на ячейку.\n\n' +
      '```js\n' +
      'function debounce(fn, delay) {\n' +
      '  let timer = null;            // приватное состояние в замыкании\n' +
      '  return (...args) => {\n' +
      '    clearTimeout(timer);\n' +
      '    timer = setTimeout(() => fn(...args), delay);\n' +
      '  };\n' +
      '}\n' +
      '```\n\n' +
      'Практические применения: приватное состояние (счётчики, кеши, таймеры в `debounce`, ' +
      '`memoize`, `once`), каррирование, модульный паттерн. Обратная сторона — замыкание ' +
      'держит окружение в памяти, поэтому незакрытые таймеры и слушатели дают утечки.',
    rubric: [
      'Определение через лексическое окружение, а не «функция в функции»',
      'Захватывается ссылка на переменную, а не копия значения',
      'Конкретный практический пример с кодом',
      'Упомянуть риск утечки памяти',
    ],
    tags: ['замыкания'],
  },
  {
    topic: 'closures',
    kind: 'output',
    difficulty: 'medium',
    promptMd: 'Что выведет этот код?',
    code: `function makeCounters() {
  let count = 0;
  return [() => ++count, () => ++count, () => count];
}

const [a, b, get] = makeCounters();
a();
b();
a();
console.log(get());

const [c, , get2] = makeCounters();
c();
console.log(get2());`,
    expectedOutput: ['3', '1'],
    explanationMd:
      'Все три функции из одного вызова `makeCounters` замкнуты на **одно** окружение, поэтому ' +
      'разделяют переменную `count`: три инкремента дают 3.\n\n' +
      'Второй вызов `makeCounters()` создаёт **новое** окружение со своим `count`, ' +
      'независимым от первого, — поэтому 1.',
    tags: ['замыкания'],
  },
  {
    topic: 'closures',
    kind: 'mc',
    difficulty: 'medium',
    promptMd: 'Какое из утверждений про замыкания **неверно**?',
    options: [
      { id: 'a', text: 'Замыкание захватывает ссылку на переменную, а не её значение' },
      { id: 'b', text: 'Замыкание может стать причиной утечки памяти' },
      {
        id: 'c',
        text: 'Замыкание создаётся только когда функция объявлена внутри другой функции',
      },
      { id: 'd', text: 'Несколько функций могут делить одно замкнутое окружение' },
    ],
    correct: ['c'],
    explanationMd:
      'Замыкание образует **любая** функция: она всегда хранит ссылку на окружение, где была ' +
      'создана, — включая функции верхнего уровня (они замкнуты на область модуля). ' +
      'Просто на верхнем уровне это не так заметно.',
    tags: ['замыкания'],
  },

  // --- this-binding ---------------------------------------------------------
  {
    topic: 'this-binding',
    kind: 'output',
    difficulty: 'medium',
    promptMd: 'Что выведет этот код? (модуль, strict mode)',
    code: `const user = {
  name: 'Аня',
  regular() {
    return this?.name;
  },
  arrow: () => globalThis.name,
};

console.log(user.regular());
const detached = user.regular;
console.log(detached());
console.log(user.regular.call({ name: 'Оля' }));`,
    expectedOutput: ['Аня', 'undefined', 'Оля'],
    explanationMd:
      '`user.regular()` — неявная привязка, `this` это `user`.\n\n' +
      '`detached()` — вызов без контекста, в strict mode `this === undefined`, ' +
      'поэтому `this?.name` даёт `undefined`.\n\n' +
      '`call` — явная привязка, `this` становится переданным объектом.',
    tags: ['this'],
  },
  {
    topic: 'this-binding',
    kind: 'mc',
    difficulty: 'medium',
    promptMd: 'Что из перечисленного **не** относится к стрелочным функциям?',
    options: [
      { id: 'a', text: 'У них нет собственного this' },
      { id: 'b', text: 'Их нельзя вызвать через new' },
      { id: 'c', text: 'У них нет собственного arguments' },
      { id: 'd', text: 'bind может изменить их this' },
      { id: 'e', text: 'У них нет свойства prototype' },
    ],
    correct: ['d'],
    explanationMd:
      '`call`, `apply` и `bind` на стрелке не меняют `this`: у неё нет собственного `this`, ' +
      'она берёт его лексически из места создания. Вызов `arrow.call(obj)` отработает, ' +
      'но первый аргумент просто проигнорируется.',
    tags: ['this', 'стрелочные функции'],
  },
  {
    topic: 'this-binding',
    kind: 'open',
    difficulty: 'medium',
    promptMd:
      'Как определяется значение `this` при вызове функции? Перечислите правила в порядке ' +
      'приоритета.',
    explanationMd:
      'Ждут упоминание call-site и четыре правила. Сильный кандидат отдельно оговорит ' +
      'стрелочные функции, которые вообще вне этой системы.',
    referenceAnswerMd:
      '`this` определяется **в момент вызова**, по тому, как функция была вызвана (call-site), ' +
      'а не по месту объявления. Правила по убыванию приоритета:\n\n' +
      '1. **`new`** — `this` это новый создаваемый объект.\n' +
      '2. **Явная привязка** — `call`, `apply`, `bind`. Функция, полученная из `bind`, ' +
      'жёстко привязана и не перепривязывается повторно.\n' +
      '3. **Неявная привязка** — вызов как метода: `obj.method()`, `this` это `obj`. ' +
      'Значение имеет только последняя точка перед вызовом.\n' +
      '4. **Вызов без контекста** — `this` это `undefined` в strict mode ' +
      '(модули и классы всегда strict) и `globalThis` в нестрогом режиме.\n\n' +
      '**Стрелочные функции вне этой системы**: своего `this` у них нет, они берут его ' +
      'лексически из окружающей области на момент создания, и изменить его нельзя.\n\n' +
      'Отсюда классическая потеря контекста:\n\n' +
      '```js\n' +
      'const fn = user.getName;   // точки при вызове больше нет\n' +
      'fn();                      // TypeError\n' +
      'setTimeout(user.getName.bind(user), 0);  // починка\n' +
      '```',
    rubric: [
      'this определяется в момент вызова, а не объявления',
      'Перечислить четыре правила с правильным приоритетом',
      'Отдельно сказать про стрелочные функции и лексический this',
      'Привести пример потери контекста и способ починки',
    ],
    tags: ['this'],
  },

  // --- prototypes -----------------------------------------------------------
  {
    topic: 'prototypes',
    kind: 'mc',
    difficulty: 'medium',
    promptMd: 'В чём разница между `prototype` и `[[Prototype]]` (`__proto__`)?',
    options: [
      { id: 'a', text: 'Это одно и то же, просто разный синтаксис доступа' },
      {
        id: 'b',
        text: '`prototype` — свойство функций; `[[Prototype]]` — внутренняя ссылка любого объекта на его прототип',
      },
      {
        id: 'c',
        text: '`prototype` — внутренняя ссылка объекта; `__proto__` — свойство конструктора',
      },
      { id: 'd', text: '`prototype` работает только с классами, `__proto__` — только с функциями' },
    ],
    correct: ['b'],
    explanationMd:
      '`prototype` есть только у функций (кроме стрелочных) — это объект, который станет ' +
      'прототипом экземпляров, созданных через `new`. `[[Prototype]]` — внутренний слот ' +
      'любого объекта, ссылка на объект, по которому идёт поиск свойств. ' +
      'Связь: `Object.getPrototypeOf(new Foo()) === Foo.prototype`.',
    tags: ['прототипы'],
  },
  {
    topic: 'prototypes',
    kind: 'output',
    difficulty: 'medium',
    promptMd: 'Что выведет этот код?',
    code: `const animal = { eats: true };
const rabbit = Object.create(animal);

rabbit.eats = false;

console.log(animal.eats);
console.log(rabbit.eats);
console.log(Object.hasOwn(rabbit, 'eats'));
console.log('eats' in rabbit);

delete rabbit.eats;
console.log(rabbit.eats);`,
    expectedOutput: ['true', 'false', 'true', 'true', 'true'],
    explanationMd:
      'Чтение идёт по цепочке прототипов, а **запись создаёт собственное свойство** ' +
      'на самом объекте (shadowing) — прототип не меняется.\n\n' +
      '`Object.hasOwn` проверяет только собственные свойства, `in` — всю цепочку.\n\n' +
      'После `delete` собственное свойство исчезает и снова видно прототипное `true`.',
    tags: ['прототипы', 'shadowing'],
  },
  {
    topic: 'prototypes',
    kind: 'open',
    difficulty: 'medium',
    promptMd: 'Что происходит при вызове `new Foo()`? Напишите реализацию оператора `new` функцией.',
    explanationMd: 'Проверяют понимание связи new, прототипа и возвращаемого значения.',
    referenceAnswerMd:
      '`new Foo(args)` выполняет четыре шага:\n\n' +
      '1. создаёт новый пустой объект;\n' +
      '2. устанавливает его `[[Prototype]]` в `Foo.prototype`;\n' +
      '3. вызывает `Foo` с этим объектом в качестве `this`;\n' +
      '4. возвращает этот объект — **если** функция не вернула явно другой объект ' +
      '(возврат примитива игнорируется).\n\n' +
      '```js\n' +
      'function myNew(Constructor, ...args) {\n' +
      '  const obj = Object.create(Constructor.prototype);\n' +
      '  const result = Constructor.apply(obj, args);\n' +
      '  return typeof result === \'object\' && result !== null ? result : obj;\n' +
      '}\n' +
      '```\n\n' +
      'Дополнительно: внутри конструктора `new.target` равен вызванной функции — на этом ' +
      'делают имитацию абстрактных классов.',
    rubric: [
      'Перечислить все четыре шага',
      'Указать, что прототип берётся из Constructor.prototype',
      'Упомянуть правило про явный возврат объекта',
      'Написать рабочий код',
    ],
    tags: ['прототипы', 'new'],
  },
  {
    topic: 'prototypes',
    kind: 'mc',
    difficulty: 'hard',
    promptMd: 'Почему методы принято объявлять в `prototype`, а не присваивать в конструкторе?',
    options: [
      { id: 'a', text: 'Иначе метод не будет виден снаружи объекта' },
      { id: 'b', text: 'Методы в прототипе создаются один раз и переиспользуются всеми экземплярами' },
      { id: 'c', text: 'Методы в конструкторе нельзя вызвать через this' },
      { id: 'd', text: 'Это единственный способ поддержать наследование' },
    ],
    correct: ['b'],
    explanationMd:
      'Присваивание метода в конструкторе создаёт **новую функцию на каждый экземпляр**. ' +
      'Для миллиона объектов это миллион функций в памяти. Метод в прототипе существует ' +
      'в единственном экземпляре, и все объекты находят его по цепочке. ' +
      'Это же объясняет, почему модульный паттерн на замыканиях дороже классов по памяти.',
    tags: ['прототипы', 'память'],
  },

  // --- classes --------------------------------------------------------------
  {
    topic: 'classes',
    kind: 'mc',
    difficulty: 'medium',
    promptMd: 'Какие утверждения про `class` верны? (несколько вариантов)',
    options: [
      { id: 'a', text: 'Тело класса всегда исполняется в strict mode' },
      { id: 'b', text: 'Класс поднимается так же, как function declaration' },
      { id: 'c', text: 'Вызов класса без new бросает TypeError' },
      { id: 'd', text: 'Методы класса неперечисляемые (не попадают в Object.keys)' },
      { id: 'e', text: 'Класс — это полностью синтаксический сахар без дополнительных правил' },
    ],
    correct: ['a', 'c', 'd'],
    explanationMd:
      'Класс регистрируется, но находится в TDZ до объявления — в отличие от function ' +
      'declaration, поэтому пункт b неверен. Пункт e тоже: у классов есть собственные правила ' +
      '(strict mode, запрет вызова без `new`, неперечисляемые методы, обязательный `super()` ' +
      'до `this`), которых у функций-конструкторов нет.',
    tags: ['классы'],
  },
  {
    topic: 'classes',
    kind: 'output',
    difficulty: 'medium',
    promptMd: 'Что выведет этот код?',
    code: `class Base {
  constructor() {
    this.type = 'base';
  }
}

class Child extends Base {
  constructor() {
    try {
      console.log(this.type);
    } catch (e) {
      console.log(e.constructor.name);
    }
    super();
    console.log(this.type);
  }
}

new Child();`,
    expectedOutput: ['ReferenceError', 'base'],
    explanationMd:
      'В производном классе `this` не существует до вызова `super()`: объект создаёт базовый ' +
      'конструктор. Обращение к `this` раньше даёт `ReferenceError`. После `super()` объект ' +
      'создан и инициализирован базовым конструктором, поэтому `this.type === "base"`.',
    tags: ['классы', 'super'],
  },
  {
    topic: 'classes',
    kind: 'open',
    difficulty: 'medium',
    promptMd:
      'Чем приватное поле `#count` отличается от соглашения `_count`? Какие есть альтернативы ' +
      'и в чём их цена?',
    explanationMd:
      'Проверяют знание современного синтаксиса и понимание, чем платят за приватность ' +
      'через замыкания.',
    referenceAnswerMd:
      '`_count` — это только соглашение: поле доступно снаружи, видно в `Object.keys`, ' +
      '`JSON.stringify` и отладчике.\n\n' +
      '`#count` — настоящая приватность на уровне языка:\n\n' +
      '- обращение снаружи — **SyntaxError на этапе парсинга**, а не рантайм-ошибка;\n' +
      '- поле не видно рефлексии: `Object.keys`, `JSON.stringify`, `Object.getOwnPropertyNames`;\n' +
      '- поле не наследуется: подкласс не видит `#count` родителя;\n' +
      '- проверить наличие можно через `#count in obj`.\n\n' +
      'Альтернативы и их цена:\n\n' +
      '**Замыкание** — приватность есть, но методы создаются заново на каждый экземпляр ' +
      'и не лежат в прототипе, то есть дороже по памяти.\n\n' +
      '```js\n' +
      'const privates = new WeakMap();\n' +
      'class Counter {\n' +
      '  constructor() { privates.set(this, { count: 0 }); }\n' +
      '  inc() { privates.get(this).count += 1; }\n' +
      '}\n' +
      '```\n\n' +
      '**WeakMap** — методы остаются в прототипе, данные собираются вместе с объектом, ' +
      'но код многословнее и появляется косвенность.\n\n' +
      '**`private` в TypeScript** — проверка только на этапе компиляции, в рантайме поле ' +
      'обычное и доступно.',
    rubric: [
      '`_` — соглашение, `#` — механизм языка',
      'Назвать хотя бы два наблюдаемых отличия (SyntaxError, невидимость для рефлексии)',
      'Упомянуть замыкания и/или WeakMap как альтернативы',
      'Назвать цену альтернатив (память или многословность)',
      'Бонус: private в TypeScript исчезает в рантайме',
    ],
    tags: ['классы', 'приватность'],
  },
];
