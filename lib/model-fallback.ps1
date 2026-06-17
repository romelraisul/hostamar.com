# Multi-Model Fallback System
# Automatically switches between models if one fails or hallucinates

$Models = @(
    @{ Name = "qwen3.6:27B"; Priority = 1; Type = "local" },
    @{ Name = "smollm3:F16"; Priority = 2; Type = "local" },
    @{ Name = "gpt-4o-mini"; Priority = 3; Type = "openai" },
    @{ Name = "gpt-3.5-turbo"; Priority = 4; Type = "openai" }
)

$Script:CurrentModelIndex = 0
$Script:LastError = $null
$Script:ConsecutiveFailures = 0
$Script:MaxConsecutiveFailures = 3

function Get-CurrentModel {
    return $Models[$Script:CurrentModelIndex]
}

function Test-ModelResponse {
    param(
        [string]$Response,
        [string]$Prompt
    )
    
    # Check for common failure patterns
    $failurePatterns = @(
        "I cannot",
        "I don't have",
        "I'm not able",
        "I'm unable",
        "Error:",
        "Failed to",
        "Unable to process",
        "Model is not available",
        "Connection refused",
        "Timeout"
    )
    
    foreach ($pattern in $failurePatterns) {
        if ($Response -match $pattern) {
            return $false
        }
    }
    
    # Check for hallucination patterns
    $hallucinationPatterns = @(
        "As an AI language model",
        "I'm a large language model",
        "My training data",
        "I was trained by",
        "My knowledge cutoff"
    )
    
    foreach ($pattern in $hallucinationPatterns) {
        if ($Response -match $pattern) {
            return $false
        }
    }
    
    # Check response length (too short might indicate failure)
    if ($Response.Length -lt 10) {
        return $false
    }
    
    return $true
}

function Invoke-WithFallback {
    param(
        [string]$Prompt,
        [scriptblock]$FallbackAction,
        [int]$MaxRetries = 3
    )
    
    $attempt = 0
    $modelIndex = $Script:CurrentModelIndex
    
    while ($attempt -lt $MaxRetries -and $modelIndex -lt $Models.Count) {
        $model = $Models[$modelIndex]
        Write-Host "Attempting with model: $($model.Name)" -ForegroundColor Cyan
        
        try {
            if ($model.Type -eq "local") {
                # Use Docker Model Runner
                $response = docker model run $model.Name $Prompt 2>&1
            } else {
                # For OpenAI models, you would need API key
                Write-Host "OpenAI models not configured yet" -ForegroundColor Yellow
                $modelIndex++
                continue
            }
            
            # Test the response
            if (Test-ModelResponse -Response $response -Prompt $Prompt) {
                Write-Host "Success with model: $($model.Name)" -ForegroundColor Green
                $Script:ConsecutiveFailures = 0
                return $response
            } else {
                Write-Host "Model $($model.Name) failed or hallucinated" -ForegroundColor Yellow
                $Script:ConsecutiveFailures++
                
                if ($Script:ConsecutiveFailures -ge $Script:MaxConsecutiveFailures) {
                    Write-Host "Too many consecutive failures, switching to next model" -ForegroundColor Red
                    $modelIndex++
                    $Script:ConsecutiveFailures = 0
                }
            }
        } catch {
            Write-Host "Error with model $($model.Name): $_" -ForegroundColor Red
            $Script:LastError = $_
            $modelIndex++
        }
        
        $attempt++
    }
    
    # All models failed
    Write-Host "All models failed. Using fallback action." -ForegroundColor Red
    if ($FallbackAction) {
        return & $FallbackAction
    }
    
    throw "All models failed and no fallback action provided"
}

function Switch-Model {
    param(
        [string]$ModelName
    )
    
    for ($i = 0; $i -lt $Models.Count; $i++) {
        if ($Models[$i].Name -eq $ModelName) {
            $Script:CurrentModelIndex = $i
            Write-Host "Switched to model: $ModelName" -ForegroundColor Green
            return
        }
    }
    
    Write-Host "Model not found: $ModelName" -ForegroundColor Red
}

function Get-ModelStatus {
    $status = @()
    foreach ($model in $Models) {
        $status += [PSCustomObject]@{
            Name = $model.Name
            Priority = $model.Priority
            Type = $model.Type
            IsCurrent = ($Models[$Script:CurrentModelIndex].Name -eq $model.Name)
        }
    }
    return $status
}

# Export functions
Export-ModuleMember -Function @(
    'Get-CurrentModel',
    'Test-ModelResponse',
    'Invoke-WithFallback',
    'Switch-Model',
    'Get-ModelStatus'
)
