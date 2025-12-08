# =====================================================================
# Release script - Creates git tag and publishes to GitHub
# =====================================================================

param(
    [string]$Version = "",
    [switch]$SkipTag = $false
)

# Load package.json to get version
$packageJsonPath = "package.json"
if (-not (Test-Path $packageJsonPath)) {
    Write-Host "Error: package.json not found!" -ForegroundColor Red
    exit 1
}

$packageJson = Get-Content $packageJsonPath | ConvertFrom-Json
$packageVersion = if ($Version) { $Version } else { $packageJson.version }
$tagName = "v$packageVersion"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Release Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Version: $packageVersion" -ForegroundColor Yellow
Write-Host "Tag: $tagName" -ForegroundColor Yellow
Write-Host ""

# Check if tag already exists
if (-not $SkipTag) {
    $existingTag = git tag -l $tagName
    if ($existingTag) {
        Write-Host "Warning: Tag $tagName already exists!" -ForegroundColor Yellow
        $response = Read-Host "Do you want to continue anyway? (y/n)"
        if ($response -ne "y" -and $response -ne "Y") {
            Write-Host "Aborted." -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "Creating git tag: $tagName" -ForegroundColor Green
        git tag $tagName
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Failed to create tag!" -ForegroundColor Red
            exit 1
        }
        
        Write-Host "Pushing tag to GitHub..." -ForegroundColor Green
        git push origin $tagName
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Failed to push tag!" -ForegroundColor Red
            Write-Host "You may need to set up your git remote or credentials." -ForegroundColor Yellow
            exit 1
        }
        
        Write-Host "Tag pushed successfully!" -ForegroundColor Green
        Write-Host ""
    }
}

# Check for GH_TOKEN
if (-not $env:GH_TOKEN) {
    Write-Host "Warning: GH_TOKEN environment variable not set!" -ForegroundColor Yellow
    Write-Host "Trying to load from .env file..." -ForegroundColor Yellow
    
    if (Test-Path ".env") {
        $envContent = Get-Content ".env" | Where-Object { $_ -match "^GH_TOKEN=(.+)$" }
        if ($envContent) {
            $env:GH_TOKEN = $matches[1]
            Write-Host "Loaded GH_TOKEN from .env" -ForegroundColor Green
        } else {
            Write-Host "GH_TOKEN not found in .env file!" -ForegroundColor Red
            Write-Host "Please set GH_TOKEN environment variable or add it to .env file" -ForegroundColor Yellow
            exit 1
        }
    } else {
        Write-Host ".env file not found!" -ForegroundColor Red
        Write-Host "Please set GH_TOKEN environment variable or create .env file with GH_TOKEN=your_token" -ForegroundColor Yellow
        exit 1
    }
}

Write-Host "Building and publishing to GitHub..." -ForegroundColor Green
Write-Host ""

# Build and publish
pnpm build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}

electron-builder --win --publish always

if ($LASTEXITCODE -ne 0) {
    Write-Host "Publish failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Release Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Version $packageVersion has been released to GitHub!" -ForegroundColor Green
Write-Host "Check: https://github.com/DarkNoriss/IdleonHelper/releases" -ForegroundColor Cyan

