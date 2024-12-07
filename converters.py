def convert_to_string(item):
    if isinstance(item, int):
        return str(item)
    elif isinstance(item, str):
        return "\"" + item + "\""
    else:
        res = []
        for it in item:
            res.append(convert_to_string(it))
        return "[" + ", ".join(res) + "]"