/**
 * @author Victor Taran <tarvics@gmail.com>
 */

/**
 * Callback для задання параметрів елемента за допомогою функції {@link makeTag}
 * @callback fnParamsCallback
 * @param {HTMLElement} element Елемент, якому потрібно вказати параметри
 */

/**
 * Додаткова інформація, яка використовується під час створення тегу функцією {@link makeTag}
 * @typedef {Object} TagInfo
 * @property {string?} className назва класу, із пробілами в ролі роздільників, у випадку, якщо кілька класів
 * @property {string?} id ID тегу
 * @property {string?} innerHTML innerHTML значення тегу
 * @property {string?} innerText innerText значення тегу. Якщо, цей атрибут заданий, то значення атрибуту html - буде ігноруватись
 * @property {string?} tagName назва тегу
 * @property {string?} textContent textContent значення тегу
 */

/**
 * Створення вкладених тегів
 * @param {string|TagInfo} tag Назва тегу або об'єкт із додатковою інформацією про тег
 * @param {fnParamsCallback|HTMLElement} fnParams Callback функція для задання параметрів елемента
 * У випадку, якщо функція не задана, то даний параметр буде вважатись дочірнім елементом, який додається
 * до поточного елемента
 * @param {...HTMLElement} children Дочірні елементи, які будуть додані до поточного елемента
 * @returns {HTMLElement}
 */
const makeTag = function (tag, fnParams = undefined, ...children) {
    let res;

    if (typeof tag === 'object') {
        res = document.createElement(tag.tagName || 'div');
        if (tag.id) res.id = tag.id;
        if (tag.className) res.className = tag.className;
        if (tag.textContent) {
            res.textContent = tag.textContent;
        } else if (tag.innerText) {
            res.innerText = tag.innerText;
        } else if (tag.innerHTML) {
            res.innerHTML = tag.innerHTML;
        }
    } else {
        res = document.createElement(tag);
    }

    if (typeof fnParams === 'function') {
        fnParams(res);
        if (children.length) res.append(...children);
    } else if (fnParams) {
        res.append(fnParams, ...children);
    } else {
        res.append(...children);
    }

    return res;
}

/**
 * Реалізація простого арифметичного калькулятора
 */
class Calculator {
    MAX_DIGIT_COUNT = 12;

    /**
     * Ініціалізація структури калькулятора
     * @param {HTMLElement} root Батьківський елемент, на якому створюється калькулятор
     */
    #init(root) {
        const makeBtn = (className, caption, callback, keys) => {
            return makeTag({className, innerHTML: caption}, el => {
                el.onclick = callback.bind(this);
                if (this.keyMap) {
                    this.keyMap.push({ keys, element: el })
                }
            });
        }

        const calculator = makeTag({className: "calculator"},
            makeTag({className: "lsd"},
                makeTag({className: "history"},
                    makeTag('span', el => this.history = el)
                ),
                makeTag({className: "display"},
                    makeTag({className: "state"}, el => this.state = el),
                    makeTag({className: "digits"}, el => this.display = el)
                )
            ),
            makeTag({className: "controls"},
                makeBtn("memory", "MC", this.fnMem, {altKey: true, code: 'KeyC'}),
                makeBtn("memory", "MR", this.fnMem, {altKey: true, code: 'KeyR'}),
                makeBtn("memory", "M+", this.fnMem, {altKey: true, key: '+'}),
                makeBtn("memory", "M-", this.fnMem, {altKey: true, key: '-'}),

                makeBtn("power", "C", this.fnClear, {code: 'KeyC'}),
                makeBtn("operator", "√", this.fnSqrt, {altKey: true, key: '/'}),
                makeBtn("operator", "x²", this.fnSqr, {altKey: true, key: '*'}),
                makeBtn("operator", "÷", this.fnCalc, {altKey: false, key: '/'}),

                makeBtn("digit", "7", this.fnDigit, {key: '7'}),
                makeBtn("digit", "8", this.fnDigit, {key: '8'}),
                makeBtn("digit", "9", this.fnDigit, {key: '9'}),
                makeBtn("operator", "×", this.fnCalc, {altKey: false, key: '*'}),

                makeBtn("digit", "4", this.fnDigit, {key: '4'}),
                makeBtn("digit", "5", this.fnDigit, {key: '5'}),
                makeBtn("digit", "6", this.fnDigit, {key: '6'}),
                makeBtn("operator", "−", this.fnCalc, {altKey: false, key: '-'}),

                makeBtn("digit", "1", this.fnDigit, {key: '1'}),
                makeBtn("digit", "2", this.fnDigit, {key: '2'}),
                makeBtn("digit", "3", this.fnDigit, {key: '3'}),
                makeBtn("operator", "+", this.fnCalc, {altKey: false, key: '+'}),

                makeBtn("digit", "±", this.fnSign, {key: '!'}),
                makeBtn("digit", "0", this.fnDigit, {key: '0'}),
                makeBtn("digit", ".", this.fnPoint, {key: '.'}),
                makeBtn("operator", "=", this.fnCalc, {key: 'Enter'})
            )
        )

        if (this.keyMap) {
            document.addEventListener('keydown', e => {
                const map = this.keyMap.find(map => {
                    const {key, altKey, code} = map.keys;
                    return (!key || e.key === key) && (!altKey || e.altKey === altKey) && (!code || e.code === code);
                });

                if (map) {
                    map.element.dispatchEvent( new MouseEvent( 'mousedown' ) );
                    map.element.classList.add('active');
                    setTimeout(() => {
                        map.element.dispatchEvent( new MouseEvent( 'mouseup' ) );
                        map.element.dispatchEvent( new MouseEvent( 'click' ) );
                        map.element.classList.remove('active');
                    }, 100);
                    e.preventDefault();
                }
            })
        }


        root.appendChild(calculator);
    }

    /**
     * Зображення вмісту буфера введення на екрані
     */
    #paint() {
        this.display.textContent = this.readBuffer();
    }

    /**
     * Ініціалізація буфера уведення
     */
    #reset() {
        this.buffer = [];
        this.negative = false;
        this.pointer = -1;
    }

    /**
     * Обчислення основних операцій, які включають два операнди
     * @param {Event} event Тип операції визначається з тексту кнопки, на яку було натиснено
     */
    fnCalc(event) {
        if (!this.isValid()) return;

        const op = event.target.textContent;

        if (this.operation && this.editing) {
            const value = +this.readBuffer();

            switch (this.operation) {
                case '÷':
                    this.setValue(this.value / value);
                    break;
                case '×':
                    this.setValue(this.value * value);
                    break;
                case '−':
                    this.setValue(this.value - value);
                    break;
                case '+':
                    this.setValue(this.value + value);
                    break;
            }

            this.history.innerHTML += value.toString() + op;

            if (op === '=') {
                this.history.innerHTML += this.value.toString();
            }

        }

        if (!this.operation || (this.operation === '=' && op !== '=')) {
            const value = +this.readBuffer();
            this.setValue(value);
            this.history.innerHTML = this.value.toString() + op;
        }

        this.operation = op;
        this.editing = false;
    }

    /**
     * Ініціалізація пам'яті калькулятора
     */
    fnClear() {
        this.operation = '';
        this.editing = false;
        this.value = 0;
        this.#reset();
        this.#paint()
        this.history.textContent = '';
    }

    /**
     * Додавання до буфера введення цифр від 0 до 9
     * @param {Event} event Цифра, яку потрібно додати до буфера визначається з тексту кнопки, на яку було натиснено
     */
    fnDigit(event) {
        if (!this.isValid() || this.editing && this.buffer.length >= this.MAX_DIGIT_COUNT) return;

        const digit = event.target.textContent;

        if (!this.editing) {
            this.editing = true;
            this.#reset();
            this.buffer[0] = digit;
        } else if (this.buffer.length === 1 && this.buffer[0] === '0' && this.pointer === -1) {
            this.buffer[0] = digit;
        } else {
            this.buffer.push(digit);
        }

        this.#paint();
    }

    /**
     * Додавання до буфера введення розділового знака дробної частини числа
     */
    fnPoint() {
        if (!this.isValid()) return;

        if (!this.editing) {
            this.editing = true;
            this.#reset();
            this.buffer.push('0');
            this.pointer = 1;
        } else if (this.buffer.length === this.pointer) {
            this.pointer = -1;
        } else if (this.pointer === -1) {
            this.pointer = this.buffer.length;
        }

        this.#paint();
    }

    /**
     * Додавання до буфера введення знака "-" для представлення від'ємних чисел
     */
    fnSign() {
        if (!this.isValid()) return;

        this.editing = true;
        this.negative = !this.negative;
        this.#paint();
    }

    /**
     * Обчислення операцій обчислення значення степені 2
     */
    fnSqr() {
        if (!this.isValid()) return;

        const value = +this.readBuffer();
        this.setValue(Math.pow(value, 2));

        this.history.innerHTML = `${value}²=${this.value}`;

        this.operation = '';
        this.editing = false;
    }

    /**
     * Обчислення операцій виділення значення квадратного кореня
     */
    fnSqrt() {
        if (!this.isValid()) return;

        const value = +this.readBuffer();
        this.setValue(Math.sqrt(value));

        this.history.innerHTML = `√${value}=${this.value}`;

        this.operation = '';
        this.editing = false;
    }

    /**
     * Операції із допоміжною областю пам'яті. Підтримуються наступні значення:
     * MC - очистити допоміжну пам'ять
     * MR - завантажити значення до буфера введення
     * M+ - додати поточне значення з буфера введення до значення, яке міститься у допоміжній пам'яті
     * M- - відняти поточне значення з буфера введення від значення, яке міститься у допоміжній пам'яті
     * @param {Event} event Тип операції визначається з тексту кнопки, на яку було натиснено
     */
    fnMem(event) {
        const op = event?.target.textContent || 'MC';
        switch (op) {
            case 'MC':
                this.state.textContent = '';
                this.memory = 0;
                break;
            case 'MR':
                this.setValue(this.memory);
                break;
            case 'M+':
                const bufferAdd = +this.readBuffer();
                this.memory += bufferAdd;
                this.state.textContent = 'M';
                break;
            case 'M-':
                const bufferSub = +this.readBuffer();
                this.memory -= bufferSub;
                this.state.textContent = 'M';
                break;
        }
    }

    /**
     * Конструктор об'єкта типу Calculator
     * @param {HTMLElement} root Батьківський елемент, на якому створюється калькулятор
     * @param {boolean} useKeys Використовувати події клавіатури для активації клавіш калькулятора.
     *
     * Наразі, активна наступна розкладка клавіатури:
     *
     *   [MC] => Alt + "C", [MR] => Alt + "R", [M+] => Alt + "+", [M-] => Alt + "-",
     *
     *   [C] => "C", [√] => Alt + "/", [x²] => Alt + "*", [÷] => "/", [×] => "*",
     *   [−] => "-", [+] => "+", [±] => "!", [.] => ".", [=] => "Enter"
     *
     *   [0] => "0", [1] => "1", [2] => "2", [3] => "3", [4] => "4",
     *   [5] => "5", [6] => "6", [7] => "7", [8] => "8", [9] => "9",
     */
    constructor(root = document.body, useKeys = false) {
        if (useKeys) this.keyMap = [];
        this.#init(root);
        this.fnClear();
        this.fnMem(null);
    }

    /**
     * Визначення допустимості значень у буфері введення та проміжного значення для залучення їх до наступних обчислень
     * @returns {boolean}
     */
    isValid() {
        return this.buffer.length > 0 || Number.isFinite(this.value);
    }

    /**
     * Перетворення значення, яке міститься у буфері введення, до текстового представлення числа
     * @returns {string}
     */
    readBuffer() {
        const buffer = Array.from(this.buffer);
        if (~this.pointer) buffer.splice(this.pointer, 0, '.');
        return (this.negative ? '-' : '') + (buffer.join('') || '0');
    }

    /**
     * Запис числа до буфера введення із додатковими перевірками на обмеження кількості цифр.
     * У випадку, якщо вхідне число містить більше цифр, ніж може вмістити екран, виконується
     * зменшення їх кількості після знака коми шляхом округлення числа.
     * @param {number|string} value
     */
    setValue(value) {
        let floatValue = +value;
        let stringValue = Math.abs(floatValue).toString();
        let pointer = stringValue.indexOf('.');

        let allDigits = stringValue.length;
        let intDigits = pointer;

        if (intDigits === -1) {
            intDigits = allDigits;
        } else {
            allDigits--;
        }

        if (!Number.isFinite(floatValue) || this.MAX_DIGIT_COUNT < intDigits) {
            floatValue *= Infinity;
            stringValue = Math.abs(floatValue).toString()
            pointer = -1;
        } else if (allDigits > this.MAX_DIGIT_COUNT) {
            floatValue = +floatValue.toFixed(this.MAX_DIGIT_COUNT - intDigits);
            stringValue = Math.abs(floatValue).toString();
            pointer = stringValue.indexOf('.');
        }

        if (~pointer) {
            stringValue = stringValue.substring(0, pointer) + stringValue.substring(pointer + 1);
        }

        this.value = floatValue;
        this.negative = floatValue < 0;
        this.buffer = stringValue.split('');
        this.pointer = pointer;

        this.#paint();
    }

}

const root = document.getElementById('root');
const calculator = new Calculator(root, true);

