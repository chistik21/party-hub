"""Write the three release archives without profiles, dependencies or local settings."""
import argparse
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
root=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser();parser.add_argument('output',type=Path);out=parser.parse_args().output.resolve();out.mkdir(parents=True,exist_ok=True)
def tree(z,base,prefix):
 for f in sorted(base.rglob('*')):
  if f.is_file() and not f.is_symlink() and not any(k in {'build','.gradle','hub-profiles','node_modules','__pycache__','local.properties'} for k in f.relative_to(base).parts):
   z.write(f,str(Path(prefix)/f.relative_to(base)))
docs=['README.md','THIRD-PARTY-NOTICES.txt']
with ZipFile(out/'PARTY-HUB-WEB.zip','w',ZIP_DEFLATED) as z:
 tree(z,root/'release/site','')
 for f in docs:z.write(root/f,f)
with ZipFile(out/'PARTY-HUB-SERVER.zip','w',ZIP_DEFLATED) as z:
 tree(z,root/'release','party-hub-server')
 for f in docs:z.write(root/f,'party-hub-server/'+f)
with ZipFile(out/'PARTY-HUB-SOURCE.zip','w',ZIP_DEFLATED) as z:
 for d in ['.github','android','core','release','scripts','server','tests','web']:tree(z,root/d,d)
 for f in [*docs,'package.json','package-lock.json','tsconfig.json','.gitignore']:z.write(root/f,f)
