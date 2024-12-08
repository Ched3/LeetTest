import random
import math
import converters

class IntGenerator:
    def __init__(self, min, max):
        self.min = min
        self.max = max
            
    def generate(self):
        return random.randint(self.min, self.max)
    
class FloatGenerator:
    def __init__(self, min, max):
        self.min = min
        self.max = max

    def generate(self):
        return random.uniform(self.min, self.max)

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

class TreeNode:
    def __init__(self, val = 0, left = None, right = None):
        self.val = val
        self.left = left
        self.right = right
    
class TreeGenerator:
    def __init__(self, nodes, range, unique, complete, BST):
        self.nodes = nodes
        self.range = range
        self.unique = unique
        self.complete = complete
        self.BST = BST

    def generate_BST(self, arr): # compelete -> balanced
        if not arr:
            return None
        
        i = len(arr) // 2 if self.complete else random.randint(0, len(arr) - 1)

        root = TreeNode(arr[i])
        root.left = self.generate_BST(arr[:i])
        root.right = self.generate_BST(arr[i + 1:])

        return root
    
    def generate_complete_tree(self, num_nodes):
        if self.unique:
            num_nodes = min(num_nodes, self.range.max - self.range.min + 1)
            nodes = random.sample(range(self.range.min, self.range.max + 1), num_nodes)
        else:
            nodes = [self.range.generate() for _ in range(num_nodes)]

        root = TreeNode(nodes.pop())
        queue = [root]
        count = 1

        while count < num_nodes:
            next_queue = []

            for node in queue:
                if count < num_nodes:
                    left = TreeNode(nodes.pop(0))
                    node.left = left
                    next_queue.append(left)
                    count += 1

                if count < num_nodes:
                    right = TreeNode(nodes.pop(0))
                    node.right = right
                    next_queue.append(right)
                    count += 1

            queue = next_queue

        return root    
    
    def generate_tree(self, num_nodes):
        if self.unique:
            num_nodes = min(num_nodes, self.range.max - self.range.min + 1)
            nodes = random.sample(range(self.range.min, self.range.max + 1), num_nodes)
        else:
            nodes = [self.range.generate() for _ in range(num_nodes)]

        root = TreeNode(nodes.pop())
        queue = [root]
        count = 1

        while count < num_nodes:
            curr = queue.pop()

            has_left = random.randint(0, 5)
            has_right = random.randint(0, 5)

            if not has_left and not has_right:
                if random.randint(0, 1):
                    has_left = True
                else:
                    has_right = True
            
            children_order = [("L", has_left), ("R", has_right)]
            random.shuffle(children_order)

            for direction, has_child in children_order:
                if has_child and count < num_nodes:
                    child_node = TreeNode(nodes.pop())
                    
                    if direction == "L":
                        curr.left = child_node
                    else:
                        curr.right = child_node

                    queue.append(child_node)
                    count += 1

        return root

    def generate(self):
        num_nodes = self.nodes.generate()

        if not num_nodes:
            return None
        
        if self.BST:
            num_nodes = min(num_nodes, self.range.max - self.range.min + 1)
            arr = sorted(random.sample(range(self.range.min, self.range.max + 1), num_nodes))
            return self.generate_BST(arr)
        elif self.complete:
            return self.generate_complete_tree(num_nodes)
        else:
            return self.generate_tree(num_nodes)
        
class GraphGenerator:

    def __init__(self, nodes, edges, weight = None):
        self.nodes = nodes
        self.edges = edges
        self.weight = weight

    def generate(self):
        res = []
        num_nodes = self.nodes.generate()
        num_edges = self.edges.generate()

        if not num_nodes:
            return res

        for _ in range(num_edges):
            entry = [random.randint(0, num_nodes - 1), random.randint(0, num_nodes - 1)]
            if self.weight:
                entry.append(self.weight.generate())
            res.append(entry)
    
        return res
            
if __name__ == "__main__":
    int_gen = IntGenerator(20,100)
    int_gen2 = IntGenerator(100,200)
    int_gen3 = IntGenerator(0,10)
    str_gen = StringGenerator(int_gen, "qazxjsed", False, False)
    array_gen = ArrayGenerator(int_gen, str_gen, False, False)
    array2_gen = ArrayGenerator(int_gen, array_gen, False, False)
    array3_gen = ArrayGenerator(int_gen, int_gen, True, True)
    tree_gen = TreeGenerator(int_gen, int_gen, False, True, True) # unique, complete, BST
    graph_gen = GraphGenerator(int_gen3, int_gen3, FloatGenerator(0, 1))
    # print(int_gen.generate())
    # print(str_gen.generate())
    # print(array2_gen.generate())
    #it = array2_gen.generate()
    # print(it)
    # print(converters.convert_to_string(it))

    # x = converters.tree_to_string(tree_gen.generate())
    # print(x.count(",") + 1 - x.count("null"))
    # print(x)

    y = converters.convert_to_string(graph_gen.generate())
    print(y)