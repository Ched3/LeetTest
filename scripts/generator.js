// generators.js — Client-side test case generators for LeetTest
// Bundled with the extension. All functions are globally available
// to LLM-generated code (no imports needed).

// ────────────────────────────────────────────
//  Primitives
// ────────────────────────────────────────────

function generateInt(minValue, maxValue) {
    return Math.floor(Math.random() * (maxValue - minValue + 1)) + minValue;
  }
  
  function generateFloat(minValue, maxValue) {
    return Math.random() * (maxValue - minValue) + minValue;
  }
  
  function generateString(length, chars, { unique = false, sortedOrder = false } = {}) {
    const charArr = chars.split("");
    let result;
    if (unique) {
      length = Math.min(length, charArr.length);
      const shuffled = [...charArr];
      _shuffle(shuffled);
      result = shuffled.slice(0, length);
    } else {
      result = Array.from({ length }, () => charArr[generateInt(0, charArr.length - 1)]);
    }
    if (sortedOrder) result.sort();
    return result.join("");
  }
  
  // ────────────────────────────────────────────
  //  Arrays
  // ────────────────────────────────────────────
  
  function generateArray(length, generator, { unique = false, sortedOrder = false } = {}) {
    let elements;
    if (!unique) {
      elements = Array.from({ length }, () => generator());
    } else {
      const seen = new Set();
      elements = [];
      const maxAttempts = length * 10;
      for (let i = 0; i < maxAttempts && elements.length < length; i++) {
        const x = generator();
        const key = typeof x === "object" ? JSON.stringify(x) : x;
        if (!seen.has(key)) {
          seen.add(key);
          elements.push(x);
        }
      }
    }
    if (sortedOrder) elements.sort(_compare);
    return elements;
  }
  
  function generateIntArray(length, minValue, maxValue, { unique = false, sortedOrder = false } = {}) {
    let array;
    if (unique) {
      length = Math.min(length, maxValue - minValue + 1);
      const range = Array.from({ length: maxValue - minValue + 1 }, (_, i) => i + minValue);
      _shuffle(range);
      array = range.slice(0, length);
    } else {
      array = Array.from({ length }, () => generateInt(minValue, maxValue));
    }
    if (sortedOrder) array.sort((a, b) => a - b);
    return array;
  }
  
  // ────────────────────────────────────────────
  //  Matrices
  // ────────────────────────────────────────────
  
  function generate2dArray(rows, cols, generator, {
    rowUnique = false, rowSorted = false,
    matrixUnique = false, matrixSorted = false,
  } = {}) {
    let matrix = Array.from({ length: rows }, () =>
      generateArray(cols, generator, { unique: rowUnique, sortedOrder: rowSorted })
    );
    if (matrixUnique) {
      const seen = new Set();
      matrix = matrix.filter((row) => {
        const key = JSON.stringify(row);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }
    if (matrixSorted) {
      matrix.sort((a, b) => {
        for (let i = 0; i < Math.min(a.length, b.length); i++) {
          if (a[i] < b[i]) return -1;
          if (a[i] > b[i]) return 1;
        }
        return a.length - b.length;
      });
    }
    return matrix;
  }
  
  function generateIntMatrix(rows, cols, minValue, maxValue, {
    rowUnique = false, rowSorted = false,
    matrixUnique = false, matrixSorted = false,
  } = {}) {
    return generate2dArray(rows, cols, () => generateInt(minValue, maxValue), {
      rowUnique, rowSorted, matrixUnique, matrixSorted,
    });
  }
  
  // ────────────────────────────────────────────
  //  Trees
  // ────────────────────────────────────────────
  
  class TreeNode {
    constructor(val = 0, left = null, right = null) {
      this.val = val;
      this.left = left;
      this.right = right;
    }
  }
  
  function generateTree(nodes, minValue, maxValue, {
    unique = false, bst = false, complete = false,
  } = {}) {
    if (nodes <= 0) return null;
    if (bst) return _generateBst(nodes, minValue, maxValue, complete);
    if (complete) return _generateCompleteTree(nodes, minValue, maxValue, unique);
    return _generateRandomTree(nodes, minValue, maxValue, unique);
  }
  
  function _generateValues(count, minValue, maxValue, unique) {
    if (unique) {
      count = Math.min(count, maxValue - minValue + 1);
      return generateIntArray(count, minValue, maxValue, { unique: true });
    }
    return Array.from({ length: count }, () => generateInt(minValue, maxValue));
  }
  
  function _generateBst(nodes, minValue, maxValue, balanced) {
    nodes = Math.min(nodes, maxValue - minValue + 1);
    const values = generateIntArray(nodes, minValue, maxValue, { unique: true, sortedOrder: true });
  
    function build(arr) {
      if (arr.length === 0) return null;
      const i = balanced ? Math.floor(arr.length / 2) : generateInt(0, arr.length - 1);
      const node = new TreeNode(arr[i]);
      node.left = build(arr.slice(0, i));
      node.right = build(arr.slice(i + 1));
      return node;
    }
    return build(values);
  }
  
  function _generateCompleteTree(nodes, minValue, maxValue, unique) {
    const values = _generateValues(nodes, minValue, maxValue, unique);
    const n = values.length;
    const root = new TreeNode(values[0]);
    const queue = [root];
    let i = 1;
    while (i < n) {
      const parent = queue.shift();
      if (i < n) {
        parent.left = new TreeNode(values[i++]);
        queue.push(parent.left);
      }
      if (i < n) {
        parent.right = new TreeNode(values[i++]);
        queue.push(parent.right);
      }
    }
    return root;
  }
  
  function _generateRandomTree(nodes, minValue, maxValue, unique) {
    const values = _generateValues(nodes, minValue, maxValue, unique);
    const n = values.length;
    const root = new TreeNode(values[0]);
    const openSlots = [[root, "left"], [root, "right"]];
    for (let i = 1; i < n; i++) {
      const idx = generateInt(0, openSlots.length - 1);
      const [parent, direction] = openSlots.splice(idx, 1)[0];
      const child = new TreeNode(values[i]);
      parent[direction] = child;
      openSlots.push([child, "left"], [child, "right"]);
    }
    return root;
  }
  
  // ────────────────────────────────────────────
  //  Graphs
  // ────────────────────────────────────────────
  
  function generateGraph(nodes, edges, {
    directed = false, selfLoops = false,
    uniqueEdges = true, weightGenerator = null,
  } = {}) {
    if (nodes <= 0) return [];
    const seen = new Set();
    const result = [];
    const maxAttempts = edges * 10;
    for (let attempt = 0; attempt < maxAttempts && result.length < edges; attempt++) {
      const u = generateInt(0, nodes - 1);
      const v = generateInt(0, nodes - 1);
      if (!selfLoops && u === v) continue;
      const edgeKey = directed ? `${u},${v}` : `${Math.min(u, v)},${Math.max(u, v)}`;
      if (uniqueEdges && seen.has(edgeKey)) continue;
      seen.add(edgeKey);
      const entry = directed ? [u, v] : [Math.min(u, v), Math.max(u, v)];
      if (weightGenerator) entry.push(weightGenerator());
      result.push(entry);
    }
    return result;
  }
  
  // ────────────────────────────────────────────
  //  Serialization (for displaying test cases)
  // ────────────────────────────────────────────
  
  function treeToString(root) {
    if (!root) return "[]";
    const res = [];
    let queue = [root];
    while (queue.length > 0) {
      const next = [];
      for (const node of queue) {
        if (node === null) {
          res.push("null");
        } else {
          res.push(String(node.val));
          next.push(node.left);
          next.push(node.right);
        }
      }
      queue = next;
    }
    while (res.length > 0 && res[res.length - 1] === "null") res.pop();
    return "[" + res.join(",") + "]";
  }
  
  function convertToString(item) {
    if (item === null || item === undefined) return "[]";
    if (typeof item === "number" || typeof item === "boolean") return String(item);
    if (typeof item === "string") return '"' + item + '"';
    if (item instanceof TreeNode) return treeToString(item);
    if (Array.isArray(item)) return "[" + item.map(convertToString).join(",") + "]";
    return String(item);
  }
  
  // ────────────────────────────────────────────
  //  Internal helpers
  // ────────────────────────────────────────────
  
  function _shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }
  
  function _compare(a, b) {
    if (typeof a === "number" && typeof b === "number") return a - b;
    return String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0;
  }