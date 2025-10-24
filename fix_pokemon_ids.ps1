# PowerShell script to fix Pokemon ID numbering from Ratoncio onwards
# This script will find all Pokemon IDs from line containing Ratoncio and increment each by 2

$filePath = "e:\pk rpg essentials\Pokemon_Zero_v0.13.1_alpha\PBS\pokemon.txt"
$tempFilePath = "e:\pk rpg essentials\Pokemon_Zero_v0.13.1_alpha\PBS\pokemon_temp.txt"

Write-Host "Starting Pokemon ID fix..."

# Read all lines from the file
$lines = Get-Content -Path $filePath

# Find the line number where Ratoncio starts
$ratonciaoStartLine = -1
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "Name = Ratoncio") {
        # Look backwards to find the [ID] line
        for ($j = $i; $j -ge 0; $j--) {
            if ($lines[$j] -match "^\[(\d+)\]$") {
                $ratonciaoStartLine = $j
                Write-Host "Found Ratoncio at line $($j + 1) with ID $($matches[1])"
                break
            }
        }
        break
    }
}

if ($ratonciaoStartLine -eq -1) {
    Write-Host "Could not find Ratoncio in the file!"
    exit 1
}

Write-Host "Processing Pokemon IDs from line $($ratonciaoStartLine + 1) onwards..."

$processedLines = @()
$fixedCount = 0

# Process each line
for ($i = 0; $i -lt $lines.Count; $i++) {
    $line = $lines[$i]
    
    # If we're past Ratoncio and this line contains a Pokemon ID
    if ($i -ge $ratonciaoStartLine -and $line -match "^\[(\d+)\]$") {
        $currentId = [int]$matches[1]
        $newId = $currentId + 2
        $newLine = "[$newId]"
        $processedLines += $newLine
        Write-Host "Fixed: [$currentId] -> [$newId]"
        $fixedCount++
    } else {
        $processedLines += $line
    }
}

# Write the corrected content to a temporary file first
$processedLines | Out-File -FilePath $tempFilePath -Encoding UTF8

Write-Host "Fixed $fixedCount Pokemon IDs"
Write-Host "Temporary file created at: $tempFilePath"

# Verify the temp file was created successfully
if (Test-Path $tempFilePath) {
    # Replace the original file with the corrected one
    Move-Item -Path $tempFilePath -Destination $filePath -Force
    Write-Host "Successfully updated the original file!"
    Write-Host "Pokemon ID numbering has been fixed from Ratoncio onwards."
} else {
    Write-Host "Error: Temporary file was not created properly!"
    exit 1
}