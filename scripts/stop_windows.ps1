# Stop FinAlly Docker container (Windows)

$ContainerName = "finally-app"

Write-Host "Stopping FinAlly..."
docker stop $ContainerName 2>$null
docker rm $ContainerName 2>$null
Write-Host "FinAlly stopped. Data volume preserved."
