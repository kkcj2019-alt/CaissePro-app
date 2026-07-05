import sys

def check_file(filename):
    with open(filename, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()

    lines = content.split('\n')
    stack = []
    in_string = False
    string_char = ''
    in_block_comment = False

    for i, line in enumerate(lines):
        in_line_comment = False
        j = 0
        while j < len(line):
            c = line[j]

            if in_block_comment:
                if c == '*' and j+1 < len(line) and line[j+1] == '/':
                    in_block_comment = False
                    j += 1
                j += 1
                continue

            if in_string:
                if c == '\\':
                    j += 2
                    continue
                if c == string_char:
                    in_string = False
                j += 1
                continue

            if c in '"\'`':
                in_string = True
                string_char = c
            elif c == '/' and j+1 < len(line) and line[j+1] == '/':
                break
            elif c == '/' and j+1 < len(line) and line[j+1] == '*':
                in_block_comment = True
                j += 1
            elif c in '{[(':
                stack.append((c, i + 1, j))
            elif c in '}])':
                if not stack:
                    print(f"Unmatched closing {c} at line {i+1}, col {j}")
                else:
                    top, line_num, col = stack[-1]
                    matches = {'{': '}', '[': ']', '(': ')'}
                    if matches[top] == c:
                        stack.pop()
                    else:
                        print(f"Mismatch at line {i+1}: expected closing for {top} from line {line_num}, got {c}")
                        stack.pop()
            j += 1

    for c, line, col in stack:
        print(f"Unclosed {c} from line {line}, col {col}")

check_file(r'e:\TEST CODE\CAISSE\app.js')
