# install-lowvram.ps1 — PowerShell equivalent for Windows-side prep.
# Downloads the 8GB-friendly GGUF weights into video-pipeline-lowvram/models.
# Run from PowerShell in the video-pipeline-lowvram dir. Requires huggingface-cli.
param(
  [string]$HF_TOKEN = $env:HF_TOKEN
)
$ErrorActionPreference = "Stop"
$HERE = $PSScriptRoot
$MODELS = Join-Path $HERE "models"
New-Item -ItemType Directory -Force -Path $MODELS\diffusion_models, $MODELS\vae, $MODELS\text_encoders, $MODELS\loras | Out-Null

function Get-Model {
  param($Repo, $OutName, $MinMB)
  $dest = Join-Path $MODELS $OutName
  if (Test-Path $dest) { Write-Host "skip (exists): $dest"; return }
  Write-Host ">> $Repo -> $dest"
  $env:HF_TOKEN = $HF_TOKEN
  huggingface-cli download $Repo --local-dir (Join-Path $MODELS "_tmp_$Repo")
  $f = Get-ChildItem (Join-Path $MODELS "_tmp_$Repo") -Recurse -Include *.gguf,*.safetensors | Select-Object -First 1
  Move-Item $f.FullName $dest -Force
  Remove-Item (Join-Path $MODELS "_tmp_$Repo") -Recurse -Force
  $mb = [math]::Round((Get-Item $dest).Length / 1MB)
  if ($mb -lt $MinMB) { Write-Error "$dest too small ($mb MB < $MinMB MB)"; exit 1 }
  Write-Host "   ok: $mb MB"
}

Get-Model "city96/LTX-Video-2B-gguf"            "diffusion_models/ltxv-2b-distilled-Q6_K.gguf" 6000
Get-Model "Kijai/Wan2.1_i2v_480p_14B_FusionX-Q4_0-GGUF" "diffusion_models/wan2.1_i2v_480p_14B_Q4_0.gguf" 8000
Get-Model "xuhongming251/InfiniteTalk"         "loras/wan2.1_infiniteTalk_single_fp16.safetensors" 1000
Get-Model "Lightricks/LTX-Video"                "vae/ltxv_2b_vae.safetensors" 100
Get-Model "Comfy-Org/Wan_2.1_Repackaged"        "vae/wan_2.1_vae.safetensors" 100
Get-Model "Comfy-Org/Wan_2.1_Repackaged"        "text_encoders/umt5_xxl_fp16.safetensors" 1000
Write-Host "=== install-lowvram done ==="
