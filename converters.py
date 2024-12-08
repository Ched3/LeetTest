def convert_to_string(item):
    if isinstance(item, int) or isinstance(item, float):
        return str(item)
    elif isinstance(item, str):
        return "\"" + item + "\""
    else:
        res = []
        for it in item:
            res.append(convert_to_string(it))
        return "[" + ", ".join(res) + "]"
    
def tree_to_string(root):
    if not root:
        return "[]"

    res = []
    queue = [root]

    while queue:
        temp = []
        for node in queue:
            if not node:
                res.append("null")
            else:
                res.append(str(node.val))
                temp.append(node.left)
                temp.append(node.right)
        queue = temp

    while res and res[-1] == "null":
        res.pop()

    return "[" + ", ".join(res) + "]"