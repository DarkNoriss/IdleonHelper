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

# Function to generate release notes from git commits
function Get-ReleaseNotes {
    param([string]$TagName)
    
    # Get all tags sorted by version
    $allTags = git tag -l | Sort-Object { [version]($_ -replace '^v', '') }
    $previousTag = $null
    
    if ($allTags.Count -eq 0 -or ($allTags.Count -eq 1 -and $allTags[0] -eq $TagName)) {
        # First release - get all commits
        Write-Host "Generating release notes from all commits..." -ForegroundColor Green
        $commits = git log --pretty=format:"- %s (%h)" --no-merges
    } else {
        # Find the previous tag (the one before current)
        for ($i = 0; $i -lt $allTags.Count; $i++) {
            if ($allTags[$i] -eq $TagName -and $i -gt 0) {
                $previousTag = $allTags[$i - 1]
                break
            }
        }
        
        if ($previousTag) {
            Write-Host "Generating release notes from $previousTag to $TagName..." -ForegroundColor Green
            $commits = git log --pretty=format:"- %s (%h)" --no-merges "$previousTag..HEAD"
        } else {
            # Tag exists but no previous tag found, use all commits
            Write-Host "Generating release notes from all commits..." -ForegroundColor Green
            $commits = git log --pretty=format:"- %s (%h)" --no-merges
        }
    }
    
    if ($commits) {
        if ($previousTag) {
            $notes = @"
## What's Changed

$commits

---
**Full Changelog**: https://github.com/DarkNoriss/IdleonHelper/compare/$previousTag...$TagName
"@
        } else {
            $notes = @"
## What's Changed

$commits

---
**Full Changelog**: https://github.com/DarkNoriss/IdleonHelper/releases/tag/$TagName
"@
        }
        return $notes
    } else {
        return "## What's Changed`n`n- Initial release"
    }
}

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

Write-Host "Generating release notes..." -ForegroundColor Green
$releaseNotes = Get-ReleaseNotes -TagName $tagName

# Save release notes to a file
$notesFile = "dist\release-notes.md"
New-Item -ItemType Directory -Force -Path "dist" | Out-Null
$releaseNotes | Out-File -FilePath $notesFile -Encoding UTF8
Write-Host "Release notes saved to $notesFile" -ForegroundColor Green
Write-Host ""
Write-Host "Release Notes Preview:" -ForegroundColor Cyan
Write-Host $releaseNotes -ForegroundColor Gray
Write-Host ""

Write-Host "Building and publishing to GitHub..." -ForegroundColor Green
Write-Host ""

# Build and publish
pnpm build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}

# Read release notes file content
$notesContent = Get-Content $notesFile -Raw

# Publish with release notes
# electron-builder supports releaseNotes via config.publish.releaseNotes
# We'll pass it as a JSON-escaped string
$notesJsonEscaped = $notesContent | ConvertTo-Json -Compress

# Use electron-builder with release notes
# Note: electron-builder reads releaseNotes from the publish config
# We can override it via command line, but for multiline content, 
# we'll update the release via GitHub API after publishing
electron-builder --win --publish always

# Update the GitHub release with our generated notes using GitHub API
Write-Host "Updating GitHub release with release notes..." -ForegroundColor Green
$releaseNotesJson = $notesContent | ConvertTo-Json
$body = @{
    body = $notesContent
} | ConvertTo-Json

$headers = @{
    Authorization = "token $env:GH_TOKEN"
    Accept = "application/vnd.github.v3+json"
}

$updateUrl = "https://api.github.com/repos/DarkNoriss/IdleonHelper/releases/tags/$tagName"
try {
    Invoke-RestMethod -Uri $updateUrl -Method PATCH -Headers $headers -Body $body -ContentType "application/json" | Out-Null
    Write-Host "Release notes updated successfully!" -ForegroundColor Green
} catch {
    Write-Host "Warning: Could not update release notes automatically: $_" -ForegroundColor Yellow
    Write-Host "You can manually update the release notes at:" -ForegroundColor Yellow
    Write-Host "https://github.com/DarkNoriss/IdleonHelper/releases/tag/$tagName" -ForegroundColor Cyan
}

# Clean up release notes file
if (Test-Path $notesFile) {
    Remove-Item $notesFile -Force
}

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

