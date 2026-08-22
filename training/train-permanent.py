"""train-permanent.py - permanent local training loop.

Architecture (locked):
  Internet UP + KILOCODE key:  hy3-free  teacher -> distill -> gema4 2b/4b/12b + qwen3.6
  Internet DOWN or no key:     qwen3.6:27b  local teacher (Ollama on :11434)

Honest behaviour (no fake training):
  - If online path 401s or fails for any reason, it falls back to the
    local qwen3.6:27b teacher and logs that fallback.
  - If the local teacher call also fails, we log a FAILED line and do
    NOT create a fake -trained alias (no `ollama create` with garbage).
  - Every run writes one JSONL history line per student.
  - Keys stay in the environment ONLY; never written to disk.

Run: .venv/bin/python training/train-permanent.py "<task>"
"""
import os, json, time, hashlib, sys, socket
from datetime import datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) or "/mnt/c/Users/User/hostamar-build"
LOG = os.path.join(ROOT, "training", "training-history.jsonl")
os.makedirs(os.path.join(ROOT, "training"), exist_ok=True)

from openai import OpenAI  # verified installed in .venv

LOCAL = "http://localhost:11434/v1"
KILO = "https://api.kilocode.ai/v1"
STUDENTS_ONLINE  = ["gema4:2b", "gema4:4b", "gema4:12b", "qwen3.6"]
STUDENTS_OFFLINE = ["gema4:2b", "gema4:4b", "gema4:12b"]  # qwen3.6 is the offline teacher -> skip self-train


def internet_up() -> bool:
    try:
        socket.create_connection(("8.8.8.8", 53), timeout=3)
        return True
    except OSError:
        return False


def has_kilocode_key() -> bool:
    k = os.getenv("KILOCODE_API_KEY_1", "")
    return bool(k) and k != "placeholder"


def _new_id(student: str) -> str:
    return hashlib.sha256(f"{student}{time.time()}{os.getpid()}".encode()).hexdigest()[:12]


def _write(cert: dict) -> None:
    with open(LOG, "a") as f:
        f.write(json.dumps(cert) + "\n")


def _distill(student: str, task: str, teacher_name: str, client: OpenAI, max_tokens=600):
    """Call the teacher and create the <student>-trained Ollama alias.

    Returns the training_data text, or raises on real failure.
    Never called with a placeholder key (caller guards).
    """
    resp = client.chat.completions.create(
        model=teacher_name,
        messages=[
            {"role": "system", "content": f"You are teacher {teacher_name}. Train student {student} for a Hostamar task. Output an improved system prompt + 2 short examples. Bangla-first where natural."},
            {"role": "user", "content": f"Task: {task}\n\nStudent: {student}\n\nGive system prompt + 2 examples."},
        ],
        max_tokens=max_tokens,
    )
    data = resp.choices[0].message.content or ""
    if not data.strip():
        raise RuntimeError("teacher returned empty content")
    safe = student.replace(":", "-")
    modelfile = f'FROM {student}\nSYSTEM """{data[:1500]}\n\nHostamar permanent local trained from {teacher_name}."""\n'
    with open(f"/tmp/Modelfile-{safe}", "w") as f:
        f.write(modelfile)
    rc = os.system(f"ollama create {student}-trained -f /tmp/Modelfile-{safe} >/dev/null 2>&1")
    if rc != 0:
        raise RuntimeError(f"ollama create failed rc={rc}")
    return data


def train_online(student: str, task: str) -> dict:
    cert_base = {"id": _new_id(student), "timestamp": datetime.now().isoformat(),
                 "student": student, "task": task[:80], "permanent": True}
    if not has_kilocode_key():
        print(f"[online] no KILOCODE_API_KEY_1 -> offline fallback for {student}")
        return train_offline(student, task)
    try:
        client = OpenAI(base_url=KILO, api_key=os.environ["KILOCODE_API_KEY_1"])
        data = _distill(student, task, "hy3-free", client)
        cert = dict(cert_base, teacher="hy3-free", internet=True,
                    training_hash=hashlib.sha256(data.encode()).hexdigest()[:12])
        _write(cert)
        print(f"TRAINED ONLINE  {student} <- hy3-free        id={cert['id']}")
        return cert
    except Exception as e:
        msg = str(e)
        tag = "401 NO KEY" if "401" in msg else "ONLINE FAIL"
        if has_kilocode_key() and "401" in msg:
            print(f"[online] {tag} -> offline fallback for {student}")
        else:
            print(f"[online] {tag} ({msg[:80]}) -> offline fallback for {student}")
        return train_offline(student, task)


def train_offline(student: str, task: str) -> dict:
    cert_base = {"id": _new_id(student), "timestamp": datetime.now().isoformat(),
                 "student": student, "task": task[:80], "permanent": True, "internet": False}
    try:
        client = OpenAI(base_url=LOCAL, api_key="ollama")
        data = _distill(student, task, "qwen3.6:27b", client)
        cert = dict(cert_base, teacher="qwen3.6:27b",
                    training_hash=hashlib.sha256(data.encode()).hexdigest()[:12])
        _write(cert)
        print(f"TRAINED OFFLINE {student} <- qwen3.6:27b   id={cert['id']}")
        return cert
    except Exception as e:
        # Honest: teacher failed too. Do NOT create a fake alias.
        cert = dict(cert_base, teacher="qwen3.6:27b", failed=True, error=str(e)[:120])
        _write(cert)
        print(f"FAILED OFFLINE  {student} <- qwen3.6:27b   err={str(e)[:80]}")
        return cert


if __name__ == "__main__":
    task = sys.argv[1] if len(sys.argv) > 1 else "general Hostamar task"
    online = internet_up()
    rnd = (online, has_kilocode_key())
    if all(rnd):
        print(f"ONLINE  mode: hy3-free -> distill {STUDENTS_ONLINE}")
        for s in STUDENTS_ONLINE:
            train_online(s, task)
    else:
        print(f"OFFLINE mode: qwen3.6:27b -> distill {STUDENTS_OFFLINE}  (internet={online} has_key={has_kilocode_key()})")
        for s in STUDENTS_OFFLINE:
            train_offline(s, task)
