Add-Type -AssemblyName System.Drawing

$sourcePath = "c:\BusinessTrackingApp\mobile\src\assets\logo.png"
$resPath = "c:\BusinessTrackingApp\mobile\android\app\src\main\res"

$sizes = [ordered]@{
    "mipmap-mdpi" = 48
    "mipmap-hdpi" = 72
    "mipmap-xhdpi" = 96
    "mipmap-xxhdpi" = 144
    "mipmap-xxxhdpi" = 192
}

foreach ($folder in $sizes.Keys) {
    $size = $sizes[$folder]
    $destFolder = Join-Path $resPath $folder
    $destIcon = Join-Path $destFolder "ic_launcher.png"
    $destRoundIcon = Join-Path $destFolder "ic_launcher_round.png"

    # Load source image
    $srcImage = [System.Drawing.Image]::FromFile($sourcePath)
    
    # Create target bitmap
    $destBitmap = New-Object System.Drawing.Bitmap($size, $size)
    $graphics = [System.Drawing.Graphics]::FromImage($destBitmap)
    
    # Set high quality resize settings
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    
    # Draw resized image
    $graphics.DrawImage($srcImage, 0, 0, $size, $size)
    
    # Dispose graphics and source image to release file locks
    $graphics.Dispose()
    $srcImage.Dispose()

    # Save resized images
    $destBitmap.Save($destIcon, [System.Drawing.Imaging.ImageFormat]::Png)
    $destBitmap.Save($destRoundIcon, [System.Drawing.Imaging.ImageFormat]::Png)
    
    $destBitmap.Dispose()
    
    Write-Host "Generated launcher icons for $folder ($size x $size px)"
}
