from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
root = Path(__file__).resolve().parents[1]
(root / 'dist').mkdir(exist_ok=True)
with ZipFile(root / 'dist/french-ipa-0.1.0.zip', 'w', ZIP_DEFLATED) as archive:
    for file in sorted((root / 'extension').rglob('*')):
        if file.is_file():
            archive.write(file, file.relative_to(root / 'extension'))
print(root / 'dist/french-ipa-0.1.0.zip')
