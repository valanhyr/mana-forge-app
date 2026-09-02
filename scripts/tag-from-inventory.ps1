<#
PowerShell helper: read mana-forge-web/public/inventory.json and create annotated git tags per service-version.
Usage:
  .\tag-from-inventory.ps1 [-Force] [-Push]
#>
param(
    [switch]$Force,
    [switch]$Push
)

$inventoryPath = "mana-forge-web\public\inventory.json"
if (-not (Test-Path $inventoryPath)) {
    Write-Error "Inventory file not found: $inventoryPath"
    exit 1
}

$json = Get-Content $inventoryPath -Raw | ConvertFrom-Json
$releases = $json | Get-Member -Name releases -Force -ErrorAction SilentlyContinue
# Simple parse: inventory.json in repo root is expected, if not found try the public path
# If file shape is flat (key:version) use that
if ($json.PSObject.Properties.Name -contains 'web') {
    $map = @{}
    foreach ($p in $json.PSObject.Properties) { $map[$p.Name] = $p.Value }
} else {
    # Fallback: look for nested structure like {"web":"1.0.14"}
    $map = @{}
    try {
        $content = Get-Content $inventoryPath -Raw | ConvertFrom-Json
        foreach ($k in $content.PSObject.Properties.Name) {
            $map[$k] = $content.$k
        }
    } catch {
        Write-Error "Failed to parse inventory.json"
        exit 1
    }
}

$commit = (git rev-parse --verify HEAD).Trim()
Write-Host "Tagging commit: $commit"

foreach ($svc in $map.Keys) {
    $ver = $map[$svc]
    $tag = "$svc-$ver"
    $exists = (git rev-parse -q --verify "refs/tags/$tag" ) -ne $null
    if ($exists -and -not $Force) {
        Write-Host "Tag $tag already exists. Use -Force to overwrite. Skipping."
        continue
    }
    if ($exists -and $Force) {
        git tag -f -a $tag -m "$svc $ver" $commit
    } else {
        git tag -a $tag -m "$svc $ver" $commit
    }
    Write-Host "Created tag $tag"
    if ($Push) {
        git push origin "refs/tags/$tag"
        Write-Host "Pushed tag $tag to origin"
    }
}

Write-Host "Done."
