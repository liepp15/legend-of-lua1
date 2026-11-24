# Render peta asli Legend of Lua menjadi gambar pratinjau untuk portal.
# Memakai tileset dan maps.json yang sama dengan game, tanpa mengubah data game.
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$mapsPath = Join-Path $root 'assets/maps/maps.json'
$outDir = Join-Path $root 'assets/images'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$maps = Get-Content $mapsPath -Raw | ConvertFrom-Json
$targets = @(
  @{ id = 'new1'; file = 'map-new1.png' },
  @{ id = 'new2'; file = 'map-new2.png' },
  @{ id = 'new3'; file = 'map-new3.png' }
)

foreach ($target in $targets) {
  $m = $maps.($target.id)
  if (-not $m) { continue }
  $w = [int]$m.w
  $h = [int]$m.h
  $bmp = New-Object System.Drawing.Bitmap ($w * 16), ($h * 16)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
  $g.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceOver
  $g.Clear([System.Drawing.ColorTranslator]::FromHtml('#0d1117'))

  $tilesets = @()
  foreach ($ts in $m.ts) {
    $imgPath = Join-Path $root ($ts.img -replace '/', '\')
    if (Test-Path $imgPath) {
      $tilesets += [PSCustomObject]@{
        first = [int]$ts.first
        cols  = [int]$ts.cols
        n     = [int]$ts.n
        img   = [System.Drawing.Image]::FromFile($imgPath)
      }
    }
  }

  $layers = @('Background', 'Base', 'Objects', 'Objects2')
  foreach ($layerName in $layers) {
    $layer = $m.layers | Where-Object { $_.name -eq $layerName } | Select-Object -First 1
    if (-not $layer) { continue }
    $data = $layer.data
    for ($i = 0; $i -lt $data.Count; $i++) {
      $gid = [int]$data[$i]
      if ($gid -le 0) { continue }
      $flip = $false
      if ($gid -ge 100000) { $gid -= 100000; $flip = $true }
      $ts = $null
      foreach ($candidate in $tilesets) {
        if ($candidate.first -le $gid) { $ts = $candidate }
      }
      if (-not $ts) { continue }
      $id = $gid - $ts.first
      if ($id -lt 0 -or $id -ge $ts.n) { continue }
      $sx = ($id % $ts.cols) * 16
      $sy = [math]::Floor($id / $ts.cols) * 16
      if (($sx + 16) -gt $ts.img.Width -or ($sy + 16) -gt $ts.img.Height) { continue }
      $dx = ($i % $w) * 16
      $dy = [math]::Floor($i / $w) * 16
      $src = New-Object System.Drawing.Rectangle $sx, $sy, 16, 16
      if ($flip) {
        $state = $g.Save()
        $g.TranslateTransform(($dx + 16), $dy)
        $g.ScaleTransform(-1, 1)
        $g.DrawImage($ts.img, (New-Object System.Drawing.Rectangle 0, 0, 16, 16), $src, [System.Drawing.GraphicsUnit]::Pixel)
        $g.Restore($state)
      } else {
        $g.DrawImage($ts.img, (New-Object System.Drawing.Rectangle $dx, $dy, 16, 16), $src, [System.Drawing.GraphicsUnit]::Pixel)
      }
    }
  }

  $out = Join-Path $outDir $target.file
  $bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose()
  $bmp.Dispose()
  foreach ($ts in $tilesets) { $ts.img.Dispose() }
  Write-Output "Rendered $out"
}
