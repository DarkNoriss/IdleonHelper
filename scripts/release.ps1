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
            $token = $matches[1].Trim('"').Trim("'").Trim()
            $env:GH_TOKEN = $token
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

Write-Host "Cleaning and building..." -ForegroundColor Green
Write-Host ""

# Remove resources/backend completely
$backendOut = "resources/backend"
if (Test-Path $backendOut) {
    Write-Host "Removing existing backend files..." -ForegroundColor Yellow
    Remove-Item $backendOut -Recurse -Force
}

# Build backend
Write-Host "Building backend..." -ForegroundColor Green
pnpm build:backend
if ($LASTEXITCODE -ne 0) {
    Write-Host "Backend build failed!" -ForegroundColor Red
    exit 1
}

# Build application
Write-Host "Building application..." -ForegroundColor Green
pnpm build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}

# Publish to GitHub
Write-Host "Publishing to GitHub..." -ForegroundColor Green
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
