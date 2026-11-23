$icons = @(
    'logos:aws-s3',
    'logos:google-drive',
    'logos:dropbox',
    'logos:box',
    'logos:huawei',
    'logos:google-photos',
    'logos:microsoft-onedrive',
    'vscode-icons:file-type-onedrive',
    'arcticons:pcloud',
    'arcticons:koofr',
    'arcticons:linkbox',
    'simple-icons:alibabacloud',
    'simple-icons:cloudinary',
    'simple-icons:protondrive',
    'simple-icons:icloud',
    'simple-icons:nextcloud',
    'simple-icons:infomaniak',
    'simple-icons:maildotru',
    'simple-icons:zoho'
)

foreach ($icon in $icons) {
    try {
        $parts = $icon.Split(':')
        $prefix = $parts[0]
        $name = $parts[1]
        $svg = Invoke-RestMethod -Uri "https://api.iconify.design/$prefix/$name.svg"
        $filename = "icon_$($prefix)_$($name).svg"
        $svg | Out-File -FilePath "./$filename" -Encoding utf8
        Write-Host "$icon -> saved to $filename"
    } catch {
        Write-Host "$icon -> failed"
    }
}
