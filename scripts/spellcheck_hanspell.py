import difflib
import json
import sys


def make_issues(original, checked):
    issues = []
    matcher = difflib.SequenceMatcher(None, original, checked)

    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == "equal":
            continue

        original_part = original[i1:i2]
        replacement = checked[j1:j2]
        if original_part == replacement:
            continue

        issues.append(
            {
                "start": i1,
                "end": i2,
                "original": original_part,
                "candidates": [replacement],
                "help": "py-hanspell suggestion",
            }
        )

    return issues


def main():
    try:
        payload = json.loads(sys.stdin.read() or "{}")
        text = str(payload.get("text") or "")

        if not text.strip():
            print(json.dumps({"ok": True, "issues": []}, ensure_ascii=False))
            return

        from hanspell import spell_checker

        result = spell_checker.check(text)
        data = result.as_dict() if hasattr(result, "as_dict") else result
        checked = str(data.get("checked") or text)
        issues = make_issues(text, checked)
        print(json.dumps({"ok": True, "issues": issues}, ensure_ascii=False))
    except Exception as exc:
        print(json.dumps({"ok": False, "error": str(exc)}, ensure_ascii=False))
        sys.exit(1)


if __name__ == "__main__":
    main()
