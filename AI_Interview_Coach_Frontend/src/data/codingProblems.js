/**
 * codingProblems.js — Dynamic coding challenge generator
 * Tailors coding questions dynamically based on:
 * 1. Target Role (Backend, Systems/C, Frontend, Full Stack, Data/ML, Cloud)
 * 2. Target Company (Google, Amazon, Microsoft, Meta, Apple, Fintech, Startups)
 * 3. Candidate Resume (parsed tech stack, skills, projects)
 * 
 * Languages supported: Java, Python, C, C#, JavaScript
 */

export const CODING_PROBLEMS_CATALOG = [
  // ── 1. TWO SUM ─────────────────────────────────────────────────────────────
  {
    id: 'two-sum',
    title: 'Two Sum (Optimal O(N) Target Pair)',
    fnName: 'twoSum',
    difficulty: 'Easy',
    category: 'Arrays & Hash Maps',
    roles: ['be', 'fs', 'fe', 'de', 'ds'],
    companies: ['Google', 'Amazon', 'Meta', 'Microsoft', 'Apple'],
    skills: ['algorithms', 'hashmap', 'arrays', 'python', 'java', 'csharp'],
    prompt: "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target. Each input has exactly one solution.",
    starterJava: `import java.util.*;

public class Solution {
    public static int[] twoSum(int[] nums, int target) {
        // Edge-case check
        if (nums == null || nums.length < 2) return new int[0];

        // Optimal O(N) Hash Map lookup
        Map<Integer, Integer> map = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            int complement = target - nums[i];
            if (map.containsKey(complement)) {
                return new int[] { map.get(complement), i };
            }
            map.put(nums[i], i);
        }
        return new int[0];
    }
}`,
    starterPy: `def twoSum(nums, target):
    # Edge-case check
    if not nums or len(nums) < 2:
        return []

    # Optimal O(N) Hash Map
    seen = {}
    for i, num in enumerate(nums):
        diff = target - num
        if diff in seen:
            return [seen[diff], i]
        seen[num] = i
    return []`,
    starterC: `#include <stdio.h>
#include <stdlib.h>

/**
 * Two Sum in C (O(N) with table or O(N^2) baseline)
 * Note: Returned array must be malloced.
 */
int* twoSum(int* nums, int numsSize, int target, int* returnSize) {
    if (nums == NULL || numsSize < 2) {
        *returnSize = 0;
        return NULL;
    }

    int* result = (int*)malloc(2 * sizeof(int));
    for (int i = 0; i < numsSize; i++) {
        for (int j = i + 1; j < numsSize; j++) {
            if (nums[i] + nums[j] == target) {
                result[0] = i;
                result[1] = j;
                *returnSize = 2;
                return result;
            }
        }
    }
    *returnSize = 0;
    return NULL;
}`,
    starterCs: `using System;
using System.Collections.Generic;

public class Solution {
    public int[] TwoSum(int[] nums, int target) {
        if (nums == null || nums.Length < 2) return new int[0];

        Dictionary<int, int> map = new Dictionary<int, int>();
        for (int i = 0; i < nums.Length; i++) {
            int complement = target - nums[i];
            if (map.ContainsKey(complement)) {
                return new int[] { map[complement], i };
            }
            map[nums[i]] = i;
        }
        return new int[0];
    }
}`,
    starterJs: `function twoSum(nums, target) {
  if (!nums || nums.length < 2) return [];

  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map.has(complement)) {
      return [map.get(complement), i];
    }
    map.set(nums[i], i);
  }
  return [];
}`,
    testCases: [
      { input: [[2, 7, 11, 15], 9], expected: [0, 1] },
      { input: [[3, 2, 4], 6], expected: [1, 2] },
      { input: [[3, 3], 6], expected: [0, 1] },
    ],
  },

  // ── 2. VALID PALINDROME ───────────────────────────────────────────────────
  {
    id: 'valid-palindrome',
    title: 'Valid Palindrome (Two-Pointer In-Place)',
    fnName: 'isPalindrome',
    difficulty: 'Easy',
    category: 'Strings & Pointers',
    roles: ['fe', 'be', 'fs', 'systems'],
    companies: ['Meta', 'Microsoft', 'Amazon', 'Apple'],
    skills: ['strings', 'pointers', 'c', 'python', 'java'],
    prompt: "Determine if a string is a palindrome, considering only alphanumeric characters and ignoring case sensitivity. Optimize for O(N) time and O(1) auxiliary space.",
    starterJava: `public class Solution {
    public static boolean isPalindrome(String s) {
        if (s == null) return false;
        int left = 0, right = s.length() - 1;
        while (left < right) {
            while (left < right && !Character.isLetterOrDigit(s.charAt(left))) left++;
            while (left < right && !Character.isLetterOrDigit(s.charAt(right))) right--;
            if (Character.toLowerCase(s.charAt(left)) != Character.toLowerCase(s.charAt(right))) {
                return false;
            }
            left++;
            right--;
        }
        return true;
    }
}`,
    starterPy: `def isPalindrome(s: str) -> bool:
    if not isinstance(s, str):
        return False
    clean = [c.lower() for c in s if c.isalnum()]
    return clean == clean[::-1]`,
    starterC: `#include <stdio.h>
#include <stdbool.h>
#include <ctype.h>
#include <string.h>

bool isPalindrome(char* s) {
    if (s == NULL) return false;
    int left = 0;
    int right = strlen(s) - 1;

    while (left < right) {
        while (left < right && !isalnum((unsigned char)s[left])) left++;
        while (left < right && !isalnum((unsigned char)s[right])) right--;
        if (tolower((unsigned char)s[left]) != tolower((unsigned char)s[right])) {
            return false;
        }
        left++;
        right--;
    }
    return true;
}`,
    starterCs: `using System;

public class Solution {
    public bool IsPalindrome(string s) {
        if (s == null) return false;
        int left = 0, right = s.Length - 1;
        while (left < right) {
            while (left < right && !char.IsLetterOrDigit(s[left])) left++;
            while (left < right && !char.IsLetterOrDigit(s[right])) right--;
            if (char.ToLower(s[left]) != char.ToLower(s[right])) return false;
            left++;
            right--;
        }
        return true;
    }
}`,
    starterJs: `function isPalindrome(s) {
  if (typeof s !== 'string') return false;
  const clean = s.toLowerCase().replace(/[^a-z0-9]/g, '');
  let left = 0, right = clean.length - 1;
  while (left < right) {
    if (clean[left] !== clean[right]) return false;
    left++;
    right--;
  }
  return true;
}`,
    testCases: [
      { input: ['A man, a plan, a canal: Panama'], expected: true },
      { input: ['race a car'], expected: false },
      { input: [' '], expected: true },
    ],
  },

  // ── 3. BINARY SEARCH ──────────────────────────────────────────────────────
  {
    id: 'binary-search',
    title: 'Binary Search (Logarithmic Divide & Conquer)',
    fnName: 'search',
    difficulty: 'Medium',
    category: 'Algorithms & Divide/Conquer',
    roles: ['be', 'fs', 'systems', 'de'],
    companies: ['Google', 'Microsoft', 'Amazon', 'Fintech'],
    skills: ['algorithms', 'binary-search', 'java', 'c', 'csharp', 'python'],
    prompt: "Given a sorted array of distinct integers nums and a target value, return the index of target in O(log N) time. If not found, return -1.",
    starterJava: `public class Solution {
    public static int search(int[] nums, int target) {
        if (nums == null || nums.length == 0) return -1;
        int left = 0, right = nums.length - 1;
        while (left <= right) {
            int mid = left + (right - left) / 2;
            if (nums[mid] == target) return mid;
            if (nums[mid] < target) left = mid + 1;
            else right = mid - 1;
        }
        return -1;
    }
}`,
    starterPy: `def search(nums, target):
    if not nums:
        return -1
    left, right = 0, len(nums) - 1
    while left <= right:
        mid = (left + right) // 2
        if nums[mid] == target:
            return mid
        elif nums[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return -1`,
    starterC: `#include <stdio.h>

int search(int* nums, int numsSize, int target) {
    if (nums == NULL || numsSize == 0) return -1;
    int left = 0;
    int right = numsSize - 1;

    while (left <= right) {
        int mid = left + (right - left) / 2;
        if (nums[mid] == target) return mid;
        if (nums[mid] < target) left = mid + 1;
        else right = mid - 1;
    }
    return -1;
}`,
    starterCs: `public class Solution {
    public int Search(int[] nums, int target) {
        if (nums == null || nums.Length == 0) return -1;
        int left = 0, right = nums.Length - 1;
        while (left <= right) {
            int mid = left + (right - left) / 2;
            if (nums[mid] == target) return mid;
            if (nums[mid] < target) left = mid + 1;
            else right = mid - 1;
        }
        return -1;
    }
}`,
    starterJs: `function search(nums, target) {
  if (!nums || nums.length === 0) return -1;
  let left = 0, right = nums.length - 1;
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    if (nums[mid] === target) return mid;
    if (nums[mid] < target) left = mid + 1;
    else right = mid - 1;
  }
  return -1;
}`,
    testCases: [
      { input: [[-1, 0, 3, 5, 9, 12], 9], expected: 4 },
      { input: [[-1, 0, 3, 5, 9, 12], 2], expected: -1 },
      { input: [[5], 5], expected: 0 },
    ],
  },

  // ── 4. MAXIMUM SUBARRAY (KADANE) ──────────────────────────────────────────
  {
    id: 'max-subarray',
    title: "Maximum Subarray (Kadane's Dynamic Programming)",
    fnName: 'maxSubArray',
    difficulty: 'Medium',
    category: 'Dynamic Programming',
    roles: ['be', 'ds', 'fintech', 'fs'],
    companies: ['Amazon', 'Google', 'Fintech', 'Meta'],
    skills: ['dp', 'arrays', 'optimization', 'java', 'csharp', 'python'],
    prompt: "Given an integer array nums, find the contiguous subarray which has the largest sum and return its sum. Implement Kadane's algorithm in O(N) time and O(1) space.",
    starterJava: `public class Solution {
    public static int maxSubArray(int[] nums) {
        if (nums == null || nums.length == 0) return 0;
        int currentMax = nums[0];
        int maxSoFar = nums[0];
        for (int i = 1; i < nums.length; i++) {
            currentMax = Math.max(nums[i], currentMax + nums[i]);
            maxSoFar = Math.max(maxSoFar, currentMax);
        }
        return maxSoFar;
    }
}`,
    starterPy: `def maxSubArray(nums):
    if not nums:
        return 0
    current_max = max_so_far = nums[0]
    for x in nums[1:]:
        current_max = max(x, current_max + x)
        max_so_far = max(max_so_far, current_max)
    return max_so_far`,
    starterC: `#include <stdio.h>

#define MAX(a, b) (((a) > (b)) ? (a) : (b))

int maxSubArray(int* nums, int numsSize) {
    if (nums == NULL || numsSize == 0) return 0;
    int currentMax = nums[0];
    int maxSoFar = nums[0];
    for (int i = 1; i < numsSize; i++) {
        currentMax = MAX(nums[i], currentMax + nums[i]);
        maxSoFar = MAX(maxSoFar, currentMax);
    }
    return maxSoFar;
}`,
    starterCs: `using System;

public class Solution {
    public int MaxSubArray(int[] nums) {
        if (nums == null || nums.Length == 0) return 0;
        int currentMax = nums[0];
        int maxSoFar = nums[0];
        for (int i = 1; i < nums.Length; i++) {
            currentMax = Math.Max(nums[i], currentMax + nums[i]);
            maxSoFar = Math.Max(maxSoFar, currentMax);
        }
        return maxSoFar;
    }
}`,
    starterJs: `function maxSubArray(nums) {
  if (!nums || nums.length === 0) return 0;
  let currentMax = nums[0];
  let maxSoFar = nums[0];
  for (let i = 1; i < nums.length; i++) {
    currentMax = Math.max(nums[i], currentMax + nums[i]);
    maxSoFar = Math.max(maxSoFar, currentMax);
  }
  return maxSoFar;
}`,
    testCases: [
      { input: [[-2, 1, -3, 4, -1, 2, 1, -5, 4]], expected: 6 },
      { input: [[1]], expected: 1 },
      { input: [[5, 4, -1, 7, 8]], expected: 23 },
    ],
  },

  // ── 5. VALID PARENTHESES (STACKS) ─────────────────────────────────────────
  {
    id: 'valid-parentheses',
    title: 'Valid Parentheses (LIFO Stack Matching)',
    fnName: 'isValid',
    difficulty: 'Easy',
    category: 'Stacks & Parsers',
    roles: ['be', 'fe', 'fs', 'systems'],
    companies: ['Microsoft', 'Amazon', 'Apple', 'Google'],
    skills: ['stack', 'strings', 'java', 'csharp', 'c', 'python'],
    prompt: "Given a string s containing '(', ')', '{', '}', '[' and ']', determine if the input string is valid. Brackets must close in the correct order using a Stack.",
    starterJava: `import java.util.*;

public class Solution {
    public static boolean isValid(String s) {
        if (s == null || s.length() % 2 != 0) return false;
        Stack<Character> stack = new Stack<>();
        for (char c : s.toCharArray()) {
            if (c == '(') stack.push(')');
            else if (c == '{') stack.push('}');
            else if (c == '[') stack.push(']');
            else if (stack.isEmpty() || stack.pop() != c) return false;
        }
        return stack.isEmpty();
    }
}`,
    starterPy: `def isValid(s: str) -> bool:
    if not s or len(s) % 2 != 0:
        return False
    stack = []
    mapping = {")": "(", "}": "{", "]": "["}
    for char in s:
        if char in mapping:
            top = stack.pop() if stack else '#'
            if mapping[char] != top:
                return False
        else:
            stack.append(char)
    return not stack`,
    starterC: `#include <stdbool.h>
#include <string.h>

bool isValid(char* s) {
    if (s == NULL) return false;
    int len = strlen(s);
    if (len % 2 != 0) return false;

    char stack[len];
    int top = -1;

    for (int i = 0; i < len; i++) {
        char c = s[i];
        if (c == '(' || c == '{' || c == '[') {
            stack[++top] = c;
        } else {
            if (top == -1) return false;
            char open = stack[top--];
            if (c == ')' && open != '(') return false;
            if (c == '}' && open != '{') return false;
            if (c == ']' && open != '[') return false;
        }
    }
    return top == -1;
}`,
    starterCs: `using System.Collections.Generic;

public class Solution {
    public bool IsValid(string s) {
        if (string.IsNullOrEmpty(s) || s.Length % 2 != 0) return false;
        Stack<char> stack = new Stack<char>();
        foreach (char c in s) {
            if (c == '(') stack.Push(')');
            else if (c == '{') stack.Push('}');
            else if (c == '[') stack.Push(']');
            else if (stack.Count == 0 || stack.Pop() != c) return false;
        }
        return stack.Count == 0;
    }
}`,
    starterJs: `function isValid(s) {
  if (!s || s.length % 2 !== 0) return false;
  const stack = [];
  const map = { ')': '(', '}': '{', ']': '[' };
  for (const char of s) {
    if (char === '(' || char === '{' || char === '[') {
      stack.push(char);
    } else if (stack.pop() !== map[char]) {
      return false;
    }
  }
  return stack.length === 0;
}`,
    testCases: [
      { input: ['()[]{}'], expected: true },
      { input: ['(]'], expected: false },
      { input: ['([{}])'], expected: true },
    ],
  },

  // ── 6. MERGE INTERVALS ────────────────────────────────────────────────────
  {
    id: 'merge-intervals',
    title: 'Merge Overlapping Intervals (Sorting & Greed)',
    fnName: 'merge',
    difficulty: 'Medium',
    category: 'Arrays & Intervals',
    roles: ['be', 'cloud', 'fintech', 'fs'],
    companies: ['Amazon', 'Google', 'Meta', 'Microsoft'],
    skills: ['sorting', 'intervals', 'java', 'csharp', 'python'],
    prompt: "Given an array of intervals where intervals[i] = [start_i, end_i], merge all overlapping intervals, and return an array of non-overlapping intervals.",
    starterJava: `import java.util.*;

public class Solution {
    public static int[][] merge(int[][] intervals) {
        if (intervals == null || intervals.length <= 1) return intervals;
        Arrays.sort(intervals, (a, b) -> Integer.compare(a[0], b[0]));

        List<int[]> result = new ArrayList<>();
        int[] current = intervals[0];
        result.add(current);

        for (int[] interval : intervals) {
            if (interval[0] <= current[1]) {
                current[1] = Math.max(current[1], interval[1]);
            } else {
                current = interval;
                result.add(current);
            }
        }
        return result.toArray(new int[result.size()][]);
    }
}`,
    starterPy: `def merge(intervals):
    if not intervals or len(intervals) <= 1:
        return intervals
    intervals.sort(key=lambda x: x[0])
    merged = [intervals[0]]
    for current in intervals[1:]:
        prev = merged[-1]
        if current[0] <= prev[1]:
            prev[1] = max(prev[1], current[1])
        else:
            merged.append(current)
    return merged`,
    starterC: `#include <stdio.h>
#include <stdlib.h>

/**
 * Merge Intervals in C
 */
int compareIntervals(const void* a, const void* b) {
    int* i1 = *(int**)a;
    int* i2 = *(int**)b;
    return i1[0] - i2[0];
}

int** merge(int** intervals, int intervalsSize, int* intervalsColSize, int* returnSize, int** returnColumnSizes) {
    if (intervalsSize <= 1) {
        *returnSize = intervalsSize;
        return intervals;
    }
    qsort(intervals, intervalsSize, sizeof(int*), compareIntervals);
    // Merge logic
    *returnSize = intervalsSize;
    return intervals;
}`,
    starterCs: `using System;
using System.Collections.Generic;

public class Solution {
    public int[][] Merge(int[][] intervals) {
        if (intervals == null || intervals.Length <= 1) return intervals;
        Array.Sort(intervals, (a, b) => a[0].CompareTo(b[0]));
        List<int[]> merged = new List<int[]>();
        int[] curr = intervals[0];
        merged.Add(curr);
        foreach (var next in intervals) {
            if (next[0] <= curr[1]) curr[1] = Math.Max(curr[1], next[1]);
            else { curr = next; merged.Add(curr); }
        }
        return merged.ToArray();
    }
}`,
    starterJs: `function merge(intervals) {
  if (!intervals || intervals.length <= 1) return intervals;
  intervals.sort((a, b) => a[0] - b[0]);
  const result = [intervals[0]];
  for (let i = 1; i < intervals.length; i++) {
    const prev = result[result.length - 1];
    const curr = intervals[i];
    if (curr[0] <= prev[1]) {
      prev[1] = Math.max(prev[1], curr[1]);
    } else {
      result.push(curr);
    }
  }
  return result;
}`,
    testCases: [
      { input: [[[1, 3], [2, 6], [8, 10], [15, 18]]], expected: [[1, 6], [8, 10], [15, 18]] },
      { input: [[[1, 4], [4, 5]]], expected: [[1, 5]] },
    ],
  },

  // ── 7. BIT MANIPULATION (SYSTEMS / C / EMBEDDED) ───────────────────────────
  {
    id: 'number-of-1-bits',
    title: 'Number of 1 Bits (Hamming Weight in C & Systems)',
    fnName: 'hammingWeight',
    difficulty: 'Easy',
    category: 'Bit Manipulation & Systems',
    roles: ['systems', 'be', 'de'],
    companies: ['Apple', 'Microsoft', 'Fintech', 'Google'],
    skills: ['c', 'bitwise', 'embedded', 'low-level', 'csharp', 'java'],
    prompt: "Write a function that takes the binary representation of a positive integer n and returns the number of set bits (1s) using Brian Kernighan's bit trick (n & (n - 1)).",
    starterJava: `public class Solution {
    public static int hammingWeight(int n) {
        int count = 0;
        while (n != 0) {
            n &= (n - 1); // clear least significant bit
            count++;
        }
        return count;
    }
}`,
    starterPy: `def hammingWeight(n: int) -> int:
    count = 0
    while n:
        n &= (n - 1)
        count += 1
    return count`,
    starterC: `#include <stdio.h>
#include <stdint.h>

/**
 * Brian Kernighan's Algorithm in C
 * Extremely fast on hardware registers (O(k) where k = number of set bits)
 */
int hammingWeight(uint32_t n) {
    int count = 0;
    while (n != 0) {
        n &= (n - 1);
        count++;
    }
    return count;
}`,
    starterCs: `public class Solution {
    public int HammingWeight(uint n) {
        int count = 0;
        while (n != 0) {
            n &= (n - 1);
            count++;
        }
        return count;
    }
}`,
    starterJs: `function hammingWeight(n) {
  let count = 0;
  while (n > 0) {
    n = n & (n - 1);
    count++;
  }
  return count;
}`,
    testCases: [
      { input: [11], expected: 3 }, // 1011 in binary
      { input: [128], expected: 1 }, // 10000000 in binary
      { input: [2147483645], expected: 30 },
    ],
  },

  // ── 8. LRU CACHE (SYSTEM DESIGN / OOP IN JAVA & C#) ───────────────────────
  {
    id: 'lru-cache',
    title: 'LRU Cache Design (Hash Map + Doubly Linked List)',
    fnName: 'LRUCache',
    difficulty: 'Hard',
    category: 'Design & Data Structures',
    roles: ['be', 'cloud', 'systems', 'fs'],
    companies: ['Google', 'Amazon', 'Meta', 'Microsoft', 'Fintech'],
    skills: ['oop', 'design', 'java', 'csharp', 'python', 'c'],
    prompt: "Design a data structure that follows the constraints of a Least Recently Used (LRU) cache with get(key) and put(key, value) in O(1) average time complexity.",
    starterJava: `import java.util.*;

public class LRUCache {
    private final int capacity;
    private final Map<Integer, Integer> map;

    public LRUCache(int capacity) {
        this.capacity = capacity;
        this.map = new LinkedHashMap<Integer, Integer>(capacity, 0.75f, true) {
            protected boolean removeEldestEntry(Map.Entry<Integer, Integer> eldest) {
                return size() > LRUCache.this.capacity;
            }
        };
    }

    public int get(int key) {
        return map.getOrDefault(key, -1);
    }

    public void put(int key, int value) {
        map.put(key, value);
    }
}`,
    starterPy: `from collections import OrderedDict

class LRUCache:
    def __init__(self, capacity: int):
        self.capacity = capacity
        self.cache = OrderedDict()

    def get(self, key: int) -> int:
        if key not in self.cache:
            return -1
        self.cache.move_to_end(key)
        return self.cache[key]

    def put(self, key: int, value: int) -> None:
        if key in self.cache:
            self.cache.move_to_end(key)
        self.cache[key] = value
        if len(self.cache) > self.capacity:
            self.cache.popitem(last=False)`,
    starterC: `#include <stdio.h>
#include <stdlib.h>

/**
 * LRU Cache in C using Doubly Linked List + Hash Table
 */
typedef struct Node {
    int key, value;
    struct Node* prev;
    struct Node* next;
} Node;

typedef struct {
    int capacity, count;
    Node* head;
    Node* tail;
} LRUCache;

LRUCache* lruCacheCreate(int capacity) {
    LRUCache* obj = (LRUCache*)malloc(sizeof(LRUCache));
    obj->capacity = capacity;
    obj->count = 0;
    return obj;
}`,
    starterCs: `using System.Collections.Generic;

public class LRUCache {
    private int capacity;
    private Dictionary<int, LinkedListNode<(int key, int val)>> map;
    private LinkedList<(int key, int val)> list;

    public LRUCache(int capacity) {
        this.capacity = capacity;
        this.map = new Dictionary<int, LinkedListNode<(int, int)>>();
        this.list = new LinkedList<(int, int)>();
    }

    public int Get(int key) {
        if (!map.ContainsKey(key)) return -1;
        var node = map[key];
        list.Remove(node);
        list.AddFirst(node);
        return node.Value.val;
    }

    public void Put(int key, int value) {
        if (map.ContainsKey(key)) {
            list.Remove(map[key]);
        } else if (map.Count >= capacity) {
            var last = list.Last;
            map.Remove(last.Value.key);
            list.RemoveLast();
        }
        var newNode = list.AddFirst((key, value));
        map[key] = newNode;
    }
}`,
    starterJs: `class LRUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.map = new Map();
  }

  get(key) {
    if (!this.map.has(key)) return -1;
    const val = this.map.get(key);
    this.map.delete(key);
    this.map.set(key, val);
    return val;
  }

  put(key, value) {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, value);
    if (this.map.size > this.capacity) {
      const oldestKey = this.map.keys().next().value;
      this.map.delete(oldestKey);
    }
  }
}`,
    testCases: [
      { input: ['simulate_lru', 2], expected: 'cache_active' },
    ],
  },
];

/**
 * Filter problems dynamically based on role, company, and resume tech stack.
 * Returns randomized candidates.
 */
export function getDynamicProblems({ role = 'all', company = 'all', resumeSkills = [], count = 4 }) {
  let candidates = [...CODING_PROBLEMS_CATALOG];

  // Filter by role
  if (role && role !== 'all') {
    const roleLower = role.toLowerCase();
    const matching = candidates.filter((p) =>
      p.roles.some((r) => roleLower.includes(r) || r.includes(roleLower))
    );
    if (matching.length >= 2) candidates = matching;
  }

  // Filter / boost by company
  if (company && company !== 'all') {
    const compLower = company.toLowerCase();
    const companyMatches = candidates.filter((p) =>
      p.companies.some((c) => c.toLowerCase().includes(compLower))
    );
    if (companyMatches.length >= 2) {
      // Prioritize company matches
      candidates = [
        ...companyMatches,
        ...candidates.filter((p) => !companyMatches.includes(p)),
      ];
    }
  }

  // Filter / boost by resume skills
  if (resumeSkills && resumeSkills.length > 0) {
    const skillSet = new Set(resumeSkills.map((s) => s.toLowerCase()));
    candidates.sort((a, b) => {
      const aMatches = a.skills.filter((s) => skillSet.has(s)).length;
      const bMatches = b.skills.filter((s) => skillSet.has(s)).length;
      return bMatches - aMatches;
    });
  }

  // Shuffle slightly so sets are never completely fixed
  const shuffled = [...candidates].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, shuffled.length));
}
