# =====================================================================
# Build backend (.NET) and prepare final IdleonBotBackend.exe
# =====================================================================

Write-Host "Cleaning old backend output..."
$backendOut = "resources/backend"

if (Test-Path $backendOut) {
    Remove-Item $backendOut -Recurse -Force
}

New-Item -ItemType Directory -Force -Path $backendOut | Out-Null

Write-Host "Publishing backend with dotnet publish..."
dotnet publish ./backend/IdleonBotBackend.csproj `
    -c Release `
    -r win-x64 `
    --self-contained true `
    -p:PublishSingleFile=false `
    -p:DebugType=None `
    -o ./backend/publish

if ($LASTEXITCODE -ne 0) {
    Write-Host "dotnet publish FAILED, aborting."
    exit 1
}

Write-Host "Copying ALL backend files (exe + dll)..."
Copy-Item "./backend/publish/*" "$backendOut" -Recurse -Force

Write-Host "Cleaning temp publish folder..."
Remove-Item "./backend/publish" -Recurse -Force

Write-Host "Backend build complete!"
Write-Host "Files ready at: resources/backend/"

