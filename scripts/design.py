import json,pathlib
labels='Динамическая|Экспрессивная|Чистый чёрный|Арктика|Сияние|Океан|Киберпанк|Закат|Леденец|Лес|Полночь|Жидкое стекло|Аркада|Монохром|Неоновая вечеринка'.split('|')
keys='dynamic expressive amoled arctic aurora ocean cyber sunset candy forest midnight glass retro mono neon'.split()
colors=['e6f3e8 194639 b8eac9','f3f2e9 243d32 d6f58a','000000 f5efed 322b43','eff6ff 213f58 b2def7','152c2b dafff2 28564b','e4f3f3 133f4b a9e0db','231331 f3d5ff 543365','fff0df 612c32 ffc198','ffeef6 542745 e9bee7','172b20 e5f8d9 304e38','171d31 e0e5ff 313756','e7eaf3 333c5b cbdbf1','242040 ffe9ad 493663','eeedeb 292826 cfcfcb','141b24 e4ffab 35442f']
themes={k:dict(name=n,bg='#'+p.split()[0],ink='#'+p.split()[1],accent='#'+p.split()[2],radius=[18,30,16,24,32][i%5]) for i,(k,n,p) in enumerate(zip(keys,labels,colors))}
p=pathlib.Path('core/design.json');p.write_text(json.dumps(themes,ensure_ascii=False))
