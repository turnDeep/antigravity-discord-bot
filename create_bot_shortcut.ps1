$WshShell = New-Object -comObject WScript.Shell
$DesktopPath = [Environment]::GetFolderPath('Desktop')
$Shortcut = $WshShell.CreateShortcut("$DesktopPath\Codex Bot.lnk")
$Shortcut.TargetPath = "c:\Users\plane\.gemini\codex\playground\white-magnetar\start_bot.bat"
$Shortcut.WorkingDirectory = "c:\Users\plane\.gemini\codex\playground\white-magnetar"
$Shortcut.Save()
Write-Host "Shortcut created successfully at $DesktopPath\Codex Bot.lnk"
