# Lance l'émulateur Firebase local (Auth 9099, Realtime Database 9000) pour le projet de
# démonstration demo-les-golems, avec les règles de database.rules.json.
# Aucune connexion à un compte Google : rien ne part en ligne.
# Usage : clic droit > Exécuter avec PowerShell, ou  powershell -ExecutionPolicy Bypass -File lancer_emulateur.ps1
# Puis, dans un autre terminal : python -m http.server 8000  et ouvrir http://127.0.0.1:8000
# Arrêt : Ctrl+C dans cette fenêtre (les données de test sont effacées).

$ici = Split-Path -Parent $MyInvocation.MyCommand.Path
$outil = Join-Path $ici "..\6 - Outils et simulations\1 - Outils\1 - Firebase\firebase-tools-win.exe"
if (-not (Test-Path $outil)) { Write-Host "Outil introuvable : $outil"; exit 1 }
if (-not (Get-Command java -ErrorAction SilentlyContinue)) {
  $env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + $env:Path
}
# Mode commande du binaire autonome (sinon il ouvre son écran d'accueil interactif).
$env:FIREPIT_VERSION = "1"
Set-Location $ici
& $outil emulators:start --only "auth,database" --project demo-les-golems
