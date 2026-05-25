# Azure Deployment Script for hostamar.com
# Run: az login first, then execute this script

$ErrorActionPreference = "Stop"

Write-Host "=== Deploying hostamar.com to Azure ===" -ForegroundColor Green

# Configuration
$RESOURCE_GROUP = "hostamar-rg"
$LOCATION = "eastus"
$APP_NAME = "hostamar"
$CONTAINER_REGISTRY = "hostamaracr"
$APP_SERVICE_PLAN = "hostamar-plan"
$WEB_APP = "hostamar-webapp"

# Step 1: Login check
Write-Host "[1/7] Checking Azure login..."
$account = az account show 2>$null
if (-not $account) {
    Write-Host "Please run: az login"
    exit 1
}
Write-Host "  Logged in as: $($account | ConvertFrom-Json).user.name"

# Step 2: Create Resource Group
Write-Host "[2/7] Creating resource group..."
az group create --name $RESOURCE_GROUP --location $LOCATION --output none
Write-Host "  Resource group: $RESOURCE_GROUP in $LOCATION"

# Step 3: Create Container Registry
Write-Host "[3/7] Creating Container Registry..."
az acr create --resource-group $RESOURCE_GROUP --name $CONTAINER_REGISTRY --sku Basic --admin-enabled true --output none
Write-Host "  Registry: $CONTAINER_REGISTRY.azurecr.io"

# Step 4: Build and push Docker image
Write-Host "[4/7] Building and pushing Docker image..."
az acr build --registry $CONTAINER_REGISTRY --image hostamar:latest --file Dockerfile .
Write-Host "  Image pushed: $CONTAINER_REGISTRY.azurecr.io/hostamar:latest"

# Step 5: Create App Service Plan
Write-Host "[5/7] Creating App Service Plan..."
az appservice plan create --name $APP_SERVICE_PLAN --resource-group $RESOURCE_GROUP --sku B1 --is-linux --output none
Write-Host "  Plan: $APP_SERVICE_PLAN (Linux B1)"

# Step 6: Create Web App
Write-Host "[6/7] Creating Web App..."
az webapp create --resource-group $RESOURCE_GROUP --plan $APP_SERVICE_PLAN --name $WEB_APP --deployment-container-image-name "$CONTAINER_REGISTRY.azurecr.io/hostamar:latest" --output none
Write-Host "  Web App: $WEB_APP.azurewebsites.net"

# Step 7: Configure app settings
Write-Host "[7/7] Configuring app settings..."
$acrCreds = az acr credential show --name $CONTAINER_REGISTRY --query "{username:username, password:passwords[0].value}" -o json | ConvertFrom-Json

az webapp config appsettings set --resource-group $RESOURCE_GROUP --name $WEB_APP --settings `
    "WEBSITES_PORT=3000" `
    "DOCKER_REGISTRY_SERVER_URL=https://$CONTAINER_REGISTRY.azurecr.io" `
    "DOCKER_REGISTRY_SERVER_USERNAME=$($acrCreds.username)" `
    "DOCKER_REGISTRY_SERVER_PASSWORD=$($acrCreds.password)" `
    "NODE_ENV=production" `
    "NEXTAUTH_URL=https://$WEB_APP.azurewebsites.net" `
    "NEXT_PUBLIC_SITE_URL=https://$WEB_APP.azurewebsites.net" `
    --output none

Write-Host ""
Write-Host "=== Deployment Complete ===" -ForegroundColor Green
Write-Host "URL: https://$WEB_APP.azurewebsites.net"
Write-Host ""
Write-Host "To add custom domain hostamar.com:"
Write-Host "  az webapp config hostname add --webapp-name $WEB_APP --resource-group $RESOURCE_GROUP --hostname hostamar.com"
Write-Host ""
Write-Host "To enable HTTPS with Let's Encrypt:"
Write-Host "  az webapp config ssl bind --certificate-type SniEnabled --name $WEB_APP --resource-group $RESOURCE_GROUP --thumbprint YOUR_THUMBPRINT"
