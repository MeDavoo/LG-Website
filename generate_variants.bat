@echo off
echo ====================================
echo Pokemon 4-Variant Generation Pipeline
echo ====================================

echo.
echo Step 1: Resize images to 96x96 with size-based scaling...
node resize_to_96x96_staged.js
if %errorlevel% neq 0 (
    echo ERROR: Resize failed!
    pause
    exit /b 1
)

echo.
echo Step 2: Copy resized images to front_normal...
if not exist "pokemon_processing\front_normal" mkdir "pokemon_processing\front_normal"
copy "pokemon_96x96_final\*.png" "pokemon_processing\front_normal\"

echo.
echo Step 3: Apply sharpening to front_normal...
node sharpen_96x96_images.js
if %errorlevel% neq 0 (
    echo ERROR: Sharpening failed!
    pause
    exit /b 1
)

echo.
echo Step 4: Create hue-shifted versions (front_shiny)...
node hue_shift_images.js
if %errorlevel% neq 0 (
    echo ERROR: Hue shift failed!
    pause
    exit /b 1
)

echo.
echo Step 5: Create back sprites (flip front_normal)...
node create_back_sprites.js
if %errorlevel% neq 0 (
    echo ERROR: Back sprite creation failed!
    pause
    exit /b 1
)

echo.
echo Step 6: Create back shiny sprites (flip front_shiny)...
node hue_shift_back_sprites.js
if %errorlevel% neq 0 (
    echo ERROR: Back shiny creation failed!
    pause
    exit /b 1
)

echo.
echo ====================================
echo SUCCESS! All 4 variants generated:
echo - front_normal: pokemon_96x96_final/
echo - front_shiny: (shiny versions)
echo - back_normal: (flipped normal)
echo - back_shiny: (flipped shiny)
echo ====================================
pause