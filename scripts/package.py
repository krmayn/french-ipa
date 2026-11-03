from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import json
root = Path(__file__).resolve().parents[1]
(root / 'dist').mkdir(exist_ok=True)
version = json.loads((root / 'extension/manifest.json').read_text())['version']
with ZipFile(root / f'dist/french-ipa-{version}.zip', 'w', ZIP_DEFLATED) as archive:
    for file in sorted((root / 'extension').rglob('*')):
        if file.is_file():
            archive.write(file, file.relative_to(root / 'extension'))
print(root / f'dist/french-ipa-{version}.zip')
