$ErrorActionPreference = 'Stop'
$PortableRoot = $PSScriptRoot
$PortableDataDirectory = [IO.Path]::GetFullPath((Join-Path $PortableRoot 'data\OpenChatCut'))
$PortableCacheDirectory = Join-Path $PortableDataDirectory 'cache'
New-Item -ItemType Directory -Force -Path $PortableDataDirectory, $PortableCacheDirectory | Out-Null
$PortableConfig = @{ version = 1; dataDirectory = $PortableDataDirectory } | ConvertTo-Json
[IO.File]::WriteAllText((Join-Path $PortableRoot 'openchatcut-portable.json'), $PortableConfig, [System.Text.UTF8Encoding]::new($false))
$env:TEMP = $PortableCacheDirectory
$env:TMP = $PortableCacheDirectory
$env:TMPDIR = $PortableCacheDirectory
Start-Process -FilePath (Join-Path $PortableRoot 'OpenChatCut.exe') -WorkingDirectory $PortableRoot
