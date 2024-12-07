import random
import math
import converters

class IntGenerator:
    def __init__(self, min, max):
        self.min = min
        self.max = max
            
    def generate(self):
        return random.randint(self.min, self.max)

class StringGenerator:
    def __init__(self, length, chars, unique, sorted):
        self.length = length
        self.chars = list(chars)
        self.unique = unique
        self.sorted = sorted

    def generate(self):
        array = []
        length = self.length.generate()

        if self.unique:
            random.shuffle(self.chars)
            array = self.chars[:length]
        else:
            for _ in range(length):
                array.append(random.choice(self.chars))
        
        if self.sorted:
            array.sort()
        
        return "".join(array)
    
class ArrayGenerator:
    def __init__(self, length, type, unique, sorted):
        self.length = length
        self.type = type
        self.unique = unique
        self.sorted = sorted

    def generate(self):
        array = []
        used = set()
        length = self.length.generate()
        strikes = 0

        if self.unique and isinstance(self.type, IntGenerator):
            return random.sample(range(self.type.min, self.type.max), length)
        
        while len(array) < length:
            new = self.type.generate()
            temp = tuple(new) if isinstance(new, list) else new

            if self.unique and temp in used:
                if strikes == 1000:
                    break
                strikes += 1
                continue

            used.add(temp)
            array.append(new)
            strikes = 0
        
        if self.sorted:
            array.sort()

        return array
    
if __name__ == "__main__":
    int_gen = IntGenerator(2, 10)
    str_gen = StringGenerator(int_gen, "qazxjsed", False, False)
    array_gen = ArrayGenerator(int_gen, str_gen, False, False)
    array2_gen = ArrayGenerator(int_gen, array_gen, False, False)
    array3_gen = ArrayGenerator(int_gen, int_gen, True, True)

    # print(int_gen.generate())
    # print(str_gen.generate())
    # print(array2_gen.generate())
    it = array2_gen.generate()
    #print(it)
    print(converters.convert_to_string(it))