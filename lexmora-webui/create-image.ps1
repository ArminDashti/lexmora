#Requires -Version 5.1
<#
.SYNOPSIS
  Build (and optionally tag) the lexmora-webui Docker image.
#>
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$ScriptDir = $PSScriptRoot
$ContainerName = 'lexmora-webui'
$DefaultImageName = 'lexmora-webui'
$DefaultTag = 'latest'
$DefaultDockerfile = 'Dockerfile'
$DefaultContext = $ScriptDir

function Write-Color([string]$Message, [string]$Color = 'White') {
    Write-Host $Message -ForegroundColor $Color
}

function Show-Help {
    @"
create-image.ps1 - build $ContainerName Docker image

USAGE:
  .\create-image.ps1 [flags]

FLAGS:
  --image-name=<name>     Image repository name (default: null -> $DefaultImageName)
  --tag=<tag>             Image tag (default: null -> $DefaultTag)
  --dockerfile=<path>     Dockerfile path relative to context (default: null -> $DefaultDockerfile)
  --context=<path>        Build context directory (default: null -> script directory)
  --help                  Show this help

EXAMPLES:
  .\create-image.ps1
  .\create-image.ps1 --tag=dev
  .\create-image.ps1 --image-name=lexmora-webui --tag=1.0.0

NOTES:
  - Null defaults resolve to project image name/tag and repo-root Dockerfile.
  - Requires Docker CLI on the local machine.
  - Built image is tagged as <image-name>:<tag>.
"@ | Write-Host
}

function Get-FlagValue {
    param([string[]]$ArgList, [string]$Name)
    foreach ($a in $ArgList) {
        if ($a -match "^--$Name=(.*)$") { return $Matches[1] }
        if ($a -eq "--$Name") {
            throw "Flag --$Name requires a value. Use --$Name=<value>."
        }
    }
    return $null
}

if ($args -match '^(--help|-h|/\?)$') { Show-Help; exit 0 }

try {
    $ImageName = Get-FlagValue -ArgList $args -Name 'image-name'
    $Tag = Get-FlagValue -ArgList $args -Name 'tag'
    $Dockerfile = Get-FlagValue -ArgList $args -Name 'dockerfile'
    $Context = Get-FlagValue -ArgList $args -Name 'context'

    foreach ($a in $args) {
        if ($a -notmatch '^--(image-name|tag|dockerfile|context|help)=?' -and $a -notmatch '^(--help|-h|/\?)$') {
            Write-Color "Unknown flag: $a" 'Red'
            Show-Help
            exit 1
        }
    }

    if ([string]::IsNullOrWhiteSpace($ImageName)) { $ImageName = $DefaultImageName }
    if ([string]::IsNullOrWhiteSpace($Tag)) { $Tag = $DefaultTag }
    if ([string]::IsNullOrWhiteSpace($Dockerfile)) { $Dockerfile = $DefaultDockerfile }
    if ([string]::IsNullOrWhiteSpace($Context)) { $Context = $DefaultContext }

    $Context = (Resolve-Path -LiteralPath $Context).Path
    $DockerfilePath = Join-Path $Context $Dockerfile
    if (-not (Test-Path -LiteralPath $DockerfilePath)) {
        Write-Color "Dockerfile not found: $DockerfilePath" 'Red'
        Show-Help
        exit 1
    }

    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        Write-Color 'Docker CLI is not available. Start Docker Desktop / daemon.' 'Red'
        exit 1
    }

    $FullTag = "${ImageName}:${Tag}"
    Write-Color "==> Building image $FullTag" 'Cyan'
    Write-Color "    context:    $Context" 'DarkGray'
    Write-Color "    dockerfile: $Dockerfile" 'DarkGray'

    & docker build -t $FullTag -f $DockerfilePath $Context
    if ($LASTEXITCODE -ne 0) {
        throw "docker build failed with exit code $LASTEXITCODE"
    }

    Write-Color "==> Image ready: $FullTag" 'Green'
    exit 0
}
catch {
    Write-Color "ERROR: $($_.Exception.Message)" 'Red'
    Show-Help
    exit 1
}
