$WshShell = New-Object -comObject WScript.Shell
$DesktopPath = [Environment]::GetFolderPath('Desktop')
$Shortcut = $WshShell.CreateShortcut("$DesktopPath\Codex Debug Mode.lnk")
$Shortcut.TargetPath = "C:\Users\plane\AppData\Local\Programs\Codex\Codex.exe"
$Shortcut.Arguments = "--remote-debugging-port=9222"
$Shortcut.WorkingDirectory = "C:\Users\plane\AppData\Local\Programs\Codex"
$Shortcut.Save()
Write-Host "Shortcut created successfully at $DesktopPath\Codex Debug Mode.lnk"
