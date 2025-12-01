
import re

file_path = r'c:\Users\HP\OneDrive\Documents\GitHub\ai-code-typer\components\DashboardPage.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

stack = []
for i, line in enumerate(lines):
    for j, char in enumerate(line):
        if char == '{':
            stack.append((i + 1, j + 1))
        elif char == '}':
            if not stack:
                print(f"Extra closing brace at line {i + 1}, col {j + 1}")
            else:
                stack.pop()

if stack:
    print(f"Unclosed braces: {len(stack)}")
    for item in stack:
        print(f"Unclosed brace at line {item[0]}, col {item[1]}")
else:
    print("Braces are balanced.")
