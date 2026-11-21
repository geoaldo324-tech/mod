param([switch]$SkipInstaller)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Push-Location $root
try {
    if (-not (Get-Command "py" -ErrorAction SilentlyContinue)) { throw "Instala Python 3.12 para Windows (64 bits)." }
    npm ci
    if ($LASTEXITCODE -ne 0) { throw "npm ci falló." }
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "La compilación de la interfaz falló." }
    py -3.12-64 -m venv .venv
    if ($LASTEXITCODE -ne 0) { throw "No se pudo crear el entorno de Python 3.12 (64 bits)." }
    $python = ".\.venv\Scripts\python.exe"
    & $python -m pip install -r scripts/windows-requirements.txt
    if ($LASTEXITCODE -ne 0) { throw "No se pudieron instalar las dependencias de Windows." }
    $ui = Join-Path $root "dist"
    $icon = Join-Path $root "assets/mosaico.ico"
    & $python -m PyInstaller --noconfirm --onefile --windowed --icon "$icon" --name MosaicoStudio --distpath release --specpath build --workpath build/pyinstaller --add-data "${ui}:dist" mosaico.py
    if ($LASTEXITCODE -ne 0) { throw "No se pudo construir MosaicoStudio.exe." }
    if (-not $SkipInstaller) {
        $iscc = (Get-Command "ISCC.exe" -ErrorAction SilentlyContinue).Source
        if (-not $iscc) { $iscc = Join-Path ${env:ProgramFiles(x86)} "Inno Setup 6\ISCC.exe" }
        if (-not (Test-Path $iscc)) { throw "Instala Inno Setup 6 o usa -SkipInstaller." }
        & $iscc "scripts/mosaico-installer.iss"
        if ($LASTEXITCODE -ne 0) { throw "No se pudo construir MosaicoStudio-Setup.exe." }
    }
} finally {
    Pop-Location
}
