!macro customInit
  ; Kill any running instances of the app before installation
  nsExec::Exec 'taskkill /F /IM "${APP_EXECUTABLE_FILENAME}"'
  Sleep 2000
!macroend

!macro customUnInit
  ; Kill any running instances of the app before uninstallation
  nsExec::Exec 'taskkill /F /IM "${APP_EXECUTABLE_FILENAME}"'
  Sleep 2000
!macroend 