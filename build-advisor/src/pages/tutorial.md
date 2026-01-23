# Build JSON Tutorial

Create custom build orders for **SC2 Waterfall**. This guide walks you through
creating valid, flexible JSON build files that work with the Build Advisor.

---

## 1. Base Structure
Every build file starts with a name, race, and a list of steps.

```json
{
  "name": "Terran Macro Opener",
  "race": "Terran",
  "steps": []
}
```

---

## 2. Build Steps
Steps are executed in order. Each step should include a time, supply, and action.

```json
{
  "time": "0:38",
  "supply": 16,
  "action": "Barracks"
}
```

Extra keys are allowed and will be safely ignored.

---

## 3. Python Example (Optional Tools)
You may generate or validate build files using scripts.

```python
import json

with open("build.json") as f:
    build = json.load(f)

print(build["name"])
```

---

## 4. Tips
- Use **mm:ss** for time values
- Keep steps ordered by time
- Ensure the JSON is valid before loading
- You may add extra metadata fields if needed
`;

---