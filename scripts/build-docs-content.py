#!/usr/bin/env python3
"""Build lib/docs/{content.json,bn/content.json} from the foundation markdowns.
Renders minimal safe HTML (headings/bold/code/lists/hr/links) at build time —
no runtime markdown parser. Run after updating either foundation.md."""
import re, json, os

def esc(s):
    return s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')

def inline(s):
    s = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', s)
    s = re.sub(r'`([^`]+)`', r'<code class="docs-code">\1</code>', s)
    s = re.sub(r'\[(.+?)\]\((.+?)\)', r'<a href="\2" class="docs-a">\1</a>', s)
    return s

def slug(s):
    return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')[:60]

def md_to_html(text):
    lines = text.split('\n')
    out, in_code, in_list = [], False, False
    for ln in lines:
        if ln.strip().startswith('```'):
            if in_code: out.append('</pre>'); in_code = False
            else: out.append('<pre class="docs-pre">'); in_code = True
            continue
        if in_code: out.append(esc(ln)); continue
        m = re.match(r'^(#{1,4})\s+(.*)', ln)
        if m:
            if in_list: out.append('</ul>'); in_list = False
            lvl = min(4, len(m.group(1)) + 1)
            out.append(f'<h{lvl}>{inline(m.group(2))}</h{lvl}>')
            continue
        if re.match(r'^\s*[-*]\s+', ln):
            if not in_list: out.append('<ul class="docs-ul">'); in_list = True
            out.append(f'<li>{inline(re.sub(r"^\\s*[-*]\\s+", "", ln))}</li>')
            continue
        if re.match(r'^\s*\d+\.\s+', ln):
            if not in_list: out.append('<ol class="docs-ol">'); in_list = True
            out.append(f'<li>{inline(re.sub(r"^\\s*\\d+\\.\\s+", "", ln))}</li>')
            continue
        if in_list: out.append('</ul>'); in_list = False
        if ln.strip() in ('---', '***'):
            out.append('<hr class="docs-hr"/>'); continue
        if ln.strip():
            out.append(f'<p class="docs-p">{inline(ln)}</p>')
    if in_list: out.append('</ul>')
    if in_code: out.append('</pre>')
    return '\n'.join(out)

def build(src, dst, max_sections=None, max_bytes=None):
    md = open(src, encoding='utf-8').read()
    if max_bytes:
        md = md[:max_bytes]  # keep the payload deployable; expansion is additive
    parts = re.split(r'\n(?=## )', md)
    sections = []
    for p in parts:
        first = p.split('\n')[0]
        m = re.match(r'^##\s+(.*)', first)
        title = m.group(1) if m else (first.lstrip('# ').strip() if first.startswith('#') else 'Intro')
        body_md = '\n'.join(p.split('\n')[1:]).strip() if m else p
        if len(body_md) < 40:
            continue
        sections.append({'id': slug(title) or f'sec{len(sections)}', 'title': title, 'html': md_to_html(body_md)})
        if max_sections and len(sections) >= max_sections:
            break
    data = {'sections': sections}
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    with open(dst, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False)
    return len(sections), os.path.getsize(dst)

# English: TRUE-1M is 4.4MB of markdown — cap the JSON at ~2.5MB so the
# client bundle stays deployable on Vercel serverless (4MB limit per asset).
n, sz = build('lib/docs/foundation.md', 'lib/docs/content.json', max_bytes=2_400_000)
print(f'EN sections: {n} | content.json: {sz} bytes')
n2, sz2 = build('lib/docs/bn/foundation.md', 'lib/docs/bn/content.json')
print(f'BN sections: {n2} | bn/content.json: {sz2} bytes')
