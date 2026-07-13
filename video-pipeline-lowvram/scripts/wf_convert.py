#!/usr/bin/env python3
"""ComfyUI UI-workflow -> API-prompt converter (root-fixed widget alignment).

Key rules learned the hard way:
- widgets_values maps positionally to EVERY widget-type input in schema order,
  whether or not that input also has a link. A linked widget still consumes a
  widgets_values slot; the link value overrides the widget value.
- SetNode/GetNode are frontend-only litegraph virtual nodes (not in /object_info).
  They must be flattened: a GetNode('key') resolves to whatever fed SetNode('key');
  a passthrough SetNode resolves to its own input source.
- VHS_VideoCombine (frames+audio) has no API equivalent that takes frames; replace
  with CreateVideo (images+audio+fps -> VIDEO) feeding a SaveVideo(video=...).
- SaveVideo format enum is "mp4" (not "video/h264-mp4"); codec "h264".
"""
import json, urllib.request, urllib.error

BASE = "http://127.0.0.1:8199"
WIDGET_TYPES = {"INT", "FLOAT", "STRING", "BOOLEAN", "COMBO"}


def load_obj():
    return json.load(urllib.request.urlopen(BASE + "/object_info", timeout=60))


def input_spec(OBJ, typ):
    n = OBJ.get(typ)
    if not n:
        return []
    out = []
    for section in ("required", "optional"):
        for name, spec in n.get("input", {}).get(section, {}).items():
            t = spec[0] if isinstance(spec, list) and spec else spec
            is_w = isinstance(t, list) or (isinstance(t, str) and t in WIDGET_TYPES)
            out.append((name, is_w))
    return out


def convert(OBJ, example_path, drop_types, fixups=None, node_patches=None):
    d = json.load(open(example_path))
    nodes = {n["id"]: n for n in d["nodes"]}
    links = {l[0]: l for l in d.get("links", [])}
    # ---- flatten Set/Get virtual nodes ----
    set_src = {}
    for n in d["nodes"]:
        if n["type"] == "SetNode":
            lk = n["inputs"][0].get("link")
            if lk in links:
                set_src[n["widgets_values"][0]] = (links[lk][1], links[lk][2])
    dropped = {}
    for n in d["nodes"]:
        if n["type"] in ("SetNode", "GetNode"):
            if n["type"] == "GetNode":
                src = set_src.get(n["widgets_values"][0])
            else:
                lk = n["inputs"][0].get("link") if n.get("inputs") else None
                src = (links[lk][1], links[lk][2]) if lk in links else None
            dropped[n["id"]] = src

    def resolve(fn, fs, depth=0):
        if depth > 10:
            return (str(fn), fs)
        if fn in dropped and dropped[fn]:
            s = dropped[fn]
            return resolve(s[0], s[1], depth + 1)
        return (str(fn), fs)

    prompt = {}
    for nid_int, n in nodes.items():
        typ = n["type"]
        if typ in drop_types:
            continue
        nid = str(nid_int)
        spec = input_spec(OBJ, typ)
        wv = list(n.get("widgets_values") or [])
        linked = {}
        for i in n.get("inputs", []):
            lk = i.get("link")
            if lk in links:
                s = resolve(links[lk][1], links[lk][2])
                linked[i["name"]] = [s[0], s[1]]
        inputs = {}
        wi = 0
        for name, is_w in spec:
            if is_w:
                val = wv[wi] if wi < len(wv) else None
                wi += 1
                if name in linked:
                    inputs[name] = linked[name]
                elif val is not None:
                    inputs[name] = val
            else:
                if name in linked:
                    inputs[name] = linked[name]
        prompt[nid] = {"class_type": typ, "inputs": inputs}
    if node_patches:
        for nid, node in prompt.items():
            if node["class_type"] in node_patches:
                node["inputs"].update(node_patches[node["class_type"]])
    if fixups:
        fixups(prompt, nodes, links, resolve)
    return prompt


def validate(name, prompt):
    miss = sorted({n["class_type"] for n in prompt.values() if n["class_type"] not in _OBJ})
    data = json.dumps({"prompt": prompt, "client_id": "v"}).encode()
    req = urllib.request.Request(BASE + "/prompt", data=data,
                                 headers={"Content-Type": "application/json"})
    try:
        j = json.load(urllib.request.urlopen(req, timeout=30))
        print(f"{name}: SUBMIT OK {j['prompt_id']} errors={j['node_errors']}")
        return "OK", []
    except urllib.error.HTTPError as e:
        j = json.loads(e.read().decode())
        bad = []
        for nid, ne in (j.get("node_errors") or {}).items():
            for x in ne.get("errors", []):
                if x.get("type") != "value_not_in_list":  # weights-gated=expected
                    bad.append((nid, ne.get("class_type"), x.get("type"), x.get("details")))
        print(f"{name}: HTTP {e.code} missing={miss or 'NONE'} | non-weight errors: {len(bad)}")
        for b in bad:
            print("   ", b)
        return "ERR", bad


_OBJ = None
