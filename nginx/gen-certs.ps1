# Generate self-signed cert and key for local testing
# Usage: run from repository root with admin privileges

$certPath = Join-Path -Path (Get-Location) -ChildPath "nginx\certs\nginx.pfx"
$crtOut = Join-Path -Path (Get-Location) -ChildPath "nginx\certs\nginx.crt"
$keyOut = Join-Path -Path (Get-Location) -ChildPath "nginx\certs\nginx.key"

$dns = @("localhost", "web.local", "api.local", "engine.local")

$cert = New-SelfSignedCertificate -DnsName $dns -CertStoreLocation "Cert:\LocalMachine\My" -NotAfter (Get-Date).AddYears(5)

# Export to PFX then extract crt/key using OpenSSL if available
$pfxPath = $certPath
$password = ConvertTo-SecureString -String "localdev" -Force -AsPlainText
Export-PfxCertificate -Cert $cert -FilePath $pfxPath -Password $password | Out-Null

if (Get-Command openssl -ErrorAction SilentlyContinue) {
  openssl pkcs12 -in $pfxPath -nocerts -nodes -passin pass:localdev | Out-File -Encoding ascii $keyOut
  openssl pkcs12 -in $pfxPath -clcerts -nokeys -passin pass:localdev | Out-File -Encoding ascii $crtOut
  Write-Output "Created $crtOut and $keyOut"
} else {
  Write-Output "PFX exported to $pfxPath. Install OpenSSL to extract .crt/.key, or import the PFX into Windows cert store and copy cert/key as needed."
}
