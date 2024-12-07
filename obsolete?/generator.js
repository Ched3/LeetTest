import { shuffle } from './misc.js';

const lowercase_letters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'];
const uppercase_letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
const string_numbers =  ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
const rest_printable = [' ',  '!', '"', '#', '$', '%', '&',  "'", '(', ')', '*', '+', ',',  '-', '.', '/', ':', ';', '<',  '=', '>', '?', '@', '[', '\\', ']', '^', '_', '`', '{', '|',  '}', '~'];

class IntGenerator {
    constructor(min, max) {
        this.min = min;
        this.max = max;
    }

    generate() {
        return Math.floor(Math.random() * (this.max - this.min + 1)) + this.min;
    }
}

class StringGenerator {
    constructor(length, characters, unique, sorted) {
        this.length = length;
        this.characters = characters.split("");
        this.unique = unique;
        this.sorted = sorted;
    }

    generate() {
        let array = [];
        const len = Math.min(this.length.generate(), this.characters.length);

        if (this.unique) {
            array = shuffle(this.characters).slice(0, len);
        } else {
            for (let i = 0; i < len; i++) {
                array.push(this.characters[Math.floor(Math.random() * this.characters.length)]);
            }
        }

        if (this.sorted) {
            array.sort();
        }

        return array.join("");
    }
}

class ArrayGenerator {
    constructor(length, type, unique, sorted) {
        this.length = length;
        this.type = type;
        this.unique = unique;
        this.sorted = sorted;
    }

    generate() {
        let res;
        const len = this.length.generate()

        // if (this.unique) {
        //     res = new Set();

        //     for (let i = 0; i < len; i++) {
        //         const new = this.unique                
        //     }
        // }
        return [1,2,3]
    }
}

const test1 = new IntGenerator(10, 15);
const test2 = new StringGenerator(test1, "qwertyuiopasdfghjklzxcvbnm", false, false);

console.log("-----------------------------------------------------------------------------")

console.log(test1.generate());
console.log(test2.generate());

console.log("-----------------------------------------------------------------------------");
