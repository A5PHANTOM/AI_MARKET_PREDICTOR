# Start FinAlly Docker container (Windows)
param(
    [switch]$Build,
    [switch]$Open
)

$ImageName = "finally"
$ContainerName = "finally-app"
$Port = if ($env:PORT) { $env:PORT } else { "8000" }

if ($Build) {
    Write-Host "Building Docker image..."
    docker build -t $ImageName .
}

$null = docker image inspect $ImageName 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Building Docker image..."
    docker build -t $ImageName .
}

docker stop $ContainerName 2>$null
docker rm $ContainerName 2>$null

Write-Host "Starting FinAlly on http://localhost:$Port"
docker run -d `
    --name $ContainerName `
    -p ${Port}:8000 `
    -v finally-data:/app/db `
    --env-file .env `
    $ImageName

Write-Host "FinAlly is running at http://localhost:$Port"

if ($Open) {
    Start-Process "http://localhost:$Port"
}
