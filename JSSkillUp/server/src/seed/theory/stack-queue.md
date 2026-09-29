# Стек и очередь

## Стек (LIFO)

Последним пришёл — первым ушёл. В JS — массив с `push`/`pop`, обе операции O(1).

Где нужен: парные элементы (скобки, теги), отмена действий, обход в глубину без
рекурсии, разбор выражений, «ближайший больший/меньший» элемент.

## Валидные скобки

```js
function isValidBrackets(str) {
  const pairs = { ')': '(', ']': '[', '}': '{' };
  const stack = [];
  for (const ch of str) {
    if (ch === '(' || ch === '[' || ch === '{') {
      stack.push(ch);
    } else if (ch in pairs) {
      if (stack.pop() !== pairs[ch]) return false;
    }
  }
  return stack.length === 0;
}
```

Три случая ошибки: закрывающая без открывающей (`pop` вернёт `undefined`), не та пара,
незакрытые в конце (стек не пуст).

## Обратная польская запись (RPN)

`3 4 + 2 *` = `(3 + 4) * 2`. Число — в стек; оператор — снять два операнда, положить результат:

```js
function evalRPN(tokens) {
  const stack = [];
  const ops = {
    '+': (a, b) => a + b,
    '-': (a, b) => a - b,
    '*': (a, b) => a * b,
    '/': (a, b) => Math.trunc(a / b),
  };
  for (const token of tokens) {
    if (token in ops) {
      const b = stack.pop();
      const a = stack.pop();       // порядок важен для - и /
      stack.push(ops[token](a, b));
    } else {
      stack.push(Number(token));
    }
  }
  return stack.pop();
}
```

## Монотонный стек

«Для каждого элемента найти ближайший справа больший» — перебор O(n²). Монотонный стек — O(n):

```js
function nextGreater(nums) {
  const result = new Array(nums.length).fill(-1);
  const stack = []; // индексы, значения по ним убывают
  for (let i = 0; i < nums.length; i++) {
    while (stack.length && nums[stack.at(-1)] < nums[i]) {
      result[stack.pop()] = nums[i]; // i — ближайший больший для снятого
    }
    stack.push(i);
  }
  return result;
}
```

Каждый индекс кладётся и снимается один раз. Применения: «дни до потепления»,
наибольший прямоугольник в гистограмме, «сколько дней акция не падала».

## Очередь (FIFO)

Первым пришёл — первым ушёл. `push` + `shift` на массиве — ловушка: **`shift` O(n)**,
все элементы сдвигаются. На большой очереди это O(n²).

Решения:

```js
// индекс головы: O(1) на операцию
class Queue {
  #items = [];
  #head = 0;
  enqueue(x) { this.#items.push(x); }
  dequeue() {
    if (this.#head >= this.#items.length) return undefined;
    const x = this.#items[this.#head++];
    if (this.#head > 1024 && this.#head * 2 > this.#items.length) { // иногда уплотняем
      this.#items = this.#items.slice(this.#head);
      this.#head = 0;
    }
    return x;
  }
  get size() { return this.#items.length - this.#head; }
}
```

## Очередь на двух стеках

Классический вопрос: `in` принимает новые элементы; когда нужно извлечь, а `out` пуст —
переливаем всё из `in` в `out` (порядок разворачивается):

```js
class TwoStackQueue {
  #in = [];
  #out = [];
  enqueue(x) { this.#in.push(x); }
  dequeue() {
    if (this.#out.length === 0) {
      while (this.#in.length) this.#out.push(this.#in.pop());
    }
    return this.#out.pop();
  }
}
```

Каждый элемент переливается ровно один раз → O(1) **амортизированно**.

## BFS по дереву или графу

Очередь — основа обхода в ширину: уровень за уровнем, кратчайший путь в невзвешенном графе.

```js
function levels(root) {
  if (!root) return [];
  const result = [];
  let queue = [root];
  while (queue.length) {
    result.push(queue.map((node) => node.value));
    queue = queue.flatMap((node) => node.children ?? []); // следующий уровень
  }
  return result;
}
```

Обход в глубину (DFS) без рекурсии — то же самое, но со **стеком** вместо очереди.

## Как это спрашивают

- «Проверьте правильность скобок» — одна из самых частых задач.
- «Реализуйте очередь на двух стеках», «стек с `getMin` за O(1)» (второй стек минимумов).
- «Вычислите выражение в RPN».
- «Обойдите дерево по уровням» / «найдите кратчайший путь в лабиринте» — BFS.
- «Почему `shift` в BFS плохая идея?»
