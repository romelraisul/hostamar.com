# Generate self-signed SSL cert for hostamar.com
# Run this script as Administrator

$certName = "hostamar.com"
$sslDir = "C:\Users\romel\hostamar-local\nginx\ssl"

# Create SSL directory if it doesn't exist
if (-not (Test-Path $sslDir)) {
    New-Item -ItemType Directory -Force -Path $sslDir
}

# Generate self-signed certificate
$cert = New-SelfSignedCertificate `
    -DnsName $certName, "www.$certName" `
    -CertStoreLocation "cert:\LocalMachine\My" `
    -NotAfter (Get-Date).AddYears(1) `
    -KeyExportPolicy Exportable `
    -KeyLength 2048 `
    -KeyAlgorithm RSA

# Export as PFX
$pfxPath = Join-Path $sslDir "hostamar.pfx"
$pfxPassword = ConvertTo-SecureString -String "hostamar123" -Force -AsPlainText
Export-PfxCertificate -Cert $cert -FilePath $pfxPath -Password $pfxPassword

# Export as CRT
$crtPath = Join-Path $sslDir "hostamar.crt"
Export-Certificate -Cert $cert -FilePath $crtPath -Type CERT

# Export as KEY (PEM format)
$keyPath = Join-Path $sslDir "hostamar.key"
openssl pkcs12 -in $pfxPath -nocerts -nodes -out $keyPath -passin pass:hostamar123 2>$null

# Copy to nginx ssl directory as fullchain.pem and privkey.pem
Copy-Item $crtPath (Join-Path $sslDir "fullchain.pem") -Force

# Trust the certificate
Import-Certificate -FilePath $crtPath -CertStoreLocation "cert:\LocalMachine\Root"

Write-Host "=== SSL Certificate Generated ===" -ForegroundColor Green
Write-Host "Certificate: $crtPath"
Write-Host "Private Key: $keyPath"
Write-Host "PFX: $pfxPath"
Write-Host "Thumbprint: $($cert.Thumbprint)"
Write-Host ""
Write-Host "Certificate is now trusted by Windows"
