# -*- coding: utf-8 -*-
"""HSK 1-5 birlesik veri seti: seviye + tema + frekans sirali, 2496 kelime."""
import json
import build_data as b

comp = json.load(open('complete.min.json'))
pos_by, freq_by = {}, {}
for e in comp:
    pos_by[e['s']] = e.get('p', [])
    freq_by[e['s']] = e.get('q', 99999)

PINYIN_FIX = {'俩': 'liǎ'}

words = {}
for lv in [1, 2, 3, 4, 5]:
    rows = [l.rstrip('\n').split('\t') for l in open(f'official2012_L{lv}.txt', encoding='utf-8-sig') if l.strip()]
    for r in rows:
        simp = r[0]
        if simp in words:  # dedup: dusuk seviye kazanir
            continue
        meanings = [m.strip() for m in r[4].split(';') if m.strip() and not m.strip().startswith('CL:')]
        pos = pos_by.get(simp, [])
        words[simp] = {'h': simp, 't': r[1], 'p': PINYIN_FIX.get(simp, r[3]), 'm': meanings,
                       'theme': b.classify(simp, b.gloss_text(meanings), pos),
                       'lv': lv, 'freq': freq_by.get(simp, 99999)}

out = list(words.values())
order = {t: i for i, t in enumerate(b.THEME_ORDER)}
out.sort(key=lambda w: (w['lv'], order[w['theme']], w['freq']))
json.dump(out, open('words_all.json', 'w'), ensure_ascii=False, indent=1)

from collections import Counter
print('toplam:', len(out))
print('seviye:', sorted(Counter(w['lv'] for w in out).items()))
print('tema:', Counter(w['theme'] for w in out).most_common())
